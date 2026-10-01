(()=>{
  if(window.__vareliaAutoTicketPrintV1)return;
  window.__vareliaAutoTicketPrintV1=true;

  let pending=null;
  const money=v=>'S/ '+Number(v||0).toFixed(2);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getSales=()=>{try{return Array.isArray(sales)?sales:[]}catch{return[]}};
  const getCart=()=>{try{return Array.isArray(cart)?cart:[]}catch{return[]}};

  function settings(){
    try{return JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')}catch{return{}}
  }
  function businessName(){
    const s=settings();
    return s.businessName||document.getElementById('vareliaBusinessName')?.textContent?.trim()||'Varelia Store';
  }
  function ticketNo(sale){
    if(sale.receiptNumber)return sale.receiptNumber;
    const id=String(sale.id||Date.now()).replace(/[^a-z0-9]/gi,'').slice(-6).toUpperCase();
    const d=new Date(sale.date||Date.now()).toISOString().slice(0,10).replace(/-/g,'');
    return 'V-'+d+'-'+id;
  }
  function paymentMethod(){
    return document.getElementById('vposPaymentMethod')?.value
      ||localStorage.getItem('varelia_last_payment_method')
      ||'Efectivo';
  }
  function sellerName(){
    const p=window.vareliaCurrentUserProfile||{};
    return p.full_name||window.vareliaSellerName||document.getElementById('vareliaUserEmail')?.textContent?.trim()?.split('@')[0]||'';
  }
  function printHtml(sale){
    const s=settings();
    const width=String(s.thermalWidth||'80')==='58'?58:80;
    const paper=width===58?52:72;
    const logoMaxW=width===58?24:30,logoMaxH=width===58?18:22;
    const items=Array.isArray(sale.items)?sale.items:[];
    const pay=sale.paymentMethod||paymentMethod();
    const bd=sale.paymentBreakdown||{};
    const payLines=Object.entries(bd).filter(([,v])=>Number(v)>0).map(([k,v])=>'<div class="line"><span>'+esc(k)+'</span><b>'+money(v)+'</b></div>').join('');
    const received=Number(sale.amountReceived||0),change=Number(sale.changeGiven||0);
    const logo=s.logo?'<div class="c logo"><img src="'+esc(s.logo)+'" alt="Logo"></div>':'';
    const seller=sale.sellerName||sellerName();
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(ticketNo(sale))}</title><style>
      @page{size:${width}mm auto;margin:3mm}
      *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}
      body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .paper{width:${paper}mm;margin:0 auto}.c{text-align:center}.logo{margin:0 0 2mm}.logo img{display:block;margin:0 auto;max-width:${logoMaxW}mm;max-height:${logoMaxH}mm;width:auto;height:auto;object-fit:contain}
      h2{font-size:17px;margin:0 0 1mm}.small{font-size:10px;color:#444;line-height:1.3}.sep{border-top:1px dashed #777;margin:2mm 0}
      .line{display:flex;justify-content:space-between;gap:2mm;margin:1.2mm 0}.item{margin:1.8mm 0}.total{font-size:18px;font-weight:900}.footer{margin-top:3mm}
    </style></head><body><div class="paper">
      ${logo}<h2 class="c">${esc(businessName())}</h2>
      <div class="c small">COMPROBANTE INTERNO DE VENTA</div>
      ${s.ruc?'<div class="c small">RUC/Doc: '+esc(s.ruc)+'</div>':''}
      ${s.phone?'<div class="c small">Tel: '+esc(s.phone)+'</div>':''}
      ${s.address?'<div class="c small">'+esc(s.address)+'</div>':''}
      <div class="sep"></div>
      <div class="line"><span>N.º</span><b>${esc(ticketNo(sale))}</b></div>
      <div class="line"><span>Fecha</span><span>${esc(new Date(sale.date||Date.now()).toLocaleString('es-PE'))}</span></div>
      <div class="line"><span>Pago</span><b>${esc(pay)}</b></div>
      ${seller?'<div class="line"><span>Vendedor</span><span>'+esc(seller)+'</span></div>':''}
      <div class="sep"></div>
      ${items.map(i=>'<div class="item"><b>'+esc(i.name||'Producto')+'</b><div class="line small"><span>'+Number(i.qty||0)+' × '+money(i.price)+'</span><b>'+money(Number(i.qty||0)*Number(i.price||0))+'</b></div></div>').join('')}
      <div class="sep"></div>
      <div class="line total"><span>TOTAL</span><span>${money(sale.total)}</span></div>
      ${payLines?'<div class="sep"></div><b>DETALLE DE PAGO</b>'+payLines:''}
      ${received?'<div class="line"><span>Total recibido</span><b>'+money(received)+'</b></div>':''}
      ${change?'<div class="line"><span>Vuelto</span><b>'+money(change)+'</b></div>':''}
      <p class="c small footer">${esc(s.ticketMessage||'Gracias por su compra.')}<br>Comprobante interno. No reemplaza boleta o factura SUNAT.</p>
    </div></body></html>`;
  }

  function finish(sale){
    if(!pending)return;
    const p=pending;pending=null;
    const snap=window.VareliaPaymentSnapshot;
    if(snap&&Date.now()-Number(snap.at||0)<10000){
      sale.paymentMethod=snap.method||sale.paymentMethod||p.method;
      sale.paymentBreakdown=snap.breakdown||sale.paymentBreakdown||{};
      sale.amountReceived=snap.received;
      sale.changeGiven=snap.change;
    }else sale.paymentMethod=sale.paymentMethod||p.method;
    sale.sellerName=sale.sellerName||sellerName();
    sale.receiptNumber=sale.receiptNumber||ticketNo(sale);
    try{if(typeof save==='function')save()}catch{}

    const w=p.win;
    if(!w||w.closed){
      window.vareliaToast?.('Permite ventanas emergentes para imprimir el ticket.','warn');
      return;
    }
    try{
      w.document.open();
      w.document.write(printHtml(sale));
      w.document.close();
      const doPrint=()=>{
        try{w.focus();w.print()}catch(e){console.error(e)}
      };
      const img=w.document.querySelector('img');
      if(img&&!img.complete){
        let done=false;
        const go=()=>{if(done)return;done=true;setTimeout(doPrint,120)};
        img.onload=go;img.onerror=go;setTimeout(go,1600);
      }else setTimeout(doPrint,160);
    }catch(e){
      console.error(e);
      try{w.close()}catch{}
    }
  }

  function waitForSale(){
    const p=pending;if(!p)return;
    let tries=0;
    const timer=setInterval(()=>{
      if(!pending||pending!==p){clearInterval(timer);return}
      tries++;
      const list=getSales();
      if(list.length>p.before){
        clearInterval(timer);
        finish(list[list.length-1]);
        return;
      }
      if(tries>50){
        clearInterval(timer);
        pending=null;
        try{p.win?.close()}catch{}
      }
    },100);
  }

  function prepare(){
    const items=getCart();
    if(!items.length)return;
    if(pending)return;
    let w=null;
    try{
      w=window.open('','_blank','width=420,height=720');
      if(w){
        w.document.write('<html><body style="font-family:sans-serif;padding:28px;text-align:center"><b>Preparando ticket...</b><p>Espera la confirmación de la venta.</p></body></html>');
        w.document.close();
      }
    }catch{}
    pending={before:getSales().length,method:paymentMethod(),win:w,at:Date.now()};
    waitForSale();
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#vposCheckout,#checkout');
    if(!b)return;
    prepare();
  },true);

  window.VareliaAutoTicketPrint={prepare};
})();