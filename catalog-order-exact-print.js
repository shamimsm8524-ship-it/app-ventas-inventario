(()=>{
  if(window.__vareliaCatalogOrderExactPrintV3)return;
  window.__vareliaCatalogOrderExactPrintV3=true;

  const thermalWidth=()=>{
    let value='';
    try{value=String(window.vareliaVideoSettings?.thermalWidth||'')}catch{}
    try{if(!value)value=String(JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')?.thermalWidth||'')}catch{}
    return value==='58'?58:80;
  };

  function printExactOrder(){
    const source=document.querySelector('#catalogOrderReceipt .vreceiptPaper');
    if(!source)throw new Error('No se encontró el comprobante de pedido');

    // No modificar contenido, descripciones ni orden: imprimir una copia exacta
    // del comprobante que ya está visible en pantalla.
    const paper=source.cloneNode(true);
    paper.querySelector('.vreceiptActions')?.remove();

    const width=thermalWidth();
    const printable=width===58?52:74;
    const logoW=width===58?22:24;
    const css=`
      @page{size:${width}mm auto;margin:3mm}
      *{box-sizing:border-box}
      html,body{margin:0!important;padding:0!important;background:#fff!important;color:#111!important}
      body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .vreceiptPaper{width:${printable}mm!important;max-width:100%!important;margin:0 auto!important;padding:0!important;background:#fff!important;color:#111!important;border:0!important;border-radius:0!important;box-shadow:none!important;line-height:1.35;overflow-wrap:anywhere}
      .vreceiptPaper h3{text-align:center;font-size:17px;margin:0 0 3px;color:#111}
      .center{text-align:center}.muted{color:#555;font-size:10px}.status{text-align:center;font-size:10px;font-weight:900;margin:2mm 0}
      .vreceiptLogo{text-align:center;margin:0 0 2mm}.vreceiptLogo img{display:block;margin:0 auto;max-width:${logoW}mm;max-height:17mm;width:auto;height:auto;object-fit:contain}
      .vreceiptSep{border-top:1px dashed #888;margin:2mm 0}
      .vreceiptLine{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2mm;align-items:start;margin:1.2mm 0;font-size:10px}
      .vreceiptLine>span:last-child,.vreceiptLine>b:last-child{text-align:right;overflow-wrap:anywhere}
      .item{border:0;border-bottom:1px dashed #bbb;padding:1.8mm 0;font-size:10px;break-inside:avoid}
      .itemqty{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2mm;align-items:start;font-size:9px;color:#444;line-height:1.35;margin-top:.8mm}
      .itemqty>b{white-space:nowrap;text-align:right;color:#111}
      .vreceiptTotal{display:flex;justify-content:space-between;gap:2mm;font-size:17px;font-weight:900;margin-top:2mm;padding-top:2mm;border-top:2px solid #111}
      .vreceiptDisclaimer{font-size:9px;text-align:center;color:#555;margin-top:3mm;line-height:1.35}
      .vreceiptActions{display:none!important}
    `;

    const w=window.open('','_blank','width=420,height=720');
    if(!w)throw new Error('No se pudo abrir la vista de impresión');
    const title=String(document.querySelector('#catalogOrderReceipt .center.muted')?.textContent||'Comprobante de pedido').replace(/[<>]/g,'');
    const autoPrint=`<script>(()=>{
      let done=false;
      const go=()=>{
        if(done)return;
        done=true;
        setTimeout(()=>{try{window.focus();window.print()}catch(e){console.error(e)}},180);
      };
      const imgs=[...document.images];
      const waiting=imgs.filter(i=>!i.complete);
      if(!waiting.length){go();return}
      let left=waiting.length;
      const ready=()=>{left--;if(left<=0)go()};
      waiting.forEach(i=>{i.addEventListener('load',ready,{once:true});i.addEventListener('error',ready,{once:true})});
      setTimeout(go,1800);
    })()<\/script>`;

    w.document.open();
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+css+'</style></head><body>'+paper.outerHTML+autoPrint+'</body></html>');
    w.document.close();
  }

  document.addEventListener('click',e=>{
    const button=e.target?.closest?.('#vcatalogReceiptPrint');
    if(!button)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    try{printExactOrder()}catch(err){
      console.error(err);
      alert('No se pudo abrir la impresión del comprobante. Inténtalo nuevamente.');
    }
  },true);
})();