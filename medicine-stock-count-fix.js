(()=>{
  if(window.__vareliaMedicineStockCountFixV7)return;
  window.__vareliaMedicineStockCountFixV7=true;

  let saving=false;
  let stockTouched=false;
  let lastEditKey='';

  const el=id=>document.getElementById(id);
  const intVal=node=>Math.max(0,Math.floor(Number(node?.value||0)));
  const num=id=>Math.max(0,Number(el(id)?.value||0)||0);
  const text=id=>String(el(id)?.value||'').trim();
  const medicineCategory=()=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(text('productCategory'));
  const isMedicineVisible=()=>{const box=el('vMedicineFields');return !!box&&box.style.display!=='none'};
  const isMedicine=()=>isMedicineVisible()||!!el('vMedicineToggle')?.checked||medicineCategory();

  function productList(){
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return Array.isArray(window.products)?window.products:[];
  }

  function findCurrent(arr=productList()){
    const id=text('productId'),barcode=text('barcode'),name=text('productName').toLowerCase();
    return (id&&arr.find(p=>String(p?.id||'')===id))
      ||(barcode&&arr.find(p=>String(p?.barcode||'').trim()===barcode))
      ||(name&&arr.find(p=>String(p?.name||'').trim().toLowerCase()===name))
      ||null;
  }

  function syncFormRequirements(){
    const sell=el('sellPrice');
    if(sell){sell.required=!isMedicine();sell.setCustomValidity('')}
  }

  function ensureGenericMedicinePrice(){
    if(!isMedicine())return;
    const sell=el('sellPrice');if(!sell)return;
    const current=Number(sell.value);
    if(Number.isFinite(current)&&current>0)return;
    const unit=num('vMedicineUnitPrice'),blister=num('vMedicineBlisterPrice'),box=num('vMedicineBoxPrice');
    const fallback=unit>0?unit:(blister>0?blister:(box>0?box:0));
    if(fallback>0)sell.value=String(fallback);
  }

  function existingStock(){
    const old=findCurrent();
    if(!old)return null;
    return {old,stock:Math.max(0,Math.floor(Number(old.stock)||0))};
  }

  function splitStock(stock,bpb,upb){
    const perBox=bpb*upb;
    if(perBox<1||upb<1)return {boxes:0,blisters:0,units:stock};
    const boxes=Math.floor(stock/perBox);
    const rem=stock-boxes*perBox;
    const blisters=Math.floor(rem/upb);
    return {boxes,blisters,units:rem-blisters*upb};
  }

  function syncUntouchedEditStock(){
    if(stockTouched||!text('productId'))return;
    const state=existingStock();if(!state)return;
    const bpb=intVal(el('vMedicineBlistersPerBox'))||Math.max(0,Math.floor(Number(state.old?.blistersPerBox)||0));
    const upb=intVal(el('vMedicineUnitsPerBlister'))||Math.max(0,Math.floor(Number(state.old?.unitsPerBlister)||0));
    if(bpb<1||upb<1)return;
    const field=el('vMedicineStockBoxes');if(!field)return;
    const wholeBoxes=Math.floor(state.stock/(bpb*upb));
    if(String(field.value||'')!==String(wholeBoxes))field.value=String(wholeBoxes);
  }

  function updateSummary(){
    const stock=el('vMedicineStockBoxes'),bpb=el('vMedicineBlistersPerBox'),upb=el('vMedicineUnitsPerBlister'),summary=el('vMedicineStockSummary');
    if(!stock||!bpb||!upb||!summary||!isMedicineVisible())return;
    const boxes=intVal(stock),blistersPerBox=intVal(bpb),unitsPerBlister=intVal(upb);
    if(blistersPerBox<1){summary.textContent='Indica cuántos blísteres trae cada caja para calcular el stock correctamente.';summary.style.color='#b45309';return}
    if(unitsPerBlister<1){summary.textContent='Indica cuántas pastillas trae cada blíster para calcular el stock correctamente.';summary.style.color='#b45309';return}

    const state=!stockTouched&&text('productId')?existingStock():null;
    if(state){
      const parts=splitStock(state.stock,blistersPerBox,unitsPerBlister);
      summary.style.color='';
      if(parts.blisters===0&&parts.units===0){
        const totalBlisters=parts.boxes*blistersPerBox;
        summary.textContent=parts.boxes+' caja'+(parts.boxes===1?'':'s')+' = '+totalBlisters+' blíster'+(totalBlisters===1?'':'es')+' = '+state.stock+' pastilla'+(state.stock===1?'':'s');
      }else{
        summary.textContent='Stock real: '+state.stock+' pastilla'+(state.stock===1?'':'s')+' = '+parts.boxes+' caja'+(parts.boxes===1?'':'s')+' completa'+(parts.boxes===1?'':'s')+' + '+parts.blisters+' blíster'+(parts.blisters===1?'':'es')+' + '+parts.units+' pastilla'+(parts.units===1?'':'s');
      }
      const qty=el('productQty');if(qty)qty.value=String(state.stock);
      return;
    }

    const blisters=boxes*blistersPerBox,units=blisters*unitsPerBlister;
    summary.style.color='';
    summary.textContent=boxes+' caja'+(boxes===1?'':'s')+' = '+blisters+' blíster'+(blisters===1?'':'es')+' = '+units+' pastilla'+(units===1?'':'s');
    const qty=el('productQty');if(qty)qty.value=String(units);
  }

  function refresh(){
    syncFormRequirements();
    const dlg=el('productDialog');
    if(!dlg?.open)return;
    const key=text('productId')||'__new__';
    if(key!==lastEditKey){
      lastEditKey=key;
      stockTouched=key==='__new__';
    }
    if(!stockTouched)syncUntouchedEditStock();
    updateSummary();
  }

  function setSavingUI(on){
    const form=el('productForm');if(!form)return;
    form.querySelectorAll('button[type="submit"],input[type="submit"]').forEach(btn=>{
      if(on){
        if(!btn.dataset.vareliaOldText)btn.dataset.vareliaOldText=btn.textContent||btn.value||'';
        btn.disabled=true;
        if(btn.tagName==='BUTTON')btn.textContent='Guardando y sincronizando…';
        else btn.value='Guardando y sincronizando…';
      }else{
        btn.disabled=false;
        const old=btn.dataset.vareliaOldText;
        if(old!==undefined){if(btn.tagName==='BUTTON')btn.textContent=old;else btn.value=old;delete btn.dataset.vareliaOldText}
      }
    });
  }

  function localSaveMedicine(){
    const bpb=intVal(el('vMedicineBlistersPerBox')),upb=intVal(el('vMedicineUnitsPerBlister')),boxes=intVal(el('vMedicineStockBoxes'));
    if(bpb<1||upb<1)throw new Error(bpb<1?'Indica cuántos blísteres trae cada caja antes de guardar.':'Indica cuántas pastillas trae cada blíster antes de guardar.');
    const arr=productList();
    const old=findCurrent(arr);
    const id=text('productId')||String(old?.id||('med-'+Date.now().toString(36)));
    const preserveExisting=!!old&&!stockTouched;
    const units=preserveExisting?Math.max(0,Math.floor(Number(old.stock)||0)):boxes*bpb*upb;
    const derivedBoxes=Math.floor(units/(bpb*upb));
    const unitPrice=num('vMedicineUnitPrice'),blisterPrice=num('vMedicineBlisterPrice'),boxPrice=num('vMedicineBoxPrice');
    const genericPrice=num('sellPrice')||(unitPrice||blisterPrice||boxPrice||Number(old?.sellPrice)||0);
    const obj={
      ...(old||{}),
      id,
      barcode:text('barcode'),
      name:text('productName')||String(old?.name||'Medicamento'),
      category:text('productCategory')||String(old?.category||'Medicinas'),
      buyPrice:num('buyPrice'),
      sellPrice:genericPrice,
      stock:units,
      unit:text('unit')||String(old?.unit||'Unidad'),
      reorderLevel:Math.max(0,Math.floor(num('reorderLevel'))),
      description:text('description'),
      medicine:true,
      laboratory:text('vMedicineLaboratory'),
      medicinePresentation:text('vMedicinePresentation'),
      batch:text('vMedicineBatch'),
      expiryDate:text('vMedicineExpiry'),
      blistersPerBox:bpb,
      unitsPerBlister:upb,
      boxPrice,
      blisterPrice,
      unitMedicinePrice:unitPrice,
      medicineStockBoxes:preserveExisting?derivedBoxes:boxes,
      __vareliaMedicineSyncPending:true
    };
    if(old)Object.assign(old,obj);else arr.push(obj);
    try{window.products=arr}catch{}
    try{if(typeof save==='function')save()}catch(err){console.error('Guardado local medicamento',err)}
    try{if(typeof K!=='undefined'&&K?.products)localStorage.setItem(K.products,JSON.stringify(arr))}catch{}
    try{if(typeof render==='function')render();else window.render?.()}catch{}
    return old||obj;
  }

  async function cloudSaveMedicine(saved){
    const syncFn=window.vareliaCentralStockSyncProduct||window.syncProductToCloud;
    if(typeof syncFn!=='function')throw new Error('Sincronización central no disponible');
    await Promise.race([
      Promise.resolve(syncFn(saved)),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('La nube tardó demasiado. Revisa tu conexión e inténtalo otra vez.')),20000))
    ]);
    if(typeof window.vareliaPublicCatalogSync==='function'){
      try{await Promise.race([Promise.resolve(window.vareliaPublicCatalogSync()),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Catálogo tardó demasiado')),8000))])}catch(e){console.warn('Catálogo pendiente',e)}
    }
  }

  async function interceptMedicineSubmit(e){
    if(e.target?.id!=='productForm'||!isMedicine())return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    if(saving)return;
    syncFormRequirements();
    ensureGenericMedicinePrice();
    updateSummary();
    const bpb=intVal(el('vMedicineBlistersPerBox')),upb=intVal(el('vMedicineUnitsPerBlister'));
    if(bpb<1||upb<1){alert(bpb<1?'Indica cuántos blísteres trae cada caja antes de guardar.':'Indica cuántas pastillas trae cada blíster antes de guardar.');return}

    saving=true;
    setSavingUI(true);
    let saved=null;
    try{
      saved=localSaveMedicine();
      window.vareliaToast?.('Guardando producto y confirmando stock en la nube…','ok');
      await cloudSaveMedicine(saved);
      delete saved.__vareliaMedicineSyncPending;
      if(saved.__ampicilinaRecovery)delete saved.__ampicilinaRecovery;
      try{if(typeof save==='function')save()}catch{}
      try{window.dispatchEvent(new CustomEvent('varelia:catalog-product-changed'))}catch{}
      window.vareliaToast?.('Producto y stock guardados.','ok');
      const dlg=el('productDialog');if(dlg?.open){try{dlg.close()}catch{}}
    }catch(err){
      console.error('Sincronización medicamento',err);
      if(saved)saved.__vareliaMedicineSyncPending=true;
      try{if(typeof save==='function')save()}catch{}
      window.vareliaToast?.('No se confirmó el stock en la nube. El producto quedó abierto para que puedas reintentar.','warn');
      alert(String(err?.message||err||'No se pudo sincronizar el medicamento.'));
    }finally{
      saving=false;
      setSavingUI(false);
    }
  }

  document.addEventListener('input',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister')){
      stockTouched=true;updateSummary();return;
    }
    if(e.target?.matches?.('#vMedicineUnitPrice,#vMedicineBlisterPrice,#vMedicineBoxPrice'))syncFormRequirements();
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister'))stockTouched=true;
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister,#productCategory,#vMedicineToggle')){syncFormRequirements();updateSummary()}
  },true);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit],#newProduct,#inventoryNewProduct'))[30,120,300].forEach(ms=>setTimeout(refresh,ms));
  },true);
  document.addEventListener('submit',interceptMedicineSubmit,true);

  const boot=()=>{
    const dlg=el('productDialog');
    if(dlg)new MutationObserver(()=>{if(dlg.open)setTimeout(refresh,0)}).observe(dlg,{attributes:true,attributeFilter:['open']});
    setTimeout(refresh,0);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

// Solo interviene si un medicamento tiene una sincronización pendiente (o fue
// recuperado localmente). Las ventas normales siguen usando el flujo original.
(()=>{
  if(window.__vareliaMedicineCheckoutReliabilityV2)return;
  window.__vareliaMedicineCheckoutReliabilityV2=true;

  const list=()=>{
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return Array.isArray(window.products)?window.products:[];
  };
  const needsSync=p=>!!(p?.medicine&&(p.__vareliaMedicineSyncPending===true||p.__ampicilinaRecovery===true));
  const timeout=(promise,ms)=>Promise.race([Promise.resolve(promise),new Promise((_,reject)=>setTimeout(()=>reject(new Error('La sincronización del medicamento tardó demasiado.')),ms))]);

  function cartSnapshot(){
    try{if(typeof cart!=='undefined'&&Array.isArray(cart))return cart.map(x=>({...x}))}catch{}
    try{return (window.VareliaPOS?.getCartItems?.()||[]).map(x=>({...x}))}catch{return[]}
  }

  function pendingProducts(){
    const productsNow=list();
    const found=[];
    for(const item of cartSnapshot()){
      const p=productsNow.find(x=>String(x?.id||'')===String(item?.id||''))
        ||productsNow.find(x=>String(x?.barcode||'').trim()&&String(x?.barcode||'').trim()===String(item?.barcode||'').trim());
      if(p&&needsSync(p)&&!found.includes(p))found.push(p);
    }
    return found;
  }

  document.addEventListener('click',async e=>{
    const legacy=e.target?.closest?.('#checkout');
    if(!legacy||legacy.dataset.centralStock!=='1')return;
    const pending=pendingProducts();
    if(!pending.length)return;
    const original=legacy.onclick;
    if(typeof original!=='function')return;

    e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
    if(legacy.dataset.vareliaMedicineCheckoutBusy==='1')return;
    legacy.dataset.vareliaMedicineCheckoutBusy='1';
    const visible=document.getElementById('vposCheckout');
    const oldText=visible?.textContent||'💳 Cobrar venta';
    if(visible){visible.disabled=true;visible.textContent='⏳ Confirmando stock…'}

    try{
      if(navigator.onLine===false)throw new Error('No hay conexión a internet para confirmar el stock.');
      const syncFn=window.vareliaCentralStockSyncProduct||window.syncProductToCloud;
      if(typeof syncFn!=='function')throw new Error('La sincronización de inventario aún no está lista.');
      for(const p of pending){
        await timeout(syncFn(p),18000);
        delete p.__vareliaMedicineSyncPending;
        delete p.__ampicilinaRecovery;
      }
      try{if(typeof save==='function')save()}catch{}
      if(visible)visible.textContent='⏳ Registrando venta…';
      await Promise.resolve(original.call(legacy));
    }catch(err){
      console.error('Confirmar medicamento antes de cobrar',err);
      const msg=String(err?.message||err||'No se pudo confirmar el stock del medicamento.');
      window.vareliaToast?.(msg,'warn');
      alert(msg);
    }finally{
      delete legacy.dataset.vareliaMedicineCheckoutBusy;
      if(visible){visible.disabled=false;visible.textContent=oldText}
    }
  },true);
})();
