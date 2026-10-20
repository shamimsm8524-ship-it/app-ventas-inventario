(()=>{
  if(window.__vareliaAmpicilinaUnitSelectorAndroidFixV1)return;
  window.__vareliaAmpicilinaUnitSelectorAndroidFixV1=true;

  const BARCODE='2071674969557';
  const NAME='ampicilina';
  const el=id=>document.getElementById(id);
  const text=id=>String(el(id)?.value||'').trim();
  const isAmpicilinaForm=()=>text('barcode')===BARCODE||text('productName').toLowerCase()===NAME;

  function ensureOptions(){
    const unit=el('unit');
    if(!unit||!isAmpicilinaForm())return;
    const wanted=['Unidad','Caja','Blíster','Paquete','Bolsa','Botella','Lata','Docena','Kg','Gramo','Litro'];
    for(const label of wanted){
      if(!Array.from(unit.options||[]).some(o=>String(o.value||o.textContent).trim()===label)){
        const option=document.createElement('option');
        option.value=label;
        option.textContent=label;
        unit.appendChild(option);
      }
    }
  }

  // La corrección anterior guardaba durante el evento input/change y Android
  // podía reconstruir el formulario antes de completar la selección nativa.
  // Interceptamos SOLO el selector de Ampicilina antes de llegar a esos listeners.
  function protectNativeSelection(e){
    if(e.target?.id!=='unit'||!isAmpicilinaForm())return;
    e.stopPropagation();
    const selected=String(e.target.value||'').trim();
    if(selected){
      e.target.dataset.vareliaAmpicilinaSelectedUnit=selected;
      setTimeout(()=>{
        try{if(typeof window.updateProductQtyUI==='function')window.updateProductQtyUI()}catch{}
      },0);
    }
  }

  window.addEventListener('input',protectNativeSelection,true);
  window.addEventListener('change',protectNativeSelection,true);

  function prepare(){
    if(!isAmpicilinaForm())return;
    ensureOptions();
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit]')){
      setTimeout(prepare,25);
      setTimeout(prepare,100);
      setTimeout(prepare,250);
    }
  },true);

  document.addEventListener('focusin',e=>{
    if(e.target?.id==='unit'&&isAmpicilinaForm())ensureOptions();
  },true);
})();
