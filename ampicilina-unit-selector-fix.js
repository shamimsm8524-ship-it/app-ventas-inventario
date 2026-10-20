(()=>{
  if(window.__vareliaAmpicilinaUnitSelectorAndroidFixV2)return;
  window.__vareliaAmpicilinaUnitSelectorAndroidFixV2=true;

  const BARCODE='2071674969557';
  const NAME='ampicilina';
  const CHOICES=['Unidad','Caja','Blíster'];
  const el=id=>document.getElementById(id);
  const text=id=>String(el(id)?.value||'').trim();
  const isAmpicilinaForm=()=>text('barcode')===BARCODE||text('productName').toLowerCase()===NAME;

  function ensureOption(value){
    const unit=el('unit');if(!unit)return;
    if(!Array.from(unit.options||[]).some(o=>String(o.value||o.textContent).trim()===value)){
      const option=document.createElement('option');option.value=value;option.textContent=value;unit.appendChild(option);
    }
  }

  function ensureChooser(){
    const unit=el('unit');if(!unit)return null;
    let box=el('vareliaAmpicilinaUnitChoices');
    if(box)return box;
    const label=unit.closest('label');
    box=document.createElement('div');
    box.id='vareliaAmpicilinaUnitChoices';
    box.style.display='none';
    box.style.marginBottom='11px';
    box.innerHTML='<div style="font-size:13px;font-weight:800;margin-bottom:7px">Unidad de medida</div><div data-amp-unit-buttons style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"></div>';
    const buttons=box.querySelector('[data-amp-unit-buttons]');
    CHOICES.forEach(value=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.dataset.ampUnit=value;
      btn.textContent=value;
      btn.style.minHeight='46px';
      btn.style.border='1px solid var(--line,#d1d5db)';
      btn.style.borderRadius='12px';
      btn.style.background='var(--card,#fff)';
      btn.style.color='var(--ink,#111827)';
      btn.style.fontWeight='800';
      buttons.appendChild(btn);
    });
    if(label?.parentNode)label.parentNode.insertBefore(box,label.nextSibling);
    else unit.parentNode?.appendChild(box);
    box.addEventListener('click',e=>{
      const btn=e.target?.closest?.('[data-amp-unit]');if(!btn)return;
      e.preventDefault();
      const value=String(btn.dataset.ampUnit||'').trim();if(!value)return;
      ensureOption(value);
      unit.value=value;
      unit.dataset.vareliaAmpicilinaSelectedUnit=value;
      paint();
      try{if(typeof window.updateProductQtyUI==='function')window.updateProductQtyUI()}catch{}
    });
    return box;
  }

  function paint(){
    const unit=el('unit'),box=el('vareliaAmpicilinaUnitChoices');if(!unit||!box)return;
    const current=String(unit.value||'Unidad').trim()||'Unidad';
    box.querySelectorAll('[data-amp-unit]').forEach(btn=>{
      const active=String(btn.dataset.ampUnit)===current;
      btn.setAttribute('aria-pressed',active?'true':'false');
      btn.style.background=active?'var(--p,#2563eb)':'var(--card,#fff)';
      btn.style.color=active?'#fff':'var(--ink,#111827)';
      btn.style.borderColor=active?'var(--p,#2563eb)':'var(--line,#d1d5db)';
    });
  }

  function sync(){
    const unit=el('unit');if(!unit)return;
    const label=unit.closest('label');
    const box=ensureChooser();if(!box)return;
    if(isAmpicilinaForm()){
      CHOICES.forEach(ensureOption);
      if(label)label.style.display='none';
      box.style.display='block';
      paint();
    }else{
      if(label)label.style.display='';
      box.style.display='none';
    }
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit],#newProduct,#inventoryNewProduct')){
      [25,100,250,500].forEach(ms=>setTimeout(sync,ms));
    }
  },true);
  document.addEventListener('input',e=>{
    if(e.target?.matches?.('#productName,#barcode'))setTimeout(sync,0);
  },true);
  document.addEventListener('close',e=>{if(e.target?.id==='productDialog')setTimeout(sync,0)},true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,0),{once:true});
  else setTimeout(sync,0);
})();
