(()=>{if(document.getElementById('vareliaProductsPolish'))return;const s=document.createElement('style');s.id='vareliaProductsPolish';s.textContent=`
@media(max-width:980px){
  .top{padding:6px 9px!important}
  .brand{min-height:40px!important;gap:7px!important}
  .left{gap:7px!important}
  .menu,.logo{width:36px!important;height:36px!important;border-radius:11px!important}
  .menu{font-size:19px!important}
  .brand h1{font-size:16px!important;line-height:1.05!important}
  .brand .meta{font-size:9px!important;line-height:1.15!important;margin-top:2px!important}
  #cloudStatus{font-size:9px!important;margin-left:3px!important}
  #newSaleTop{min-height:36px!important;padding:7px 11px!important;border-radius:11px!important;font-size:11px!important}
  .content{padding:13px 10px 78px!important}
  #products .head{display:flex!important;flex-direction:row!important;align-items:flex-start!important;gap:8px!important;margin-bottom:7px!important}
  #products .head>div:first-child{min-width:0!important;flex:1!important}
  #products .head h2{font-size:20px!important;line-height:1.05!important;margin:0 0 2px!important}
  #products .head .notice{font-size:10px!important;line-height:1.25!important;margin:0!important}
  #products>.flowRole{display:none!important}
  #products .catalogHeadActions{display:flex!important;width:auto!important;gap:5px!important;margin:0!important}
  #products .catalogHeadActions .btn,#publicCatalogBtn,#newProduct{min-height:34px!important;height:34px!important;padding:6px 9px!important;border-radius:10px!important;font-size:10px!important;line-height:1!important}
  #products .toolbar{margin:6px 0!important}
  #products .toolbar input{min-height:38px!important;height:38px!important;padding:8px 11px!important;border-radius:11px!important;font-size:12px!important}
  #bcToolbar{display:flex!important;gap:5px!important;margin:5px 0 7px!important;align-items:center!important;flex-wrap:wrap!important}
  #bcToolbar button{min-height:34px!important;height:34px!important;padding:6px 10px!important;border-radius:10px!important;font-size:10px!important}
  #btPrinterBtn{min-height:34px!important;height:34px!important;padding:6px 9px!important;border-radius:10px!important;font-size:10px!important}
  .bt-print-status{margin:2px 0 6px!important;padding:3px 5px!important;font-size:9px!important}
  #productViewBar{display:grid!important;grid-template-columns:1fr!important;gap:0!important;margin:4px 0 7px!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
  #productViewBar .productViewLabel{display:none!important}
  #productViewBar .productViewButtons{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;width:100%!important;margin:0!important}
  #productViewBar .productViewBtn{min-height:30px!important;height:30px!important;padding:4px 4px!important;border-radius:9px!important;font-size:9px!important;justify-content:center!important}
  #products .chips{gap:5px!important;margin:5px 0 8px!important;padding:0 0 1px!important;overflow-x:auto!important;flex-wrap:nowrap!important}
  #products .chip{padding:6px 10px!important;min-height:30px!important;border-radius:999px!important;font-size:10px!important;white-space:nowrap!important}
  #productGrid{gap:8px!important}
  #productGrid .pb{padding:9px!important}
  #productGrid .pb h3{font-size:13px!important}
  #productGrid .meta{font-size:9px!important}
  #productGrid .price,#productGrid .price *{font-size:19px!important}
  #productGrid .actions{gap:4px!important;margin-top:7px!important}
  #productGrid .actions .btn{min-height:32px!important;padding:5px 6px!important;font-size:9px!important;border-radius:9px!important}
  #vmobileNav{height:68px!important;padding-top:4px!important;padding-bottom:calc(4px + env(safe-area-inset-bottom))!important}
  #vmobileNav button{font-size:8px!important;gap:2px!important;padding:4px 1px!important}
  #vmobileNav button span{font-size:23px!important;line-height:1!important}
}
@media(max-width:380px){
  .brand h1{font-size:15px!important}
  #newSaleTop{padding-inline:8px!important;font-size:10px!important}
  #products .head h2{font-size:19px!important}
  #products .catalogHeadActions .btn,#publicCatalogBtn,#newProduct{padding-inline:7px!important;font-size:9px!important}
}
`;document.head.appendChild(s)})();();

