(()=>{
  if(window.__vareliaCatalogOrderDirectPrint)return;
  window.__vareliaCatalogOrderDirectPrint=true;

  function getThermalWidth(){
    let value='';
    try{value=String(window.vareliaVideoSettings?.thermalWidth||'')}catch{}
    try{if(!value)value=String(JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')?.thermalWidth||'')}catch{}
    return value==='58'?58:80;
  }

  function buildExactReceiptHtml(){
    const section=document.getElementById('catalogOrderReceipt');
    const source=section?.querySelector('.vreceiptPaper');
    if(!source)throw new Error('No se encontró el comprobante');

    const clone=source.cloneNode(true);
    clone.querySelector('.vreceiptActions')?.remove();
    clone.querySelectorAll('img').forEach(img=>{
      try{img.setAttribute('src',img.src)}catch{}
    });

    const width=getThermalWidth();
    const baseCss=document.getElementById('vreceiptCss')?.textContent||'';
    const nativeCss='@page{size:'+width+'mm auto;margin:0}'+
      '@media print{html,body{margin:0!important;padding:0!important;background:#fff!important}'+
      '#catalogOrderReceipt{display:block!important;position:absolute!important;left:0!important;top:0!important;width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:0!important;background:#fff!important}'+
      '#catalogOrderReceipt .vreceiptWrap{width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:0!important}'+
      '#catalogOrderReceipt .vreceiptPaper{box-sizing:border-box!important;width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:4mm!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#111!important}'+
      '#catalogOrderReceipt .vreceiptActions,#vreceiptBack{display:none!important}}';

    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+baseCss+'\n'+nativeCss+'</style></head><body><section id="catalogOrderReceipt"><div class="vreceiptWrap">'+clone.outerHTML+'</div></section></body></html>';
  }

  function receiptTitle(){
    const text=document.querySelector('#catalogOrderReceipt .center.muted:nth-of-type(2)')?.textContent||'';
    return 'Comprobante '+String(text.replace(/^N\.º\s*/i,'').trim()||'pedido');
  }

  document.addEventListener('click',function(e){
    const button=e.target&&e.target.closest?e.target.closest('#vcatalogReceiptPrint'):null;
    if(!button)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    try{
      const html=buildExactReceiptHtml();
      const native=window.VareliaAndroid;
      if(native&&typeof native.printHtmlDocument==='function'){
        native.printHtmlDocument(receiptTitle(),html);
        return;
      }
      window.print();
    }catch(err){
      console.error('Varelia catalog order Android print',err);
      alert('No se pudo abrir la impresión de Android. Inténtalo nuevamente.');
    }
  },true);
})();
