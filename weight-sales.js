(()=>{if(window.__vareliaWeightSales)return;window.__vareliaWeightSales=true;
const all=()=>{try{return Array.isArray(products)?products:[]}catch{return[]}},isKg=p=>String(p?.unit||'').trim().toLowerCase()==='kg';
const findProduct=(id,barcode,name)=>all().find(x=>String(x.id)===String(id))||all().find(x=>barcode&&String(x.barcode||'').trim()===String(barcode).trim())||all().find(x=>name&&String(x.name||'').trim().toLowerCase()===String(name).trim().toLowerCase());
const st=document.createElement('style');st.textContent='.vwDlg{border:0;border-radius:20px;padding:0;width:min(430px,92vw);background:var(--card);color:var(--ink);box-shadow:0 24px 70px #0005}.vwDlg::backdrop{background:#0f172a99}.vwBody{padding:18px}.vwHead{display:flex;justify-content:space-between;align-items:center;gap:12px}.vwHead h3{margin:0}.vwClose{border:0;background:transparent;color:var(--ink);font-size:28px}.vwInfo{margin:6px 0 15px;color:var(--muted);font-size:13px}.vwQuick{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.vwQuick button{padding:14px;border:1px solid var(--line);border-radius:13px;background:var(--bg);color:var(--ink);font-weight:900;display:grid;gap:4px;text-align:left}.vwQuick button small{color:var(--p);font-size:14px;font-weight:950}.vwQuick button.active{border:2px solid var(--p);background:color-mix(in srgb,var(--p) 8%,var(--card))}.vwManual{display:grid;grid-template-columns:1fr 110px;gap:9px;margin-top:12px}.vwManual input,.vwManual select{width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink)}.vwCalc{margin-top:14px;padding:13px;border-radius:14px;background:var(--bg);display:flex;justify-content:space-between;align-items:center}.vwCalc strong{font-size:24px;color:var(--p)}.vwAdd{width:100%;margin-top:12px;padding:14px}.vwError{display:none;margin-top:10px;padding:10px 12px;border-radius:10px;background:#fff1f2;color:#9f1239;font-size:13px;font-weight:700}.vwError.show{display:block}';document.head.appendChild(st);
const d=document.createElement('dialog');d.className='vwDlg';d.innerHTML='<div class="vwBody"><div class="vwHead"><h3 id="vwName">Venta por peso</h3><button class="vwClose" type="button">×</button></div><div class="vwInfo" id="vwInfo"></div><div class="vwQuick"><button data-g="100"><span>100 g</span><small></small></button><button data-g="250"><span>250 g</span><small></small></button><button data-g="500"><span>500 g</span><small></small></button><button data-g="1000"><span>1 kg</span><small></small></button></div><div class="vwManual"><input id="vwValue" type="number" inputmode="decimal" min="0.001" step="0.001" placeholder="Escribe el peso"><select id="vwUnit"><option value="g">gramos</option><option value="kg">kg</option></select></div><div class="vwCalc"><span id="vwQty">0 kg</span><strong id="vwTotal">S/ 0.00</strong></div><div class="vwError" id="vwError" role="alert" aria-live="polite"></div><button class="btn primary vwAdd" id="vwAdd" type="button">Agregar a la venta</button></div>';document.body.appendChild(d);
let current=null;const val=d.querySelector('#vwValue'),unit=d.querySelector('#vwUnit'),kg=()=>Math.max(0,Number(val.value)||0)*(unit.value==='g'?.001:1);
const showError=message=>{const el=d.querySelector('#vwError');el.textContent=message||'';el.classList.toggle('show',!!message)};const render=()=>{const q=kg(),grams=Math.round(q*1000);d.querySelector('#vwQty').textContent=q?(grams+' g · '+q.toFixed(3)+' kg'):'0 g';d.querySelector('#vwTotal').textContent='S/ '+(q*Number(current?.sellPrice||0)).toFixed(2);d.querySelectorAll('[data-g]').forEach(b=>b.classList.toggle('active',Number(b.dataset.g)===grams));showError('')};
const open=p=>{current=p;showError('');d.querySelectorAll('[data-g]').forEach(b=>{b.querySelector('small').textContent='S/ '+(Number(p.sellPrice||0)*Number(b.dataset.g)/1000).toFixed(2)});d.querySelector('#vwName').textContent=p.name;d.querySelector('#vwInfo').textContent='Precio por kg: S/ '+Number(p.sellPrice||0).toFixed(2)+' · Stock '+Number(p.stock||0).toFixed(3)+' kg';val.value='';unit.value='g';render();d.showModal()};
d.querySelector('.vwClose').onclick=()=>d.close();d.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{val.value=b.dataset.g;unit.value='g';render();val.focus()});val.oninput=render;unit.onchange=render;
d.querySelector('#vwAdd').onclick=()=>{const q=kg();if(!current||q<=0){showError('Ingresa un peso válido para continuar.');return}const fresh=findProduct(current.id,current.barcode,current.name)||current;current=fresh;const stock=Number(fresh.stock||0);if(q>stock){showError(stock<=0?'No se puede agregar: este producto tiene stock 0 kg. Registra primero el ingreso de mercadería o corrige el inventario.':'No hay suficiente stock. Disponible: '+stock.toFixed(3)+' kg.');return}const ok=window.VareliaCartAddWeight?.(current,q);if(!ok){showError('No se pudo agregar. Verifica el stock y vuelve a intentarlo.');return}showError('');window.vareliaSound?.('add');window.vareliaToast?.(current.name+' · '+Math.round(q*1000)+' g agregado','ok');d.close();val.value='';setTimeout(()=>window.VareliaPOS?.sync?.(),60)}
document.addEventListener('click',e=>{const add=e.target.closest?.('[data-add]');if(add){const p=all().find(x=>String(x.id)===String(add.dataset.add));if(isKg(p)){e.preventDefault();e.stopImmediatePropagation();try{if(typeof openSale==='function')openSale()}catch{};open(p);return}}const b=e.target.closest?.('#vposSuggestions [data-pos-id]');if(!b)return;const p=all().find(x=>String(x.id)===String(b.dataset.posId));if(!isKg(p))return;e.preventDefault();e.stopImmediatePropagation();open(p)},true);
document.addEventListener('keydown',e=>{const input=e.target.closest?.('#vposInput');if(!input||e.key!=='Enter')return;const q=String(input.value||'').trim().toLowerCase(),p=all().find(x=>String(x.barcode||'').trim().toLowerCase()===q)||all().find(x=>String(x.name||'').trim().toLowerCase()===q);if(!isKg(p))return;e.preventDefault();e.stopImmediatePropagation();open(p);input.value=''},true);
// En la caja principal, cualquier producto Kg debe abrir el selector antes de sumarse como unidad.
document.addEventListener('click',e=>{
 const row=e.target.closest?.('#vareliaPosSales .vposItem');
 if(!row)return;
 const id=row.querySelector('[data-pos-plus]')?.dataset.posPlus||row.querySelector('[data-pos-qty]')?.dataset.posQty;
 const p=findProduct(id,'',row.querySelector('.vposItemName')?.textContent);
 if(!isKg(p))return;
 const plus=e.target.closest('[data-pos-plus]'),qty=e.target.closest('[data-pos-qty]');
 if(plus){e.preventDefault();e.stopImmediatePropagation();open(p)}
 if(qty){e.preventDefault();e.stopImmediatePropagation();open(p)}
},true);
window.addEventListener('varelia:central-stock-updated',()=>setTimeout(()=>window.VareliaPOS?.sync?.(),0));
window.VareliaWeightSale={open};})();

