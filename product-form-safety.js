(()=>{
  if(window.__vareliaProductFormSafetyV20)return;
  window.__vareliaProductFormSafetyV20=true;
  window.__VARELIA_PRODUCT_FORM_SAFETY_BUILD__='20261021-v20';
  const $=id=>document.getElementById(id);
  const list=()=>{try{return Array.isArray(products)?products:[]}catch{return Array.isArray(window.products)?window.products:[]}};
  const medCategory=()=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(String($('productCategory')?.value||'').trim());
  const continuous=()=>['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos','l','litro','litros','ml','mililitro','mililitros','m','metro','metros','m2','m²'].includes(String($('unit')?.value||'').trim().toLowerCase());
  const round2=n=>Math.round((Number(n)||0)*100)/100;
  function current(){const id=String($('productId')?.value||'');return id?list().find(p=>String(p?.id||'')===id)||null:null}
  function applyVisibility(){
    const toggle=$('vMedicineToggle'),fields=$('vMedicineFields'),manual=$('vMedicineManualToggle');
    if(!toggle||!fields)return;
    fields.style.display=toggle.checked?'block':'none';
    if(manual)manual.style.display=medCategory()?'none':'flex';
    const commercial=$('vCommercialPricingBox');
    if(commercial)commercial.style.display=(!toggle.checked&&!medCategory()&&!continuous())?'grid':'none';
  }
  function syncFromProduct(){
    const dlg=$('productDialog');if(!dlg?.open)return;
    const toggle=$('vMedicineToggle');if(!toggle)return;
    const p=current();
    toggle.checked=p?!!p.medicine:medCategory();
    applyVisibility();
  }

  // Precio mayorista automático: si el mínimo coincide con una presentación,
  // el precio por unidad siempre se deriva de Precio / Unidades.
  function commercialRows(){return [...document.querySelectorAll('#vCommercialRows [data-crow]')]}
  function rowValues(row){
    return {
      units:Math.max(0,Math.floor(Number(row?.querySelector('[data-cunits]')?.value||0))),
      price:Math.max(0,Number(row?.querySelector('[data-cprice]')?.value||0)||0)
    };
  }
  function setWholesaleFromRow(row,{followUnits=false}={}){
    const on=$('vCommercialWholesaleOn'),min=$('vCommercialWholesaleMin'),unitPrice=$('vCommercialWholesalePrice');
    if(!on?.checked||!min||!unitPrice||!row)return false;
    const {units,price}=rowValues(row);if(units<1||price<=0)return false;
    const rows=commercialRows();
    const oldUnits=Math.max(0,Math.floor(Number(row.dataset.vareliaWholesaleOldUnits||0)));
    const minQty=Math.max(0,Math.floor(Number(min.value||0)));
    const shouldFollow=rows.length===1||minQty===units||(followUnits&&oldUnits>0&&minQty===oldUnits)||minQty<1;
    if(!shouldFollow)return false;
    if(rows.length===1||followUnits||minQty<1)min.value=String(units);
    unitPrice.value=round2(price/units).toFixed(2);
    return true;
  }
  function syncWholesaleByMinimum(){
    const on=$('vCommercialWholesaleOn'),min=$('vCommercialWholesaleMin');
    if(!on?.checked||!min)return false;
    const minQty=Math.max(0,Math.floor(Number(min.value||0)));
    const rows=commercialRows();
    const match=rows.find(r=>rowValues(r).units===minQty)||(rows.length===1?rows[0]:null);
    return match?setWholesaleFromRow(match,{followUnits:rows.length===1}):false;
  }
  function rememberRowUnits(target){
    const row=target?.closest?.('[data-crow]');if(!row)return;
    row.dataset.vareliaWholesaleOldUnits=String(rowValues(row).units||'');
  }

  document.addEventListener('focusin',e=>{
    if(e.target?.matches?.('[data-cunits],[data-cprice]'))rememberRowUnits(e.target);
  },true);
  document.addEventListener('input',e=>{
    if(e.target?.matches?.('[data-cunits],[data-cprice]')){
      const row=e.target.closest('[data-crow]');
      setWholesaleFromRow(row,{followUnits:e.target.matches('[data-cunits]')});
      return;
    }
    if(e.target?.id==='vCommercialWholesaleMin')syncWholesaleByMinimum();
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.id==='vCommercialWholesaleOn'){
      if(e.target.checked)setTimeout(syncWholesaleByMinimum,0);
      return;
    }
    if(e.target?.id==='vCommercialWholesaleMin')syncWholesaleByMinimum();
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-edit]'))[20,80,180,360].forEach(ms=>setTimeout(()=>{syncFromProduct();syncWholesaleByMinimum()},ms));
    if(e.target.closest?.('#newProduct,#inventoryNewProduct'))[20,80,180].forEach(ms=>setTimeout(()=>{const t=$('vMedicineToggle');if(t)t.checked=medCategory();applyVisibility();syncWholesaleByMinimum()},ms));
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.id==='vMedicineToggle'){applyVisibility();return}
    if(e.target?.id==='productCategory'){
      const t=$('vMedicineToggle');if(t)t.checked=medCategory();applyVisibility();return
    }
    if(e.target?.id==='unit')applyVisibility();
  },true);

  // Guardar producto debe sentirse como una sola acción. El guardado local del
  // formulario ocurre antes de la sincronización con la nube; cerramos el modal
  // apenas ese primer guardado terminó y dejamos la nube continuar en segundo plano.
  document.addEventListener('submit',e=>{
    if(e.target?.id!=='productForm')return;
    const form=e.target;
    const med=!!$('vMedicineToggle')?.checked||medCategory();
    if(med)return; // Los medicamentos tienen su flujo de guardado/sincronización propio.
    queueMicrotask(()=>{
      const dlg=$('productDialog');
      if(!dlg?.open)return;
      const id=String($('productId')?.value||'');
      const barcode=String($('barcode')?.value||'').trim();
      const name=String($('productName')?.value||'').trim().toLowerCase();
      const saved=(id&&list().find(p=>String(p?.id||'')===id))
        ||(barcode&&list().find(p=>String(p?.barcode||'').trim()===barcode))
        ||(name&&[...list()].reverse().find(p=>String(p?.name||'').trim().toLowerCase()===name));
      if(!saved)return;
      try{dlg.close()}catch{}
      window.vareliaToast?.('Producto guardado. Sincronizando en segundo plano…','ok');
      form.querySelectorAll('button[type="submit"],input[type="submit"]').forEach(btn=>{btn.disabled=false});
    });
  },false);

  const boot=()=>{
    const dlg=$('productDialog');
    if(dlg)new MutationObserver(()=>{if(dlg.open)[0,60,180].forEach(ms=>setTimeout(()=>{syncFromProduct();syncWholesaleByMinimum()},ms))}).observe(dlg,{attributes:true,attributeFilter:['open']});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
