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
      'html,body{margin:0!important;padding:0!important;background:#fff!important}'+
      '#catalogOrderReceipt{display:block!important;width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:0!important;background:#fff!important}'+
      '#catalogOrderReceipt .vreceiptWrap{width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:0!important}'+
      '#catalogOrderReceipt .vreceiptPaper{box-sizing:border-box!important;width:'+width+'mm!important;max-width:'+width+'mm!important;margin:0!important;padding:4mm!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#111!important}'+
      '#catalogOrderReceipt .vreceiptActions,#vreceiptBack{display:none!important}'+
      '@media print{html,body{margin:0!important;padding:0!important;background:#fff!important}}';

    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+baseCss+'\n'+nativeCss+'</style></head><body><section id="catalogOrderReceipt"><div class="vreceiptWrap">'+clone.outerHTML+'</div></section></body></html>';
  }

  function receiptTitle(){
    const lines=[...document.querySelectorAll('#catalogOrderReceipt .center.muted')];
    const code=lines.map(x=>x.textContent||'').find(x=>/^N\.º\s*/i.test(x))||'';
    return 'Comprobante '+String(code.replace(/^N\.º\s*/i,'').trim()||'pedido');
  }

  function encodeBase64Url(text){
    const bytes=new TextEncoder().encode(String(text||''));
    let binary='';
    for(let i=0;i<bytes.length;i+=8192){
      const chunk=bytes.subarray(i,Math.min(i+8192,bytes.length));
      binary+=String.fromCharCode.apply(null,chunk);
    }
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function openExternalPrint(html){
    const url=location.origin+'/catalog-order-print.html#'+encodeBase64Url(html);
    try{
      if(window.VareliaAndroid){
        window.VareliaAndroid.openExternal(url);
        return;
      }
    }catch(error){
      console.warn('Varelia openExternal no disponible',error);
    }
    const opened=window.open(url,'_blank');
    if(!opened)location.href=url;
  }

  document.addEventListener('click',function(e){
    const button=e.target&&e.target.closest?e.target.closest('#vcatalogReceiptPrint'):null;
    if(!button)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    try{
      const html=buildExactReceiptHtml();
      try{
        if(window.VareliaAndroid){
          window.VareliaAndroid.printHtmlDocument(receiptTitle(),html);
          return;
        }
      }catch(nativeError){
        console.info('Esta APK no tiene printHtmlDocument; usando impresión externa de Android.',nativeError);
      }
      openExternalPrint(html);
    }catch(err){
      console.error('Varelia catalog order Android print',err);
      alert('No se pudo preparar la impresión. Inténtalo nuevamente.');
    }
  },true);
})();
