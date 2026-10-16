self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url=new URL(e.request.url);

  // Restaurar el comportamiento anterior del comprobante de pedido:
  // imprimir exactamente el comprobante que se ve en pantalla, sin convertirlo
  // al formato nativo de "comprobante interno de venta" de la APK 1.0.50.
  if(url.origin===self.location.origin && url.pathname.endsWith('/catalog-orders.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        let body=await base.text();
        const printBlock=/function printThermal\(\)\{[\s\S]*?\n  const printButton=/;
        const restored=`function printThermal(){
    const source=sec.querySelector('.vreceiptPaper');
    if(!source)throw new Error('No se encontró el comprobante');
    const paper=source.cloneNode(true);
    paper.querySelector('.vreceiptActions')?.remove();
    const width=thermalWidth(), printable=width===58?52:74, logoW=width===58?22:24;
    let w=null;
    try{w=window.open('','_blank','width=420,height=720')}catch{}
    if(!w)throw new Error('No se pudo abrir la vista de impresión');
    const printCss='@page{size:'+width+'mm auto;margin:3mm}*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;background:#fff!important;color:#111!important}body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact}.vreceiptPaper{width:'+printable+'mm!important;max-width:100%!important;margin:0 auto!important;padding:0!important;background:#fff!important;color:#111!important;border:0!important;border-radius:0!important;box-shadow:none!important;line-height:1.35;overflow-wrap:anywhere}.vreceiptPaper h3{text-align:center;font-size:17px;margin:0 0 3px;color:#111}.center{text-align:center}.muted{color:#555;font-size:10px}.status{text-align:center;font-size:10px;font-weight:900;margin:2mm 0}.vreceiptLogo{text-align:center;margin:0 0 2mm}.vreceiptLogo img{display:block;margin:0 auto;max-width:'+logoW+'mm;max-height:17mm;width:auto;height:auto;object-fit:contain}.vreceiptSep{border-top:1px dashed #888;margin:2mm 0}.vreceiptLine{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2mm;align-items:start;margin:1.2mm 0;font-size:10px}.vreceiptLine>span:last-child,.vreceiptLine>b:last-child{text-align:right;overflow-wrap:anywhere}.item{border:0;border-bottom:1px dashed #bbb;padding:1.8mm 0;font-size:10px;break-inside:avoid}.itemqty{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2mm;align-items:start;font-size:9px;color:#444;line-height:1.35;margin-top:.8mm}.itemqty>b{white-space:nowrap;text-align:right;color:#111}.vreceiptTotal{display:flex;justify-content:space-between;gap:2mm;font-size:17px;font-weight:900;margin-top:2mm;padding-top:2mm;border-top:2px solid #111}.vreceiptDisclaimer{font-size:9px;text-align:center;color:#555;margin-top:3mm;line-height:1.35}.vreceiptActions{display:none!important}';
    w.document.open();
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comprobante '+esc(o.order_code)+'</title><style>'+printCss+'</style></head><body>'+paper.outerHTML+'</body></html>');
    w.document.close();
    let done=false;
    const runPrint=()=>{if(done)return;done=true;setTimeout(()=>{try{w.focus();w.print()}catch(err){console.error(err)}},180)};
    const imgs=Array.from(w.document.images||[]);
    if(imgs.length&&imgs.some(img=>!img.complete)){
      let remaining=imgs.filter(img=>!img.complete).length;
      const ready=()=>{remaining--;if(remaining<=0)runPrint()};
      imgs.forEach(img=>{if(!img.complete){img.addEventListener('load',ready,{once:true});img.addEventListener('error',ready,{once:true})}});
      setTimeout(runPrint,1800);
    }else runPrint();
  }
  const printButton=`;
        if(printBlock.test(body))body=body.replace(printBlock,restored);
        return new Response(body,{
          status:base.status,
          statusText:base.statusText,
          headers:{
            'Content-Type':'application/javascript; charset=utf-8',
            'Cache-Control':'no-store, no-cache, must-revalidate'
          }
        });
      }catch(err){
        return fetch(e.request,{cache:'no-store'});
      }
    })());
    return;
  }

  // Añadir únicamente la corrección de variantes al módulo que ya gestiona
  // talla/color/marca. El resto de archivos conserva exactamente el mismo flujo.
  if(url.origin===self.location.origin && url.pathname.endsWith('/characteristics.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        const guard=await fetch('/variant-stock-guard.js?v=20261015-v4',{cache:'no-store'});
        if(!guard.ok)return base;
        const body=(await base.text())+'\n;\n'+(await guard.text());
        return new Response(body,{
          status:base.status,
          statusText:base.statusText,
          headers:{
            'Content-Type':'application/javascript; charset=utf-8',
            'Cache-Control':'no-store, no-cache, must-revalidate'
          }
        });
      }catch(err){
        return fetch(e.request,{cache:'no-store'});
      }
    })());
    return;
  }

  e.respondWith(fetch(e.request,{cache:'no-store'}));
});
