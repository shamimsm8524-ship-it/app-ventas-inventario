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
    await page.locator('#purchasePresentation').selectOption('Cajón');
    assert.equal(await page.locator('#unit').inputValue(),'Unidad');
    await page.locator('#buyPrice').fill('120');
    await page.locator('#purchaseQuantity').fill('36');
    await page.locator('#sellPrice').fill('15');
    await page.locator('#productStockEntryUnit').selectOption('purchase');
    await page.locator('#productQty').fill('1');
    assert.match(await page.locator('#productQtyHint').innerText(),/36 unidades/);
    await page.locator('#purchasePresentation').scrollIntoViewIfNeeded();
    console.log('VISUAL_SIMPLE_STOCK:'+(await page.screenshot({type:'jpeg',quality:50})).toString('base64'));
    await page.locator('#vCommercialCollapseBtn').click();
    await page.locator('[data-cpreset="5"]').click();
    let row=page.locator('[data-crow="0"]');
    assert.equal(await row.locator('[data-cunits]').inputValue(),'36');
    await row.locator('[data-cprice]').fill('180');
    await row.locator('summary').click();
    await row.locator('[data-ccost]').fill('120');
    await page.locator('[data-cpreset="1"]').click();
    row=page.locator('[data-crow="1"]');
    await row.locator('[data-cprice]').fill('40');
    await row.locator('summary').click();
    await row.locator('[data-ccost]').fill('25');
    await page.locator('[data-cpreset="4"]').click();
    row=page.locator('[data-crow="2"]');
    assert.equal(await row.locator('[data-cunits]').inputValue(),'18');
    await row.locator('[data-cprice]').fill('90');
    await page.locator('[data-cpreset="2"]').click();
    row=page.locator('[data-crow="3"]');
    assert.equal(await row.locator('[data-cunits]').inputValue(),'12');
    await row.locator('[data-cprice]').fill('60');
    await page.locator('[data-cpreset="5"]').click();
    assert.equal(await page.locator('[data-crow]').count(),4);
    console.log('VISUAL_PRODUCT:'+ (await page.screenshot({type:'jpeg',quality:45})).toString('base64'));
    await page.locator('#productForm button[type=submit]').click();
    await page.waitForFunction(()=>!!window.__savedProduct);
    const saved=await page.evaluate(()=>window.__savedProduct);
    assert.equal(saved.unit,'Unidad');assert.equal(saved.sellPrice,15);assert.equal(saved.stock,36);
    assert.equal(saved.commercialPricing.purchaseCost.presentation,'Cajón');
    assert.equal(saved.buyPrice,120/36);assert.equal(saved.commercialPricing.purchaseCost.quantity,36);
    assert.equal(saved.commercialPricing.purchaseCost.total,120);
    assert.equal(saved.salePresentations.find(p=>p.id==='cajon').buyCost,120);
    assert.equal(saved.salePresentations.find(p=>p.id==='media_docena').buyCost,25);
    console.log('PASS: real mobile form preserves independent carton and half-dozen purchase costs');
    await page.waitForFunction(()=>!document.getElementById('productDialog')?.open);
    assert.equal(await page.locator('#productForm button[type=submit]').isEnabled(),true);
    await page.evaluate(()=>{
      const legacy={...products[0],id:'legacy-box',unit:'Caja',unitsPerBox:36,stock:36};products.push(legacy);
      openProduct(legacy.id);
    });
    assert.equal(await page.locator('#unit').inputValue(),'Unidad');
    assert.equal(await page.locator('#vUnitsPerBoxWrap').isVisible(),false);
    assert.equal(await page.locator('#productQty').inputValue(),'');
    assert.equal(await page.locator('#productLegacyStockNotice').isVisible(),true);
    await page.evaluate(()=>{document.getElementById('productDialog').close();products=products.filter(p=>p.id!=='legacy-box');window.products=products});
    console.log('PASS: product save closes and restores its button even when the public catalog never responds');
    await page.evaluate(()=>{
      window.vareliaCentralAdjustStock=async({product,qty,event})=>{
        window.__movementQty=qty;const before=product.stock;product.stock=before+(event==='add'?qty:-qty);
        return {stock_before:before,stock_after:product.stock};
      };
      switchView('inventory');selectInv(products[0]);
    });
    await page.locator('#inventoryMovementUnit').selectOption('caja');
    await page.locator('#inventoryQty').fill('2');
    await page.locator('#applyInventory').click();
    await page.waitForFunction(()=>window.__movementQty===72);
    assert.equal(await page.evaluate(()=>products[0].stock),108);
    assert.match(await page.locator('#inventorySelected').innerText(),/108 Unidad/);
    await page.evaluate(()=>addToCart(products[0],1));
    await page.locator('#vCSModes [data-cmode="unit"]').waitFor({state:'visible'});
    assert.equal((await page.locator('#vCSModes [data-cmode="unit"]').innerText()).trim(),'Unidad');
    assert.match(await page.locator('#vCSQuote').innerText(),/15.00/);
    const expectedModes=[['cajon',36],['medio_cajon',18],['docena',12],['media_docena',6]];
    for(const [id,size] of expectedModes){
      assert.equal(saved.salePresentations.find(p=>p.id===id).units,size);
      await page.locator('#vCSModes [data-cmode="p:'+id+'"]').click();
      assert.match(await page.locator('#vCSQuote').innerText(),new RegExp('Stock que saldrá: '+size+' '));
    }
    await page.locator('#vCSModes [data-cmode="unit"]').click();
    await page.locator('#vCSAdd').click();
    const soldUnit=await page.evaluate(()=>({unit:cart[0].unit,price:cart[0].price,stockQtyPerSale:cart[0].stockQtyPerSale}));
    assert.equal(soldUnit.unit,'Unidad');assert.equal(soldUnit.price,15);assert.equal(soldUnit.stockQtyPerSale,1);
    await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());clearSaleCart()});
    console.log('PASS: 1 purchased carton creates 36 units; receiving 2 cartons adds 72 units; selling one unit stays S/15');

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
    await page.evaluate(()=>{
      window.__beforeMedicineProducts=products.slice();
      products.push({id:'medicine-fixture',name:'Ampicilina',category:'Medicinas',stock:1969,unit:'Caja',medicine:true,blistersPerBox:10,unitsPerBlister:10,boxPrice:60,blisterPrice:30,unitMedicinePrice:3,sellPrice:60,characteristics:[{name:'__varelia_medicine_purchase_costs_v1__',values:[{label:'box:35'},{label:'blister:3.5'},{label:'unit:0.35'}]}]});window.products=products;switchView('products');render();
    });
    for(const [label,price,mult] of [['Caja',60,100],['Blíster',30,10],['Pastilla',3,1]]){
      await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());clearSaleCart()});
      await page.locator('[data-add="medicine-fixture"]').click();
      console.log('MED_DIAGNOSTIC',label,await page.evaluate(()=>({errors:window.__medErrors,product:products.find(p=>p.id==='medicine-fixture'),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.innerText.slice(0,300)),picker:!!document.querySelector('[data-medopts]'),cart})),errors);
      await page.locator('[data-medopts]').waitFor({state:'visible'});
      assert.equal(await page.locator('#vcsDlg[open]').count(),0);
      await page.locator('[data-medopts] button').filter({hasText:new RegExp('^'+label+'S/')}).click();
      await page.waitForFunction(()=>document.getElementById('saleDialog').open);
      const item=await page.evaluate(()=>cart[0]);assert.equal(item.price,price);assert.equal(item.medicineMultiplier,mult);assert.equal(item.medicineSaleUnit,label);
    }
    await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());clearSaleCart();products=window.__beforeMedicineProducts;window.products=products;render()});
    console.log('PASS: Ampicilina catalog button ignores internal cost metadata and sells Caja, Blíster and Pastilla at configured prices');
    await page.evaluate(()=>{
      window.__scanOriginalProducts=products.slice();window.__scanOriginalScope=localStorage.getItem('varelia_active_business_id');window.__scanOriginalKey=K.products;
      localStorage.setItem('varelia_active_business_id','scanner-test');window.vareliaBusinessScope='scanner-test';K.products='miNegocio_products_v1__scanner-test';
      localStorage.setItem(K.products,JSON.stringify([{id:'stale',barcode:'0123456789012',name:'Old product',stock:0}]));
      products=[{id:'scan-current',name:'Escaneo actual',barcode:'0123456789012',stock:10,sellPrice:5,unit:'Unidad',category:'General',characteristics:[]}];window.products=products;
      window.VareliaAndroid={openScanner(which){window.__scanOpened=which}};switchView('inventory');render();
    });
    // The old native callbacks remain supported, while camera-capable phones use the web decoder.
    await page.evaluate(()=>window.VareliaNativeScanResult('inventory','123456789012'));
    await page.waitForFunction(()=>inventoryProductId==='scan-current');
    assert.match(await page.locator('#inventorySelected').innerText(),/Escaneo actual/);
    assert.equal(await page.evaluate(()=>products[0].stock),10);
    await page.evaluate(()=>{clearSaleCart();window.VareliaNativeScanResult('sale','0123456789012')});
    await page.waitForFunction(()=>cart.length===1);
    assert.equal(await page.evaluate(()=>cart[0].id),'scan-current');assert.equal(await page.evaluate(()=>cart[0].price),5);
    await page.evaluate(()=>{clearSaleCart();switchView('inventory');window.__scanOpened=null});
    await page.route('**/html5-qrcode@2.3.8/html5-qrcode.min.js',route=>{
      if(route.request().url().includes('unpkg.com'))return route.abort();
      return route.fulfill({contentType:'application/javascript',body:`window.Html5Qrcode=class {static async getCameras(){return [{id:'rear',label:'Back camera'}]}async start(camera,config,onRead){window.__cameraStarts=(window.__cameraStarts||0)+1;window.__cameraStarted=camera;window.__scanConfig=config;window.__deliverBarcode=onRead;let torch=false;const track={getCapabilities(){return window.__omitTorchCaps?{}:{torch:true}},getSettings(){return {torch}},async applyConstraints(c){if(window.__rejectTorch)throw new Error('WebView flash blocked');torch=c.torch??c.advanced?.[0]?.torch??torch;window.__physicalTorch=torch}};const video=document.createElement('video');Object.defineProperty(video,'srcObject',{value:{getVideoTracks(){return [track]}}});document.getElementById('vareliaReader').appendChild(video)}getState(){return 2}async stop(){window.__cameraStops=(window.__cameraStops||0)+1}async clear(){}}`});
    });
    await page.locator('#scanForInventory').click();
    await page.waitForFunction(()=>!!window.__deliverBarcode);
    assert.equal(await page.locator('#scannerDialog').evaluate(d=>d.open),true);assert.equal(await page.evaluate(()=>window.__scanOpened),null);assert.equal(await page.evaluate(()=>window.__scanConfig.qrbox),undefined);
    await page.evaluate(()=>{inventoryProductId=null;window.__deliverBarcode('0123456789012')});
    await page.waitForFunction(()=>inventoryProductId==='scan-current'&&!document.getElementById('scannerDialog').open);
    console.log('PASS: camera scanner recovers from primary library failure, accepts decoded barcode, selects inventory and closes');
    await page.evaluate(()=>{clearSaleCart();switchView('sales');window.__deliverBarcode=null;window.__omitTorchCaps=true});
    await page.locator('#vposScan').click();
    await page.waitForFunction(()=>!!window.__deliverBarcode);
    await page.locator('#scannerTorch').click();
    assert.equal(await page.evaluate(()=>window.__physicalTorch),true);
    const cameraBefore=await page.evaluate(()=>({starts:window.__cameraStarts,stops:window.__cameraStops||0,top:document.getElementById('vareliaReader').getBoundingClientRect().top}));
    await page.evaluate(()=>window.__deliverBarcode('0123456789012'));
    await page.waitForFunction(()=>cart.length===1);
    await page.waitForTimeout(1400);
    await page.evaluate(()=>window.__deliverBarcode('0123456789012'));
    await page.waitForFunction(()=>cart[0].qty===2);
    const cameraAfter=await page.evaluate(()=>({starts:window.__cameraStarts,stops:window.__cameraStops||0,top:document.getElementById('vareliaReader').getBoundingClientRect().top,torch:window.__physicalTorch}));
    assert.equal(cameraAfter.starts,cameraBefore.starts);assert.equal(cameraAfter.stops,cameraBefore.stops);assert.ok(Math.abs(cameraAfter.top-cameraBefore.top)<2);assert.equal(cameraAfter.torch,true);
    await page.locator('#scannerTorch').click();assert.equal(await page.evaluate(()=>window.__physicalTorch),false);
    console.log('PASS: missing torch capabilities do not disable flash; actual settings confirm on/off and two scans preserve position, stream and torch');

    assert.equal(await page.evaluate(()=>cart[0].id),'scan-current');
    assert.equal(await page.evaluate(()=>window.__scanOpened),null);
    assert.equal(await page.locator('#scannerDialog').evaluate(d=>d.open),true);
    await page.evaluate(()=>{window.__cartBeforeLayout=cart.slice();for(let i=0;i<12;i++)cart.push({...cart[0],cartKey:'pack-'+i,selectionLabel:'Six Pack',salePresentationUnits:6,price:15});window.dispatchEvent(new CustomEvent('varelia:cart-changed'))});
    assert.match(await page.locator('#scannerCartItems').innerText(),/Six Pack.*6 unidades por presentación/);
    for(const size of [{width:393,height:852},{width:360,height:640}]){
      await page.setViewportSize(size);
      const bounds=await page.evaluate(()=>{const d=document.getElementById('scannerDialog').getBoundingClientRect(),b=document.getElementById('scannerCartCheckout').getBoundingClientRect(),m=document.querySelector('#scannerDialog .modal').getBoundingClientRect(),t=document.getElementById('scannerCartTotal').getBoundingClientRect(),r=document.getElementById('vareliaReader').getBoundingClientRect();return {button:b.bottom,total:t.bottom,modal:m.bottom,dialog:d.bottom,screen:innerHeight,reader:r.height,width:b.right}});
      assert.ok(bounds.button<=Math.min(bounds.modal,bounds.dialog,bounds.screen)+1,JSON.stringify(bounds));assert.ok(bounds.total<=bounds.screen,JSON.stringify(bounds));assert.ok(bounds.reader>=80);assert.ok(bounds.width<=size.width);
    }
    assert.equal(await page.locator('#scannerDialog .vscannerStage').count(),0);
    assert.equal(await page.locator('#vareliaLargeScannerCss').count(),0);
    const cameraSize=await page.locator('#vareliaReader').boundingBox();assert.ok(cameraSize.height>=150,'camera needs usable height: '+JSON.stringify(cameraSize));
    console.log('VISUAL_SCANNER:'+(await page.screenshot({type:'jpeg',quality:50})).toString('base64'));
    await page.setViewportSize({width:393,height:852});
    await page.evaluate(()=>{cart=window.__cartBeforeLayout;window.dispatchEvent(new CustomEvent('varelia:cart-changed'))});
    console.log('PASS: scanner cart keeps total and Cobrar visible at 393x852 and 360x640 with twelve items; package labels are distinct');
    await page.locator('#scannerCartCheckout').click();
    await page.waitForFunction(()=>document.getElementById('saleDialog').open);
    console.log('PASS: quick checkout uses updateable full-frame camera inside existing APK, decoded barcode reaches cart and Cobrar opens checkout');
    await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());window.__rejectTorch=true;window.__scanOpened=null;window.__deliverBarcode=null;switchView('sales')});
    await page.locator('#vposScan').click();await page.waitForFunction(()=>!!window.__deliverBarcode);
    await page.locator('#scannerTorch').click();
    await page.waitForFunction(()=>!document.getElementById('scannerTorch').disabled);
    assert.match(await page.locator('#scannerTorch').innerText(),/Usar lector con linterna/);
    const cartBeforeNative=await page.evaluate(()=>JSON.stringify(cart));
    await page.locator('#scannerTorch').click();
    await page.waitForFunction(()=>window.__scanOpened==='sale');
    assert.equal(await page.evaluate(()=>JSON.stringify(cart)),cartBeforeNative);
    assert.equal(await page.locator('#scannerDialog').evaluate(d=>d.open),false);
    await page.evaluate(()=>{window.__rejectTorch=false});
    console.log('PASS: blocked WebView flash offers original Android scanner, stops web camera and preserves cart when switching');


    await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());clearSaleCart();delete window.VareliaAndroid;products=window.__scanOriginalProducts;window.products=products;localStorage.removeItem(K.products);K.products=window.__scanOriginalKey;if(window.__scanOriginalScope)localStorage.setItem('varelia_active_business_id',window.__scanOriginalScope);else localStorage.removeItem('varelia_active_business_id');window.vareliaBusinessScope=window.__scanOriginalScope||'';render()});
    console.log('PASS: mobile native scanner selects current inventory and adds a sale; UPC/EAN leading zero matches without replacing live products with stale storage');
    await page.evaluate(()=>{openProduct();document.getElementById('productName').value='Borrador conservado';document.getElementById('sellPrice').value='19';window.VareliaNativeScanResult('product','7750670313537')});
    await page.waitForFunction(()=>document.getElementById('barcode').value==='7750670313537');
    assert.equal(await page.locator('#productName').inputValue(),'Borrador conservado');assert.equal(await page.locator('#sellPrice').inputValue(),'19');
    await page.evaluate(()=>document.getElementById('productDialog').close());
    console.log('PASS: scanning a product barcode keeps draft name and price and does not wait for external product lookup');

    await page.evaluate(()=>{switchView('products');products.push({id:'label-fixture',name:'Zanahoria',barcode:'7750670313537',sellPrice:3,stock:1,unit:'Unidad'});window.products=products;window.VareliaAndroid={printHtmlDocument(title,html){window.__labelPrint={title,html}}};render()});
    await page.locator('#btPrinterBtn').click();
    await page.locator('#btPrintHelp').waitFor({state:'visible'});
    assert.match(await page.locator('#btPrintHelp').innerText(),/servicio de impresión compatible/);
    await page.locator('#btPrintHelp button').click();
    await page.locator('#bcToolbar button').first().click();
    const labelRow=page.locator('.bc-row[data-id="label-fixture"]');
    await labelRow.locator('input').fill('3');await labelRow.locator('.bc-print').click();
    await page.waitForFunction(()=>!!window.__labelPrint);
    assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('/vendor/JsBarcode.all.min.js'))),true);
    const labelDoc=await page.evaluate(()=>window.__labelPrint);
    const preview=await browser.newPage({viewport:{width:393,height:852}});
    await preview.setContent(labelDoc.html);
    assert.equal(await preview.locator('.label').count(),3);
    const dimensions=await preview.locator('.label').first().boundingBox();assert.ok(dimensions.height>110&&dimensions.height<116,JSON.stringify(dimensions));
    assert.match(await preview.locator('.label').first().innerText(),/Zanahoria.*S\/ 3.00/s);
    await preview.close();
    await page.locator('#bcPaper').selectOption('letter');
    await page.locator('#bcLabelSize').selectOption('40x30');
    assert.match(await page.locator('#bcPrintSummary').innerText(),/4 etiquetas por fila/);
    await page.evaluate(()=>window.__labelPrint=null);await labelRow.locator('.bc-print').click();await page.waitForFunction(()=>!!window.__labelPrint);
    assert.match(await page.evaluate(()=>window.__labelPrint.html),/size:letter/);
    await page.locator('#bcPaper').selectOption('roll58');
    await page.locator('#bcLabelSize').selectOption('50x30');
    assert.match(await page.locator('#bcPrintSummary').innerText(),/Una etiqueta de 50 × 30 mm/);
    await page.evaluate(()=>window.__labelPrint=null);await labelRow.locator('.bc-print').click();await page.waitForFunction(()=>!!window.__labelPrint);
    const rollHtml=await page.evaluate(()=>window.__labelPrint.html);
    assert.match(rollHtml,/size:58mm 30mm/);
    const rollPreview=await browser.newPage();await rollPreview.setContent(rollHtml);
    const rollPdf=await rollPreview.pdf({preferCSSPageSize:true});
    assert.equal((rollPdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,3);
    await rollPreview.close();
    await page.locator('#bcLabelSize').selectOption('100x50');
    assert.match(await page.locator('#bcPrintSummary').innerText(),/no cabe/);
    await page.evaluate(()=>window.__labelPrint=null);
    const rejected=page.waitForEvent('dialog').then(async d=>{assert.match(d.message(),/no cabe/);await d.accept()});
    await labelRow.locator('.bc-print').click();await rejected;
    assert.equal(await page.evaluate(()=>window.__labelPrint),null);
    await page.locator('#bcPaper').selectOption('rollCustom');await page.locator('#bcRollWidth').fill('100');
    assert.match(await page.locator('#bcPrintSummary').innerText(),/rollo de 100 mm/);
    await page.locator('#bcPaper').selectOption('a4');await page.locator('#bcLabelSize').selectOption('50x30');
    assert.equal(await page.evaluate(()=>products.find(p=>p.id==='label-fixture').barcode),'7750670313537');
    await page.evaluate(()=>{window.VareliaAndroid={openExternal(url){window.__externalLabelUrl=url}};window.__labelPrint=null});
    await labelRow.locator('.bc-print').click();
    await page.waitForFunction(()=>!!window.__externalLabelUrl);
    const externalUrl=await page.evaluate(()=>window.__externalLabelUrl);
    assert.ok(externalUrl.includes('/imprimir-etiquetas.html#'));
    const externalPreview=await browser.newPage({viewport:{width:393,height:852}});
    await externalPreview.addInitScript(()=>{window.print=()=>{window.__printInvoked=true}});
    await externalPreview.goto(externalUrl,{waitUntil:'load'});
    await externalPreview.waitForFunction(()=>!document.getElementById('print').disabled);
    assert.equal(await externalPreview.locator('.label').count(),3);
    assert.match(await externalPreview.locator('#status').innerText(),/3 etiqueta/);
    await externalPreview.locator('#print').click();
    assert.equal(await externalPreview.evaluate(()=>window.__printInvoked),true);
    const imageDownload=externalPreview.waitForEvent('download');
    await externalPreview.locator('#download').click();const downloaded=await imageDownload;
    assert.equal(downloaded.suggestedFilename(),'codigo-zanahoria.png');
    const downloadedPng=fs.readFileSync(await downloaded.path());assert.equal(downloadedPng.subarray(1,4).toString(),'PNG');
    assert.equal(downloadedPng.readUInt32BE(16),1400);assert.equal(downloadedPng.readUInt32BE(20),760);

    await externalPreview.close();
    assert.equal(await labelRow.locator('.bc-print').isEnabled(),true);
    await page.evaluate(()=>{window.VareliaAndroid={saveDataUrl(data,name){window.__nativePng={data,name}}}});
    await labelRow.locator('.bc-img').click();await page.waitForFunction(()=>!!window.__nativePng);
    const nativeImage=await page.evaluate(()=>window.__nativePng);
    assert.equal(nativeImage.name,'codigo-zanahoria.png');assert.ok(nativeImage.data.startsWith('data:image/png;base64,'));
    const nativeBytes=Buffer.from(nativeImage.data.split(',')[1],'base64');assert.equal(nativeBytes.subarray(1,4).toString(),'PNG');assert.equal(nativeBytes.readUInt32BE(16),1400);
    assert.equal(await labelRow.locator('input').inputValue(),'3');
    console.log('PASS: PNG uses Android saveDataUrl without WebView download manager; external browser downloads a valid 1400x760 PNG and copy count stays intact');
    await page.locator('.bc-close').click();
    await page.evaluate(()=>{delete window.VareliaAndroid;products=products.filter(p=>p.id!=='label-fixture');window.products=products;render()});
    console.log('PASS: printing loads actual barcode generator locally with external CDNs blocked; native bridge receives copies and paper settings; old APK opens standalone browser label page and its print button invokes printing');
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
    await page.evaluate(()=>{
      const sb=window.vareliaSupabase,existing=products[0];
      window.__syncSessionReader=sb.auth.getSession;window.__syncFrom=sb.from;window.__syncRpc=sb.rpc;
      window.__failSync=true;
      sb.auth.getSession=()=>new Promise(()=>{}); // Reproduce the Android session-read hang.
      const expires=Math.floor(Date.now()/1000)+3600;
      const token='header.'+btoa(JSON.stringify({sub:'qa-owner',exp:expires})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')+'.signature';
      localStorage.setItem('qa-session-cache',JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:expires,user:{id:'qa-owner'}}));
      window.VareliaSessionState.attach(sb,{key:'qa-session-cache'});

      window.vareliaCurrentUserProfile={id:'qa-owner',business_id:'qa-business',role:'owner'};
      products.push({id:'offline-new',name:'Pendiente local',category:'General',stock:3,unit:'Unidad',buyPrice:1,sellPrice:2});window.products=products;
      const remote={id:'00000000-0000-4000-8000-000000000010',legacy_id:existing.id,name:existing.name,unit:'Unidad',stock:existing.stock,sell_price:15,buy_price:120/36,updated_at:'2026-10-23T00:00:00Z',category_id:'qa-cat'};
      sb.from=table=>{let q;q=new Proxy({}, {get(_t,key){if(key==='then')return resolve=>Promise.resolve(window.__failSync?{data:null,error:{message:'TEST: red no responde'}}:{error:null,data:table==='varelia_products'?[remote]:table==='varelia_categories'?[{id:'qa-cat',name:'General'}]:[]}).then(resolve);return ()=>q}});return q};
      sb.rpc=()=>new Promise(()=>{}); // Public stock maintenance must not delay reconnection.
      window.vareliaSetCloudStatus('☁️ Error de prueba',true);
    });
    await page.locator('#cloudStatus').click();
    await page.waitForFunction(()=>document.getElementById('cloudStatus').dataset.syncing==='0');
    assert.match(await page.locator('#cloudStatus').innerText(),/TEST: red no responde/);
    assert.equal(await page.evaluate(()=>products.some(p=>p.id==='offline-new')),true);
    await page.evaluate(()=>{window.__failSync=false});
    await page.locator('#cloudStatus').click();
    await page.waitForFunction(()=>document.getElementById('cloudStatus').textContent.includes('Conectado'),{},{timeout:5000});
    assert.equal(await page.evaluate(()=>products.some(p=>p.id==='offline-new')),true);
    await page.evaluate(()=>{
      const sb=window.vareliaSupabase;sb.auth.getSession=window.__syncSessionReader;sb.from=window.__syncFrom;sb.rpc=window.__syncRpc;
    });
    console.log('PASS: even with a stalled SDK session reader, a valid shared session reconnects; failed reads preserve local products and never show connected');




    await page.evaluate(()=>{
      const sb=window.vareliaSupabase;window.__sellerHistoryReads=[];
      sb.auth.getUser=async()=>({data:{user:{id:'qa-owner',email:'owner@example.test'}},error:null});
      sb.functions={invoke:async()=>({data:{sellers:[{id:'qa-seller',full_name:'Caja 2',email:'seller@example.test',permissions:{sales:true}}]},error:null})};
      sb.from=table=>{const filters=[],q={};let range=[0,50];
        for(const method of ['select','order','abortSignal','limit'])q[method]=()=>q;
        q.eq=(k,v)=>{filters.push([k,v]);return q};q.gte=(k,v)=>{filters.push([k,v]);return q};q.lt=(k,v)=>{filters.push([k,v]);return q};q.in=(k,v)=>{filters.push([k,v]);return q};q.range=(a,b)=>{range=[a,b];return q};
        const result=()=>{if(table==='profiles')return {data:{id:'qa-owner',business_id:'qa-business',role:'owner',full_name:'Dueña',permissions:{}},error:null};
          if(table==='varelia_sales'){
            if(!filters.some(([k,v])=>k==='business_id'&&v==='qa-business')||!filters.some(([k,v])=>k==='created_by'&&v==='qa-seller'))throw Error('Missing seller/business scope');
            window.__sellerHistoryReads.push({table,filters,range});return {data:Array.from({length:52},(_,i)=>({id:'seller-sale-'+i,total:15,created_by:'qa-seller',created_at:new Date().toISOString()})).slice(range[0],range[1]+1),error:null};
          }
          if(table==='varelia_sale_details'){if(!filters.some(([k,v])=>k==='seller_id'&&v==='qa-seller'))throw Error('Missing receipt seller scope');const ids=filters.find(([k,v])=>k==='sale_id'&&Array.isArray(v))?.[1];return {data:ids?ids.filter(id=>id!=='seller-sale-0').map(id=>({sale_id:id,receipt:{items:[{name:'Vaporera',qty:1,price:15}],paymentMethod:id==='seller-sale-1'?'Fiado':'Mixto',paymentBreakdown:id==='seller-sale-1'?{}:{Efectivo:10,Yape:5}}})):[{receipt:{items:[{name:'Vaporera',qty:1,price:15,subtotal:15}],paymentMethod:'Efectivo'}}],error:null}}
          return {data:[],error:null};};q.then=(resolve,reject)=>Promise.resolve().then(result).then(resolve,reject);q.maybeSingle=async()=>result();return q;
      };
      window.dispatchEvent(new Event('varelia:account-isolation-ready'));
    });
    await page.locator('.premiumSellersItem').waitFor({state:'attached'});
    await page.locator('.premiumSellersItem').evaluate(b=>b.click());
    await page.locator('[data-seller-history]').waitFor({state:'visible'});
    await page.locator('[data-seller-history]').click();
    await page.locator('[data-hticket]').first().waitFor({state:'visible'});
    assert.match(await page.locator('#vsellerHistory').innerText(),/Caja 2/);
    assert.equal(await page.locator('[data-hticket]').count(),50);
    assert.match(await page.locator('[data-hsummary]').innerText(),/52 ventas.*S\/ 780.00/s);
    assert.match(await page.locator('[data-hpayment="Efectivo"]').innerText(),/500.00/);
    assert.match(await page.locator('[data-hpayment="Yape"]').innerText(),/250.00/);
    assert.match(await page.locator('[data-hpayment="Fiado"]').innerText(),/15.00/);
    assert.match(await page.locator('[data-hpayment="Sin registrar"]').innerText(),/15.00/);
    console.log('VISUAL_SELLER_HISTORY:'+(await page.screenshot({type:'jpeg',quality:50})).toString('base64'));
    await page.locator('[data-hdate]').fill('2026-10-13');
    await page.waitForFunction(()=>window.__sellerHistoryReads.some(r=>r.filters.some(([k,v])=>k==='created_at'&&String(v).includes('2026-10-13'))));
    assert.equal(await page.locator('[data-hdate]').inputValue(),'2026-10-13');

    await page.locator('[data-hperiod="all"]').click();
    await page.waitForFunction(()=>window.__sellerHistoryReads.some(r=>!r.filters.some(([k])=>k==='created_at')));
    await page.locator('[data-hnext]').click();
    await page.waitForFunction(()=>document.querySelectorAll('[data-hticket]').length===2);
    await page.locator('[data-hticket]').first().click();
    await page.waitForFunction(()=>window.__vareliaCurrentReceiptSale?.id==='seller-sale-50');
    assert.equal(await page.evaluate(()=>window.__vareliaCurrentReceiptSale.sellerName),'Caja 2');
    assert.equal(await page.locator('#vsellerHistory').evaluate(d=>d.open),false);
    console.log('PASS: seller history calendar uses day boundaries; full-period summary totals 52 sales across pages, splits mixed cash/Yape, distinguishes credit and missing payments, and opens matching ticket');

    await page.evaluate(()=>{
      window.__logoutCalls=0;window.vareliaSupabase.auth.signOut=()=>{window.__logoutCalls++;return new Promise(r=>window.__releaseLogout=r)};
      document.getElementById('vareliaLogout').click();
    });
    await page.waitForFunction(()=>!!window.__releaseLogout);
    assert.equal(await page.evaluate(()=>window.__logoutCalls),1);
    await page.evaluate(()=>window.__releaseLogout({error:{message:'QA logout network failure'}}));
    await page.waitForFunction(()=>!document.getElementById('vareliaLogout').disabled);
    assert.equal(await page.evaluate(()=>window.vareliaCurrentUserProfile?.id),'qa-owner');
    await page.evaluate(()=>{window.vareliaSupabase.auth.signOut=async()=>{window.__logoutCalls++;return {error:null}};document.getElementById('vareliaLogout').click()});
    await page.waitForFunction(()=>window.vareliaCurrentUserProfile===null);
    assert.equal(await page.evaluate(()=>window.__logoutCalls),2);
    assert.equal(await page.evaluate(()=>products.length+cart.length+sales.length),0);
    assert.ok(!page.url().includes('/login.html'));
    console.log('PASS: logout coalesces two UI handlers into one SDK request; failed logout preserves account; successful logout clears visible data without a nonexistent redirect');
    await page.waitForTimeout(500);
    assert.deepEqual(errors,[]);
    console.log('PASS: app scripts load without uncaught browser errors');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
