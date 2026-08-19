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
  if(typeof productForm!=='undefined')productForm.onsubmit=async e=>{e.preventDefault();const id=productId.value,old=products.find(p=>p.id===id),newId=id||uid();let img='';if(!imagePreview.hidden&&imagePreview.src)img=imagePreview.src;const obj={id:newId,barcode:barcode.value.trim(),name:productName.value.trim(),category:productCategory.value,buyPrice:+buyPrice.value||0,sellPrice:+sellPrice.value||0,stock:old?+old.stock||0:0,unit:unit.value,reorderLevel:Math.max(0,Math.floor(+reorderLevel.value||0)),description:description.value,image:img};try{if(img)await putImage(newId,img);else await deleteImage(newId)}catch(e){console.warn(e)};old?Object.assign(old,obj):products.push(obj);productDialog.close();safeSave()};
  if(typeof productGrid!=='undefined')productGrid.addEventListener('click',e=>{const id=e.target?.dataset?.delete;if(id)deleteImage(id).catch(()=>{})},true);
  window.addEventListener('pagehide',()=>{try{localStorage.setItem(K.products,JSON.stringify(compactProducts()))}catch{}});
  migrateAndHydrate();
})();

(()=>{
  const VIEW_KEY='miNegocio_lastView_v1';
  const validViews=['products','inventory','categories','suppliers','purchases','sales','cash','appearance'];
  function remember(view){if(validViews.includes(view)){try{localStorage.setItem(VIEW_KEY,view)}catch{}}}
  document.querySelectorAll('.nav [data-view]').forEach(btn=>{
    btn.addEventListener('click',()=>remember(btn.dataset.view));
  });
  const originalSwitchView=typeof switchView==='function'?switchView:null;
  if(originalSwitchView){
    window.switchView=function(view){remember(view);return originalSwitchView(view)};
  }
  let saved='products';
  try{saved=localStorage.getItem(VIEW_KEY)||'products'}catch{}
  if(!validViews.includes(saved))saved='products';
  setTimeout(()=>{
    if(typeof switchView==='function')switchView(saved);
    else{
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===saved));
      document.querySelectorAll('.nav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===saved));
      if((saved==='suppliers'||saved==='purchases')&&typeof supplierGroup!=='undefined')supplierGroup.classList.add('open');
    }
  },0);
})();