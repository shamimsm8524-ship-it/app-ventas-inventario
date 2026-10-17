(()=>{
  if(window.__vareliaMedicineStockCountFixV1)return;
  window.__vareliaMedicineStockCountFixV1=true;

  const AMP_NAME='ampicilina';
  const AMP_BARCODE='2071674969557';
  let clearedRecoveredAmpicilina=false;

  const el=id=>document.getElementById(id);
  const intVal=node=>Math.max(0,Math.floor(Number(node?.value||0)));
  const isMedicineVisible=()=>{
    const box=el('vMedicineFields');
    return !!box&&box.style.display!=='none';
  };
  const isAmpicilina=()=>{
    const name=String(el('productName')?.value||'').trim().toLowerCase();
    const barcode=String(el('barcode')?.value||'').trim();
    return name===AMP_NAME||barcode===AMP_BARCODE;
  };

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

    const cat=String(el('productCategory')?.value||'').trim();
    if(/^(pastillas?|medicinas?|medicamentos?)$/i.test(cat)){
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
    clearRecoveredBadDefault();
    setTimeout(updateSummary,0);
  }

  document.addEventListener('input',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister'))setTimeout(updateSummary,0);
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#vMedicineStockBoxes,#vMedicineBlistersPerBox,#vMedicineUnitsPerBlister,#productCategory'))setTimeout(updateSummary,0);
  },true);

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit],button')){
      setTimeout(refresh,30);setTimeout(refresh,120);setTimeout(refresh,300);
    }
  },true);

  document.addEventListener('submit',e=>{
    if(e.target?.id!=='productForm'||!isMedicineVisible())return;
    const bpb=intVal(el('vMedicineBlistersPerBox'));
    const upb=intVal(el('vMedicineUnitsPerBlister'));
    if(bpb<1||upb<1){
      e.preventDefault();
      e.stopImmediatePropagation();
      updateSummary();
      alert(bpb<1?'Indica cuántos blísteres trae cada caja antes de guardar.':'Indica cuántas pastillas trae cada blíster antes de guardar.');
    }
  },true);

  new MutationObserver(()=>setTimeout(refresh,0)).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(el('productDialog')?.open)refresh()},500);
})();