(()=>{const section=document.getElementById('products');const grid=document.getElementById('productGrid');if(section&&grid&&!document.getElementById('productViewBar')){const toolbar=section.querySelector('.toolbar');const bar=document.createElement('div');bar.id='productViewBar';bar.className='productViewBar';bar.innerHTML='<span class="productViewLabel">Ver productos como</span><div class="productViewButtons"><button type="button" class="productViewBtn" data-product-view="list">☰ Lista</button><button type="button" class="productViewBtn" data-product-view="grid">▦ Cuadrícula</button><button type="button" class="productViewBtn" data-product-view="compact">▥ Compacta</button></div>';toolbar.insertAdjacentElement('afterend',bar);const key='miNegocio_productView_v1';const valid=['list','grid','compact'];function apply(mode){if(!valid.includes(mode))mode='grid';grid.classList.remove('view-list','view-grid','view-compact');grid.classList.add('view-'+mode);bar.querySelectorAll('[data-product-view]').forEach(b=>b.classList.toggle('active',b.dataset.productView===mode));try{localStorage.setItem(key,mode)}catch{}}bar.addEventListener('click',e=>{const b=e.target.closest('[data-product-view]');if(b)apply(b.dataset.productView)});let saved='grid';try{saved=localStorage.getItem(key)||'grid'}catch{}apply(saved)}})();

(()=>{
  if(typeof products==='undefined'||typeof K==='undefined') return;
  const DB_NAME='miNegocioDB', DB_VERSION=1, STORE='productImages';
  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function putImage(id,data){if(!id||!data)return;const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(data,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
  async function getImage(id){const db=await openDB();const value=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result||'');req.onerror=()=>reject(req.error)});db.close();return value}
  async function deleteImage(id){const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
  function compactProducts(){return products.map(p=>{const copy={...p};delete copy.image;return copy})}
  function safeSave(){try{localStorage.setItem(K.products,JSON.stringify(compactProducts()));for(const [k,v] of [[K.categories,categories],[K.sales,sales],[K.closures,closures],[K.cashStart,cashStart],[K.movements,movements],[K.suppliers,suppliers],[K.purchases,purchases]])localStorage.setItem(k,JSON.stringify(v));render();return true}catch(err){console.error('No se pudo guardar',err);alert('No se pudo guardar el cambio. El almacenamiento del navegador está lleno.');return false}}
  save=safeSave;
  async function migrateAndHydrate(){let changed=false;for(const p of products){if(p.image&&typeof p.image==='string'&&p.image.startsWith('data:')){try{await putImage(p.id,p.image);changed=true}catch(e){console.warn(e)}}}if(changed){try{localStorage.setItem(K.products,JSON.stringify(compactProducts()))}catch(e){console.warn(e)}}for(const p of products){if(!p.image){try{p.image=await getImage(p.id)}catch(e){}}}render()}
  if(typeof productForm!=='undefined')productForm.onsubmit=async e=>{e.preventDefault();const id=productId.value,old=products.find(p=>p.id===id),newId=id||uid();let img='';if(!imagePreview.hidden&&imagePreview.src)img=imagePreview.src;const obj={id:newId,barcode:barcode.value.trim(),name:productName.value.trim(),category:productCategory.value,buyPrice:+buyPrice.value||0,sellPrice:+sellPrice.value||0,stock:(document.getElementById('vMedicineToggle')?.checked?Math.max(0,Math.floor(Number(document.getElementById('vMedicineStockBoxes')?.value||0)))*Math.max(1,Math.floor(Number(document.getElementById('vMedicineBlistersPerBox')?.value||1)))*Math.max(1,Math.floor(Number(document.getElementById('vMedicineUnitsPerBlister')?.value||1))):(old?+old.stock||0:0)),unit:unit.value,reorderLevel:Math.max(0,Math.floor(+reorderLevel.value||0)),description:String(old?.description||''),medicine:document.getElementById('vMedicineToggle')?.checked||false,laboratory:String(document.getElementById('vMedicineLaboratory')?.value||old?.laboratory||'').trim(),medicinePresentation:String(document.getElementById('vMedicinePresentation')?.value||old?.medicinePresentation||'').trim(),batch:String(document.getElementById('vMedicineBatch')?.value||old?.batch||'').trim(),expiryDate:String(document.getElementById('vMedicineExpiry')?.value||old?.expiryDate||'').trim(),blistersPerBox:Math.max(1,Math.floor(Number(document.getElementById('vMedicineBlistersPerBox')?.value||old?.blistersPerBox||1))),unitsPerBlister:Math.max(1,Math.floor(Number(document.getElementById('vMedicineUnitsPerBlister')?.value||old?.unitsPerBlister||1))),boxPrice:Number(document.getElementById('vMedicineBoxPrice')?.value||old?.boxPrice||0),blisterPrice:Number(document.getElementById('vMedicineBlisterPrice')?.value||old?.blisterPrice||0),unitMedicinePrice:Number(document.getElementById('vMedicineUnitPrice')?.value||old?.unitMedicinePrice||0),medicineStockBoxes:Math.max(0,Math.floor(Number(document.getElementById('vMedicineStockBoxes')?.value||old?.medicineStockBoxes||0))),variants:String(document.getElementById('vProductVariants')?.value||old?.variants||'').trim(),specifications:String(document.getElementById('productSpecifications')?.value||old?.specifications||'').trim(),image:img};try{if(img)await putImage(newId,img);else await deleteImage(newId)}catch(e){console.warn(e)};old?Object.assign(old,obj):products.push(obj);safeSave();try{if(typeof window.syncProductToCloud==='function')await window.syncProductToCloud(obj)}catch(err){console.error('Barcode cloud save',err);window.vareliaToast?.('No se pudo guardar el producto en la nube.','warn');return}productDialog.close();window.vareliaToast?.('Producto guardado correctamente.','ok')};
  if(typeof productGrid!=='undefined')productGrid.addEventListener('click',e=>{const id=e.target?.dataset?.delete;if(id)deleteImage(id).catch(()=>{})},true);
  window.addEventListener('pagehide',()=>{try{localStorage.setItem(K.products,JSON.stringify(compactProducts()))}catch{}});
  migrateAndHydrate();
})();

