const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html');res.end(data)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 const fixture=[
 {product_id:'water',name:'Agua',category:'Aguas',stock:7,unit:'Unidad',sell_price:3.5,sale_presentations:[{id:'six',name:'Six Pack',units:6,price:15,active:true}]},
 {product_id:'simple',name:'Simple',category:'Otros',stock:1,unit:'Unidad',sell_price:2},
 {product_id:'med',name:'Ampicilina',category:'Medicinas',stock:100,unit:'Caja',sell_price:60,medicine:true,blisters_per_box:10,units_per_blister:10,box_price:60,blister_price:30,unit_medicine_price:3},
 {product_id:'weight',name:'Pollo',category:'Carne',stock:.5,unit:'kg',sell_price:12},
 {product_id:'variant',name:'Polo',category:'Ropa',stock:4,unit:'Unidad',sell_price:20,characteristics:[{name:'Color',values:[{label:'Azul'},{label:'Rojo'}]}],variant_combinations:[{values:['Azul'],stock:1},{values:['Rojo'],stock:3}]}
 ];
 let mode='fail',release,requests=[];
 await page.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.includes('/rest/v1/public_catalogs?'))return route.fulfill({contentType:'application/json',body:JSON.stringify([{business_id:'qa-business',business_name:'Varelia QA',business_info:{allow_pickup:true},social_links:{}}])});
  if(url.includes('/rest/v1/public_catalog_products?'))return route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)});
  if(url.includes('/rest/v1/public_catalog_orders')&&req.method()==='POST'){
   requests.push(req.postDataJSON());
   if(mode==='hold')await new Promise(r=>release=r);
   return route.fulfill({status:mode==='fail'?503:201,contentType:'application/json',body:mode==='fail'?'{"message":"QA offline"}':''});
  }
  if(url.startsWith('http://127.0.0.1:'))return route.continue();return route.abort();
 });
 const url='http://127.0.0.1:'+server.address().port+'/catalogo/milagros/catalogo-v112.html?c=qa-public';
 await page.goto(url,{waitUntil:'load'});await page.locator('#grid .add').first().waitFor({state:'visible'});
 async function alertOn(action,pattern=/stock/i){const event=page.waitForEvent('dialog').then(async d=>{assert.match(d.message(),pattern);await d.accept()});await action();await event}
 async function closeViewer(){if(await page.locator('#productViewer').evaluate(e=>e.classList.contains('on')))await page.locator('#viewerClose').click()}
 async function openCart(){await closeViewer();if(!await page.locator('#modal').evaluate(e=>e.classList.contains('on')))await page.locator('#view').click()}
 async function closeCart(){if(await page.locator('#modal').evaluate(e=>e.classList.contains('on')))await page.locator('#close').click()}
 async function clearCart(){await closeViewer();if(await page.locator('#items .remove').count()){await openCart();while(await page.locator('#items .remove').count())await page.locator('#items .remove').first().click();await closeCart()}}
 async function add(id){await closeCart();await page.locator('#grid .add[data-id="'+id+'"]').click()}
 await add('simple');await alertOn(()=>add('simple'));await clearCart();
 console.log('PASS: public catalog prevents repeated unit additions beyond stock');
 await add('med');await page.locator('.medicineDirectAdd[data-key="box"]').click();await add('med');await alertOn(()=>page.locator('.medicineDirectAdd[data-key="blister"]').click());await clearCart();
 console.log('PASS: medicine stock is shared across Caja, Blíster and Pastilla in the public cart');
 await add('weight');await page.locator('.viewerAdd').click();await openCart();await alertOn(()=>page.locator('.plus').first().click());await alertOn(()=>page.locator('.weightVariant').selectOption('1'));await clearCart();
 console.log('PASS: public weight selection and plus controls cannot exceed fractional stock');
 await add('variant');await page.locator('.viewerVariant[data-value="Azul"]').click();await page.locator('.viewerAdd').click();await add('variant');await page.locator('.viewerVariant[data-value="Azul"]').click();await alertOn(()=>page.locator('.viewerAdd').click());await clearCart();
 console.log('PASS: public variants respect their individual stock when other colors remain available');
 await add('water');await page.locator('.presentationDirectAdd[data-pid="six"]').click();await add('water');await page.locator('.presentationDirectAdd[data-pid=""]').click();
 await openCart();assert.match(await page.locator('#subtotal').innerText(),/18.50/);
 await alertOn(()=>page.locator('#order').click(),/Completa/);await page.waitForFunction(()=>!document.getElementById('order').disabled);
 await page.locator('#cname').fill('Cliente QA');await page.locator('#phone').fill('999999999');await page.locator('#city').fill('Lima');
 await alertOn(()=>page.locator('#order').click(),/No se pudo registrar/);
 assert.equal(requests.length,1);assert.equal(await page.locator('#items .cartCard').count(),2);assert.match(await page.locator('#subtotal').innerText(),/18.50/);
 await page.waitForFunction(()=>!document.getElementById('order').disabled);
 mode='hold';const request=page.waitForRequest(r=>r.url().includes('/public_catalog_orders')&&r.method()==='POST');await page.locator('#order').click();await request;
 assert.equal(await page.locator('#order').isDisabled(),true);await page.evaluate(()=>document.getElementById('order').click());assert.equal(requests.length,2);
 await closeCart();await add('simple');
 while(!release)await new Promise(r=>setTimeout(r,10));mode='success';release();
 await page.locator('#catalogReceiptOverlay').waitFor({state:'visible'});
 const submitted=requests[1];assert.equal(submitted.total,18.5);assert.equal(submitted.items[0].presentation_units,6);assert.equal(submitted.items[0].subtotal,15);
 await page.locator('#catalogReceiptClose').click();await openCart();assert.equal(await page.locator('#items .cartCard').count(),1);assert.match(await page.locator('#items').innerText(),/Simple/);assert.match(await page.locator('#subtotal').innerText(),/2.00/);
 await closeCart();await page.reload({waitUntil:'load'});await page.locator('#grid .add').first().waitFor();await openCart();assert.equal(await page.locator('#items .cartCard').count(),1);
 console.log('PASS: failed orders preserve cart; repeated send clicks create one request; successful receipt uses snapshot and removes only submitted lines; new additions survive reload');
 assert.deepEqual(errors,[]);console.log('PASS: real public catalog scripts execute without browser exceptions; all HTTP writes intercepted as fixtures');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
