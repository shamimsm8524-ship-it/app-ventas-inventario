const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {unitCost}=require('../purchase-cost-math.js');
const report=read('reports-profit.js');
const source=report.slice(report.indexOf('  function gainItemData('),report.indexOf('  function gainProductSummary('));
const ctx={};vm.createContext(ctx);vm.runInContext(source,ctx);
const product={id:'local',_cloudId:'cloud',name:'Vaporera',unit:'Unidad',buyPrice:unitCost(120,36),sellPrice:15};
test('36 units at S/120: unit profit S/11.67, full carton cost S/120',()=>{
  assert.equal((15-unitCost(120,36)).toFixed(2),'11.67');
  assert.equal((unitCost(120,36)*36).toFixed(2),'120.00');
});
test('single unit and continuous inventory retain their cost basis',()=>{
  assert.equal(unitCost(12,1),12);assert.equal(unitCost(45,2.5),18);assert.equal(unitCost(0,36),0);
});
for(const [total,qty] of [[120,0],[120,-1],[-1,36],[NaN,36],[120,Infinity]]){
  test(`invalid purchase ${total}/${qty} is rejected`,()=>assert.throws(()=>unitCost(total,qty)));
}
test('historical unit cost survives a change of current product cost',()=>{
  const row=ctx.gainItemData({product_id:'cloud',qty:1,unit_price:15,buy_price_at_sale:3.333333},[{...product,buyPrice:9}]);
  assert.equal(row.buy,3.333333);assert.equal(row.estimated,false);assert.equal((row.subtotal-row.buy*row.costQty).toFixed(2),'11.67');
});
test('missing historical cost resolves the cloud product ID',()=>{
  const row=ctx.gainItemData({product_id:'cloud',qty:1,unit_price:15},[product]);
  assert.equal(row.buy,product.buyPrice);assert.equal(row.estimated,true);
});
test('a dozen costs 12 units and preserves the chosen presentation quantity',()=>{
  const row=ctx.gainItemData({id:'local',qty:2,unit_price:150,sale_presentation_id:'docena',sale_presentation_units:12,stock_qty:24,sale_unit:'Docena'},[product]);
  assert.equal(row.qty,2);assert.equal(row.buy*row.costQty,80);assert.equal(row.subtotal,300);
});
test('a non-medicine Caja uses its commercial presentation cost',()=>{
  const row=ctx.gainItemData({id:'local',qty:1,unit_price:200,sale_presentation_id:'caja',sale_presentation_units:36,stock_qty:36,sale_unit:'Caja'},[product]);
  assert.equal(row.buy*row.costQty,120);
});
test('500 grams use half a kilogram of cost',()=>{
  const row=ctx.gainItemData({id:'weight',qty:500,unit_price:.02,sale_unit:'g'},[{id:'weight',unit:'Kg',buyPrice:12}]);
  assert.equal(row.qty,.5);assert.equal(row.buy*row.costQty,6);assert.equal(row.subtotal,10);
});
test('zero historical cost is not replaced with a current cost',()=>{
  const row=ctx.gainItemData({id:'local',qty:1,unit_price:15,buy_price_at_sale:0},[product]);
  assert.equal(row.buy,0);assert.equal(row.estimated,false);
});
test('empty payment history formats zero rather than showing template source',()=>{
  const src=read('video-features.js');
  assert(!src.includes("'<div class=\"vrefPayment\"><span>Sin ventas</span><b>${money(0)}</b></div>'"));
  assert(src.includes('`<div class="vrefPayment"><span>Sin ventas</span><b>${money(0)}</b></div>`'));
});
test('product form saves commercial fields before cloud synchronization',()=>{
  const src=read('index.html');assert(src.indexOf('obj.commercialPricing=')<src.indexOf('syncFn(saved)'));
  assert(!read('advanced-pricing.js').includes('setTimeout(apply,120)'));
  assert(read('central-stock-sync.js').includes('!p.__commercialEdited'));
});
test('half-dozen purchase cost is independent from the unit and carton costs',()=>{
  const p={...product,salePresentations:[{id:'half_dozen',units:6,buyCost:25},{id:'carton',units:36,buyCost:120}]};
  const row=ctx.gainItemData({id:'local',qty:2,unit_price:40,sale_presentation_id:'half_dozen',sale_presentation_units:6,stock_qty:12},[p]);
  assert.equal(row.buy,25);assert.equal(row.costQty*row.buy,50);
  assert.equal(row.subtotal-row.costQty*row.buy,30);
});
test('free presentation cost remains zero instead of falling back to unit cost',()=>{
  const row=ctx.gainItemData({id:'local',qty:1,unit_price:40,sale_presentation_id:'gift',sale_presentation_units:6},[{...product,salePresentations:[{id:'gift',buyCost:0}]}]);
  assert.equal(row.buy,0);
});
test('editing presentation prices never recalculates the wholesale price',()=>{
  assert(!read('product-form-safety.js').includes('unitPrice.value=round2(price/units)'));
});
function purchaseHarness(unit,quantity,cost){
  const html=read('index.html'),start=html.indexOf('addPurchaseItem.onclick='),end=html.indexOf('\nsavePurchase.onclick=',start);
  const alerts=[];const env={products:[{id:'p',name:'P',unit}],purchaseProduct:{value:'p'},purchaseQty:{value:String(quantity)},purchaseCost:{value:String(cost)},purchaseCart:[],renderPurchaseCart(){},alert:m=>alerts.push(m),addPurchaseItem:{}};
  vm.createContext(env);vm.runInContext(html.slice(start,end),env);env.addPurchaseItem.onclick();return {env,alerts};
}
test('goods receipt preserves fractional kilograms instead of truncating them',()=>{
  const {env}=purchaseHarness('Kg',2.5,10);assert.equal(env.purchaseCart[0].qty,2.5);
});
test('goods receipt rejects negative purchase cost and fractional discrete units',()=>{
  for(const args of [['Unidad',2,-1],['Unidad',1.5,10],['Unidad',0,10]]){
    const {env,alerts}=purchaseHarness(...args);assert.equal(env.purchaseCart.length,0);assert.equal(alerts.length,1);
  }
});
test('product names and codes are escaped before rendering HTML',()=>{
  const html=read('index.html');const start=html.indexOf('esc=s=>'),end=html.indexOf(';',start);
  // Extract the complete helper line because HTML entities contain semicolons.
  const line=html.slice(start,html.indexOf('\n',start));const env={};vm.createContext(env);vm.runInContext('const '+line+'\nthis.escape=esc',env);
  assert.equal(env.escape('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('image persistence module never replaces the product form save handler',()=>{
  const src=read('product-view-20260930-17.js');
  assert(!src.includes('productForm.onsubmit='));
  assert(src.includes('VareliaProductImages={put:putImage'));
  assert(read('index.html').includes('await images.put(obj.id,obj.image)'));
});
test('mobile navigation waits for DOM readiness without invoking an undefined result',()=>{
  const env={window:{},document:{readyState:'loading',addEventListener(){}}};vm.createContext(env);
  assert.doesNotThrow(()=>vm.runInContext(read('simple-mobile-nav.js'),env));
});
test('sidebar section titles resolve a nested submenu to its direct navigation ancestor',()=>{
  const src=read('sidebar-premium.js');
  const body=src.match(/const anchor=el=>\{([^}]+)\}/)[1];
  const nav={contains:()=>true},group={parentNode:nav},submenu={parentNode:group},button={parentNode:submenu};
  const ctx={nav};vm.createContext(ctx);vm.runInContext('this.anchor=el=>{'+body+'}',ctx);
  assert.equal(ctx.anchor(button),group);
});
test('cloud quantities preserve fractions and reject invalid values',()=>{
  const src=read('central-stock-sync.js');
  const fn=src.slice(src.indexOf('  function validQuantity('),src.indexOf('  async function centralCheckout('));
  const env={};vm.createContext(env);vm.runInContext(fn+';this.validate=validQuantity;',env);
  assert.equal(env.validate(.5),.5);assert.equal(env.validate('0.125'),.125);
  for(const n of [0,-1,NaN,Infinity,'invalid'])assert.throws(()=>env.validate(n));
});
test('confirmed rows preserve separate costs for two presentations of one product',()=>{
  const src=read('central-stock-sync.js');
  const body=src.slice(src.indexOf('      const soldItems=current.map'),src.indexOf('      let committedSale=null;'));
  const env={current:[{id:'p',qty:1},{id:'p',qty:1}],localProducts:()=>[{id:'p',_cloudId:'cloud'}],remoteItems:[{product_id:'cloud',buy_price_at_sale:120,unit_price:180},{product_id:'cloud',buy_price_at_sale:25,unit_price:40}]};
  vm.createContext(env);vm.runInContext(body+'this.result=soldItems;',env);
  assert.equal(env.result[0].buyPriceAtSale,120);assert.equal(env.result[1].buyPriceAtSale,25);
});

test('startup screen restoration stops after the first user interaction',()=>{
  const src=read('product-view-20260930-17.js');
  const restore=src.slice(src.indexOf('const restore=()=>{'),src.indexOf(";window.addEventListener('pageshow'"));
  const env={window:{__vareliaNavigationTouched:true},wantedView:()=>{throw Error('must not navigate')},forceView:()=>{throw Error('must not navigate')},saveView(){}};
  vm.createContext(env);vm.runInContext(restore+';restore();',env);
});
function productSaveHarness(conflict=false){
  const src=read('central-stock-sync.js');
  const body=src.slice(src.indexOf('  async function syncProduct(p){'),src.indexOf('  function installProductBridge(){'));
  const requests=[];
  const env={AbortController,setTimeout,clearTimeout,Map,Promise,console,
    sb:{from(table){const request={table};requests.push(request);let q;
      q=new Proxy({}, {get(_t,key){if(key==='then')return resolve=>Promise.resolve({data:conflict?null:{id:'cloud',business_id:'biz',stock:8,updated_at:'v2'},error:null}).then(resolve);
        return (...args)=>{request[key]=args;return q}}});return q}},
    profile:{id:'owner'},businessId:'biz',isOwner:()=>true,productSyncLocks:new Map(),lastProductStockWrite:new Map(),suppressRefreshUntil:0,
    ensureCategory:async(_name,known)=>{assert.equal(known,true);return 'cat'},
    productPayload:p=>({business_id:'biz',name:p.name,stock:p.stock}),withTimeout:p=>p,
    refreshPublicStock:()=>new Promise(()=>{}),window:{dispatchEvent(){}},CustomEvent:class{},document:{getElementById(){return null}}
  };
  vm.createContext(env);vm.runInContext(body+'this.run=syncProduct;',env);
  return {env,requests};
}
test('editing a synchronized product confirms it with one database request',async()=>{
  const {env,requests}=productSaveHarness();const product={id:'local',_cloudId:'cloud',_cloudUpdatedAt:'v1',name:'Prueba',stock:8};
  await env.run(product);
  assert.equal(requests.length,1);assert.equal(requests[0].table,'varelia_products');
  assert(requests[0].update);assert.equal(product._cloudUpdatedAt,'v2');
  assert.equal(env.productSyncLocks.size,0);
});
test('a conflicting product version still rejects the edit and releases its lock',async()=>{
  const {env,requests}=productSaveHarness(true);
  await assert.rejects(env.run({id:'local',_cloudId:'cloud',_cloudUpdatedAt:'v1',stock:8}),/inventario cambió/);
  assert.equal(requests.length,1);assert.equal(env.productSyncLocks.size,0);
});
test('business settings use the authenticated account scope and reject another account',()=>{
  const src=read('business-settings-cloud.js');const a=src.indexOf('  const businessScopes=');const b=src.indexOf('  const localSet=',a);
  const storage=new Map([['varelia_active_business_id','user-a'],['varelia_video_settings_v1__user-a','{"businessName":"Mi negocio"}']]);
  const env={Map,defaults:{businessName:''},clean:x=>String(x||''),localStorage:{getItem:k=>storage.get(k)||null}};
  vm.createContext(env);vm.runInContext(src.slice(a,b)+"businessScopes.set('business-a','user-a');this.load=localGet;",env);
  assert.equal(env.load('business-a').businessName,'Mi negocio');
  storage.set('varelia_active_business_id','user-b');assert.equal(env.load('business-a').businessName,'');
});

test('cartons convert to unit inventory without changing the unit sale price',()=>{
  const {stockFromPackages}=require('../purchase-cost-math.js');
  assert.equal(stockFromPackages(1,36),36);assert.equal(stockFromPackages(2,36),72);
  assert.equal(stockFromPackages(.5,36),18);assert.equal(stockFromPackages(0,36),0);
  for(const [qty,size] of [[-1,36],[1,0],[NaN,36],[1,Infinity]])assert.throws(()=>stockFromPackages(qty,size));
  const price=15;assert.equal(price-unitCost(120,36),11.666666666666666);
});
function syncStartupHarness(fail=false){
  const src=read('central-stock-sync.js');
  const body=src.slice(src.indexOf('  async function init(){'),src.indexOf('  // Sincronización forzada:'));
  const events=[],timers=[];
  const env={initBusy:false,initAgain:false,businessId:'biz',channel:null,retryTimer:null,retryDelay:1000,bridgeTimer:null,syncLifecycleBound:false,
    waitClient:async()=>true,loadProfile:async()=>({id:'owner',business_id:'biz'}),
    refreshCloud:async()=>{if(fail)throw Error('network failed');return true},
    localProducts:()=>[{id:'pending'}],seedIfNeeded:()=>new Promise(()=>{}),withTimeout:p=>p,
    installProductBridge(){},installCategoryBridge(){},installCategoryDeleteBridge(){},installCheckoutBridge(){},subscribe(){},scheduleRefresh(){},
    setTimeout(fn,ms){timers.push({fn,ms});return timers.length},clearTimeout(){},setInterval(){return 1},clearInterval(){},
    window:{vareliaSetCloudStatus(){},dispatchEvent(e){events.push(e.type)}},CustomEvent:class{constructor(type){this.type=type}},
    addEventListener(){},document:{addEventListener(){}},navigator:{onLine:true},console:{warn(){},error(){}},toast(){}};
  vm.createContext(env);vm.runInContext(body+'this.start=init;',env);return {env,events,timers};
}
test('startup confirms a cloud read without waiting for an unresponsive local backup',async()=>{
  const {env,events}=syncStartupHarness();await env.start();
  assert(events.includes('varelia:sync-connected'));assert.equal(env.initBusy,false);
});
test('startup never reports connected after a failed read and schedules a fast retry',async()=>{
  const {env,events,timers}=syncStartupHarness(true);await env.start();
  assert(!events.includes('varelia:sync-connected'));assert(events.includes('varelia:sync-error'));
  assert(timers.some(t=>t.ms===1000));assert.equal(env.initBusy,false);
});
test('concurrent inventory reads share a request and release it afterwards',async()=>{
  const src=read('central-stock-sync.js');const a=src.indexOf('  let cloudReadInFlight=null;'),b=src.indexOf('  let suppressRefreshUntil=',a);
  let resolve,calls=0;const pending=new Promise(r=>resolve=r);
  const env={businessId:'biz',readCloud:()=>{calls++;return pending}};
  vm.createContext(env);vm.runInContext(src.slice(a,b)+'this.refresh=refreshCloud;',env);
  const first=env.refresh(),second=env.refresh();assert.equal(first,second);assert.equal(calls,1);
  resolve(true);await first;await env.refresh();assert.equal(calls,2);
});
function sessionFixture({expired=false,read,timeoutMs=30}={}){
  const {attachSessionState}=require('../auth-session-state.js');
  const expiry=Math.floor(Date.now()/1000)+(expired?-100:3600);
  const session={access_token:'header.'+Buffer.from(JSON.stringify({sub:'qa-user',exp:expiry})).toString('base64url')+'.signature',refresh_token:'test-refresh',expires_at:expiry,user:{id:'qa-user'}};
  const storage=new Map([['session',JSON.stringify(session)]]);let callback,calls=0;
  const client={auth:{getSession(){calls++;return read?read():new Promise(()=>{})},onAuthStateChange(fn){callback=fn}}};
  attachSessionState(client,{storage:{getItem:key=>storage.get(key)||null},key:'session',timeoutMs});
  return {client,session,storage,calls:()=>calls,event:(name,value)=>callback(name,value)};
}
test('valid persisted session is immediately available when SDK session initialization stalls',async()=>{
  const fixture=sessionFixture();
  const results=await Promise.all(Array.from({length:20},()=>fixture.client.auth.getSession()));
  assert(results.every(r=>r.data.session.user.id==='qa-user'&&!r.error));assert.equal(fixture.calls(),0);
});
test('expired sessions share one SDK renewal and are never returned as a valid cache',async()=>{
  const fixture=sessionFixture({expired:true});
  const first=fixture.client.auth.getSession(),second=fixture.client.auth.getSession();
  assert.equal(first,second);const result=await first;
  assert.equal(result.data.session,null);assert.equal(result.error.code,'VARELIA_SESSION_TIMEOUT');assert.equal(fixture.calls(),1);
});
test('signout invalidates a pending session read and prevents late restoration',async()=>{
  let resolve;const fixture=sessionFixture({expired:true,read:()=>new Promise(r=>resolve=r)});
  const pending=fixture.client.auth.getSession();await Promise.resolve();
  fixture.event('SIGNED_OUT',null);
  resolve({data:{session:{...fixture.session,expires_at:Math.floor(Date.now()/1000)+3600}},error:null});
  assert.equal((await pending).data.session,null);
  assert.equal((await fixture.client.auth.getSession()).data.session,null);
});
test('a sign-in event supplies the shared session without another restoration request',async()=>{
  const fixture=sessionFixture();fixture.storage.clear();fixture.event('SIGNED_IN',fixture.session);
  assert.equal((await fixture.client.auth.getSession()).data.session.user.id,'qa-user');assert.equal(fixture.calls(),0);
});
test('a still-valid session is not blocked by a second forced refresh before loading inventory',async()=>{
  const src=read('central-stock-sync.js');const a=src.indexOf('  async function loadProfile(){'),b=src.indexOf('  async function fetchCategories(){',a);
  const env={sb:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'},expires_at:Math.floor(Date.now()/1000)+30}},error:null}),refreshSession(){throw Error('redundant refresh')}}},window:{vareliaCurrentUserProfile:{id:'owner',business_id:'biz',role:'owner'}},withTimeout:p=>p,profile:null,businessId:'',role:''};
  vm.createContext(env);vm.runInContext(src.slice(a,b)+'this.load=loadProfile;',env);
  assert.equal((await env.load()).business_id,'biz');assert.equal(env.businessId,'biz');
});
