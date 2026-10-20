(()=>{
  if(window.__vareliaMedicineSaveFeedbackV1)return;
  window.__vareliaMedicineSaveFeedbackV1=true;

  let saveAttempt=null;

  const el=id=>document.getElementById(id);
  const value=id=>Math.max(0,Number(el(id)?.value||0)||0);
  const text=id=>String(el(id)?.value||'').trim();
  const medicineVisible=()=>{
    const fields=el('vMedicineFields');
    return !!fields&&fields.style.display!=='none';
  };

  const pairs=[
    {name:'caja',buy:'vMedicineBuyBoxPrice',sell:'vMedicineBoxPrice'},
    {name:'blíster',buy:'vMedicineBuyBlisterPrice',sell:'vMedicineBlisterPrice'},
    {name:'pastilla / unidad',buy:'vMedicineBuyUnitPrice',sell:'vMedicineUnitPrice'}
  ];

  function showStatus(message){
    let box=el('vareliaMedicineSaveStatus');
    if(!box){
      box=document.createElement('div');
      box.id='vareliaMedicineSaveStatus';
      box.style.cssText='position:fixed;left:18px;right:18px;bottom:92px;z-index:1000001;padding:16px 18px;border-radius:16px;background:#111827;color:#fff;font-weight:800;font-size:16px;line-height:1.35;box-shadow:0 14px 36px rgba(0,0,0,.28);text-align:center;';
      document.body.appendChild(box);
    }
    box.textContent=message;
    box.style.display='block';
    clearTimeout(box.__hideTimer);
    box.__hideTimer=setTimeout(()=>{box.style.display='none'},4200);
  }

  function currentProduct(){
    let rows=[];
    try{if(typeof products!=='undefined'&&Array.isArray(products))rows=products}catch{}
    if(!rows.length&&Array.isArray(window.products))rows=window.products;
    const id=text('productId');
    const barcode=text('barcode');
    const name=text('productName').toLowerCase();
    return (id&&rows.find(p=>String(p?.id||'')===id))
      ||(barcode&&rows.find(p=>String(p?.barcode||'').trim()===barcode))
      ||(name&&rows.find(p=>String(p?.name||'').trim().toLowerCase()===name))
      ||null;
  }

  function validateCosts(){
    for(const p of pairs){
      if(value(p.sell)>0&&!(value(p.buy)>0))return p;
    }
    return null;
  }

  document.addEventListener('click',e=>{
    const submit=e.target?.closest?.('#productForm button[type="submit"],#productForm input[type="submit"]');
    if(!submit||!medicineVisible())return;

    const missing=validateCosts();
    if(missing){
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      const input=el(missing.buy);
      const msg='Falta el precio de compra por '+missing.name+'. Escríbelo antes de guardar; Varelia no lo calcula automáticamente.';
      showStatus('⚠️ '+msg);
      try{window.vareliaToast?.(msg,'warn')}catch{}
      setTimeout(()=>{input?.focus?.();input?.scrollIntoView?.({behavior:'smooth',block:'center'})},40);
      return;
    }

    saveAttempt={time:Date.now(),id:text('productId'),barcode:text('barcode'),name:text('productName')};
    showStatus('⏳ Guardando y sincronizando producto…');
  },true);

  function watchDialog(){
    const dlg=el('productDialog');
    if(!dlg||dlg.__vareliaMedicineSaveFeedbackWatch)return false;
    dlg.__vareliaMedicineSaveFeedbackWatch=true;
    new MutationObserver(()=>{
      if(dlg.open||!saveAttempt)return;
      const attempt=saveAttempt;
      saveAttempt=null;
      if(Date.now()-attempt.time>35000)return;
      const p=currentProduct();
      if(p&&p.__vareliaMedicineSyncPending!==true){
        showStatus('✓ Producto guardado y sincronizado correctamente.');
      }
    }).observe(dlg,{attributes:true,attributeFilter:['open']});
    return true;
  }

  const boot=()=>{
    if(watchDialog())return;
    setTimeout(boot,120);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
