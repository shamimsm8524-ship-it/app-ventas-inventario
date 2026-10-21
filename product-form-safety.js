(()=>{
  if(window.__vareliaProductFormSafetyV19)return;
  window.__vareliaProductFormSafetyV19=true;
  const $=id=>document.getElementById(id);
  const list=()=>{try{return Array.isArray(products)?products:[]}catch{return Array.isArray(window.products)?window.products:[]}};
  const medCategory=()=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(String($('productCategory')?.value||'').trim());
  const continuous=()=>['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos','l','litro','litros','ml','mililitro','mililitros','m','metro','metros','m2','m²'].includes(String($('unit')?.value||'').trim().toLowerCase());
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
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-edit]'))[20,80,180,360].forEach(ms=>setTimeout(syncFromProduct,ms));
    if(e.target.closest?.('#newProduct,#inventoryNewProduct'))[20,80,180].forEach(ms=>setTimeout(()=>{const t=$('vMedicineToggle');if(t)t.checked=medCategory();applyVisibility()},ms));
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.id==='vMedicineToggle'){applyVisibility();return}
    if(e.target?.id==='productCategory'){
      const t=$('vMedicineToggle');if(t)t.checked=medCategory();applyVisibility();return
    }
    if(e.target?.id==='unit')applyVisibility();
  },true);
  const boot=()=>{
    const dlg=$('productDialog');
    if(dlg)new MutationObserver(()=>{if(dlg.open)[0,60,180].forEach(ms=>setTimeout(syncFromProduct,ms))}).observe(dlg,{attributes:true,attributeFilter:['open']});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
