(()=>{
  if(window.__vareliaCatalogOrderDirectPrint)return;
  window.__vareliaCatalogOrderDirectPrint=true;

  function getThermalWidth(){
    let value='';
    try{value=String(window.vareliaVideoSettings?.thermalWidth||'')}catch{}
    try{if(!value)value=String(JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')?.thermalWidth||'')}catch{}
    return value==='58'?58:80;
  }

  function ensurePrintCss(){
    const width=getThermalWidth();
    const existing=document.getElementById('vareliaCatalogOrderDirectPrintCss');
    if(existing)existing.remove();
    const style=document.createElement('style');
    style.id='vareliaCatalogOrderDirectPrintCss';
    style.textContent='@page{size:'+width+'mm auto;margin:0}@media print{html,body{margin:0!important;padding:0!important;width:'+width+'mm!important;background:#fff!important}body *{visibility:hidden!important}#catalogOrderReceipt,#catalogOrderReceipt *{visibility:visible!important}#catalogOrderReceipt{display:block!important;position:absolute!important;left:0!important;top:0!important;width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:0!important;background:#fff!important}#catalogOrderReceipt .vreceiptWrap{width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:0!important}#catalogOrderReceipt .vreceiptPaper{box-sizing:border-box!important;width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:4mm!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#111!important}#catalogOrderReceipt .vreceiptActions,#vreceiptBack{display:none!important}}';
    document.head.appendChild(style);
  }

  document.addEventListener('click',function(e){
    const button=e.target&&e.target.closest?e.target.closest('#vcatalogReceiptPrint'):null;
    if(!button)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    try{
      ensurePrintCss();
      requestAnimationFrame(()=>setTimeout(()=>window.print(),80));
    }catch(err){
      console.error('Varelia catalog order direct print',err);
      alert('No se pudo abrir la impresión. Inténtalo nuevamente.');
    }
  },true);
})();
