(() => {
  const DB_NAME = 'miNegocioDB';
  const DB_VERSION = 1;
  const STORE = 'productImages';
  const scope = (localStorage.getItem('varelia_active_business_id')||'').trim();
  const scopedKey = id => scope ? `${scope}:${String(id)}` : String(id);

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function putRaw(key,data){
    if(key===undefined || key===null || !data) return;
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(data,key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }

  async function getRaw(key){
    if(key===undefined || key===null) return '';
    const db=await openDB();
    const value=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(key);
      req.onsuccess=()=>resolve(req.result||'');
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return value;
  }

  async function deleteRaw(key){
    if(key===undefined || key===null) return;
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }

  async function putImage(id,data){
    if(!id || !data) return;
    await putRaw(scopedKey(id),data);
  }

  async function getImage(id){
    const candidates=[];
    if(scope) candidates.push(scopedKey(id));
    candidates.push(id,String(id));
    const n=Number(id);
    if(Number.isFinite(n)) candidates.push(n);
    const seen=new Set();
    for(const key of candidates){
      const marker=typeof key+':'+String(key);
      if(seen.has(marker)) continue;
      seen.add(marker);
      try{
        const value=await getRaw(key);
        if(value){
          if(scope && key!==scopedKey(id)){
            try{ await putRaw(scopedKey(id),value); }catch{}
          }
          return value;
        }
      }catch{}
    }
    return '';
  }

  async function deleteImage(id){
    const keys=[scopedKey(id),id,String(id)];
    const n=Number(id);if(Number.isFinite(n))keys.push(n);
    const seen=new Set();
    for(const key of keys){
      const marker=typeof key+':'+String(key);
      if(seen.has(marker)) continue;seen.add(marker);
      try{await deleteRaw(key)}catch{}
    }
  }

  function compactProducts(){
    return products.map(p=>{
      const copy={...p};
      delete copy.image;
      return copy;
    });
  }

  function safeSave(){
    try{
      localStorage.setItem(K.products,JSON.stringify(compactProducts()));
      for(const [k,v] of [[K.categories,categories],[K.sales,sales],[K.closures,closures],[K.cashStart,cashStart],[K.movements,movements],[K.suppliers,suppliers],[K.purchases,purchases]]){
        localStorage.setItem(k,JSON.stringify(v));
      }
      render();
    }catch(err){
      console.error('No se pudo guardar',err);
      alert('No se pudo guardar el cambio. Libera un poco de espacio del navegador y vuelve a intentarlo.');
    }
  }

  save = safeSave;

  async function migrateAndHydrate(){
    let changed=false;
    for(const p of products){
      if(p.image && typeof p.image==='string' && p.image.startsWith('data:')){
        try{ await putImage(p.id,p.image); changed=true; }catch(e){ console.warn('No se pudo migrar imagen',e); }
      }
    }
    if(changed){
      try{ localStorage.setItem(K.products,JSON.stringify(compactProducts())); }catch(e){}
    }
    for(const p of products){
      if(!p.image){
        try{
          const restored=await getImage(p.id);
          if(restored) p.image=restored;
        }catch(e){}
      }
    }
    render();
  }

  if(typeof productForm!=='undefined'){
    productForm.onsubmit=async e=>{
      e.preventDefault();
      const id=productId.value;
      const old=products.find(p=>String(p.id)===String(id));
      const newId=id||uid();
      let img='';
      if(!imagePreview.hidden && imagePreview.src) img=imagePreview.src;
      const obj={
        id:newId,
        barcode:barcode.value.trim(),
        name:productName.value.trim(),
        category:productCategory.value,
        buyPrice:+buyPrice.value||0,
        sellPrice:+sellPrice.value||0,
        stock:old?+old.stock||0:0,
        unit:unit.value,
        reorderLevel:Math.max(0,Math.floor(+reorderLevel.value||0)),
        description:description.value,
        image:img
      };
      try{
        if(img) await putImage(newId,img); else await deleteImage(newId);
      }catch(err){ console.warn('No se pudo guardar la imagen',err); }
      old?Object.assign(old,obj):products.push(obj);
      productDialog.close();
      safeSave();
    };
  }

  if(typeof productGrid!=='undefined'){
    productGrid.addEventListener('click',e=>{
      const id=e.target?.dataset?.delete;
      if(id) deleteImage(id).catch(()=>{});
    },true);
  }

  migrateAndHydrate();
})();