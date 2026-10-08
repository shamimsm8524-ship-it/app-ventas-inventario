(()=>{
  if(window.__vareliaPosReceiptRestoredV100)return;
  window.__vareliaPosReceiptRestoredV100=true;
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
        .vreceiptOverlay{position:fixed;inset:0;z-index:100020;display:none;align-items:center;justify-content:center;padding:16px;background:#0f172aa8;backdrop-filter:blur(8px)}.vreceiptOverlay.show{display:flex}.vreceiptCard{width:min(96vw,520px);max-height:92vh;overflow:auto;background:var(--card);color:var(--ink);border-radius:24px;box-shadow:0 24px 70px #0004}.vreceiptHead{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)}.vreceiptHead h2{margin:0;font-size:19px}.vreceiptClose{width:38px;height:38px;border:0;border-radius:11px;background:var(--bg);color:var(--ink);font-size:22px}.vreceiptPaper{width:min(100%,360px);margin:18px auto;padding:20px 16px;background:#fff;color:#111;border:1px dashed #cbd5e1;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.vreceiptPaper h3{text-align:center;margin:0;font-size:18px}.vreceiptPaper .center{text-align:center}.vreceiptPaper .muted{color:#666;font-size:11px}.vreceiptSep{border-top:1px dashed #999;margin:12px 0}.vreceiptLine{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:7px 0;font-size:12px}.vreceiptItemName{font-weight:800}.vreceiptItemMeta{font-size:11px;color:#555;margin-top:2px}.vreceiptTotal{display:flex;justify-content:space-between;gap:12px;font-size:18px;font-weight:950;margin-top:10px}.vreceiptDisclaimer{font-size:10px;text-align:center;color:#666;margin-top:14px;line-height:1.4}.vreceiptActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 18px 18px}.vreceiptActions .vreceiptCloseAction{grid-column:1/-1}.vreceiptActions button{border:0;border-radius:12px;padding:11px 9px;font-weight:900}.vreceiptPrimary{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff}.vreceiptSecondary{background:var(--bg);color:var(--ink);border:1px solid var(--line)!important}
        @media(max-width:560px){.vposPaymentBar{display:grid}.vposPaymentBar select{width:100%}.vreceiptActions{grid-template-columns:1fr 1fr}.vreceiptActions .vreceiptCloseAction{grid-column:1/-1}.vreceiptPaper{width:calc(100% - 28px)}}
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
        try{localStorage.setItem(window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_reader_ready'):'varelia_reader_ready__no_account','1')}catch{}
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
      try{paymentMethod.value=(localStorage.getItem(window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_last_payment_method'):'varelia_last_payment_method__no_account')||'Efectivo')}catch{}
      paymentMethod.onchange=()=>{try{localStorage.setItem(window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_last_payment_method'):'varelia_last_payment_method__no_account',paymentMethod.value)}catch{}};

      document.getElementById('vreceiptOverlay')?.remove();
      const overlay=document.createElement('div');
      overlay.className='vreceiptOverlay';overlay.id='vreceiptOverlay';
      overlay.innerHTML='<div class="vreceiptCard"><div class="vreceiptHead"><h2>Comprobante de venta</h2><button type="button" class="vreceiptClose" aria-label="Cerrar">×</button></div><div id="vreceiptPreview"></div><div class="vreceiptActions"><button type="button" class="vreceiptPrimary" id="vreceiptPrint">🖨️ Imprimir</button><button type="button" class="vreceiptSecondary" id="vreceiptPdf">📄 Descargar comprobante</button><button type="button" class="vreceiptSecondary vreceiptCloseAction" id="vreceiptCloseAction">Cerrar</button></div></div>';
      document.body.appendChild(overlay);
      const preview=overlay.querySelector('#vreceiptPreview');
      overlay.querySelector('.vreceiptClose').onclick=()=>overlay.classList.remove('show');
      overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
      const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const money=v=>'S/ '+Number(v||0).toFixed(2);
      const businessSettings=()=>{try{return JSON.parse(localStorage.getItem(window.vareliaScopedLocalKey('varelia_video_settings_v1'))||'{}')}catch{return{}}};
      const businessName=()=>businessSettings().businessName||document.getElementById('vareliaBusinessName')?.textContent?.trim()||'Varelia Store';
      const ticketNo=sale=>sale.receiptNumber||('V-'+String(sale.id||Date.now()).replace(/[^a-z0-9]/gi,'').slice(-10).toUpperCase());
      const dateText=sale=>new Date(sale.date||Date.now()).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'});
      let currentReceipt=null;
      const paymentDetailHTML=sale=>{
        const b=sale&&sale.paymentBreakdown&&typeof sale.paymentBreakdown==='object'?sale.paymentBreakdown:{};
        const rows=Object.entries(b).filter(([,v])=>Number(v)>0).map(([k,v])=>`<div class="vreceiptLine"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join('');
        const received=Number.isFinite(Number(sale?.amountReceived))&&Number(sale?.amountReceived)>0?`<div class="vreceiptLine"><span>Recibido</span><b>${money(sale.amountReceived)}</b></div>`:'';
        const change=Number.isFinite(Number(sale?.changeGiven))&&Number(sale?.changeGiven)>=0?`<div class="vreceiptLine"><span>Vuelto</span><b>${money(sale.changeGiven)}</b></div>`:'';
        return rows||received||change?`<div class="vreceiptSep"></div>${rows}${received}${change}`:'';
      };

      function receiptHTML(sale){
        const items=Array.isArray(sale.items)?sale.items:[],bs=businessSettings(),subtotal=Number(sale.subtotal??((Number(sale.total)||0)+(Number(sale.discount)||0)));
        return `<div class="vreceiptPaper">${bs.logo?`<div class="center"><img src="${bs.logo}" alt="" style="max-width:74px;max-height:50px;object-fit:contain;margin-bottom:6px"></div>`:''}<h3>${esc(businessName())}</h3><div class="center muted">COMPROBANTE INTERNO DE VENTA</div>${bs.ruc?`<div class="center muted">RUC/Doc: ${esc(bs.ruc)}</div>`:''}${bs.phone?`<div class="center muted">Tel: ${esc(bs.phone)}</div>`:''}${bs.address?`<div class="center muted">${esc(bs.address)}</div>`:''}<div class="vreceiptSep"></div><div class="vreceiptLine"><span>N.º</span><b>${esc(ticketNo(sale))}</b></div><div class="vreceiptLine"><span>Fecha</span><span>${esc(dateText(sale))}</span></div><div class="vreceiptLine"><span>Pago</span><span>${esc(sale.paymentMethod||'Efectivo')}</span></div>${sale.customerName?`<div class="vreceiptLine"><span>Cliente</span><span>${esc(sale.customerName)}</span></div>`:''}${sale.sellerName?`<div class="vreceiptLine"><span>Vendedor</span><span>${esc(sale.sellerName)}</span></div>`:''}<div class="vreceiptSep"></div>${items.map(i=>{const q=Number(i.qty||0),p=Number(i.price||0),weighted=(i.saleType==='weight'||i.unit==='kg'||i.byWeight===true||(!Number.isInteger(q)&&q>0));const meta=weighted?`Peso: ${q<1?Math.round(q*1000)+' g':q.toLocaleString('es-PE')+' kg'}<br>Precio por kilo: ${money(p)}`:`${q} × ${money(p)}`;return `<div class="vreceiptLine"><div><div class="vreceiptItemName">${esc(i.name||'Producto')}</div><div class="vreceiptItemMeta">${meta}</div></div><b>${money(q*p)}</b></div>`}).join('')}${Number(sale.discount)>0?`<div class="vreceiptSep"></div><div class="vreceiptLine"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="vreceiptLine"><span>Descuento</span><span>-${money(sale.discount)}</span></div>`:''}<div class="vreceiptSep"></div><div class="vreceiptTotal"><span>TOTAL</span><span>${money(sale.total)}</span></div>${paymentDetailHTML(sale)}${sale.paymentMethod==='Fiado'?`<div class="center muted" style="margin-top:8px">Venta al crédito · Saldo: ${money(Math.max(0,(Number(sale.total)||0)-(Number(sale.paidAmount)||0)))}</div>`:''}${sale.notes?`<div class="center muted" style="margin-top:8px">Nota: ${esc(sale.notes)}</div>`:''}<div class="vreceiptDisclaimer">${esc(bs.ticketMessage||'Gracias por su compra.')}<br>Este ticket es un comprobante interno y no reemplaza una boleta o factura electrónica SUNAT.</div></div>`;
      }
      function showReceipt(sale){currentReceipt=sale;preview.innerHTML=receiptHTML(sale);overlay.classList.add('show')}
      function receiptText(sale){
        const bs=businessSettings(),items=(sale.items||[]).map(i=>`${i.qty} x ${i.name} — ${money(Number(i.qty||0)*Number(i.price||0))}`).join('\n');
        const subtotal=Number(sale.subtotal??((Number(sale.total)||0)+(Number(sale.discount)||0)));
        return `${businessName()}\nCOMPROBANTE DE VENTA\nN.º ${ticketNo(sale)}\n${dateText(sale)}\nPago: ${sale.paymentMethod||'Efectivo'}${sale.customerName?'\nCliente: '+sale.customerName:''}${sale.sellerName?'\nVendedor: '+sale.sellerName:''}\n\n${items}${Number(sale.discount)>0?'\n\nSubtotal: '+money(subtotal)+'\nDescuento: -'+money(sale.discount):''}\n\nTOTAL: ${money(sale.total)}${sale.paymentMethod==='Fiado'?'\nSaldo pendiente: '+money(Math.max(0,(Number(sale.total)||0)-(Number(sale.paidAmount)||0))):''}${sale.notes?'\nNota: '+sale.notes:''}\n\n${bs.ticketMessage||'Gracias por su compra.'}`;
      }
      function nativeReceiptPayload(sale){
        const bs=businessSettings();
        return {
          business:businessName(),
          logo:String(bs.logo||''),
          ruc:String(bs.ruc||''),
          phone:String(bs.phone||''),
          address:String(bs.address||''),
          message:String(bs.ticketMessage||'Gracias por su compra.'),
          thermalWidth:String(bs.thermalWidth||'80'),
          ticket:ticketNo(sale),
          date:dateText(sale),
          method:String(sale?.paymentMethod||'Efectivo'),
          seller:String(sale?.sellerName||''),
          customer:String(sale?.customerName||''),
          total:Number(sale?.total||0),
          received:Number(sale?.amountReceived||0),
          change:Number(sale?.changeGiven||0),
          breakdown:(sale?.paymentBreakdown&&typeof sale.paymentBreakdown==='object')?sale.paymentBreakdown:{},
          items:(Array.isArray(sale?.items)?sale.items:[]).map(i=>({name:String(i?.name||'Producto'),qty:Number(i?.qty||0),price:Number(i?.price||0),subtotal:Number(i?.qty||0)*Number(i?.price||0),saleType:String(i?.saleType||''),unit:String(i?.unit||''),byWeight:i?.byWeight===true}))
        };
      }
      function printReceipt(sale){
        try{
          if(window.VareliaAndroid&&typeof window.VareliaAndroid.printSaleReceipt==='function'){
            window.VareliaAndroid.printSaleReceipt(JSON.stringify(nativeReceiptPayload(sale)));
            return;
          }
        }catch(e){console.warn('Impresión nativa no disponible',e)}
        const w=window.open('','_blank','width=420,height=720');
        if(!w)return alert('Permite ventanas emergentes para imprimir el comprobante.');
        const bs=businessSettings(),width=String(bs.thermalWidth||'80')==='58'?58:80,paper=width===58?52:72;
        const logoMaxW=width===58?24:30,logoMaxH=width===58?18:22;
        const logoHtml=bs.logo?`<div class="c logoWrap"><img id="ticketLogo" src="${esc(bs.logo)}" alt="Logo"></div>`:'';
        const businessInfo=`${bs.ruc?`<div class="c small">RUC/Doc: ${esc(bs.ruc)}</div>`:''}${bs.phone?`<div class="c small">Tel: ${esc(bs.phone)}</div>`:''}${bs.address?`<div class="c small">${esc(bs.address)}</div>`:''}`;
        const customerInfo=`${sale.customerName?`<div class="line"><span>Cliente</span><span>${esc(sale.customerName)}</span></div>`:''}${sale.sellerName?`<div class="line"><span>Vendedor</span><span>${esc(sale.sellerName)}</span></div>`:''}`;
        const footer=esc(bs.ticketMessage||'Gracias por su compra.');
        w.document.write(`<html><head><meta charset="utf-8"><title>${esc(ticketNo(sale))}</title><style>@page{size:${width}mm auto;margin:3mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}body{font-family:monospace;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}.paper{width:${paper}mm;margin:0 auto}.c{text-align:center}.logoWrap{margin:0 0 2mm}.logoWrap img{display:block;margin:0 auto;max-width:${logoMaxW}mm;max-height:${logoMaxH}mm;width:auto;height:auto;object-fit:contain}.sep{border-top:1px dashed #777;margin:2mm 0}.line{display:flex;justify-content:space-between;gap:2mm;margin:1.2mm 0}.small{font-size:10px;color:#444;line-height:1.25}.total{font-size:18px;font-weight:900}.item{margin:1.8mm 0}h2{font-size:17px;margin:0 0 1mm}.footer{margin-top:3mm}</style></head><body><div class="paper">${logoHtml}<h2 class="c">${esc(businessName())}</h2><div class="c small">COMPROBANTE INTERNO DE VENTA</div>${businessInfo}<div class="sep"></div><div class="line"><span>N.º</span><b>${esc(ticketNo(sale))}</b></div><div class="line"><span>Fecha</span><span>${esc(dateText(sale))}</span></div><div class="line"><span>Pago</span><span>${esc(sale.paymentMethod||'Efectivo')}</span></div>${customerInfo}<div class="sep"></div>${(sale.items||[]).map(i=>`<div class="item"><b>${esc(i.name||'Producto')}</b><div class="line small"><span>${Number(i.qty||0)} × ${money(i.price)}</span><b>${money(Number(i.qty||0)*Number(i.price||0))}</b></div></div>`).join('')}<div class="sep"></div><div class="line total"><span>TOTAL</span><span>${money(sale.total)}</span></div><p class="c small footer">${footer}<br>Comprobante interno. No reemplaza boleta o factura SUNAT.</p></div><script>(()=>{let done=false;const go=()=>{if(done)return;done=true;setTimeout(()=>{print();setTimeout(()=>close(),800)},120)};const img=document.getElementById('ticketLogo');if(img&&!img.complete){img.onload=go;img.onerror=go;setTimeout(go,1800)}else go()})()<\/script></body></html>`);
        w.document.close();
      }
      function loadJsPDF(){return new Promise((resolve,reject)=>{if(window.jspdf?.jsPDF)return resolve(window.jspdf.jsPDF);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';s.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error('jsPDF no disponible'));s.onerror=reject;document.head.appendChild(s)})}
      const pdfLogoData=data=>new Promise(resolve=>{
        if(!data)return resolve('');
        try{
          const img=new Image();
          img.onload=()=>{
            try{
              const canvas=document.createElement('canvas');
              const max=500,scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
              canvas.width=Math.max(1,Math.round((img.naturalWidth||1)*scale));
              canvas.height=Math.max(1,Math.round((img.naturalHeight||1)*scale));
              canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
              resolve(canvas.toDataURL('image/jpeg',0.9));
            }catch{resolve(data)}
          };
          img.onerror=()=>resolve(data);
          img.src=data;
        }catch{resolve(data)}
      });

      async function savePDF(sale){
        try{
          if(window.VareliaAndroid&&typeof window.VareliaAndroid.saveSalePdf==='function'){
            window.VareliaAndroid.saveSalePdf(JSON.stringify(nativeReceiptPayload(sale)));
            return;
          }
        }catch(e){console.warn('Guardado PDF nativo no disponible',e)}
        try{
          const jsPDF=await loadJsPDF(),items=Array.isArray(sale.items)?sale.items:[],bs=businessSettings();
          const doc=new jsPDF({orientation:'portrait',unit:'mm',format:[80,Math.max(150,120+items.length*16)]});
          let y=8;
          if(bs.logo){try{const logo=await pdfLogoData(bs.logo);if(logo){doc.addImage(logo,'JPEG',33,y,14,12,undefined,'FAST');y+=16}}catch{}}
          doc.setFont('courier','bold');doc.setFontSize(12);doc.text(businessName(),40,y,{align:'center'});y+=5;
          doc.setFont('courier','normal');doc.setFontSize(7);doc.text('COMPROBANTE INTERNO DE VENTA',40,y,{align:'center'});y+=4;
          if(bs.ruc){doc.text('RUC/Doc: '+bs.ruc,40,y,{align:'center'});y+=4} if(bs.phone){doc.text('Tel: '+bs.phone,40,y,{align:'center'});y+=4} if(bs.address){doc.text(String(bs.address),40,y,{align:'center'});y+=4}
          doc.setLineDashPattern([1,1],0);doc.line(7,y,73,y);y+=5;
          const lr=(l,r,b)=>{doc.setFont('courier',b?'bold':'normal');doc.setFontSize(7);doc.text(String(l),7,y);doc.text(String(r||''),73,y,{align:'right'});y+=4};
          lr('N.º',ticketNo(sale),true);lr('Fecha',dateText(sale));lr('Pago',sale.paymentMethod||'Efectivo');if(sale.sellerName)lr('Vendedor',sale.sellerName);
          doc.line(7,y,73,y);y+=5;
          items.forEach(i=>{const q=Number(i.qty||0),p=Number(i.price||0),weighted=i.saleType==='weight'||i.unit==='kg'||i.byWeight===true||(!Number.isInteger(q)&&q>0);lr(i.name||'Producto',money(q*p),true);if(weighted){lr('Peso: '+(q<1?Math.round(q*1000)+' g':q+' kg'),'');lr('Precio por kilo: '+money(p),'')}else lr(q+' × '+money(p),'');});
          doc.line(7,y,73,y);y+=5;doc.setFont('courier','bold');doc.setFontSize(12);doc.text('TOTAL',7,y);doc.text(money(sale.total),73,y,{align:'right'});y+=6;doc.line(7,y,73,y);y+=5;
          const bd=sale.paymentBreakdown&&typeof sale.paymentBreakdown==='object'?sale.paymentBreakdown:{};Object.entries(bd).filter(([,v])=>Number(v)>0).forEach(([k,v])=>lr(k,money(v),false));
          if(Number(sale.amountReceived)>0)lr('Recibido',money(sale.amountReceived));lr('Vuelto',money(Number(sale.changeGiven)||0));
          y+=4;doc.setFont('courier','normal');doc.setFontSize(5.5);doc.text(String(bs.ticketMessage||'Gracias por su compra.'),40,y,{align:'center',maxWidth:64});y+=3;doc.text('Este ticket es un comprobante interno y no reemplaza',40,y,{align:'center'});y+=3;doc.text('una boleta o factura electrónica SUNAT.',40,y,{align:'center'});
          const name='comprobante-'+ticketNo(sale)+'.pdf',uri=doc.output('datauristring');
          if(window.VareliaAndroid&&typeof window.VareliaAndroid.saveDataUrl==='function')window.VareliaAndroid.saveDataUrl(uri,name);else doc.save(name);
        }catch(e){console.error(e);alert('No se pudo descargar el comprobante.')}
      }
            async function shareReceipt(sale){
        const text=receiptText(sale);
        if(navigator.share){try{await navigator.share({title:'Comprobante '+ticketNo(sale),text});return}catch(e){if(e?.name==='AbortError')return}}
        window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
      }
      overlay.querySelector('#vreceiptPrint').onclick=()=>currentReceipt&&printReceipt(currentReceipt);
      overlay.querySelector('#vreceiptPdf').onclick=()=>currentReceipt&&savePDF(currentReceipt);
      overlay.querySelector('#vreceiptCloseAction').onclick=()=>overlay.classList.remove('show');

      let pending=null;
      document.addEventListener('click',e=>{
        const b=e.target.closest('#checkout');if(!b)return;
        let rows=[],total=0;
        try{const s=window.VareliaPOS?.sync?.();rows=s?.rows||[];total=Number(s?.total||0)}catch{}
        if(!rows.length||total<=0)return;
        try{window.VareliaSaleExtrasUpdate?.()}catch{}
        const extras=window.VareliaSaleExtras||{};
        if(paymentMethod.value==='Fiado'&&!String(extras.customerName||'').trim()){
          e.preventDefault();e.stopImmediatePropagation();alert('Escribe el nombre del cliente para registrar el fiado.');return;
        }
        let before=0;try{before=Array.isArray(sales)?sales.length:0}catch{}
        pending={before,paymentMethod:paymentMethod.value,total,extras:{...extras}};
        // La venta puede tardar más de unos milisegundos en guardarse.
        // Esperamos hasta 6 segundos para mostrar siempre el comprobante después de cobrar.
        let waited=0;
        const waitForSavedSale=()=>{
          if(!pending)return;
          try{
            if(Array.isArray(sales)&&sales.length>pending.before){
              const sale=sales[sales.length-1];
              if(!sale.receiptNumber)sale.receiptNumber='V-'+new Date(sale.date||Date.now()).toISOString().slice(0,10).replace(/-/g,'')+'-'+String(sale.id||Date.now()).replace(/[^a-z0-9]/gi,'').slice(-6).toUpperCase();
              sale.paymentMethod=pending.paymentMethod;const snap=window.VareliaPaymentSnapshot;if(snap&&Date.now()-Number(snap.at||0)<15000){sale.paymentMethod=snap.method||sale.paymentMethod;sale.paymentBreakdown=snap.breakdown||{};sale.amountReceived=Number(snap.received)||0;sale.changeGiven=Number(snap.change)||0;}const ex=pending.extras||{};const originalTotal=Number(sale.total)||0;sale.subtotal=originalTotal;sale.discount=Math.max(0,Math.min(originalTotal,Number(ex.discount)||0));sale.total=Math.max(0,originalTotal-sale.discount);sale.notes=String(ex.notes||'').trim();sale.customerName=String(ex.customerName||'').trim();if(sale.paymentMethod==='Fiado'&&!Number.isFinite(Number(sale.paidAmount)))sale.paidAmount=0;const vp=window.vareliaCurrentUserProfile||{};sale.sellerId=vp.id||window.vareliaSellerId||'';sale.sellerName=vp.full_name||window.vareliaSellerName||document.getElementById('vareliaUserEmail')?.textContent?.trim()?.split('@')[0]||'Usuario';sale.sellerRole=vp.role||window.vareliaSellerRole||'';sale.receiptIssuedAt=new Date().toISOString();
              try{if(typeof save==='function')save()}catch{}
              pending=null;showReceipt(sale);window.vareliaSound?.('sale');return;
            }
          }catch(err){console.error('No se pudo preparar el comprobante:',err)}
          waited+=100;
          if(waited<6000)setTimeout(waitForSavedSale,100);
          else{pending=null;window.vareliaToast?.('La venta se guardó, pero no se pudo abrir el comprobante.','warn')}
        };
        setTimeout(waitForSavedSale,120);
        return;
      },true);

      window.VareliaReceipt={show:showReceipt,print:printReceipt,pdf:savePDF,share:shareReceipt};
    },120);
    setTimeout(()=>clearInterval(wait),15000);
  });
})();