(()=>{
  const VIEW_KEY='miNegocio_lastView_v3';
  const valid=['products','inventory','categories','suppliers','purchases','sales','cash','appearance'];
  const toHash={products:'productos',inventory:'inventario',categories:'categorias',suppliers:'proveedores',purchases:'mercaderia',sales:'ventas',cash:'caja',appearance:'apariencia'};
  const fromHash=Object.fromEntries(Object.entries(toHash).map(([k,v])=>[v,k]));
  function saveView(view){if(!valid.includes(view))return;try{localStorage.setItem(VIEW_KEY,view)}catch{}try{sessionStorage.setItem(VIEW_KEY,view)}catch{}const hash=toHash[view];if(hash&&location.hash!=='#'+hash){try{history.replaceState(null,'',location.pathname+location.search+'#'+hash)}catch{}}}
  function wantedView(){let v=fromHash[(location.hash||'').slice(1)];if(!v){try{v=sessionStorage.getItem(VIEW_KEY)}catch{}}if(!v){try{v=localStorage.getItem(VIEW_KEY)}catch{}}return valid.includes(v)?v:'products'}
  function forceView(view){if(!valid.includes(view))return;document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===view));document.querySelectorAll('.nav [data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));const group=document.getElementById('supplierGroup');if(group&&(view==='suppliers'||view==='purchases'))group.classList.add('open')}
  document.addEventListener('click',e=>{const btn=e.target.closest('.nav [data-view]');if(!btn)return;saveView(btn.dataset.view);setTimeout(()=>forceView(btn.dataset.view),0)},true);
  const restore=()=>{const v=wantedView();forceView(v);saveView(v)};window.addEventListener('pageshow',restore);window.addEventListener('hashchange',restore);restore();setTimeout(restore,0);setTimeout(restore,80);setTimeout(restore,250);setTimeout(restore,700);
})();

(()=>{const loadAuth=()=>{if(window.vareliaSupabase||document.getElementById('vareliaSupabaseAuthLoader'))return;const auth=document.createElement('script');auth.id='vareliaSupabaseAuthLoader';auth.src='supabase-auth.js?v=20261001-4';auth.onload=()=>{const enh=document.createElement('script');enh.src='auth-enhancements.js?v=20260819-1';document.body.appendChild(enh)};document.body.appendChild(auth)};if(window.supabase){loadAuth();return}if(document.getElementById('vareliaSupabaseLoader'))return;const sdk=document.createElement('script');sdk.id='vareliaSupabaseLoader';sdk.src='https://unpkg.com/@supabase/supabase-js@2';sdk.onload=loadAuth;document.head.appendChild(sdk)})();

(()=>{if(!document.getElementById('vareliaProfessionalCss')){const l=document.createElement('link');l.id='vareliaProfessionalCss';l.rel='stylesheet';l.href='app-professional.css?v=20260819-2';document.head.appendChild(l)}if(!document.getElementById('vareliaProfessionalJs')){const p=document.createElement('script');p.id='vareliaProfessionalJs';p.src='app-professional-20260930-17.js?v=20260930-account-stable-1';document.body.appendChild(p)}if(!document.getElementById('vareliaBusinessNameLoader')){const n=document.createElement('script');n.id='vareliaBusinessNameLoader';n.src='business-name.js?v=20260819-3';document.body.appendChild(n)}setTimeout(()=>{if(!document.getElementById('vareliaBluetoothPrinter')){const b=document.createElement('script');b.id='vareliaBluetoothPrinter';b.src='bluetooth-printer.js?v=20260929-11';document.body.appendChild(b)}},500)})();