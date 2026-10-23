(()=>{
  if(!document.getElementById('vareliaSessionRecoveryLoader')){
    const s=document.createElement('script');
    s.id='vareliaSessionRecoveryLoader';
    s.src='/session-recovery.js?v=20261023-auth-webview-v112';
    document.head.appendChild(s);
  }
})();

(()=>{
  if(window.__vareliaProductFormSafetyV23)return;
  window.__vareliaProductFormSafetyV23=true;
  window.__VARELIA_PRODUCT_FORM_SAFETY_BUILD__='20261022-v25-clear-unit-price';
  const $=id=>document.getElementById(id);
  const list=()=>{try{return Array.isArray(products)?products:[]}catch{return Array.isArray(window.products)?window.products:[]}};
  const medCategory=()=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(String($('productCategory')?.value||'').trim());
  const continuous=()=>['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos','l','litro','litros','ml','mililitro','mililitros','m','metro','metros','m2','m²'].includes(String($('unit')?.value||'').trim().toLowerCase());
  const round2=n=>Math.round((Number(n)||0)*100)/100;
  function current(){const id=String($('productId')?.value||'');return id?list().find(p=>String(p?.id||'')===id)||null:null}

  function commercialRows(){return [...document.querySelectorAll('#vCommercialRows [data-crow]')]}
  function updatePurchaseSummary(){
    const medicine=!!$('vMedicineToggle')?.checked||medCategory();
    const purchaseLabel=$('purchaseQuantityLabel');
    if(purchaseLabel)purchaseLabel.hidden=medicine;
    if($('purchasePresentationLabel'))$('purchasePresentationLabel').hidden=medicine;
    if(medicine&&$('purchaseQuantity'))$('purchaseQuantity').value=1;
    const total=Number($('buyPrice')?.value),quantity=Number($('purchaseQuantity')?.value);
    const out=$('purchaseUnitCost');
    const text=Number.isFinite(total)&&total>=0&&Number.isFinite(quantity)&&quantity>0?'Costo de compra por 1 '+currentUnitLabel()+': S/ '+(total/quantity).toFixed(6)+' · Precio de venta por 1 '+currentUnitLabel()+': S/ '+Math.max(0,Number($('sellPrice')?.value)||0).toFixed(2):'Escribe una cantidad mayor que cero.';
    if(out&&out.textContent!==text)out.textContent=text;
  }
  document.addEventListener('change',e=>{if(['unit','purchasePresentation'].includes(e.target?.id))updatePurchaseSummary()});
  document.addEventListener('input',e=>{if(['buyPrice','purchaseQuantity','sellPrice'].includes(e.target?.id))updatePurchaseSummary()});
  function currentUnitLabel(){return String($('unit')?.value||'Unidad').trim()||'Unidad'}
  function ensurePriceMeaning(){
    updatePurchaseSummary();
    const price=$('sellPrice'),label=price?.closest('label'),unit=currentUnitLabel();
    const title=label?.querySelector('span');
    const priceTitle=`Precio por 1 ${unit} (S/)`;
    if(title&&title.textContent!==priceTitle)title.textContent=priceTitle;
    if(label){
      let help=$('vUnitPriceHelp');
      if(!help){
        help=document.createElement('div');help.id='vUnitPriceHelp';help.className='meta';
        help.style.cssText='margin-top:7px;line-height:1.35;color:var(--muted)';
        label.appendChild(help);
      }
      const helpText=`Este precio es solo para vender 1 ${unit}. No pongas aquí el precio del cajón, docena o media docena; esos precios se escriben abajo y cada uno es independiente.`;
      if(help.textContent!==helpText)help.textContent=helpText;
    }
    commercialRows().forEach(row=>{
      const input=row.querySelector('[data-cprice]'),l=input?.closest('label');if(!l)return;
      const first=[...l.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
      if(first&&first.nodeValue!=='Precio de venta total (S/)')first.nodeValue='Precio de venta total (S/)';
    });
    const box=$('vCommercialPricingBox');
    if(box){
      let note=$('vPresentationPriceHelp');
      if(!note){
        note=document.createElement('div');note.id='vPresentationPriceHelp';note.className='meta';
        note.style.cssText='padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--p) 7%,transparent);font-weight:750;line-height:1.4';
        const rows=$('vCommercialRows');if(rows)box.insertBefore(note,rows);
      }
      const noteText='Escribe por separado el costo de compra y el precio de venta TOTAL de cada presentación. Cajón, medio cajón, docena y media docena son independientes; cambiar uno no modifica los demás.';
      if(note.textContent!==noteText)note.textContent=noteText;
    }
  }

  function ensureCommercialAccordion(){
    const box=$('vCommercialPricingBox');if(!box)return false;
    if(box.dataset.vareliaAccordion==='1')return true;
    const header=box.firstElementChild;if(!header)return false;
    box.dataset.vareliaAccordion='1';

    const textWrap=document.createElement('div');
    while(header.firstChild)textWrap.appendChild(header.firstChild);
    textWrap.style.minWidth='0';

    const btn=document.createElement('button');
    btn.type='button';
    btn.id='vCommercialCollapseBtn';
    btn.className='btn secondary';
    btn.style.cssText='flex:0 0 42px;width:42px;height:42px;padding:0;border-radius:12px;font-size:24px;line-height:1;display:grid;place-items:center';
    btn.setAttribute('aria-label','Mostrar u ocultar Presentaciones de venta');

    header.append(textWrap,btn);
    header.style.display='flex';
    header.style.alignItems='center';
    header.style.justifyContent='space-between';
    header.style.gap='12px';
    header.style.cursor='pointer';

    const bodyChildren=()=>[...box.children].slice(1);
    const rememberDisplay=el=>{
      if(el.dataset.vareliaCommercialDisplaySaved==='1')return;
      el.dataset.vareliaCommercialDisplaySaved='1';
      el.dataset.vareliaCommercialDisplay=el.style.display||'__empty__';
    };
    const restoreDisplay=el=>{
      const saved=el.dataset.vareliaCommercialDisplay;
      el.style.display=saved&&saved!=='__empty__'?saved:'';
    };
    const apply=collapsed=>{
      box.dataset.vareliaCollapsed=collapsed?'1':'0';
      bodyChildren().forEach(el=>{rememberDisplay(el);if(collapsed)el.style.display='none';else restoreDisplay(el)});
      btn.textContent=collapsed?'⌄':'⌃';
      btn.setAttribute('aria-expanded',collapsed?'false':'true');
      btn.title=collapsed?'Mostrar Presentaciones de venta':'Ocultar Presentaciones de venta';
      try{localStorage.setItem('varelia_commercial_section_collapsed_v1',collapsed?'1':'0')}catch{}
    };
    const toggle=()=>apply(box.dataset.vareliaCollapsed!=='1');
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle()});
    header.addEventListener('click',e=>{if(e.target.closest('button,input,select,textarea,a'))return;toggle()});

    let collapsed=true;
    try{const saved=localStorage.getItem('varelia_commercial_section_collapsed_v1');if(saved==='0')collapsed=false;if(saved==='1')collapsed=true}catch{}
    apply(collapsed);
    return true;
  }

  function applyVisibility(){
    const toggle=$('vMedicineToggle'),fields=$('vMedicineFields'),manual=$('vMedicineManualToggle');
    if(!toggle||!fields)return;
    fields.style.display=toggle.checked?'block':'none';
    if(manual)manual.style.display=medCategory()?'none':'flex';
    const commercial=$('vCommercialPricingBox');
    if(commercial){commercial.style.display=(!toggle.checked&&!medCategory()&&!continuous())?'grid':'none';ensureCommercialAccordion()}
    ensurePriceMeaning();
  }
  function syncFromProduct(){
    const dlg=$('productDialog');if(!dlg?.open)return;
    const toggle=$('vMedicineToggle');if(!toggle)return;
    const p=current();
    toggle.checked=p?!!p.medicine:medCategory();
    applyVisibility();ensurePriceMeaning();
  }

  function rowValues(row){
    return {
      units:Math.max(0,Math.floor(Number(row?.querySelector('[data-cunits]')?.value||0))),
      price:Math.max(0,Number(row?.querySelector('[data-cprice]')?.value||0)||0)
    };
  }
  // Los precios se escriben por separado; editar una presentación nunca cambia mayorista.
  function setWholesaleFromRow(){return false}
  function syncWholesaleByMinimum(){return false}
  function rememberRowUnits(target){
    const row=target?.closest?.('[data-crow]');if(!row)return;
    row.dataset.vareliaWholesaleOldUnits=String(rowValues(row).units||'');
  }

  function repairPresentationTotals(p){
    return false;
  }
  function pickerProduct(){
    const layer=$('vCommercialSalePicker');if(!layer||layer.style.display==='none')return null;
    const name=String($('vCSName')?.textContent||'').trim().toLowerCase();if(!name)return null;
    return list().find(p=>String(p?.name||'').trim().toLowerCase()===name)||null;
  }
  function redrawPicker(){
    const qty=$('vCSQty');
    if(!qty)return;
    try{qty.dispatchEvent(new Event('input',{bubbles:true}))}catch{}
  }
  function repairOpenPicker(){
    const p=pickerProduct();if(!p)return false;
    const changed=repairPresentationTotals(p);
    if(changed){
      try{if(typeof save==='function')save()}catch{}
      queueMicrotask(redrawPicker);
    }
    return changed;
  }

  document.addEventListener('focusin',e=>{
    if(e.target?.matches?.('[data-cunits],[data-cprice]'))rememberRowUnits(e.target);
  },true);
  document.addEventListener('input',e=>{
    if(e.target?.matches?.('[data-cunits],[data-cprice]')){
      const row=e.target.closest('[data-crow]');
      setWholesaleFromRow(row,{followUnits:e.target.matches('[data-cunits]')});
      ensurePriceMeaning();
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
    if(e.target.closest?.('[data-edit]'))[20,80,180,360].forEach(ms=>setTimeout(()=>{syncFromProduct();syncWholesaleByMinimum();ensureCommercialAccordion();ensurePriceMeaning()},ms));
    if(e.target.closest?.('#newProduct,#inventoryNewProduct'))[20,80,180].forEach(ms=>setTimeout(()=>{const t=$('vMedicineToggle');if(t)t.checked=medCategory();applyVisibility();syncWholesaleByMinimum();ensureCommercialAccordion();ensurePriceMeaning()},ms));
    if(e.target.closest?.('#vCSModes [data-cmode]'))repairOpenPicker();
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.id==='vMedicineToggle'){applyVisibility();return}
    if(e.target?.id==='productCategory'){
      const t=$('vMedicineToggle');if(t)t.checked=medCategory();applyVisibility();return
    }
    if(e.target?.id==='unit'){applyVisibility();ensurePriceMeaning()}
  },true);

  // El formulario principal confirma el guardado; no cerrar desde una microtarea.

  const boot=()=>{
    ensurePriceMeaning();
    const dlg=$('productDialog');
    if(dlg)new MutationObserver(()=>{if(dlg.open)[0,60,180].forEach(ms=>setTimeout(()=>{syncFromProduct();syncWholesaleByMinimum();ensureCommercialAccordion();ensurePriceMeaning()},ms))}).observe(dlg,{attributes:true,attributeFilter:['open']});
    const observer=new MutationObserver(()=>{
      ensureCommercialAccordion();ensurePriceMeaning();
      const layer=$('vCommercialSalePicker');
      if(layer&&layer.style.display!=='none')queueMicrotask(repairOpenPicker);
    });
    // Observar solo el formulario: el inicio de sesión no debe activar este módulo.
    const form=$('productForm');
    if(form)observer.observe(form,{subtree:true,childList:true});
    const picker=$('vCommercialSalePicker');
    if(picker)observer.observe(picker,{attributes:true,attributeFilter:['style']});
    let tries=0;const accordionTimer=setInterval(()=>{tries++;ensurePriceMeaning();if(ensureCommercialAccordion()||tries>80)clearInterval(accordionTimer)},100);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
