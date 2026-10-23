(()=>{
  if(window.__vareliaStaffOperations)return;
  window.__vareliaStaffOperations=true;

  const toast=(m,t='warn')=>window.vareliaToast?window.vareliaToast(m,t):alert(m);
  const getProfile=()=>window.vareliaCurrentUserProfile||null;
  const isStaff=()=>{const p=getProfile();return !!p&&String(p.role||'owner')!=='owner'};
  const getProducts=()=>{try{return Array.isArray(products)?products:[]}catch{return[]}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const style=document.createElement('style');
  style.id='vareliaStaffOperationsCss';
  style.textContent=`
    #vstaffQuickQtyWrap{display:none!important}
    #vstaffOpsCard{margin:0 0 16px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
    #vstaffOpsCard h3{margin:0 0 5px;font-size:15px}#vstaffOpsCard p{margin:0 0 12px;color:var(--muted);font-size:12px}
    .vstaffOpsButtons{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .vstaffOpBtn{border:0;border-radius:13px;padding:13px 11px;font-weight:900;font-size:13px;background:var(--bg);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}
    .vstaffOpBtn.return{background:#ecfdf5;color:#047857;box-shadow:inset 0 0 0 1px #a7f3d0}
    .vstaffOpBtn.restock{background:#eff6ff;color:#1d4ed8;box-shadow:inset 0 0 0 1px #bfdbfe}
    #vstaffStockDialog{width:min(92vw,480px);border:0;border-radius:22px;padding:0;background:var(--card);color:var(--ink);box-shadow:0 28px 90px #0005}
    #vstaffStockDialog::backdrop{background:#0f172a99;backdrop-filter:blur(4px)}
    .vstaffStockCard{padding:20px}.vstaffStockHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.vstaffStockHead h3{margin:0}
    .vstaffStockClose{border:0;width:38px;height:38px;border-radius:11px;background:var(--bg);color:inherit;font-size:22px}
    .vstaffStockForm{display:grid;gap:12px;margin-top:15px}.vstaffStockForm label{display:grid;gap:6px;font-size:12px;font-weight:850}
    .vstaffStockForm select,.vstaffStockForm input{width:100%;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:12px}
    .vstaffStockSave{border:0;border-radius:13px;padding:13px;background:var(--p);color:#fff;font-weight:900}
    #vstaffPosReturn{margin-left:8px}
    @media(max-width:650px){
      #vareliaPosSales .vposSearch{grid-template-columns:1fr!important}
      #vareliaPosSales .vposSearch #vposScan{grid-column:auto}
      .vstaffOpsButtons{grid-template-columns:1fr}
      #vstaffPosReturn{margin-left:0;margin-top:8px;width:100%}
    }
  `;
  document.head.appendChild(style);

  function removeQuickQty(){
    const wrap=document.getElementById('vstaffQuickQtyWrap');
    if(wrap)wrap.remove();
    const search=document.querySelector('#vareliaPosSales .vposSearch');
    if(search)search.style.gridTemplateColumns='';
    return true;
  }

  function setCartQtyById(id,value){
    try{
      if(!Array.isArray(cart))return;
      const item=cart.find(x=>String(x.id)===String(id));
      const p=getProducts().find(x=>String(x.id)===String(id));
      if(!item||!p)return;
      const max=Math.max(1,Math.floor(Number(p.stock)||1));
      let q=Math.max(1,Math.min(Math.floor(Number(value)||1),max));
      item.qty=q;
      try{if(typeof renderCart==='function')renderCart()}catch{}
      try{window.VareliaPOS?.sync?.()}catch{}
    }catch(err){console.error(err)}
  }

  document.addEventListener('click',e=>{
    const plus=e.target.closest?.('[data-pos-plus],[data-force-plus]');
    const minus=e.target.closest?.('[data-pos-minus],[data-force-minus]');
    if(!plus&&!minus)return;
    const btn=plus||minus;
    let id=btn.dataset.posPlus||btn.dataset.posMinus||'';
    if(!id && (btn.dataset.forcePlus!=null||btn.dataset.forceMinus!=null)){
      const idx=Number(btn.dataset.forcePlus??btn.dataset.forceMinus);
      try{id=String(cart?.[idx]?.id||'')}catch{}
    }
    if(!id)return;
    let current=1;try{current=Number(cart.find(x=>String(x.id)===id)?.qty)||1}catch{}
    e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
    setCartQtyById(id,current+(plus?1:-1));
  },true);

  function resolveVisibleCartId(inp){
    let id=inp?.dataset?.posQty||'';
    if(!id&&inp?.dataset?.forceQty!=null){try{id=String(cart?.[Number(inp.dataset.forceQty)]?.id||'')}catch{}}
    return id;
  }

  function commitVisibleCartQty(inp){
    const id=resolveVisibleCartId(inp);
    if(!id)return;
    const raw=String(inp.value??'').trim();
    if(raw===''){inp.value='1';setCartQtyById(id,1);return}
    setCartQtyById(id,raw);
  }

  document.addEventListener('input',e=>{
    const inp=e.target.closest?.('[data-pos-qty],[data-force-qty]');
    if(!inp)return;
    // Do not re-render while the user is deleting/typing the number.
    const raw=String(inp.value??'').trim();
    if(raw==='')return;
  },true);

  document.addEventListener('change',e=>{
    const inp=e.target.closest?.('[data-pos-qty],[data-force-qty]');
    if(inp)commitVisibleCartQty(inp);
  },true);

  document.addEventListener('focusout',e=>{
    const inp=e.target.closest?.('[data-pos-qty],[data-force-qty]');
    if(inp)commitVisibleCartQty(inp);
  },true);

  document.addEventListener('keydown',e=>{
    const inp=e.target.closest?.('[data-pos-qty],[data-force-qty]');
    if(!inp||e.key!=='Enter')return;
    e.preventDefault();
    commitVisibleCartQty(inp);
    inp.blur();
  },true);

  function ensureDialog(){
    let d=document.getElementById('vstaffStockDialog');
    if(d)return d;
    d=document.createElement('dialog');
    d.id='vstaffStockDialog';
    d.innerHTML=`<div class="vstaffStockCard">
      <div class="vstaffStockHead"><div><h3 id="vstaffStockTitle">Movimiento de mercadería</h3><div style="font-size:11px;color:var(--muted);margin-top:4px">Selecciona producto y cantidad.</div></div><button type="button" class="vstaffStockClose">×</button></div>
      <form class="vstaffStockForm" id="vstaffStockForm">
        <label>Código de barras<div style="display:grid;grid-template-columns:1fr auto;gap:8px"><input id="vstaffStockBarcode" inputmode="numeric" placeholder="Escanea o escribe el código"><button type="button" class="btn secondary" id="vstaffStockScan">📷 Escanear</button></div></label>
        <label>Producto<select id="vstaffStockProduct"></select></label>
        <label>Cantidad<input id="vstaffStockQty" type="number" inputmode="numeric" min="0.001" step="0.001" value="1" required></label>
        <input id="vstaffStockEvent" type="hidden" value="restock">
        <button class="vstaffStockSave" type="submit">Confirmar</button>
      </form>
    </div>`;
    document.body.appendChild(d);
    d.querySelector('.vstaffStockClose').onclick=()=>d.close();
    d.querySelector('#vstaffStockForm').onsubmit=submitStock;
    const bc=d.querySelector('#vstaffStockBarcode'),sel=d.querySelector('#vstaffStockProduct');
    const recognize=()=>{const code=String(bc.value||'').trim();if(!code)return;const p=getProducts().find(x=>String(x.barcode||'').trim()===code);if(!p)return toast('Código no registrado.');sel.value=String(p.id);toast('Producto reconocido: '+p.name,'ok')};
    bc.addEventListener('change',recognize);bc.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();recognize()}});
    d.querySelector('#vstaffStockScan').onclick=()=>{d.close();window.__vareliaReturnScanTarget=true;document.getElementById('scanForInventory')?.click()};
    return d;
  }

  function fillProducts(d){
    const sel=d.querySelector('#vstaffStockProduct');
    const list=getProducts().filter(p=>Number(p.stock)>=0);
    sel.innerHTML=list.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · Stock ${Number(p.stock)||0}</option>`).join('');
  }

  function openStock(event){
    const d=ensureDialog();
    fillProducts(d);
    if(!d.querySelector('#vstaffStockProduct').options.length)return toast('No hay productos disponibles.');
    d.querySelector('#vstaffStockEvent').value=event;
    d.querySelector('#vstaffStockQty').value='1';
    d.querySelector('#vstaffStockBarcode').value='';
    d.querySelector('#vstaffStockTitle').textContent=event==='return'?'↩ Devolver mercadería':'📦 Reponer mercadería';
    d.querySelector('.vstaffStockSave').textContent=event==='return'?'Registrar devolución':'Registrar reposición';
    d.showModal();
  }

  async function submitStock(e){
    e.preventDefault();
    const d=ensureDialog();
    const id=d.querySelector('#vstaffStockProduct').value;
    const qty=Number(d.querySelector('#vstaffStockQty').value);
    if(!Number.isFinite(qty)||qty<=0){alert('Ingresa una cantidad mayor que cero.');return}
    const event=d.querySelector('#vstaffStockEvent').value==='return'?'return':'restock';
    const p=getProducts().find(x=>String(x.id)===String(id));
    if(!p)return toast('Selecciona un producto.');
    if(typeof window.vareliaCentralStockIn!=='function')return toast('Actualiza la página y vuelve a intentarlo.');
    const saveBtn=d.querySelector('.vstaffStockSave');saveBtn.disabled=true;
    try{
      await window.vareliaCentralStockIn({product:p,event,qty});
      d.close();
      toast(event==='return'
        ? 'Devolución registrada. '+qty+' unidad(es) regresaron al stock.'
        : 'Reposición registrada. Se agregaron '+qty+' unidad(es) al stock.','ok');
    }catch(err){
      console.error(err);toast(err?.message||'No se pudo registrar el movimiento.');
    }finally{saveBtn.disabled=false}
  }

  document.addEventListener('input',e=>{if(!window.__vareliaReturnScanTarget||e.target?.id!=='inventoryCode')return;const code=String(e.target.value||'').trim();if(!code)return;const p=getProducts().find(x=>String(x.barcode||'').trim()===code);if(!p)return;window.__vareliaReturnScanTarget=false;setTimeout(()=>{const d=ensureDialog();fillProducts(d);d.querySelector('#vstaffStockEvent').value='return';d.querySelector('#vstaffStockTitle').textContent='↩ Devolver mercadería';d.querySelector('.vstaffStockSave').textContent='Registrar devolución';d.querySelector('#vstaffStockBarcode').value=code;d.querySelector('#vstaffStockProduct').value=String(p.id);d.showModal();toast('Producto reconocido: '+p.name,'ok')},180)},true);

  function ensureOps(){
    // Inventario ya tiene su formulario completo: no duplicar Reponer/Devolver arriba.
    document.getElementById('vstaffOpsCard')?.remove();
    if(!isStaff())return false;
    const hero=document.querySelector('#vareliaPosSales .vposHero');
    if(hero&&!document.getElementById('vstaffPosReturn')){
      const b=document.createElement('button');
      b.id='vstaffPosReturn';b.type='button';b.className='btn secondary';b.textContent='↩ Devolución';
      b.onclick=()=>openStock('return');hero.appendChild(b);
    }
    return true;
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-vstaff-op]');
    if(!b)return;
    e.preventDefault();openStock(b.dataset.vstaffOp);
  });

  function tick(){
    removeQuickQty();
    ensureOps();
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;tick();if(tries>160)clearInterval(timer)},250);
  new MutationObserver(()=>tick()).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('pageshow',()=>setTimeout(tick,100));
})();

// Impresión del comprobante: imprimir el HTML ya renderizado del ticket.
// Evita que el código JavaScript del detalle aparezca literalmente en la hoja.
(()=>{
  if(window.__vareliaReceiptPrintLiteralFixV1)return;
  window.__vareliaReceiptPrintLiteralFixV1=true;

  function thermalWidth(){
    let value=window.vareliaVideoSettings?.thermalWidth;
    try{
      if(!value){
        const scopedKey=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_video_settings_v1'):'';
        const scoped=scopedKey?JSON.parse(localStorage.getItem(scopedKey)||'{}'):{};
        value=scoped?.thermalWidth;
      }
    }catch{}
    try{if(!value)value=JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')?.thermalWidth}catch{}
    return String(value)==='58'?58:80;
  }

  function printableHtml(){
    const source=document.querySelector('#vreceiptPreview .vreceiptPaper');
    if(!source)return '';
    const clone=source.cloneNode(true);
    clone.removeAttribute('style');
    const width=thermalWidth(),paper=width===58?52:72;
    return `<html><head><meta charset="utf-8"><style>
      @page{size:${width}mm auto;margin:2mm}
      *{box-sizing:border-box}html,body{margin:0!important;padding:0!important;background:#fff;color:#111;width:100%}
      body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .vreceiptPaper{width:${paper}mm!important;margin:0 auto!important;padding:2mm 1.5mm!important;background:#fff!important;color:#111!important;border:0!important;border-radius:0!important}
      .vreceiptPaper h3{text-align:center;margin:0;font-size:17px}.center{text-align:center}.muted{color:#555;font-size:10px}.vreceiptSep{border-top:1px dashed #777;margin:2mm 0}
      .vreceiptLine{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2mm;margin:1.2mm 0;font-size:11px;align-items:start}.vreceiptLine>span:last-child,.vreceiptLine>b:last-child{text-align:right}
      .vreceiptItemName{font-weight:800}.vreceiptItemMeta{font-size:10px;color:#444;line-height:1.35;margin-top:.5mm}.vreceiptTotal{display:flex;justify-content:space-between;gap:2mm;font-size:18px;font-weight:900;margin-top:2mm}
      .vreceiptDisclaimer{font-size:9px;text-align:center;color:#555;margin-top:3mm;line-height:1.35}.vreceiptPaper img{display:block;margin:0 auto 2mm;max-width:${width===58?24:30}mm!important;max-height:${width===58?18:22}mm!important;width:auto!important;height:auto!important;object-fit:contain}
    </style></head><body>${clone.outerHTML}</body></html>`;
  }

  function nativeThermalPayload(sale){
    const cfg=window.vareliaVideoSettings||{};
    const items=Array.isArray(sale?.items)?sale.items:[];
    let total=Number(sale?.total)||0;
    if(total<=0)total=items.reduce((sum,item)=>sum+(Number(item?.qty)||0)*(Number(item?.price)||0),0);
    const ticket=String(sale?.receiptNumber||sale?.receipt_number||('V-'+String(sale?.id||Date.now()).replace(/[^a-z0-9]/gi,'').slice(-10).toUpperCase()));
    const breakdown=(sale?.paymentBreakdown&&typeof sale.paymentBreakdown==='object')?sale.paymentBreakdown:((sale?.payment_breakdown&&typeof sale.payment_breakdown==='object')?sale.payment_breakdown:{});
    const received=Number(sale?.received??sale?.amountReceived??sale?.paidAmount??total)||0;
    const change=Number(sale?.change??sale?.changeAmount??Math.max(0,received-total))||0;
    const business=document.getElementById('vareliaBusinessName')?.textContent?.trim()||window.vareliaBusinessDisplayName||cfg.businessName||'Varelia Store';
    const seller=String(sale?.sellerName||sale?.seller_name||'');
    return {
      business:String(business),
      logo:String(cfg.logo||window.vareliaCloudBusinessLogo||''),
      ruc:String(cfg.ruc||''),
      phone:String(cfg.phone||''),
      address:String(cfg.address||''),
      message:String(cfg.ticketMessage||'Gracias por su compra.'),
      thermalWidth:String(thermalWidth()),
      ticket,
      date:new Date(sale?.date||Date.now()).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'}),
      method:String(sale?.paymentMethod||sale?.method||'Efectivo'),
      seller,
      customer:String(sale?.customerName||sale?.customer_name||''),
      total,
      received,
      change,
      breakdown,
      items:items.map(i=>({
        name:String(i?.name||'Producto'),
        qty:Number(i?.qty||0),
        price:Number(i?.price||0),
        subtotal:Number(i?.qty||0)*Number(i?.price||0),
        saleType:String(i?.saleType||''),
        unit:String(i?.medicineSaleUnit||i?.sale_unit||i?.saleUnit||i?.unit||i?.unitType||''),
        byWeight:i?.byWeight===true,
        description:String(i?.description||i?.detail||i?.details||i?.specifications||i?.specification||'')
      }))
    };
  }

  function printFixed(sale){
    if(window.VareliaAndroid&&typeof window.VareliaAndroid.printSaleReceipt==='function'){
      try{
        window.VareliaAndroid.printSaleReceipt(JSON.stringify(nativeThermalPayload(sale)));
        return true;
      }catch(err){console.warn('Impresión térmica nativa no disponible; se usará el respaldo HTML',err)}
    }
    const html=printableHtml();
    if(!html)return false;
    const title='Comprobante '+String(sale?.receiptNumber||sale?.receipt_number||'venta');
    if(window.VareliaAndroid&&typeof window.VareliaAndroid.printHtmlDocument==='function'){
      try{window.VareliaAndroid.printHtmlDocument(title,html);return true}catch(err){console.warn('Impresión nativa corregida no disponible',err)}
    }
    let w=null,frame=null;
    try{w=window.open('','_blank','width=420,height=720')}catch{}
    if(!w){
      frame=document.createElement('iframe');
      frame.setAttribute('title','Imprimir comprobante');
      frame.style.cssText='position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff;z-index:2147483647';
      document.body.appendChild(frame);
      w=frame.contentWindow;
    }
    if(!w)return false;
    try{
      w.document.open();w.document.write(html);w.document.close();
      setTimeout(()=>{try{w.focus()}catch{}try{w.print()}catch(err){console.error('Error al imprimir comprobante',err)}setTimeout(()=>{try{frame?.remove()}catch{}},1200)},300);
      return true;
    }catch(err){console.error('No se pudo preparar la impresión corregida',err);try{frame?.remove()}catch{};return false}
  }

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#vreceiptPrint');
    if(!btn||!document.querySelector('#vreceiptPreview .vreceiptPaper'))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(!printFixed(window.__vareliaCurrentReceiptSale))alert('No se pudo abrir la impresión.');
  },true);

  let attempts=0;
  const patch=setInterval(()=>{
    attempts++;
    const api=window.VareliaReceipt;
    if(api&&!api.__vareliaPrintLiteralFixed){
      const original=typeof api.print==='function'?api.print.bind(api):null;
      api.print=sale=>printFixed(sale)||(original?original(sale):undefined);
      api.__vareliaPrintLiteralFixed=true;
      clearInterval(patch);
    }else if(attempts>120)clearInterval(patch);
  },100);
})();
