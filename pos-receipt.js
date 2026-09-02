(()=>{
  if(window.__vareliaPosReceipt)return;
  window.__vareliaPosReceipt=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const wait=setInterval(()=>{
      const pos=document.getElementById('vareliaPosSales');
      const input=document.getElementById('vposInput');
      const checkout=document.getElementById('checkout');
      if(!pos||!input||!checkout||!window.VareliaPOS)return;
      clearInterval(wait);

      const style=document.createElement('style');
      style.textContent=`
        .vposReaderBar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:10px 2px 0}.vposReaderBtn{border:1px solid color-mix(in srgb,var(--p) 35%,var(--line));background:var(--card);color:var(--p);border-radius:12px;padding:9px 12px;font-weight:900}.vposReaderState{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:12px;font-weight:800}.vposReaderDot{width:9px;height:9px;border-radius:50%;background:#94a3b8}.vposReaderDot.on{background:#16a34a;box-shadow:0 0 0 4px #16a34a22}.vposReaderDot.warn{background:#f59e0b;box-shadow:0 0 0 4px #f59e0b22}
        .vposPaymentBar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px;padding:12px 13px;border:1px solid var(--line);border-radius:14px;background:var(--bg)}.vposPaymentBar label{font-size:12px;font-weight:900;color:var(--muted)}.vposPaymentBar select{min-width:170px;border:1px solid var(--line);border-radius:11px;background:var(--card);color:var(--ink);padding:9px 11px;font-weight:800}
        .vreceiptOverlay{position:fixed;inset:0;z-index:100020;display:none;align-items:center;justify-content:center;padding:16px;background:#0f172aa8;backdrop-filter:blur(8px)}.vreceiptOverlay.show{display:flex}.vreceiptCard{width:min(96vw,520px);max-height:92vh;overflow:auto;background:var(--card);color:var(--ink);border-radius:24px;box-shadow:0 24px 70px #0004}.vreceiptHead{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)}.vreceiptHead h2{margin:0;font-size:19px}.vreceiptClose{width:38px;height:38px;border:0;border-radius:11px;background:var(--bg);color:var(--ink);font-size:22px}.vreceiptPaper{width:min(100%,360px);margin:18px auto;padding:20px 16px;background:#fff;color:#111;border:1px dashed #cbd5e1;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.vreceiptPaper h3{text-align:center;margin:0;font-size:18px}.vreceiptPaper .center{text-align:center}.vreceiptPaper .muted{color:#666;font-size:11px}.vreceiptSep{border-top:1px dashed #999;margin:12px 0}.vreceiptLine{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:7px 0;font-size:12px}.vreceiptItemName{font-weight:800}.vreceiptItemMeta{font-size:11px;color:#555;margin-top:2px}.vreceiptTotal{display:flex;justify-content:space-between;gap:12px;font-size:18px;font-weight:950;margin-top:10px}.vreceiptDisclaimer{font-size:10px;text-align:center;color:#666;margin-top:14px;line-height:1.4}.vreceiptActions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 18px 18px}.vreceiptActions button{border:0;border-radius:12px;padding:11px 9px;font-weight:900}.vreceiptPrimary{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff}.vreceiptSecondary{background:var(--bg);color:var(--ink);border:1px solid var(--line)!important}
        @media(max-width:560px){.vposPaymentBar{display:grid}.vposPaymentBar select{width:100%}.vreceiptActions{grid-template-columns:1fr}.vreceiptPaper{width:calc(100% - 28px)}}
      `;
      document.head.appendChild(style);

      const help=pos.querySelector('.vposHelp');
      const reader=document.createElement('div');
      reader.className='vposReaderBar';
      reader.innerHTML='<button type="button" class="vposReaderBtn" id="vposReaderBtn">🔗 Conectar lector</button><span class="vposReaderState"><span class="vposReaderDot" id="vposReaderDot"></span><span id="vposReaderText">Lector no activado</span></span>';
      help?.insertAdjacentElement('afterend',reader);
      const readerBtn=reader.querySelector('#vposReaderBtn'),readerDot=reader.querySelector('#vposReaderDot'),readerText=reader.querySelector('#vposReaderText');
      function setReader(text,mode='off'){
        readerText.textContent=text;
        readerDot.classList.toggle('on',mode==='on');
        readerDot.classList.toggle('warn',mode==='warn');
      }
      async function connectReader(){
        readerBtn.disabled=true;setReader('Preparando lector...','warn');
        let deviceName='';
        if(window.isSecureContext&&navigator.hid?.requestDevice){
          try{
            const list=await navigator.hid.requestDevice({filters:[]});
            const device=list?.[0];
            if(device){
              if(!device.opened)await device.open();
              deviceName=device.productName||'Lector USB';
              window.__vareliaBarcodeReaderDevice=device;
            }
          }catch(e){
            if(e?.name!=='NotFoundError')console.warn('Lector HID',e);
          }
        }
        input.focus();
        readerBtn.disabled=false;readerBtn.textContent='✓ Lector listo';
        setReader(deviceName?'Conectado: '+deviceName:'Lector listo · USB/Bluetooth modo teclado','on');
        try{localStorage.setItem('varelia_reader_ready','1')}catch{}
      }
      readerBtn.onclick=connectReader;
      try{if(localStorage.getItem('varelia_reader_ready')==='1'){readerBtn.textContent='✓ Lector listo';setReader('Lector listo · toca aquí para reconectar','on')}}catch{}
      input.addEventListener('keydown',e=>{if(e.key==='Enter'&&input.value.trim())setTimeout(()=>setReader('Escaneo recibido · listo para el siguiente','on'),80)});

      const box=pos.querySelector('.vposBox');
      const bottom=pos.querySelector('.vposBottom');
      const payment=document.createElement('div');
      payment.className='vposPaymentBar';
      payment.innerHTML='<label for="vposPaymentMethod">Método de pago</label><select id="vposPaymentMethod"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Tarjeta</option><option>Transferencia</option><option>Otro</option></select>';
      bottom?.insertAdjacentElement('beforebegin',payment);
      const paymentMethod=payment.querySelector('#vposPaymentMethod');
      try{paymentMethod.value=localStorage.getItem('varelia_last_payment_method')||'Efectivo'}catch{}
      paymentMethod.onchange=()=>{try{localStorage.setItem('varelia_last_payment_method',paymentMethod.value)}catch{}};

      const overlay=document.createElement('div');
      overlay.className='vreceiptOverlay';overlay.id='vreceiptOverlay';
      overlay.innerHTML='<div class="vreceiptCard"><div class="vreceiptHead"><h2>Comprobante de venta</h2><button type="button" class="vreceiptClose" aria-label="Cerrar">×</button></div><div id="vreceiptPreview"></div><div class="vreceiptActions"><button type="button" class="vreceiptPrimary" id="vreceiptPrint">🖨️ Imprimir</button><button type="button" class="vreceiptSecondary" id="vreceiptPdf">📄 Guardar PDF</button><button type="button" class="vreceiptSecondary" id="vreceiptShare">📲 WhatsApp</button></div></div>';
      document.body.appendChild(overlay);
      const preview=overlay.querySelector('#vreceiptPreview');
      overlay.querySelector('.vreceiptClose').onclick=()=>overlay.classList.remove('show');
      overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
      const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const money=v=>'S/ '+Number(v||0).toFixed(2);
      const businessName=()=>document.getElementById('vareliaBusinessName')?.textContent?.trim()||'Varelia Store';
      const ticketNo=sale=>sale.receiptNumber||('V-'+String(sale.id||Date.now()).replace(/[^a-z0-9]/gi,'').slice(-10).toUpperCase());
      const dateText=sale=>new Date(sale.date||Date.now()).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'});
      let currentReceipt=null;

      function receiptHTML(sale){
        const items=Array.isArray(sale.items)?sale.items:[];
        return `<div class="vreceiptPaper"><h3>${esc(businessName())}</h3><div class="center muted">COMPROBANTE INTERNO DE VENTA</div><div class="vreceiptSep"></div><div class="vreceiptLine"><span>N.º</span><b>${esc(ticketNo(sale))}</b></div><div class="vreceiptLine"><span>Fecha</span><span>${esc(dateText(sale))}</span></div><div class="vreceiptLine"><span>Pago</span><span>${esc(sale.paymentMethod||'Efectivo')}</span></div><div class="vreceiptSep"></div>${items.map(i=>`<div class="vreceiptLine"><div><div class="vreceiptItemName">${esc(i.name||'Producto')}</div><div class="vreceiptItemMeta">${Number(i.qty||0)} × ${money(i.price)}</div></div><b>${money(Number(i.qty||0)*Number(i.price||0))}</b></div>`).join('')}<div class="vreceiptSep"></div><div class="vreceiptTotal"><span>TOTAL</span><span>${money(sale.total)}</span></div><div class="vreceiptDisclaimer">Gracias por su compra.<br>Este ticket es un comprobante interno y no reemplaza una boleta o factura electrónica SUNAT.</div></div>`;
      }
      function showReceipt(sale){currentReceipt=sale;preview.innerHTML=receiptHTML(sale);overlay.classList.add('show')}
      function receiptText(sale){
        const items=(sale.items||[]).map(i=>`${i.qty} x ${i.name} — ${money(Number(i.qty||0)*Number(i.price||0))}`).join('\n');
        return `${businessName()}\nCOMPROBANTE DE VENTA\nN.º ${ticketNo(sale)}\n${dateText(sale)}\nPago: ${sale.paymentMethod||'Efectivo'}\n\n${items}\n\nTOTAL: ${money(sale.total)}\n\nGracias por su compra.`;
      }
      function printReceipt(sale){
        const w=window.open('','_blank','width=420,height=720');
        if(!w)return alert('Permite ventanas emergentes para imprimir el comprobante.');
        w.document.write(`<html><head><meta charset="utf-8"><title>${esc(ticketNo(sale))}</title><style>@page{size:80mm auto;margin:4mm}body{font-family:monospace;color:#111;margin:0}.paper{width:72mm;margin:auto}.c{text-align:center}.sep{border-top:1px dashed #777;margin:8px 0}.line{display:flex;justify-content:space-between;gap:8px;margin:5px 0}.small{font-size:11px;color:#555}.total{font-size:18px;font-weight:900}.item{margin:7px 0}h2{font-size:18px;margin:0}</style></head><body><div class="paper"><h2 class="c">${esc(businessName())}</h2><div class="c small">COMPROBANTE INTERNO DE VENTA</div><div class="sep"></div><div class="line"><span>N.º</span><b>${esc(ticketNo(sale))}</b></div><div class="line"><span>Fecha</span><span>${esc(dateText(sale))}</span></div><div class="line"><span>Pago</span><span>${esc(sale.paymentMethod||'Efectivo')}</span></div><div class="sep"></div>${(sale.items||[]).map(i=>`<div class="item"><b>${esc(i.name||'Producto')}</b><div class="line small"><span>${Number(i.qty||0)} × ${money(i.price)}</span><b>${money(Number(i.qty||0)*Number(i.price||0))}</b></div></div>`).join('')}<div class="sep"></div><div class="line total"><span>TOTAL</span><span>${money(sale.total)}</span></div><p class="c small">Gracias por su compra.<br>Comprobante interno. No reemplaza boleta o factura SUNAT.</p></div><script>onload=()=>{print();setTimeout(()=>close(),500)}<\/script></body></html>`);
        w.document.close();
      }
      function loadJsPDF(){return new Promise((resolve,reject)=>{if(window.jspdf?.jsPDF)return resolve(window.jspdf.jsPDF);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';s.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error('jsPDF no disponible'));s.onerror=reject;document.head.appendChild(s)})}
      async function savePDF(sale){
        try{
          const jsPDF=await loadJsPDF();
          const itemCount=(sale.items||[]).length;const height=Math.max(120,78+itemCount*15);
          const doc=new jsPDF({orientation:'portrait',unit:'mm',format:[80,height]});
          let y=8;doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(businessName(),40,y,{align:'center',maxWidth:68});y+=7;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('COMPROBANTE INTERNO DE VENTA',40,y,{align:'center'});y+=7;doc.text('N. '+ticketNo(sale),5,y);y+=5;doc.text(dateText(sale),5,y);y+=5;doc.text('Pago: '+(sale.paymentMethod||'Efectivo'),5,y);y+=5;doc.line(5,y,75,y);y+=5;
          for(const i of sale.items||[]){doc.setFont('helvetica','bold');doc.setFontSize(9);const name=doc.splitTextToSize(String(i.name||'Producto'),48);doc.text(name,5,y);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(`${Number(i.qty||0)} x ${money(i.price)}`,5,y+5);doc.text(money(Number(i.qty||0)*Number(i.price||0)),75,y+5,{align:'right'});y+=Math.max(12,name.length*4+7)}
          doc.line(5,y,75,y);y+=7;doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('TOTAL',5,y);doc.text(money(sale.total),75,y,{align:'right'});y+=9;doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text('Gracias por su compra.',40,y,{align:'center'});y+=4;doc.text('Comprobante interno. No reemplaza boleta o factura SUNAT.',40,y,{align:'center',maxWidth:70});doc.save('comprobante-'+ticketNo(sale)+'.pdf');
        }catch(e){console.error(e);alert('No se pudo generar el PDF. Puedes usar Imprimir y elegir Guardar como PDF.')}
      }
      async function shareReceipt(sale){
        const text=receiptText(sale);
        if(navigator.share){try{await navigator.share({title:'Comprobante '+ticketNo(sale),text});return}catch(e){if(e?.name==='AbortError')return}}
        window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
      }
      overlay.querySelector('#vreceiptPrint').onclick=()=>currentReceipt&&printReceipt(currentReceipt);
      overlay.querySelector('#vreceiptPdf').onclick=()=>currentReceipt&&savePDF(currentReceipt);
      overlay.querySelector('#vreceiptShare').onclick=()=>currentReceipt&&shareReceipt(currentReceipt);

      let pending=null;
      document.addEventListener('click',e=>{
        const b=e.target.closest('#checkout');if(!b)return;
        let rows=[],total=0;
        try{const s=window.VareliaPOS?.sync?.();rows=s?.rows||[];total=Number(s?.total||0)}catch{}
        if(!rows.length||total<=0)return;
        let before=0;try{before=Array.isArray(sales)?sales.length:0}catch{}
        pending={before,paymentMethod:paymentMethod.value,total};
        setTimeout(()=>{
          if(!pending)return;
          try{
            if(!Array.isArray(sales)||sales.length<=pending.before){pending=null;return}
            const sale=sales[sales.length-1];
            if(!sale.receiptNumber)sale.receiptNumber='V-'+new Date(sale.date||Date.now()).toISOString().slice(0,10).replace(/-/g,'')+'-'+String(sale.id||Date.now()).replace(/[^a-z0-9]/gi,'').slice(-6).toUpperCase();
            sale.paymentMethod=pending.paymentMethod;sale.receiptIssuedAt=new Date().toISOString();
            try{if(typeof save==='function')save()}catch{}
            showReceipt(sale);window.vareliaSound?.('sale');
          }finally{pending=null}
        },120);
      },true);

      window.VareliaReceipt={show:showReceipt,print:printReceipt,pdf:savePDF,share:shareReceipt};
    },120);
    setTimeout(()=>clearInterval(wait),15000);
  });
})();