(()=>{
  if(window.__vareliaMedicineStockCountFixV6)return;
  window.__vareliaMedicineStockCountFixV6=true;

  const AMP_NAME='ampicilina';
  const AMP_BARCODE='2071674969557';
  let clearedRecoveredAmpicilina=false;
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
  const isAmpicilina=()=>text('productName').toLowerCase()===AMP_NAME||text('barcode')===AMP_BARCODE;

  function productList(){
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return Array.isArray(window.products)?window.products:[];
  }

  function findCurrent(arr){
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

  function prepareMedicineSave(){
    if(!isMedicine())return;
    syncFormRequirements();
    ensureGenericMedicinePrice();
  }

  function existingStock(){
    const old=findCurrent(productList());
    if(!old)return null;
    const stock=Math.max(0,Math.floor(Number(old.stock)||0));
    return {old,stock};
  }

  function splitStock(stock,bpb,upb){
    const perBox=bpb*upb;
    if(perBox<1||upb<1)return {boxes:0,blisters:0,units:stock};
    const boxes=Math.floor(stock/perBox);
    const remAfterBoxes=stock-(boxes*perBox);
    const blisters=Math.floor(remAfterBoxes/upb);
    const units=remAfterBoxes-(blisters*upb);
    return {boxes,blisters,units};
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

  function clearRecoveredBadDefault(){
    if(clearedRecoveredAmpicilina||!isAmpicilina())return;
    const bpb=el('vMedicineBlistersPerBox');if(!bpb)return;
    if(String(bpb.value||'').trim()==='1'){
      bpb.value='';
      bpb.placeholder='Ingresa el dato real';
      clearedRecoveredAmpicilina=true;
      updateSummary();
    }
  }

  function refresh(){
    syncFormRequirements();
    const key=text('productId')||'__new__';
    if(key!==lastEditKey){
      lastEditKey=key;
      stockTouched=key==='__new__';
    }
    clearRecoveredBadDefault();
    if(!stockTouched)syncUntouchedEditStock();
    setTimeout(updateSummary,0);
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
      medicineStockBoxes:preserveExisting?derivedBoxes:boxes
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
      if(saved&&saved.__ampicilinaRecovery)delete saved.__ampicilinaRecovery;
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
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister')){
      stockTouched=true;
      syncFormRequirements();
      setTimeout(updateSummary,0);
      return;
    }
    if(e.target?.matches?.('#vMedicineUnitPrice,#vMedicineBlisterPrice,#vMedicineBoxPrice')){syncFormRequirements();setTimeout(updateSummary,0)}
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister'))stockTouched=true;
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

// Cobro confiable para medicamentos recuperados.
// Intercepta el botón oculto #checkout justo antes de centralCheckout, confirma
// Ampicilina en la nube si todavía era una recuperación local y muestra el estado
// real del cobro en el botón visible.
(()=>{
  if(window.__vareliaMedicineCheckoutReliabilityV1)return;
  window.__vareliaMedicineCheckoutReliabilityV1=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const timeout=(promise,ms,label)=>Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' tardó demasiado.')),ms))
  ]);
  const list=()=>{
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return Array.isArray(window.products)?window.products:[];
  };
  const isRecoveredMedicine=p=>!!(p&&p.medicine&&p.__ampicilinaRecovery===true);

  async function remoteMedicine(p){
    const sb=window.vareliaSupabase;if(!sb)return null;
    const cols='id,legacy_id,barcode,stock,blisters_per_box,units_per_blister,medicine_stock_boxes';
    let q=null;
    if(p._cloudId){q=await timeout(sb.from('varelia_products').select(cols).eq('id',p._cloudId).maybeSingle(),8000,'La verificación del medicamento');if(q.error)throw q.error;if(q.data)return q.data}
    const legacy=String(p.id||'').trim();
    if(legacy){q=await timeout(sb.from('varelia_products').select(cols).eq('legacy_id',legacy).maybeSingle(),8000,'La verificación del medicamento');if(q.error)throw q.error;if(q.data)return q.data}
    const barcode=String(p.barcode||'').trim();
    if(barcode){q=await timeout(sb.from('varelia_products').select(cols).eq('barcode',barcode).limit(1).maybeSingle(),8000,'La verificación del medicamento');if(q.error)throw q.error;if(q.data)return q.data}
    return null;
  }

  function matchesSavedMedicine(row,p){
    if(!row||!p)return false;
    const stock=Math.max(0,Number(p.stock)||0);
    const boxes=Math.max(0,Math.floor(Number(p.medicineStockBoxes)||0));
    const bpb=Math.max(1,Math.floor(Number(p.blistersPerBox)||1));
    const upb=Math.max(1,Math.floor(Number(p.unitsPerBlister)||1));
    return Math.abs((Number(row.stock)||0)-stock)<0.000001
      &&Math.floor(Number(row.medicine_stock_boxes)||0)===boxes
      &&Math.floor(Number(row.blisters_per_box)||0)===bpb
      &&Math.floor(Number(row.units_per_blister)||0)===upb;
  }

  async function ensureRecoveredMedicineReady(p){
    if(!isRecoveredMedicine(p))return;
    const visible=document.getElementById('vposCheckout');
    if(visible)visible.textContent='⏳ Sincronizando medicamento…';
    window.vareliaToast?.('Confirmando el stock de '+String(p.name||'medicamento')+' antes de cobrar…','ok');

    let row=await remoteMedicine(p).catch(()=>null);
    if(!matchesSavedMedicine(row,p)){
      const fn=window.vareliaCentralStockSyncProduct||window.syncProductToCloud;
      if(typeof fn!=='function')throw new Error('La sincronización del medicamento todavía no está lista.');
      try{await timeout(fn(p),14000,'La sincronización del medicamento')}catch(err){console.warn('Sincronización previa al cobro',err)}
      row=await remoteMedicine(p);
    }
    if(!matchesSavedMedicine(row,p))throw new Error('El stock del medicamento todavía no quedó confirmado en la nube. Abre el producto, guárdalo nuevamente y vuelve a cobrar.');
    if(row?.id)p._cloudId=String(row.id);
    delete p.__ampicilinaRecovery;
    try{if(typeof save==='function')save()}catch{}
  }

  function cartSnapshot(){
    try{if(typeof cart!=='undefined'&&Array.isArray(cart))return cart.map(x=>({...x}))}catch{}
    try{return (window.VareliaPOS?.getCartItems?.()||[]).map(x=>({...x}))}catch{return[]}
  }

  document.addEventListener('click',async e=>{
    const legacy=e.target?.closest?.('#checkout');
    if(!legacy||legacy.dataset.centralStock!=='1')return;
    const original=legacy.onclick;
    if(typeof original!=='function'||original.__vareliaReliableWrapped)return;

    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    if(legacy.dataset.vareliaReliableCheckoutBusy==='1')return;
    legacy.dataset.vareliaReliableCheckoutBusy='1';

    const visible=document.getElementById('vposCheckout');
    const oldText=visible?.textContent||'💳 Cobrar venta';
    if(visible){visible.disabled=true;visible.textContent='⏳ Procesando cobro…'}
    let slowTimer=setTimeout(()=>{
      if(visible)visible.textContent='⏳ Verificando venta…';
      window.vareliaToast?.('La red está tardando. No vuelvas a pulsar Cobrar mientras se verifica la venta.','warn');
    },8000);

    try{
      if(navigator.onLine===false)throw new Error('No hay conexión a internet para confirmar la venta.');
      const snapshot=cartSnapshot();
      const productsNow=list();
      for(const item of snapshot){
        const p=productsNow.find(x=>String(x?.id||'')===String(item?.id||''))
          ||productsNow.find(x=>String(x?.barcode||'').trim()&&String(x?.barcode||'').trim()===String(item?.barcode||'').trim());
        if(isRecoveredMedicine(p))await ensureRecoveredMedicineReady(p);
      }
      if(visible)visible.textContent='⏳ Registrando venta…';
      await Promise.resolve(original.call(legacy));
    }catch(err){
      console.error('Cobro de medicamento',err);
      const msg=String(err?.message||err||'No se pudo registrar la venta.');
      window.vareliaToast?.(msg,'warn');
      alert(msg);
    }finally{
      clearTimeout(slowTimer);
      delete legacy.dataset.vareliaReliableCheckoutBusy;
      if(visible){visible.disabled=false;visible.textContent=oldText.includes('COBRAR')?'💳 Cobrar venta':oldText}
    }
  },true);
})();