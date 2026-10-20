(()=>{
  if(window.__vareliaAmpicilinaUnitSelectorAndroidFixV3)return;
  window.__vareliaAmpicilinaUnitSelectorAndroidFixV3=true;

  const BARCODE='2071674969557';
  const NAME='ampicilina';
  const CHOICES=['Unidad','Caja','Blíster'];
  const el=id=>document.getElementById(id);
  const text=id=>String(el(id)?.value||'').trim();

  function isAmpicilinaForm(){
    const id=text('productId');
    if(text('barcode')===BARCODE||text('productName').toLowerCase()===NAME)return true;
    try{
      const arr=Array.isArray(window.products)?window.products:(typeof products!=='undefined'&&Array.isArray(products)?products:[]);
      const p=id&&arr.find(x=>String(x?.id||'')===id);
      return !!p&&(String(p?.barcode||'').trim()===BARCODE||String(p?.name||'').trim().toLowerCase()===NAME);
    }catch{return false}
  }

  function ensureOption(value){
    const unit=el('unit');if(!unit)return;
    if(!Array.from(unit.options||[]).some(o=>String(o.value||o.textContent).trim()===value)){
      const option=document.createElement('option');
      option.value=value;
      option.textContent=value;
      unit.appendChild(option);
    }
  }

  function chooser(){
    const unit=el('unit');if(!unit)return null;
    let box=el('vareliaAmpicilinaUnitChoicesV3');
    if(box)return box;

    box=document.createElement('div');
    box.id='vareliaAmpicilinaUnitChoicesV3';
    box.style.cssText='display:none;margin:4px 0 12px;padding:12px;border:2px solid color-mix(in srgb,var(--p,#2563eb) 28%,#d7def0);border-radius:14px;background:color-mix(in srgb,var(--p,#2563eb) 5%,var(--card,#fff))';
    box.innerHTML='<div style="font-size:14px;font-weight:900;margin-bottom:8px">Unidad de medida de Ampicilina</div><div data-amp-unit-buttons style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"></div><div data-amp-unit-status style="font-size:12px;margin-top:8px;color:var(--muted,#6b7280)"></div>';

    const buttons=box.querySelector('[data-amp-unit-buttons]');
    CHOICES.forEach(value=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.dataset.ampUnit=value;
      btn.textContent=value;
      btn.style.cssText='min-height:48px;padding:10px 6px;border:1px solid var(--line,#d1d5db);border-radius:12px;background:var(--card,#fff);color:var(--ink,#111827);font-weight:900;font-size:14px';
      buttons.appendChild(btn);
    });

    const medBox=el('vMedicineBox');
    const unitLabel=unit.closest('label');
    if(medBox?.parentNode)medBox.parentNode.insertBefore(box,medBox);
    else if(unitLabel?.parentNode)unitLabel.parentNode.insertBefore(box,unitLabel.nextSibling);
    else unit.parentNode?.appendChild(box);

    box.addEventListener('click',e=>{
      const btn=e.target?.closest?.('[data-amp-unit]');
      if(!btn)return;
      e.preventDefault();
      e.stopPropagation();
      const value=String(btn.dataset.ampUnit||'').trim();
      const unit=el('unit');
      if(!unit||!value)return;
      ensureOption(value);
      unit.value=value;
      unit.dataset.vareliaAmpicilinaSelectedUnit=value;
      paint();
      try{if(typeof window.updateProductQtyUI==='function')window.updateProductQtyUI()}catch{}
    },true);

    return box;
  }

  function paint(){
    const unit=el('unit'),box=el('vareliaAmpicilinaUnitChoicesV3');
    if(!unit||!box)return;
    const forced=String(unit.dataset.vareliaAmpicilinaSelectedUnit||'').trim();
    const current=forced||String(unit.value||'Unidad').trim()||'Unidad';
    if(forced&&String(unit.value)!==forced)unit.value=forced;
    box.querySelectorAll('[data-amp-unit]').forEach(btn=>{
      const active=String(btn.dataset.ampUnit)===current;
      btn.setAttribute('aria-pressed',active?'true':'false');
      btn.style.background=active?'var(--p,#2563eb)':'var(--card,#fff)';
      btn.style.color=active?'#fff':'var(--ink,#111827)';
      btn.style.borderColor=active?'var(--p,#2563eb)':'var(--line,#d1d5db)';
      btn.style.boxShadow=active?'0 4px 12px color-mix(in srgb,var(--p,#2563eb) 22%,transparent)':'none';
    });
    const status=box.querySelector('[data-amp-unit-status]');
    if(status)status.textContent='Seleccionado: '+current;
  }

  function sync(){
    const dlg=el('productDialog'),unit=el('unit');
    if(!dlg||!unit)return;
    const box=chooser();if(!box)return;
    const unitLabel=unit.closest('label');
    const amp=!!dlg.open&&isAmpicilinaForm();
    if(amp){
      CHOICES.forEach(ensureOption);
      if(!unit.dataset.vareliaAmpicilinaSelectedUnit){
        const initial=String(unit.value||'Unidad').trim();
        unit.dataset.vareliaAmpicilinaSelectedUnit=CHOICES.includes(initial)?initial:'Unidad';
      }
      if(unitLabel)unitLabel.style.display='none';
      box.style.display='block';
      paint();
    }else{
      if(unitLabel)unitLabel.style.display='';
      box.style.display='none';
      if(!dlg.open)delete unit.dataset.vareliaAmpicilinaSelectedUnit;
    }
  }

  // Antes de guardar, restaurar explícitamente la elección al <select> real.
  document.addEventListener('submit',e=>{
    if(e.target?.id!=='productForm'||!isAmpicilinaForm())return;
    const unit=el('unit');
    const chosen=String(unit?.dataset.vareliaAmpicilinaSelectedUnit||'').trim();
    if(unit&&chosen){ensureOption(chosen);unit.value=chosen}
  },true);

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit],#newProduct,#inventoryNewProduct')){
      [0,30,100,250,500].forEach(ms=>setTimeout(sync,ms));
    }
  },true);
  document.addEventListener('input',e=>{
    if(e.target?.matches?.('#productName,#barcode,#productId'))setTimeout(sync,0);
  },true);

  // El editor puede ser modificado por varios módulos; mientras el diálogo esté
  // abierto verificamos el control sin tocar el stock ni reconstruir el formulario.
  setInterval(()=>{if(el('productDialog')?.open)sync()},200);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,0),{once:true});
  else setTimeout(sync,0);
})();