// Comprobante de pedido: en APK 1.0.50 imprimir exactamente el recibo visible.
// Este listener corre en captura antes del onclick del módulo de pedidos para evitar
// que el pedido sea convertido al formato resumido de "comprobante interno de venta".
(()=>{
  if(window.__vareliaCatalogOrderExactPrintV1)return;
  window.__vareliaCatalogOrderExactPrintV1=true;

  function thermalWidth(){
    let value='';
    try{value=String(window.vareliaVideoSettings?.thermalWidth||'')}catch{}
    try{if(!value)value=String(JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')?.thermalWidth||'')}catch{}
    return value==='58'?58:80;
  }

  function exactOrderPrint(){
    const source=document.querySelector('#catalogOrderReceipt .vreceiptPaper');
    if(!source)throw new Error('No se encontró el comprobante de pedido');
    const paper=source.cloneNode(true);
    paper.querySelector('.vreceiptActions')?.remove();
    const width=thermalWidth(),paperWidth=width===58?52:74,logoWidth=width===58?22:24;
    let w=null;
    try{w=window.open('','_blank','width=420,height=720')}catch{}
    if(!w)throw new Error('No se pudo abrir la vista de impresión');

    const css='@page{size:'+width+'mm auto;margin:3mm}*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;background:#fff!important;color:#111!important}body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact}.vreceiptPaper{width:'+paperWidth+'mm!important;max-width:100%!important;margin:0 auto!important;padding:0!important;background:#fff!important;color:#111!important;border:0!important;border-radius:0!important;box-shadow:none!important;line-height:1.35;overflow-wrap:anywhere}.vreceiptPaper h3{text-align:center;font-size:17px;margin:0 0 3px;color:#111}.center{text-align:center}.muted{color:#555;font-size:10px}.status{text-align:center;font-size:10px;font-weight:900;margin:2mm 0}.vreceiptLogo{text-align:center;margin:0 0 2mm}.vreceiptLogo img{display:block;margin:0 auto;max-width:'+logoWidth+'mm;max-height:17mm;width:auto;height:auto;object-fit:contain}.vreceiptSep{border-top:1px dashed #888;margin:2mm 0}.vreceiptLine{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2mm;align-items:start;margin:1.2mm 0;font-size:10px}.vreceiptLine>span:last-child,.vreceiptLine>b:last-child{text-align:right;overflow-wrap:anywhere}.item{border:0;border-bottom:1px dashed #bbb;padding:1.8mm 0;font-size:10px;break-inside:avoid}.itemqty{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2mm;align-items:start;font-size:9px;color:#444;line-height:1.35;margin-top:.8mm}.itemqty>b{white-space:nowrap;text-align:right;color:#111}.vreceiptTotal{display:flex;justify-content:space-between;gap:2mm;font-size:17px;font-weight:900;margin-top:2mm;padding-top:2mm;border-top:2px solid #111}.vreceiptDisclaimer{font-size:9px;text-align:center;color:#555;margin-top:3mm;line-height:1.35}.vreceiptActions{display:none!important}';
    const title=String(document.querySelector('#catalogOrderReceipt .center.muted:nth-of-type(2)')?.textContent||'Comprobante de pedido').replace(/[<>]/g,'');
    w.document.open();
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+css+'</style></head><body>'+paper.outerHTML+'</body></html>');
    w.document.close();

    let printed=false;
    const run=()=>{
      if(printed)return;
      printed=true;
      setTimeout(()=>{try{w.focus();w.print()}catch(err){console.error('Varelia pedido print',err)}},220);
    };
    const imgs=Array.from(w.document.images||[]).filter(img=>!img.complete);
    if(!imgs.length){run();return}
    let left=imgs.length;
    const ready=()=>{left--;if(left<=0)run()};
    imgs.forEach(img=>{img.addEventListener('load',ready,{once:true});img.addEventListener('error',ready,{once:true})});
    setTimeout(run,1800);
  }

  document.addEventListener('click',e=>{
    const button=e.target?.closest?.('#vcatalogReceiptPrint');
    if(!button)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    try{exactOrderPrint()}catch(err){console.error(err);alert('No se pudo abrir la impresión del comprobante. Inténtalo nuevamente.')}
  },true);
})();