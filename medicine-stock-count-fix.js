(()=>{
  if(window.__vareliaMedicineStockCountFixV2)return;
  window.__vareliaMedicineStockCountFixV2=true;

  const AMP_NAME='ampicilina';
  const AMP_BARCODE='2071674969557';
  let clearedRecoveredAmpicilina=false;

  const el=id=>document.getElementById(id);
  const intVal=node=>Math.max(0,Math.floor(Number(node?.value||0)));
  const medicineCategory=()=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(el('productCategory')?.value||'').trim());
  const isMedicineVisible=()=>{
    const box=el('vMedicineFields');
    return !!box&&box.style.display!=='none';
  };
  const isMedicine=()=>isMedicineVisible()||!!el('vMedicineToggle')?.checked||medicineCategory();
  const isAmpicilina=()=>{
    const name=String(el('productName')?.value||'').trim().toLowerCase();
    const barcode=String(el('barcode')?.value||'').trim();
    return name===AMP_NAME||barcode===AMP_BARCODE;
  };

  function syncFormRequirements(){
    const med=isMedicine();
    const sell=el('sellPrice');
    if(sell){
      // Los medicamentos usan sus propios precios por caja/blíster/pastilla.
      // El precio de venta genérico no debe bloquear el formulario.
      sell.required=!med;
      sell.setCustomValidity('');
    }
  }

  function ensureGenericMedicinePrice(){
    if(!isMedicine())return;
    const sell=el('sellPrice');
    if(!sell)return;
    const current=Number(sell.value);
    if(Number.isFinite(current)&&current>0)return;
    const unit=Number(el('vMedicineUnitPrice')?.value||0);
    const blister=Number(el('vMedicineBlisterPrice')?.value||0);
    const box=Number(el('vMedicineBoxPrice')?.value||0);
    const fallback=unit>0?unit:(blister>0?blister:(box>0?box:0));
    if(fallback>0)sell.value=String(fallback);
  }

  function updateSummary(){
    const stock=el('vMedicineStockBoxes');
    const bpb=el('vMedicineBlistersPerBox');
    const upb=el('vMedicineUnitsPerBlister');
    const summary=el('vMedicineStockSummary');
    if(!stock||!bpb||!upb||!summary||!isMedicineVisible())return;

    const boxes=intVal(stock),blistersPerBox=intVal(bpb),unitsPerBlister=intVal(upb);
    if(blistersPerBox<1){
      summary.textContent='Indica cuántos blísteres trae cada caja para calcular el stock correctamente.';
      summary.style.color='#b45309';
      return;
    }
    if(unitsPerBlister<1){
      summary.textContent='Indica cuántas pastillas trae cada blíster para calcular el stock correctamente.';
      summary.style.color='#b45309';
      return;
    }

    const blisters=boxes*blistersPerBox;
    const units=blisters*unitsPerBlister;
    summary.style.color='';
    summary.textContent=boxes+' caja'+(boxes===1?'':'s')+' = '+blisters+' blíster'+(blisters===1?'':'es')+' = '+units+' pastilla'+(units===1?'':'s');

    if(medicineCategory()){
      const qty=el('productQty');
      if(qty)qty.value=units;
    }
  }

  function clearRecoveredBadDefault(){
    if(clearedRecoveredAmpicilina||!isAmpicilina())return;
    const bpb=el('vMedicineBlistersPerBox');
    if(!bpb)return;
    // El valor 1 de Ampicilina fue introducido por la recuperación; no era un dato original confirmado.
    if(String(bpb.value||'').trim()==='1'){
      bpb.value='';
      bpb.placeholder='Ingresa el dato real';
      clearedRecoveredAmpicilina=true;
      updateSummary();
    }
  }

  function refresh(){
    syncFormRequirements();
    clearRecoveredBadDefault();
    setTimeout(updateSummary,0);
  }

  document.addEventListener('input',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister,#vMedicineUnitPrice,#vMedicineBlisterPrice,#vMedicineBoxPrice')){
      syncFormRequirements();
      setTimeout(updateSummary,0);
    }
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister,#productCategory,#vMedicineToggle')){
      syncFormRequirements();
      setTimeout(updateSummary,0);
    }
  },true);

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit],button')){
      setTimeout(refresh,30);setTimeout(refresh,120);setTimeout(refresh,300);
    }
  },true);

  document.addEventListener('submit',e=>{
    if(e.target?.id!=='productForm'||!isMedicine())return;
    syncFormRequirements();
    ensureGenericMedicinePrice();
    const bpb=intVal(el('vMedicineBlistersPerBox'));
    const upb=intVal(el('vMedicineUnitsPerBlister'));
    if(bpb<1||upb<1){
      e.preventDefault();
      e.stopImmediatePropagation();
      updateSummary();
      alert(bpb<1?'Indica cuántos blísteres trae cada caja antes de guardar.':'Indica cuántas pastillas trae cada blíster antes de guardar.');
      return;
    }

    const id=String(el('productId')?.value||'');
    const expectedBoxes=intVal(el('vMedicineStockBoxes'));
    const expectedBpb=bpb,expectedUpb=upb;
    // El guardado local del formulario ocurre antes del primer await del manejador original.
    // Cerrar apenas confirmemos que los valores ya entraron en window.products; la nube sigue sincronizando detrás.
    setTimeout(()=>{
      const p=(window.products||[]).find(x=>String(x?.id||'')===id)
        ||(window.products||[]).find(x=>String(x?.barcode||'').trim()===String(el('barcode')?.value||'').trim());
      if(!p)return;
      const ok=Number(p.medicineStockBoxes)===expectedBoxes&&Number(p.blistersPerBox)===expectedBpb&&Number(p.unitsPerBlister)===expectedUpb;
      if(!ok)return;
      const dlg=el('productDialog');
      if(dlg?.open){try{dlg.close()}catch{}}
      window.vareliaToast?.('Producto guardado. Sincronizando con la nube…','ok');
    },120);
  },true);

  new MutationObserver(()=>setTimeout(refresh,0)).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(el('productDialog')?.open)refresh()},400);
})();
