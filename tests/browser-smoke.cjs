const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(data)});
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
    // No real users, products, or authentication requests are written by this smoke test.
    await page.route('**/*',route=>{
      const url=route.request().url();
      if(url.includes('/@supabase/supabase-js'))return route.fulfill({contentType:'application/javascript',body:`window.supabase={createClient(){const result={data:[],error:null};const q=new Proxy({}, {get(t,k){if(k==='then')return r=>Promise.resolve(result).then(r);return ()=>q}});return {auth:{async getSession(){return {data:{session:null},error:null}},async getUser(){return {data:{user:null},error:null}},async signOut(){return {error:null}},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},async signInWithOAuth(){window.__googleClicked=true;return {data:{},error:null}}},from(){return q},rpc(){return Promise.resolve(result)},channel(){return {on(){return this},subscribe(){return this}}},removeChannel(){}}}};`});
      if(!url.startsWith('http://127.0.0.1:'))return route.abort();
      return route.continue();
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
    await page.locator('#vaGoogleBtn').waitFor({state:'visible'});
    await page.locator('#vaGoogleBtn').click({timeout:10000});
    assert.equal(await page.evaluate(()=>window.__googleClicked),true);
    console.log('PASS: Google button responds on mobile login');
    console.log('VISUAL_LOGIN:'+ (await page.screenshot({type:'jpeg',quality:45})).toString('base64'));
    await page.evaluate(()=>{
      document.getElementById('vareliaAuth').remove();document.body.classList.remove('varelia-auth-locked');
      categories=['General'];products=[];window.products=products;
      window.vareliaCentralStockSyncProduct=async p=>{window.__savedProduct=JSON.parse(JSON.stringify(p))};
      window.vareliaPublicCatalogSync=()=>new Promise(()=>{}); // A stalled public catalog must not block product saving.
      openProduct();
    });
    await page.locator('#productName').fill('Vaporera de prueba');
    await page.locator('#buyPrice').fill('120');
    await page.locator('#purchaseQuantity').fill('36');
    await page.locator('#sellPrice').fill('15');
    await page.locator('#vCommercialCollapseBtn').click();
    await page.locator('[data-cpreset="5"]').click();
    let row=page.locator('[data-crow="0"]');
    await row.locator('[data-cunits]').fill('36');
    await row.locator('[data-cprice]').fill('180');
    await row.locator('[data-ccost]').fill('120');
    await page.locator('[data-cpreset="1"]').click();
    row=page.locator('[data-crow="1"]');
    await row.locator('[data-cprice]').fill('40');
    await row.locator('[data-ccost]').fill('25');
    console.log('VISUAL_PRODUCT:'+ (await page.screenshot({type:'jpeg',quality:45})).toString('base64'));
    await page.locator('#productForm button[type=submit]').click();
    await page.waitForFunction(()=>!!window.__savedProduct);
    const saved=await page.evaluate(()=>window.__savedProduct);
    assert.equal(saved.buyPrice,120/36);assert.equal(saved.commercialPricing.purchaseCost.quantity,36);
    assert.equal(saved.commercialPricing.purchaseCost.total,120);
    assert.equal(saved.salePresentations.find(p=>p.id==='cajon').buyCost,120);
    assert.equal(saved.salePresentations.find(p=>p.id==='media_docena').buyCost,25);
    console.log('PASS: real mobile form preserves independent carton and half-dozen purchase costs');
    await page.waitForFunction(()=>!document.getElementById('productDialog')?.open);
    assert.equal(await page.locator('#productForm button[type=submit]').isEnabled(),true);
    console.log('PASS: product save closes and restores its button even when the public catalog never responds');
    await page.evaluate(()=>{
      window.__realSaveTimer=window.setTimeout;
      window.setTimeout=(fn,ms,...args)=>window.__realSaveTimer(fn,ms===25000?80:ms,...args);
      window.vareliaCentralStockSyncProduct=()=>new Promise(()=>{});
      openProduct(products[0].id);
    });
    await page.locator('#productForm button[type=submit]').click();
    await page.waitForFunction(()=>document.getElementById('productForm').dataset.saving!=='1');
    assert.equal(await page.locator('#productDialog').evaluate(d=>d.open),true);
    assert.equal(await page.locator('#productForm button[type=submit]').isEnabled(),true);
    assert.equal(await page.evaluate(()=>products.length),1);
    await page.evaluate(()=>{
      window.setTimeout=window.__realSaveTimer;
      window.vareliaCentralStockSyncProduct=async p=>{window.__savedProduct=JSON.parse(JSON.stringify(p))};
    });
    await page.locator('#productForm button[type=submit]').click();
    await page.waitForFunction(()=>!document.getElementById('productDialog').open);
    assert.equal(await page.evaluate(()=>products.length),1);
    console.log('PASS: stalled cloud save releases the button, keeps the form and allows retry without duplicating the product');
    await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
    for(const view of ['products','inventory','sales','cash','suppliers','purchases','categories','appearance']){
      const state=await page.evaluate(id=>{switchView(id);return {target:document.getElementById(id)?.className,active:[...document.querySelectorAll('.view.active')].map(x=>x.id)}},view);
      assert.equal(state.target?.split(' ').includes('active'),true,'view '+view+': '+JSON.stringify(state));
      if(view==='inventory'||view==='cash')console.log('VISUAL_'+view.toUpperCase()+':'+(await page.screenshot({type:'jpeg',quality:45})).toString('base64'));
    }
    console.log('PASS: catalog, inventory, sales, cash, suppliers, purchases, categories and appearance screens open');
    for(const view of ['sales','products','inventory','mobileHistoryHub','mobileAdminHub','mobileSettingsHub']){
      await page.locator('[data-mobile-tab="'+view+'"]').click();
      assert.equal(await page.locator('#'+view).evaluate(el=>el.classList.contains('active')),true,'mobile tab '+view);
    }
    console.log('PASS: all six mobile navigation tabs respond');
    await page.evaluate(()=>{
      window.vareliaCentralSaveSupplier=async s=>{window.__savedSupplier={...s};return {id:'00000000-0000-4000-8000-000000000001'}};
      window.vareliaCentralDeleteSupplier=async s=>{window.__deletedSupplier=s.id};
      window.vareliaCentralPurchase=async p=>{window.__purchase=p;return {purchase_id:'00000000-0000-4000-8000-000000000002',total:p.items.reduce((a,i)=>a+i.qty*i.cost,0)}};
      switchView('suppliers');
    });
    await page.locator('#newSupplier').click();
    await page.locator('#supplierName').fill('Proveedor de prueba');
    await page.locator('#supplierForm button[type=submit]').click();
    await page.waitForFunction(()=>!!window.__savedSupplier);
    assert.equal(await page.locator('#supplierList').innerText().then(t=>t.includes('Proveedor de prueba')),true);
    await page.locator('[data-editsupplier]').click();
    await page.locator('#supplierName').fill('Proveedor actualizado');
    await page.locator('#supplierForm button[type=submit]').click();
    await page.waitForFunction(()=>window.__savedSupplier?.name==='Proveedor actualizado');
    console.log('PASS: supplier creation and edit buttons persist the selected supplier');
    await page.evaluate(()=>switchView('purchases'));
    await page.locator('#newPurchase').click();
    await page.locator('#purchaseSupplier').selectOption({label:'Proveedor actualizado'});
    await page.locator('#purchaseProduct').selectOption(await page.evaluate(()=>String(products.find(p=>p.name==='Vaporera de prueba').id)));
    await page.locator('#purchaseQty').fill('2');await page.locator('#purchaseCost').fill('3.33');
    await page.locator('#addPurchaseItem').click();
    await page.locator('#savePurchase').click();
    await page.waitForFunction(()=>!!window.__purchase);
    const purchase=await page.evaluate(()=>window.__purchase);
    assert.equal(purchase.items.length,1);assert.equal(purchase.items[0].qty,2);assert.equal(purchase.items[0].cost,3.33);
    console.log('PASS: real goods receipt form sends quantity and unit cost to one cloud transaction');
    await page.evaluate(()=>{
      window.vareliaCentralCloseCash=async total=>{window.__cashTotal=total;return {id:'00000000-0000-4000-8000-000000000003',total,created_by:'qa-user',day_key:'2026-10-23',closed_at:new Date().toISOString()}};
      switchView('cash');
    });
    await page.locator('#closeCash').click();
    await page.waitForFunction(()=>typeof window.__cashTotal==='number');
    assert.equal(await page.evaluate(()=>closures.filter(c=>c.cloudClosureId==='00000000-0000-4000-8000-000000000003').length),1);
    console.log('PASS: cash closes only after cloud confirmation');
    await page.evaluate(()=>{
      const sb=window.vareliaSupabase;
      window.__oldSessionReader=sb.auth.getSession;window.__oldFrom=sb.from;
      window.vareliaCurrentUserProfile={id:'qa-owner',business_id:'qa-business',role:'owner'};
      sb.auth.getSession=async()=>({data:{session:{user:{id:'qa-owner'}}},error:null});
      window.__settingsWrites=[];
      sb.from=table=>{
        let q;let action='';
        q=new Proxy({}, {get(_t,key){
          if(key==='then')return resolve=>{
            if(table==='public_catalogs')return new Promise(()=>{});
            return Promise.resolve({data:table==='businesses'?{id:'qa-business'}:null,error:null}).then(resolve);
          };
          return (...args)=>{if(key==='update'||key==='upsert'){action=key;window.__settingsWrites.push({table,action,payload:args[0]})}return q};
        }});return q;
      };
      switchView('mobileSettingsHub');
    });
    await page.locator('#vsetBusiness').fill('Negocio de prueba');
    await page.locator('#vsettingsSave').click();
    await page.waitForFunction(()=>!document.getElementById('vsettingsSave').disabled,{},{timeout:5000});
    const settingsWrites=await page.evaluate(()=>window.__settingsWrites);
    assert.equal(settingsWrites.filter(x=>x.table==='varelia_business_settings').length,1);
    assert.equal(settingsWrites.filter(x=>x.table==='businesses').length,1);
    assert.equal(settingsWrites.find(x=>x.table==='varelia_business_settings').payload.currency,'S/');
    await page.evaluate(()=>{window.vareliaSupabase.auth.getSession=window.__oldSessionReader;window.vareliaSupabase.from=window.__oldFrom});
    console.log('PASS: settings save sends one settings write, shares one account context, and does not wait for the public catalog');



    await page.waitForTimeout(500);
    assert.deepEqual(errors,[]);
    console.log('PASS: app scripts load without uncaught browser errors');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
