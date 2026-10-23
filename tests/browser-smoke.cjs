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
      if(url.includes('/@supabase/supabase-js'))return route.fulfill({contentType:'application/javascript',body:`window.supabase={createClient(){const result={data:[],error:null};const q=new Proxy({}, {get(t,k){if(k==='then')return r=>Promise.resolve(result).then(r);return ()=>q}});return {auth:{async getSession(){return {data:{session:null},error:null}},async getUser(){return {data:{user:null},error:null}},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},async signInWithOAuth(){window.__googleClicked=true;return {data:{},error:null}}},from(){return q},rpc(){return Promise.resolve(result)},channel(){return {on(){return this},subscribe(){return this}}},removeChannel(){}}}};`});
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
      window.vareliaPublicCatalogSync=async()=>{};
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
    await page.waitForTimeout(500);
    assert.deepEqual(errors,[]);
    console.log('PASS: app scripts load without uncaught browser errors');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
