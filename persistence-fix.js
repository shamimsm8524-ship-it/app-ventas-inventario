(() => {
  const BASE_KEYS={products:'miNegocio_products_v1',categories:'miNegocio_categories_v1',sales:'miNegocio_sales_v1',closures:'miNegocio_closures_v1',cashStart:'miNegocio_cashStart_v1',theme:'miNegocio_theme_v1',movements:'miNegocio_movements_v1',suppliers:'miNegocio_suppliers_v1',purchases:'miNegocio_purchases_v1'};
  const scope=(localStorage.getItem('varelia_active_business_id')||'').trim();
  const ownerKey='varelia_legacy_owner_scope';
  let legacyOwner=localStorage.getItem(ownerKey)||'';
  const scopedStorageKey=base=>scope?`${base}__${scope}`:base;

  if(scope){
    if(!legacyOwner){legacyOwner=scope;localStorage.setItem(ownerKey,scope)}
    if(legacyOwner===scope){
      for(const base of Object.values(BASE_KEYS)){
        const sk=scopedStorageKey(base);
        if(localStorage.getItem(sk)==null&&localStorage.getItem(base)!=null){
          localStorage.setItem(sk,localStorage.getItem(base));
        }
      }
    }
    for(const [name,base] of Object.entries(BASE_KEYS)) K[name]=scopedStorageKey(base);
    try{
      products=load(K.products,[]);
      categories=load(K.categories,[]);
      sales=load(K.sales,[]);
      closures=load(K.closures,[]);
      cashStart=load(K.cashStart,new Date().toISOString());
      theme=load(K.theme,{color:'#be185d',dark:false,updatedAt:0});
      movements=load(K.movements,[]);
      suppliers=load(K.suppliers,[]);
      purchases=load(K.purchases,[]);
      if(typeof applyTheme==='function')applyTheme();
      if(typeof render==='function')render();
    }catch(e){console.warn('No se pudo cargar el espacio del negocio',e)}
  }

  const DB_NAME='miNegocioDB';
  const DB_VERSION=1;
  const STORE='productImages';
  const scopedImageKey=id=>scope?`${scope}:${String(id)}`:String(id);

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function putRaw(key,data){
    if(key===undefined||key===null||!data)return;
    const db=await openDB();
    await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(data,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
    db.close();
  }
  async function getRaw(key){
    if(key===undefined||key===null)return'';
    const db=await openDB();
    const value=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result||'');req.onerror=()=>reject(req.error)});
    db.close();return value;
  }
  async function deleteRaw(key){
    if(key===undefined||key===null)return;
    const db=await openDB();
    await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
    db.close();
  }
  async function putImage(id,data){if(id&&data)await putRaw(scopedImageKey(id),data)}
  async function getImage(id){
    if(!id)return'';
    const own=scopedImageKey(id);
    try{const value=await getRaw(own);if(value)return value}catch{}
    if(scope&&legacyOwner===scope){
      const candidates=[id,String(id)];const n=Number(id);if(Number.isFinite(n))candidates.push(n);
      const seen=new Set();
      for(const key of candidates){
        const mark=typeof key+':'+String(key);if(seen.has(mark))continue;seen.add(mark);
        try{const value=await getRaw(key);if(value){await putRaw(own,value);return value}}catch{}
      }
    }
    return'';
  }
  async function deleteImage(id){if(id)try{await deleteRaw(scopedImageKey(id))}catch{}}

  function compactProducts(){return products.map(p=>{const copy={...p};delete copy.image;return copy})}
  function safeSave(){
    try{
      localStorage.setItem(K.products,JSON.stringify(compactProducts()));
      for(const [k,v] of [[K.categories,categories],[K.sales,sales],[K.closures,closures],[K.cashStart,cashStart],[K.movements,movements],[K.suppliers,suppliers],[K.purchases,purchases]])localStorage.setItem(k,JSON.stringify(v));
      if(typeof render==='function')render();
    }catch(err){console.error('No se pudo guardar',err);alert('No se pudo guardar el cambio. Libera un poco de espacio del navegador y vuelve a intentarlo.')}
  }
  save=safeSave;

  async function migrateAndHydrate(){
    let changed=false;
    for(const p of products){
      if(p.image&&typeof p.image==='string'&&p.image.startsWith('data:')){try{await putImage(p.id,p.image);changed=true}catch{}}
    }
    if(changed)try{localStorage.setItem(K.products,JSON.stringify(compactProducts()))}catch{}
    for(const p of products){
      if(!p.image){try{const restored=await getImage(p.id);if(restored)p.image=restored}catch{}}
    }
    if(typeof render==='function')render();
  }

  if(typeof productForm!=='undefined'){
    productForm.onsubmit=async e=>{
      e.preventDefault();
      const id=productId.value;
      const old=products.find(p=>String(p.id)===String(id));
      const newId=id||uid();
      let img='';if(!imagePreview.hidden&&imagePreview.src)img=imagePreview.src;
      const obj={id:newId,barcode:barcode.value.trim(),name:productName.value.trim(),category:productCategory.value,buyPrice:+buyPrice.value||0,sellPrice:+sellPrice.value||0,stock:old?+old.stock||0:0,unit:unit.value,reorderLevel:Math.max(0,Math.floor(+reorderLevel.value||0)),description:description.value,image:img};
      try{if(img)await putImage(newId,img);else await deleteImage(newId)}catch(err){console.warn('No se pudo guardar la imagen',err)}
      old?Object.assign(old,obj):products.push(obj);
      productDialog.close();safeSave();
    };
  }
  if(typeof productGrid!=='undefined')productGrid.addEventListener('click',e=>{const id=e.target?.dataset?.delete;if(id)deleteImage(id).catch(()=>{})},true);

  migrateAndHydrate();

  const bindScope=setInterval(async()=>{
    const sb=window.vareliaSupabase;if(!sb)return;clearInterval(bindScope);
    async function syncSession(session){
      if(!session?.user)return;
      try{
        const {data:profile}=await sb.from('profiles').select('business_id').eq('id',session.user.id).maybeSingle();
        const next=String(profile?.business_id||session.user.id);
        const current=localStorage.getItem('varelia_active_business_id')||'';
        if(current!==next){localStorage.setItem('varelia_active_business_id',next);location.reload()}
      }catch(e){console.warn('No se pudo resolver el negocio activo',e)}
    }
    const {data}=await sb.auth.getSession();await syncSession(data?.session);
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){localStorage.removeItem('varelia_active_business_id');return}
      setTimeout(()=>syncSession(session),100);
    });
  },100);
})();