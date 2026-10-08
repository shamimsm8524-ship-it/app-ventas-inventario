(() => {
  const DB_NAME = 'miNegocioDB';
  const DB_VERSION = 1;
  const STORE = 'productImages';

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

  async function putImage(id,data){
    if(!id || !data) return;
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(data,id);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }

  async function getImage(id){
    const db=await openDB();
    const value=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(id);
      req.onsuccess=()=>resolve(req.result||'');
      req.onerror=()=>reject(req.error);
    });
    db.close();
    return value;
  }

  async function deleteImage(id){
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
    db.close();
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

  // Reemplaza el guardado anterior para que el stock y ventas no dependan del tamaño de las fotos.
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
        try{ p.image=await getImage(p.id); }catch(e){}
      }
    }
    render();
  }

  if(typeof productForm!=='undefined'){
    productForm.onsubmit=async e=>{
      e.preventDefault();
      const id=productId.value;
      const old=products.find(p=>p.id===id);
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

  // Si se elimina un producto, también borra su imagen separada.
  if(typeof productGrid!=='undefined'){
    productGrid.addEventListener('click',e=>{
      const id=e.target?.dataset?.delete;
      if(id) deleteImage(id).catch(()=>{});
    },true);
  }

  migrateAndHydrate();
})();