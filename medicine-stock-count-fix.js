(()=>{
  if(window.__vareliaMedicineStockCountFixV4)return;
  window.__vareliaMedicineStockCountFixV4=true;

  const AMP_NAME='ampicilina';
  const AMP_BARCODE='2071674969557';
  let clearedRecoveredAmpicilina=false;
  let saving=false;

  const el=id=>document.getElementById(id);
  const intVal=node=>Math.max(0,Math.floor(Number(node?.value||0)));
  const num=id=>Math.max(0,Number(el(id)?.value||0)||0);
  const text=id=>String(el(id)?.value||'').trim();
  const medicineCategory=()=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(text('productCategory'));
  const isMedicineVisible=()=>{const box=el('vMedicineFields');return !!box&&box.style.display!=='none'};
  const isMedicine=()=>isMedicineVisible()||!!el('vMedicineToggle')?.checked||medicineCategory();
  const isAmpicilina=()=>text('productName').toLowerCase()===AMP_NAME||text('barcode')===AMP_BARCODE;

  function productList(){
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return Array.isArray(window.products)?window.products:[];
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

  function prepareMedicineSave(){
    if(!isMedicine())return;
    syncFormRequirements();
    ensureGenericMedicinePrice();
  }

  function updateSummary(){
    const stock=el('vMedicineStockBoxes'),bpb=el('vMedicineBlistersPerBox'),upb=el('vMedicineUnitsPerBlister'),summary=el('vMedicineStockSummary');
    if(!stock||!bpb||!upb||!summary||!isMedicineVisible())return;
    const boxes=intVal(stock),blistersPerBox=intVal(bpb),unitsPerBlister=intVal(upb);
    if(blistersPerBox<1){summary.textContent='Indica cuántos blísteres trae cada caja para calcular el stock correctamente.';summary.style.color='#b45309';return}
    if(unitsPerBlister<1){summary.textContent='Indica cuántas pastillas trae cada blíster para calcular el stock correctamente.';summary.style.color='#b45309';return}
    const blisters=boxes*blistersPerBox,units=blisters*unitsPerBlister;
    summary.style.color='';
    summary.textContent=boxes+' caja'+(boxes===1?'':'s')+' = '+blisters+' blíster'+(blisters===1?'':'es')+' = '+units+' pastilla'+(units===1?'':'s');
    const qty=el('productQty');if(qty)qty.value=String(units);
  }

  function clearRecoveredBadDefault(){
    if(clearedRecoveredAmpicilina||!isAmpicilina())return;
    const bpb=el('vMedicineBlistersPerBox');if(!bpb)return;
    if(String(bpb.value||'').trim()==='1'){bpb.value='';bpb.placeholder='Ingresa el dato real';clearedRecoveredAmpicilina=true;updateSummary()}
  }

  function refresh(){syncFormRequirements();clearRecoveredBadDefault();setTimeout(updateSummary,0)}

  function findCurrent(arr){
    const id=text('productId'),barcode=text('barcode'),name=text('productName').toLowerCase();
    return (id&&arr.find(p=>String(p?.id||'')===id))
      ||(barcode&&arr.find(p=>String(p?.barcode||'').trim()===barcode))
      ||(name&&arr.find(p=>String(p?.name||'').trim().toLowerCase()===name))
      ||null;
  }

  function localSaveMedicine(){
    const bpb=intVal(el('vMedicineBlistersPerBox')),upb=intVal(el('vMedicineUnitsPerBlister')),boxes=intVal(el('vMedicineStockBoxes'));
    if(bpb<1||upb<1)throw new Error(bpb<1?'Indica cuántos blísteres trae cada caja antes de guardar.':'Indica cuántas pastillas trae cada blíster antes de guardar.');
    const arr=productList();
    const old=findCurrent(arr);
    const id=text('productId')||String(old?.id||('med-'+Date.now().toString(36)));
    const units=boxes*bpb*upb;
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
      medicineStockBoxes:boxes
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
    if(typeof syncFn==='function'){
      await Promise.race([
        Promise.resolve(syncFn(saved)),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('La nube tardó demasiado')),12000))
      ]);
      if(typeof window.vareliaPublicCatalogSync==='function'){
        try{await Promise.race([Promise.resolve(window.vareliaPublicCatalogSync()),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Catálogo tardó demasiado')),8000))])}catch(e){console.warn(e)}
      }
      return;
    }
    throw new Error('Sincronización central no disponible');
  }

  function finishLocal(saved){
    try{window.dispatchEvent(new CustomEvent('varelia:catalog-product-changed'))}catch{}
    const dlg=el('productDialog');if(dlg?.open){try{dlg.close()}catch{}}
    window.vareliaToast?.('Producto guardado. Sincronizando con la nube…','ok');
    Promise.resolve().then(()=>cloudSaveMedicine(saved)).then(()=>{
      window.vareliaToast?.('Producto guardado y sincronizado.','ok');
    }).catch(err=>{
      console.error('Sincronización medicamento',err);
      window.vareliaToast?.('Producto guardado en el equipo. La nube se reintentará.','warn');
      try{setTimeout(()=>window.vareliaForceSync?.(),1500)}catch{}
    }).finally(()=>{saving=false});
  }

  function interceptMedicineSubmit(e){
    if(e.target?.id!=='productForm'||!isMedicine())return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    if(saving)return;
    prepareMedicineSave();
    updateSummary();
    const bpb=intVal(el('vMedicineBlistersPerBox')),upb=intVal(el('vMedicineUnitsPerBlister'));
    if(bpb<1||upb<1){alert(bpb<1?'Indica cuántos blísteres trae cada caja antes de guardar.':'Indica cuántas pastillas trae cada blíster antes de guardar.');return}
    saving=true;
    try{const saved=localSaveMedicine();finishLocal(saved)}catch(err){saving=false;console.error(err);alert(String(err?.message||err||'No se pudo guardar el medicamento.'))}
  }

  document.addEventListener('input',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister,#vMedicineUnitPrice,#vMedicineBlisterPrice,#vMedicineBoxPrice')){syncFormRequirements();setTimeout(updateSummary,0)}
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister,#productCategory,#vMedicineToggle')){syncFormRequirements();setTimeout(updateSummary,0)}
  },true);

  const prepareFromPointer=e=>{if(e.target?.closest?.('#productForm button[type="submit"],#productForm input[type="submit"]'))prepareMedicineSave()};
  document.addEventListener('pointerdown',prepareFromPointer,true);
  document.addEventListener('touchstart',prepareFromPointer,{capture:true,passive:true});
  document.addEventListener('mousedown',prepareFromPointer,true);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#productForm button[type="submit"],#productForm input[type="submit"]'))prepareMedicineSave();
    if(e.target?.closest?.('[data-edit],button')){setTimeout(refresh,30);setTimeout(refresh,120);setTimeout(refresh,300)}
  },true);
  document.addEventListener('submit',interceptMedicineSubmit,true);

  new MutationObserver(()=>setTimeout(refresh,0)).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(el('productDialog')?.open)refresh()},250);
})();
