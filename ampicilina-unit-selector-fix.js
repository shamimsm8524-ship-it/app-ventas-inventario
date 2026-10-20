(()=>{
  if(window.__vareliaAmpicilinaUnitSelectorAndroidFixV4)return;
  window.__vareliaAmpicilinaUnitSelectorAndroidFixV4=true;

  const BARCODE='2071674969557';
  const NAME='ampicilina';
  const CHOICES=['Unidad','Caja','Blíster'];
  const el=id=>document.getElementById(id);
  const text=id=>String(el(id)?.value||'').trim();

  function productList(){
    try{if(Array.isArray(window.products))return window.products}catch{}
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return [];
  }

  function isAmpicilinaForm(){
    if(text('barcode')===BARCODE||text('productName').toLowerCase()===NAME)return true;
    const id=text('productId');
    if(!id)return false;
    const p=productList().find(x=>String(x?.id||'')===id);
    return !!p&&(String(p?.barcode||'').trim()===BARCODE||String(p?.name||'').trim().toLowerCase()===NAME);
  }

  function ensureOption(value){
    const unit=el('unit');
    if(!unit)return;
    const exists=Array.from(unit.options||[]).some(o=>String(o.value||o.textContent).trim()===value);
    if(exists)return;
    const option=document.createElement('option');
    option.value=value;
    option.textContent=value;
    unit.appendChild(option);
  }

  function currentChoice(){
    const unit=el('unit');
    if(!unit)return 'Unidad';
    const saved=String(unit.dataset.vareliaAmpicilinaSelectedUnit||'').trim();
    const direct=String(unit.value||'').trim();
    return CHOICES.includes(saved)?saved:(CHOICES.includes(direct)?direct:'Unidad');
  }

  function paint(){
    const box=el('vareliaAmpicilinaUnitChoicesV4');
    const choice=currentChoice();
    if(!box)return;
    box.querySelectorAll('[data-amp-unit]').forEach(btn=>{
      const active=String(btn.dataset.ampUnit)===choice;
      btn.setAttribute('aria-pressed',active?'true':'false');
      btn.style.background=active?'var(--p,#2563eb)':'var(--card,#fff)';
      btn.style.color=active?'#fff':'var(--ink,#111827)';
      btn.style.borderColor=active?'var(--p,#2563eb)':'var(--line,#d1d5db)';
      btn.style.boxShadow=active?'0 5px 14px color-mix(in srgb,var(--p,#2563eb) 22%,transparent)':'none';
    });
    const status=box.querySelector('[data-amp-unit-status]');
    if(status)status.textContent='Seleccionado: '+choice;
  }

  function choose(value){
    if(!CHOICES.includes(value))return;
    const unit=el('unit');
    if(!unit)return;
    ensureOption(value);
    unit.value=value;
    unit.dataset.vareliaAmpicilinaSelectedUnit=value;
    paint();
  }

  function ensureChooser(){
    const fields=el('vMedicineFields');
    if(!fields)return null;
    let box=el('vareliaAmpicilinaUnitChoicesV4');
    if(box)return box;

    box=document.createElement('div');
    box.id='vareliaAmpicilinaUnitChoicesV4';
    box.style.cssText='display:none;margin:0 0 14px;padding:13px;border:2px solid color-mix(in srgb,var(--p,#2563eb) 28%,#d7def0);border-radius:15px;background:color-mix(in srgb,var(--p,#2563eb) 5%,var(--card,#fff))';
    box.innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:4px">Unidad de medida de Ampicilina</div><div style="font-size:12px;color:var(--muted,#6b7280);margin-bottom:9px">Elige cómo quieres identificar la unidad base del producto.</div><div data-amp-unit-buttons style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"></div><div data-amp-unit-status style="font-size:12px;margin-top:8px;color:var(--muted,#6b7280)"></div>';

    const buttons=box.querySelector('[data-amp-unit-buttons]');
    CHOICES.forEach(value=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.dataset.ampUnit=value;
      btn.textContent=value;
      btn.style.cssText='min-height:48px;padding:10px 5px;border:1px solid var(--line,#d1d5db);border-radius:12px;background:var(--card,#fff);color:var(--ink,#111827);font-weight:900;font-size:14px;touch-action:manipulation';
      buttons.appendChild(btn);
    });

    box.addEventListener('click',e=>{
      const btn=e.target?.closest?.('[data-amp-unit]');
      if(!btn)return;
      e.preventDefault();
      e.stopPropagation();
      choose(String(btn.dataset.ampUnit||''));
    },true);

    fields.prepend(box);
    return box;
  }

  function sync(){
    const dlg=el('productDialog');
    const unit=el('unit');
    const fields=el('vMedicineFields');
    if(!dlg||!unit||!fields)return;

    const box=ensureChooser();
    if(!box)return;
    const unitLabel=unit.closest('label');
    const active=!!dlg.open&&isAmpicilinaForm();

    if(active){
      CHOICES.forEach(ensureOption);
      if(!unit.dataset.vareliaAmpicilinaSelectedUnit){
        unit.dataset.vareliaAmpicilinaSelectedUnit=currentChoice();
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

  document.addEventListener('submit',e=>{
    if(e.target?.id!=='productForm'||!isAmpicilinaForm())return;
    choose(currentChoice());
  },true);

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit],#newProduct,#inventoryNewProduct')){
      [0,40,120,300].forEach(ms=>setTimeout(sync,ms));
    }
  },true);

  document.addEventListener('input',e=>{
    if(e.target?.matches?.('#productName,#barcode'))setTimeout(sync,0);
  },true);

  const boot=()=>{
    const dlg=el('productDialog');
    if(dlg){
      new MutationObserver(()=>setTimeout(sync,0)).observe(dlg,{attributes:true,attributeFilter:['open']});
    }
    setTimeout(sync,0);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
