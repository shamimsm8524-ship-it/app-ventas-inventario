(()=>{
  // The public catalog has its own order receipt and print/PDF actions.
  // Never install the internal POS receipt module on that route: it can replace
  // the public order data with an empty sale and print S/ 0.00.
  try{
    const path=String(location.pathname||'').toLowerCase();
    const isPublicCatalog=path.includes('catalogo-publico')||path.startsWith('/catalogo/')||path.startsWith('/c/');
    if(isPublicCatalog)return;
  }catch{}
  if(window.__vareliaPosReceiptRestoredV102)return;
  if(window.__vareliaPosReceiptInitializing){
    let attempts=0;
    const retry=setInterval(()=>{attempts++;if(window.VareliaReceipt){clearInterval(retry);return}if(!window.__vareliaPosReceiptInitializing||attempts>=60){clearInterval(retry);window.__vareliaPosReceiptInitializing=false;window.__vareliaPosReceipt=false;const script=document.createElement('script');script.src='pos-receipt.js?v=20261014-sale-receipt-layout-v32&retry='+Date.now();document.head.appendChild(script)}},100);
    return;
  }
  window.__vareliaPosReceiptInitializing=true;
  window.__vareliaPosReceipt=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const wait=setInterval(()=>{
      const pos=document.getElementById('vareliaPosSales');
      const input=document.getElementById('vposInput');
      const checkout=document.getElementById('vposCheckout')||document.getElementById('checkout');
      if(!pos||!input||!checkout)return;
      clearInterval(wait);
      window.__vareliaPosReceiptRestoredV102=true;
      window.__vareliaPosReceiptRestoredV101=true;
      window.__vareliaPosReceiptInitializing=false;

      const style=document.createElement('style');
      style.textContent=`
        .vposReaderBar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:10px 2px 0}.vposReaderBtn{border:1px solid color-mix(in srgb,var(--p) 35%,var(--line));background:var(--card);color:var(--p);border-radius:12px;padding:9px 12px;font-weight:900}.vposReaderState{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:12px;font-weight:800}.vposReaderDot{width:9px;height:9px;border-radius:50%;background:#94a3b8}.vposReaderDot.on{background:#16a34a;box-shadow:0 0 0 4px #16a34a22}.vposReaderDot.warn{background:#f59e0b;box-shadow:0 0 0 4px #f59e0b22}
        .vposPaymentBar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px;padding:12px 13px;border:1px solid var(--line);border-radius:14px;background:var(--bg)}.vposPaymentBar label{font-size:12px;font-weight:900;color:var(--muted)}.vposPaymentBar select{min-width:170px;border:1px solid var(--line);border-radius:11px;background:var(--card);color:var(--ink);padding:9px 11px;font-weight:800}
        .vreceiptOverlay{position:fixed;inset:0;z-index:100020;display:none;align-items:center;justify-content:center;padding:16px;background:#0f172aa8;backdrop-filter:blur(8px)}.vreceiptOverlay.show{display:flex}.vreceiptCard{width:min(96vw,520px);max-height:92vh;overflow:auto;background:var(--card);color:var(--ink);border-radius:24px;box-shadow:0 24px 70px #0004}.vreceiptHead{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)}.vreceiptHead h2{margin:0;font-size:19px}.vreceiptClose{width:38px;height:38px;border:0;border-radius:11px;background:var(--bg);color:var(--ink);font-size:22px}.vreceiptPaper{width:min(100%,360px);margin:18px auto;padding:20px 16px;background:#fff;color:#111;border:1px dashed #cbd5e1;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.vreceiptPaper h3{text-align:center;margin:0;font-size:18px}.vreceiptPaper .center{text-align:center}.vreceiptPaper .muted{color:#666;font-size:11px}.vreceiptSep{border-top:1px dashed #999;margin:12px 0}.vreceiptLine{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:7px 0;font-size:12px}.vreceiptItemName{font-weight:800}.vreceiptItemMeta{font-size:11px;color:#555;margin-top:2px}.vreceiptTotal{display:flex;justify-content:space-between;gap:12px;font-size:18px;font-weight:950;margin-top:10px}.vreceiptDisclaimer{font-size:10px;text-align:center;color:#666;margin-top:14px;line-height:1.4}.vreceiptActions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0 18px 18px;align-items:stretch}.vreceiptActions .vreceiptCloseAction{grid-column:1/-1}.vreceiptActions #vreceiptWhatsApp{grid-column:1/-1}.vreceiptActions button{min-width:0;min-height:52px;white-space:normal;overflow-wrap:anywhere;line-height:1.25;font-size:14px;border:0;border-radius:12px;padding:12px 8px;font-weight:900}.vreceiptPaper{width:min(calc(100% - 28px),360px);margin:18px auto;padding:18px 14px;box-sizing:border-box}.vreceiptLine{grid-template-columns:minmax(0,1fr) minmax(0,auto);overflow-wrap:anywhere}.vreceiptLine>span:last-child,.vreceiptLine>b:last-child{text-align:right;overflow-wrap:anywhere}.vreceiptItemMeta{line-height:1.4}.vreceiptTotal{align-items:center}.vreceiptPrimary{background:linear-gradient(135deg,var(--p),var(--p2));color:#fff}.vreceiptSecondary{background:var(--bg);color:var(--ink);border:1px solid var(--line)!important}
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
      overlay.innerHTML='<div class="vreceiptCard"><div class="vreceiptHead"><h2>Comprobante de venta</h2><button type="button" class="vreceiptClose" aria-label="Cerrar">×</button></div><div id="vreceiptPreview"></div><div class="vreceiptActions"><button type="button" class="vreceiptPrimary" id="vreceiptPrint">🖨️ Imprimir</button><button type="button" class="vreceiptSecondary" id="vreceiptPdf">📄 Descargar PDF</button><button type="button" class="vreceiptSecondary" id="vreceiptWhatsApp">🟢 Enviar por WhatsApp</button><button type="button" class="vreceiptSecondary vreceiptCloseAction" id="vreceiptCloseAction">Cerrar</button></div></div>';
      document.body.appendChild(overlay);
      const preview=overlay.querySelector('#vreceiptPreview');
      let receiptBackState=false;const closeReceipt=(fromBack=false)=>{if(!overlay.classList.contains('show'))return;overlay.classList.remove('show');if(receiptBackState&&!fromBack){receiptBackState=false;try{history.back()}catch{}}else receiptBackState=false;};overlay.querySelector('.vreceiptClose').onclick=()=>closeReceipt();overlay.querySelector('#vreceiptCloseAction').onclick=()=>closeReceipt();overlay.addEventListener('click',e=>{if(e.target===overlay)closeReceipt()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('show'))closeReceipt()});window.addEventListener('popstate',()=>{if(overlay.classList.contains('show')){overlay.classList.remove('show');receiptBackState=false;}});
      const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const money=v=>'S/ '+Number(v||0).toFixed(2);
      const businessSettings=()=>{
        let scoped={},live=window.vareliaVideoSettings||{},legacy={},businessScoped={};
        try{
          const key=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_video_settings_v1'):'varelia_video_settings_v1__no_account';
          scoped=JSON.parse(localStorage.getItem(key)||'{}')||{};
        }catch{}
        try{legacy=JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')||{}}catch{}
        try{
          const businessId=String(localStorage.getItem('varelia_active_business_id')||'').trim();
          if(businessId)businessScoped=JSON.parse(localStorage.getItem('varelia_video_settings_v1__'+businessId.replace(/[^a-zA-Z0-9_-]/g,''))||'{}')||{};
        }catch{}
        const s={...businessScoped,...legacy,...scoped,...live};
        for(const key of ['logo','businessName','phone','ruc','address','ticketMessage','thermalWidth']){
          if(!String(s[key]||'').trim())s[key]=live[key]||scoped[key]||businessScoped[key]||legacy[key]||'';
        }
        const cloudLogo=String(window.vareliaCloudBusinessLogo||'');
        if(cloudLogo.startsWith('data:image/'))s.logo=cloudLogo;
        else if(!String(s.logo||'').startsWith('data:image/')){
          const candidates=[live.logo,scoped.logo,businessScoped.logo,legacy.logo].map(x=>String(x||''));
          s.logo=candidates.find(x=>x.startsWith('data:image/'))||'';
        }
        return s;
      };
      const receiptSeller=sale=>{
        const profile=window.vareliaCurrentUserProfile||{};
        const role=String(profile.role||window.vareliaSellerRole||'').trim().toLowerCase();
        const domName=document.getElementById('vareliaUserName')?.textContent?.trim()||'';
        const email=document.getElementById('vareliaUserEmail')?.textContent?.trim()||'';
        const ownerNames=[profile.full_name,profile.name,window.vareliaSellerName,domName,email.split('@')[0]]
          .map(v=>String(v||'').trim().toLocaleLowerCase()).filter(Boolean);
        const savedSeller=String(sale?.sellerName||sale?.seller_name||'').trim();
        if(role==='owner'&&savedSeller&&ownerNames.includes(savedSeller.toLocaleLowerCase()))return '';
        const configuredSeller=role==='owner'?'':(profile.full_name||profile.name||window.vareliaSellerName||domName||email.split('@')[0]||'');
        return String(savedSeller||configuredSeller||'').trim();
      };
      const businessName=()=>document.getElementById('vareliaBusinessName')?.textContent?.trim()||window.vareliaBusinessDisplayName||businessSettings().businessName||'Varelia Store';
      const itemDescription=i=>{const d=String(i?.description||i?.detail||i?.details||i?.specifications||i?.specification||'').trim();const raw=Array.isArray(i?.characteristics)?i.characteristics:[];const c=raw.map(x=>{if(typeof x==='string')return x.trim();if(x&&typeof x==='object')return [x.name,x.value??x.label].filter(Boolean).join(': ');return ''}).filter(Boolean).join(' · ');const variants=Array.isArray(i?.variants)?i.variants.map(x=>typeof x==='string'?x:[x?.name,x?.value??x?.label].filter(Boolean).join(': ')).filter(Boolean).join(' · '):'';return [d,c,variants].filter(Boolean).join(' · ')};
      const itemUnit=i=>String(i?.unit||i?.saleUnit||i?.unitType||i?.measureUnit||i?.quantityUnit||i?.presentation||'').trim().toLowerCase();
      const receiptUnit=i=>{const picked=String(i?.medicineSaleUnit||i?.sale_unit||'').trim();if(picked)return picked;const name=String(i?.name||i?.baseName||'');const match=name.match(/\s·\s*(cajas?|bl[ií]ster(?:es)?|pastillas?|tabletas?|c[aá]psulas?|ampollas?|sobres?|unidades?)\s*$/i);if(match)return match[1];return String(i?.saleUnit||i?.unit||i?.unitType||i?.measureUnit||i?.quantityUnit||i?.presentation||'unidades').trim();};
      const isWeightItem=i=>{const u=itemUnit(i);return i?.saleType==='weight'||i?.byWeight===true||['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos'].includes(u)||(!Number.isInteger(Number(i?.qty))&&Number(i?.qty)>0)};
      const weightLabel=q=>{const n=Number(q)||0;return n<1?`${Math.round(n*1000)} g`:`${Number.isInteger(n)?n:n.toLocaleString('es-PE')} kg`};
      const ticketNo=sale=>sale.receiptNumber||('V-'+String(sale.id||Date.now()).replace(/[^a-z0-9]/gi,'').slice(-10).toUpperCase());
      const dateText=sale=>new Date(sale.date||Date.now()).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'});
      let currentReceipt=null;
      const receiptPaymentData=sale=>{
        const total=Math.max(0,Number(sale?.total)||0),snap=window.VareliaPaymentSnapshot;
        const fresh=!!(snap&&Date.now()-Number(snap.at||0)<60000&&Math.abs((Number(snap.total)||0)-total)<0.02);
        const method=String((fresh&&snap.method)||sale?.paymentMethod||'Efectivo');
        const rawReceived=fresh?Number(snap.received):Number(sale?.amountReceived);
        const received=method==='Fiado'?Math.max(0,rawReceived||0):Math.max(total,Math.max(0,rawReceived||0));
        const change=method==='Fiado'?0:Math.max(0,fresh?(Number(snap.change)||received-total):(Number(sale?.changeGiven)||received-total));
        const sb=fresh&&snap.breakdown&&typeof snap.breakdown==='object'?snap.breakdown:null;
        const breakdown=sb&&Object.values(sb).some(v=>Number(v)>0)?sb:(sale?.paymentBreakdown&&Object.values(sale.paymentBreakdown).some(v=>Number(v)>0)?sale.paymentBreakdown:{[method]:total});
        return {method,received,change,breakdown};
      };
      const paymentDetailHTML=sale=>{
        const pay=receiptPaymentData(sale),b=pay.breakdown,total=Math.max(0,Number(sale?.total)||0),method=pay.method,receivedValue=pay.received;
        const entries=Object.entries(b).filter(([,v])=>Number(v)>0);
        const rows=(entries.length?entries:[[method,Math.min(total,receivedValue)]]).map(([k,v])=>`<div class="vreceiptLine"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join('');
        const received=receivedValue>0?`<div class="vreceiptLine"><span>${method==='Efectivo'?'Efectivo recibido':'Monto recibido'}</span><b>${money(receivedValue)}</b></div>`:'';
        const change=`<div class="vreceiptLine"><span>Vuelto</span><b>${money(pay.change)}</b></div>`;
        return `<div class="vreceiptSep"></div><div class="vreceiptLine"><span>DETALLE DE PAGO</span><b></b></div>${rows}${received}${change}`;
      };

      function receiptHTML(sale){
        const items=Array.isArray(sale.items)?sale.items:[],bs=businessSettings(),subtotal=Number(sale.subtotal??((Number(sale.total)||0)+(Number(sale.discount)||0)));
        return `<div class="vreceiptPaper">${bs.logo?`<div class="center"><img src="${bs.logo}" alt="" style="max-width:74px;max-height:50px;object-fit:contain;margin-bottom:6px"></div>`:''}<h3>${esc(businessName())}</h3><div class="center muted">COMPROBANTE INTERNO DE VENTA</div>${bs.phone?`<div class="center muted">Tel: ${esc(bs.phone)}</div>`:''}${bs.address?`<div class="center muted">${esc(bs.address)}</div>`:''}${bs.ruc?`<div class="center muted">RUC/Doc: ${esc(bs.ruc)}</div>`:''}<div class="vreceiptSep"></div><div class="vreceiptLine"><span>N.º</span><b>${esc(ticketNo(sale))}</b></div><div class="vreceiptLine"><span>Fecha</span><span>${esc(dateText(sale))}</span></div><div class="vreceiptLine"><span>Pago</span><span>${esc(sale.paymentMethod||'Efectivo')}</span></div>${sale.customerName?`<div class="vreceiptLine"><span>Cliente</span><span>${esc(sale.customerName)}</span></div>`:''}${receiptSeller(sale)?`<div class="vreceiptLine"><span>Vendedor</span><span>${esc(receiptSeller(sale))}</span></div>`:''}<div class="vreceiptSep"></div>${items.map(i=>{const q=Number(i.qty||0),p=Number(i.price||0),weighted=isWeightItem(i);const unit=String(receiptUnit(i)||'unidades').toLowerCase(),priceUnit=unit==='unidades'?'unidad':unit;const meta=weighted?`Peso: ${weightLabel(q)}<br>Precio por kilo: ${money(p)}`:`Cantidad: ${q} ${unit}<br>Precio por ${priceUnit}: ${money(p)}`;return `<div class="vreceiptLine"><div><div class="vreceiptItemName">${esc(i.name||'Producto')}</div>${itemDescription(i)?`<div class="vreceiptItemMeta">${esc(itemDescription(i))}</div>`:''}<div class="vreceiptItemMeta">${meta}</div></div><b>${money(q*p)}</b></div>`}).join('')}${Number(sale.discount)>0?`<div class="vreceiptSep"></div><div class="vreceiptLine"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="vreceiptLine"><span>Descuento</span><span>-${money(sale.discount)}</span></div>`:''}<div class="vreceiptSep"></div><div class="vreceiptTotal"><span>TOTAL</span><span>${money(sale.total)}</span></div>${paymentDetailHTML(sale)}${sale.paymentMethod==='Fiado'?`<div class="center muted" style="margin-top:8px">Venta al crédito · Saldo: ${money(Math.max(0,(Number(sale.total)||0)-(Number(sale.paidAmount)||0)))}</div>`:''}${sale.notes?`<div class="center muted" style="margin-top:8px">Nota: ${esc(sale.notes)}</div>`:''}<div class="vreceiptDisclaimer">${esc(bs.ticketMessage||'Gracias por su compra.')}<br>Este ticket es un comprobante interno y no reemplaza una boleta o factura electrónica SUNAT.</div></div>`;
      }
      let receiptSettingsHydration=null;
      async function hydrateReceiptBusinessSettings(){
        if(receiptSettingsHydration)return receiptSettingsHydration;
        receiptSettingsHydration=(async()=>{
          try{
            const sb=window.vareliaSupabase;
            if(!sb)return false;
            const {data:userData,error:userError}=await sb.auth.getUser();
            if(userError||!userData?.user)return false;
            const {data:profile,error:profileError}=await sb.from('profiles').select('business_id,role').eq('id',userData.user.id).maybeSingle();
            if(profileError||!profile?.business_id)return false;
            const {data:row,error}=await sb.from('varelia_business_settings').select('logo_data,phone,address,ruc,ticket_message,business_slogan').eq('business_id',profile.business_id).maybeSingle();
            if(error||!row)return false;
            const cloudLogo=String(row.logo_data||'');
            if(cloudLogo.startsWith('data:image/'))window.vareliaCloudBusinessLogo=cloudLogo;
            const current=window.vareliaVideoSettings||{};
            window.vareliaVideoSettings={...current,
              ...(cloudLogo.startsWith('data:image/')?{logo:cloudLogo}:{}),
              ...(row.phone?{phone:row.phone}:{}),
              ...(row.address?{address:row.address}:{}),
              ...(row.ruc?{ruc:row.ruc}:{}),
              ...(row.ticket_message?{ticketMessage:row.ticket_message}:{})
            };
            return true;
          }catch(e){console.warn('No se pudo recuperar la configuración del comprobante',e);return false}
          finally{receiptSettingsHydration=null}
        })();
        return receiptSettingsHydration;
      }
      function showReceipt(sale){
        currentReceipt=sale;window.__vareliaCurrentReceiptSale=sale;
        window.__vareliaDownloadCurrentReceipt=()=>{if(currentReceipt)savePDF(currentReceipt)};
        preview.innerHTML=receiptHTML(sale);
        if(!overlay.classList.contains('show')){try{history.pushState({vareliaReceipt:true},'',location.href);receiptBackState=true}catch{receiptBackState=false}}
        overlay.classList.add('show');
        hydrateReceiptBusinessSettings().then(ok=>{
          if(ok&&currentReceipt===sale&&overlay.classList.contains('show'))preview.innerHTML=receiptHTML(sale);
        });
      }
      function receiptText(sale){
        const bs=businessSettings(),items=(sale.items||[]).map(i=>`${i.qty} ${receiptUnit(i)||'unidades'} x ${i.name}${itemDescription(i)?' — '+itemDescription(i):''} — ${money(Number(i.qty||0)*Number(i.price||0))}`).join('\n');
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
          method:receiptPaymentData(sale).method,
          seller:receiptSeller(sale),
          customer:String(sale?.customerName||''),
          total:Number(sale?.total||0),
          received:receiptPaymentData(sale).received,
          change:receiptPaymentData(sale).change,
          breakdown:receiptPaymentData(sale).breakdown,
          items:(Array.isArray(sale?.items)?sale.items:[]).map(i=>({name:String(i?.name||'Producto'),qty:Number(i?.qty||0),price:Number(i?.price||0),subtotal:Number(i?.qty||0)*Number(i?.price||0),saleType:String(i?.saleType||''),unit:String(receiptUnit(i)||i?.unit||''),byWeight:i?.byWeight===true,description:itemDescription(i)}))
        };
      }
      function printReceipt(sale){
        const saleItems=Array.isArray(sale?.items)?sale.items:[];
        let saleTotal=Number(sale?.total)||0;
        if(saleTotal<=0) saleTotal=saleItems.reduce((sum,item)=>sum+(Number(item?.qty)||0)*(Number(item?.price)||0),0);
        if(!saleItems.length||saleTotal<=0){
          alert('No se imprimió el comprobante porque la venta no contiene productos o el total es S/ 0.00. Abre la venta guardada y vuelve a generar el comprobante.');
          return;
        }
        if(Number(sale.total)!==saleTotal) sale={...sale,total:saleTotal};
        let w=null,printFrame=null;
        const bs=businessSettings(),width=String(bs.thermalWidth||'80')==='58'?58:80,paper=width===58?52:72;
        const pay=receiptPaymentData(sale),payRows=Object.entries(pay.breakdown||{}).filter(([,v])=>Number(v)>0);
        const payHtml='<div class="sep"></div><b>DETALLE DE PAGO</b>'+(payRows.length?payRows.map(([k,v])=>'<div class="line"><span>'+esc(k)+'</span><b>'+money(v)+'</b></div>').join(''):'<div class="line"><span>'+esc(pay.method)+'</span><b>'+money(sale.total)+'</b></div>')+'<div class="line"><span>'+(pay.method==='Efectivo'?'Efectivo recibido':'Monto recibido')+'</span><b>'+money(pay.received)+'</b></div><div class="line"><span>Vuelto</span><b>'+money(pay.change)+'</b></div>';
        const logoMaxW=width===58?24:30,logoMaxH=width===58?18:22;
        const logoHtml=bs.logo?`<div class="c logoWrap"><img id="ticketLogo" src="${esc(bs.logo)}" alt="Logo"></div>`:'';
        const businessInfo=`${bs.ruc?`<div class="c small">RUC/Doc: ${esc(bs.ruc)}</div>`:''}${bs.phone?`<div class="c small">Tel: ${esc(bs.phone)}</div>`:''}${bs.address?`<div class="c small">${esc(bs.address)}</div>`:''}`;
        const customerInfo=`${sale.customerName?`<div class="line"><span>Cliente</span><span>${esc(sale.customerName)}</span></div>`:''}${sale.sellerName?`<div class="line"><span>Vendedor</span><span>${esc(sale.sellerName)}</span></div>`:''}`;
        const footer=esc(bs.ticketMessage||'Gracias por su compra.');
        const printDocumentHtml=`<html><head><meta charset="utf-8"><title>${esc(ticketNo(sale))}</title><style>@page{size:${width}mm auto;margin:2mm}*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;background:#fff;width:100%} @media print{html,body{width:${paper}mm!important;margin:0!important;padding:0!important}.paper{width:${paper}mm!important;margin:0 auto!important;page-break-after:avoid;break-after:avoid}} @media screen{body{background:#fff}}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}.paper{width:${paper}mm;margin:0 auto}.c{text-align:center}.logoWrap{margin:0 0 2mm}.logoWrap img{display:block;margin:0 auto;max-width:${logoMaxW}mm;max-height:${logoMaxH}mm;width:auto;height:auto;object-fit:contain}.sep{border-top:1px dashed #777;margin:2mm 0}.line{display:flex;justify-content:space-between;gap:2mm;margin:1mm 0;align-items:flex-start}.line span:first-child{min-width:0;overflow-wrap:anywhere}.line span:last-child,.line b:last-child{text-align:right;overflow-wrap:anywhere}.small{font-size:10px;color:#444;line-height:1.25}.total{font-size:20px;font-weight:800;border-top:1px solid #111;border-bottom:1px solid #111;padding:2mm 0}.item{display:flex;justify-content:space-between;gap:3mm;margin:3mm 0;break-inside:avoid}.item>div{min-width:0;overflow-wrap:anywhere}.item>b{white-space:nowrap}h2{font-size:17px;margin:0 0 1mm}.footer{margin-top:3mm}</style></head><body><div class="paper">${logoHtml}<h2 class="c">${esc(businessName())}</h2><div class="c small">COMPROBANTE INTERNO DE VENTA</div>${businessInfo}<div class="sep"></div><div class="line"><span>N.º</span><b>${esc(ticketNo(sale))}</b></div><div class="line"><span>Fecha</span><span>${esc(dateText(sale))}</span></div><div class="line"><span>Pago</span><span>${esc(sale.paymentMethod||'Efectivo')}</span></div>${customerInfo}<div class="sep"></div>${(sale.items||[]).map(i=>{const q=Number(i.qty||0),p=Number(i.price||0),weighted=isWeightItem(i);let unit=String(receiptUnit(i)||'unidades').trim().toLowerCase();const unitKey=unit.normalize('NFD').replace(/[\u0300-\u036f]/g,'');const unitMap={unidades:'unidad',unidad:'unidad',unids:'unidad',blister:'blíster',blisters:'blíster',blisteres:'blíster',cajas:'caja',pastillas:'pastilla',tabletas:'tableta',gramos:'gramo',kilogramos:'kilogramo',litros:'litro',mililitros:'mililitro',frascos:'frasco',sobres:'sobre',paquetes:'paquete',docenas:'docena'};const unitForPrice=unitMap[unitKey]||unit;if(!unit||unit==='unidades')unit='unidad';const description=itemDescription(i)?'<div class="small">'+esc(itemDescription(i))+'</div>':'';const meta=weighted?'<div class="small">Peso: '+esc(weightLabel(q))+'</div><div class="small">Precio por kilo: '+money(p)+'</div>':'<div class="small">Cantidad: '+esc(q)+' '+esc(unit)+'</div><div class="small">Precio por '+esc(unitForPrice)+': '+money(p)+'</div>';return '<div class="item"><div><b>'+esc(i.name||'Producto')+'</b>'+description+meta+'</div><b>'+money(q*p)+'</b></div>'}).join('')}<div class="sep"></div><div class="line total"><span>TOTAL</span><span>${money(sale.total)}</span></div>${payHtml}<p class="c small footer">${footer}<br>Comprobante interno. No reemplaza boleta o factura SUNAT.</p></div><script>(()=>{let done=false;const go=()=>{if(done)return;done=true;setTimeout(()=>{try{focus()}catch{}try{print()}catch(e){console.error('Error al abrir impresión',e)}setTimeout(()=>{try{if(window.frameElement)window.frameElement.style.display='none'}catch{}try{close()}catch{}},1200)},250)};const img=document.getElementById('ticketLogo');if(img&&!img.complete){img.onload=go;img.onerror=go;setTimeout(go,1800)}else go()})()<\/script></body></html>`;
        if(window.VareliaAndroid&&typeof window.VareliaAndroid.printHtmlDocument==='function'){
          try{window.VareliaAndroid.printHtmlDocument('Comprobante '+ticketNo(sale),printDocumentHtml);return}
          catch(nativeError){console.warn('Impresión HTML nativa no disponible; se intentará la impresión web',nativeError)}
        }
        try{w=window.open('','_blank','width=420,height=720')}catch{}
        if(!w){
          printFrame=document.createElement('iframe');
          printFrame.setAttribute('title','Imprimir comprobante');
          printFrame.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;border:0;background:#fff;z-index:2147483647';
          document.body.appendChild(printFrame);
          w=printFrame.contentWindow;
        }
        if(!w){alert('No se pudo abrir la impresión. Permite las ventanas emergentes o usa la opción de imprimir de Android.');return}
        w.document.open();w.document.write(printDocumentHtml);w.document.close();
      }
      function loadJsPDF(){
        if(window.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
        if(window.__vareliaJsPdfLoader)return window.__vareliaJsPdfLoader;
        window.__vareliaJsPdfLoader=new Promise((resolve,reject)=>{
          const sources=[
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js'
          ];
          let index=0,script=null,timer=null,lastError=null,done=false;
          const finish=(error,ctor)=>{
            if(done)return;done=true;clearTimeout(timer);script?.remove();
            if(ctor){window.__vareliaJsPdfLoader=null;resolve(ctor)}
            else{window.__vareliaJsPdfLoader=null;reject(error||new Error('No se pudo cargar el generador de PDF'))}
          };
          const attempt=()=>{
            if(window.jspdf?.jsPDF)return finish(null,window.jspdf.jsPDF);
            if(index>=sources.length)return finish(lastError||new Error('No se pudo cargar el generador de PDF'));
            script=document.createElement('script');
            const src=sources[index++];
            script.async=true;
            script.onload=()=>{
              clearTimeout(timer);
              if(window.jspdf?.jsPDF)finish(null,window.jspdf.jsPDF);
              else{lastError=new Error('La biblioteca PDF no respondió');attempt()}
            };
            script.onerror=()=>{lastError=new Error('No se pudo descargar la biblioteca PDF');clearTimeout(timer);attempt()};
            timer=setTimeout(()=>{lastError=new Error('Tiempo agotado al cargar la biblioteca PDF');attempt()},8000);
            script.src=src;document.head.appendChild(script);
          };
          attempt();
        });
        return window.__vareliaJsPdfLoader;
      }
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
          const jsPDF=await loadJsPDF(),items=Array.isArray(sale.items)?sale.items:[],bs=businessSettings();
          const pay=receiptPaymentData(sale),width=String(bs.thermalWidth||'80')==='58'?58:80;
          const margin=4,right=width-margin,center=width/2,usable=width-margin*2;
          const logo=bs.logo?await pdfLogoData(bs.logo).catch(()=>''):'';
          const render=(doc)=>{
            let y=7;
            const text=(value,size=8,bold=false,align='left',max=usable)=>{
              doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
              const lines=doc.splitTextToSize(String(value||''),max);
              doc.text(lines,align==='center'?center:margin,y,{align});
              y+=lines.length*size*.3528*1.25+1.4;
            };
            const rule=()=>{y+=1;doc.setDrawColor(190);doc.setLineWidth(.2);doc.line(margin,y,right,y);y+=4;};
            const row=(label,value,bold=false,size=8)=>{
              doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
              const valueWidth=Math.min(usable*.56,Math.max(18,doc.getTextWidth(String(value))+1));
              const leftLines=doc.splitTextToSize(String(label),usable-valueWidth-2);
              const rightLines=doc.splitTextToSize(String(value),valueWidth);
              doc.text(leftLines,margin,y);doc.text(rightLines,right,y,{align:'right'});
              y+=Math.max(leftLines.length,rightLines.length)*size*.3528*1.25+2;
            };
            if(logo){try{doc.addImage(logo,'JPEG',center-9,y,18,13,undefined,'FAST');y+=17}catch{}}
            text(businessName(),13,true,'center');
            text('COMPROBANTE DE VENTA',7,false,'center');
            if(bs.ruc)text('RUC / Doc: '+bs.ruc,7,false,'center');
            if(bs.phone)text('Tel: '+bs.phone,7,false,'center');
            if(bs.address)text(bs.address,7,false,'center');
            rule();text(ticketNo(sale),8,true);text(dateText(sale),7);
            row('Pago',sale.paymentMethod||'Efectivo');
            if(sale.customerName)text('Cliente: '+sale.customerName,7);
            if(receiptSeller(sale))text('Vendedor: '+receiptSeller(sale),7);
            rule();
            items.forEach(i=>{
              const q=Number(i.qty||0),p=Number(i.price||0);
              row(i.name||'Producto',money(q*p),true);
              if(itemDescription(i))text(itemDescription(i),7);
              text(isWeightItem(i)?weightLabel(q)+' · '+money(p)+' / kg':q+' '+String(receiptUnit(i)||'unidades')+' × '+money(p),7);
              y+=1;
            });
            if(Number(sale.discount)>0){row('Subtotal',money(Number(sale.subtotal??(Number(sale.total)+Number(sale.discount)))));row('Descuento','− '+money(sale.discount));}
            rule();row('TOTAL',money(sale.total),true,12);rule();
            Object.entries(pay.breakdown||{}).filter(([,v])=>Number(v)>0).forEach(([k,v])=>row(k,money(v)));
            row(pay.method==='Efectivo'?'Recibido':'Monto recibido',money(pay.received));row('Vuelto',money(pay.change));
            if(sale.notes)text('Nota: '+sale.notes,7);
            rule();text(bs.ticketMessage||'Gracias por tu compra',8,true,'center');
            text('Comprobante interno. No reemplaza una boleta o factura SUNAT.',6,false,'center');
            return y+4;
          };
          // Measure the same wrapped layout before creating the final page.
          const measured=render(new jsPDF({unit:'mm',format:[width,1000]}));
          const doc=new jsPDF({unit:'mm',format:[width,Math.max(width+1,Math.ceil(measured))]});
          render(doc);
          const name='comprobante-'+ticketNo(sale)+'.pdf',uri=doc.output('datauristring');
          if(window.VareliaAndroid&&typeof window.VareliaAndroid.saveDataUrl==='function'){
            try{window.VareliaAndroid.saveDataUrl(uri,name);return}catch(nativeError){console.warn('Guardado nativo no disponible; se usará descarga web',nativeError)}
          }
          try{doc.save(name)}catch(saveError){console.warn('doc.save falló',saveError)}
          setTimeout(()=>{
            try{
              const blob=doc.output('blob'),url=URL.createObjectURL(blob),a=document.createElement('a');
              a.href=url;a.download=name;a.target='_blank';a.rel='noopener';
              a.style.cssText='position:fixed;left:-10000px;top:0';
              document.body.appendChild(a);a.click();
              setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},60000);
            }catch(fallbackError){console.error('Alternativa PDF falló',fallbackError)}
          },100);
        }catch(e){console.error(e);if(window.VareliaAndroid&&typeof window.VareliaAndroid.saveSalePdf==='function'){try{window.VareliaAndroid.saveSalePdf(JSON.stringify(nativeReceiptPayload(sale)));return}catch{}}alert('No se pudo descargar el comprobante. Intenta usar Imprimir y luego Guardar como PDF.')}
      }
      async function shareReceipt(sale){
        const text=receiptText(sale);
        if(navigator.share){try{await navigator.share({title:'Comprobante '+ticketNo(sale),text});return}catch(e){if(e?.name==='AbortError')return}}
        window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
      }
      document.addEventListener('click',function(e){const b=e.target&&e.target.closest?e.target.closest('#vreceiptPdf'):null;if(!b||!currentReceipt)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();if(window.__vareliaReceiptDownloadBusy)return;window.__vareliaReceiptDownloadBusy=true;const label=b.textContent;b.disabled=true;b.textContent='Preparando PDF…';Promise.resolve(window.__vareliaDownloadCurrentReceipt?window.__vareliaDownloadCurrentReceipt():window.VareliaReceipt?.pdf?.(currentReceipt)).catch(err=>{console.error(err);alert('No se pudo guardar el PDF. Usa Imprimir y elige Guardar como PDF.')}).finally(()=>{b.disabled=false;b.textContent=label;setTimeout(()=>{window.__vareliaReceiptDownloadBusy=false},350)});},true);
      const receiptPdfButton=overlay.querySelector('#vreceiptPdf');
      receiptPdfButton.onclick=async (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if(!currentReceipt||window.__vareliaReceiptDownloadBusy)return;
        window.__vareliaReceiptDownloadBusy=true;
        receiptPdfButton.disabled=true;
        const label=receiptPdfButton.textContent;
        receiptPdfButton.textContent='Preparando PDF…';
        try{await savePDF(currentReceipt)}
        finally{
          receiptPdfButton.disabled=false;
          receiptPdfButton.textContent=label;
          setTimeout(()=>{window.__vareliaReceiptDownloadBusy=false},350);
        }
      };
      overlay.querySelector('#vreceiptPrint').onclick=()=>currentReceipt&&printReceipt(currentReceipt);
      overlay.querySelector('#vreceiptWhatsApp').onclick=()=>currentReceipt&&shareReceipt(currentReceipt);

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
        let waited=0;
        const waitForSavedSale=()=>{
          if(!pending)return;
          try{
            if(Array.isArray(sales)&&sales.length>pending.before){
              const sale=sales[sales.length-1];
              if(!sale.receiptNumber)sale.receiptNumber='V-'+new Date(sale.date||Date.now()).toISOString().slice(0,10).replace(/-/g,'')+'-'+String(sale.id||Date.now()).replace(/[^a-z0-9]/gi,'').slice(-6).toUpperCase();
              sale.paymentMethod=pending.paymentMethod;const snap=window.VareliaPaymentSnapshot;if(snap&&Date.now()-Number(snap.at||0)<15000){sale.paymentMethod=snap.method||sale.paymentMethod;const totalForPayment=Math.max(0,Number(sale.total)||Number(snap.total)||0);const snapReceived=Math.max(0,Number(snap.received)||0);const inputReceived=Math.max(0,Number(document.getElementById('vposAmountReceived')?.value)||Number(document.getElementById('vpayReceived')?.value)||Number(document.getElementById('vReceived')?.value)||Number(document.getElementById('vCash')?.value)||0);const actualReceived=sale.paymentMethod==='Fiado'?snapReceived:(snapReceived||inputReceived||totalForPayment);const actualChange=sale.paymentMethod==='Fiado'?0:Math.max(0,Number(snap.change)||Math.max(0,actualReceived-totalForPayment));const bd=snap.breakdown&&typeof snap.breakdown==='object'?snap.breakdown:{};sale.paymentBreakdown=Object.keys(bd).some(k=>Number(bd[k])>0)?bd:{[sale.paymentMethod]:Math.min(totalForPayment,actualReceived)};sale.amountReceived=Math.max(Number(sale.amountReceived)||0,actualReceived);sale.changeGiven=Math.max(Number(sale.changeGiven)||0,actualChange);}const ex=pending.extras||{};const originalTotal=Number(sale.total)||0;sale.subtotal=originalTotal;sale.discount=Math.max(0,Math.min(originalTotal,Number(ex.discount)||0));sale.total=Math.max(0,originalTotal-sale.discount);sale.notes=String(ex.notes||'').trim();sale.customerName=String(ex.customerName||'').trim();if(sale.paymentMethod==='Fiado'&&!Number.isFinite(Number(sale.paidAmount)))sale.paidAmount=0;const vp=window.vareliaCurrentUserProfile||{};sale.sellerId=vp.id||window.vareliaSellerId||'';sale.sellerName=vp.full_name||window.vareliaSellerName||document.getElementById('vareliaUserEmail')?.textContent?.trim()?.split('@')[0]||'Usuario';sale.sellerRole=vp.role||window.vareliaSellerRole||'';sale.receiptIssuedAt=new Date().toISOString();
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
    setTimeout(()=>{clearInterval(wait);if(!window.__vareliaPosReceiptRestoredV102)window.__vareliaPosReceiptInitializing=false},15000);
  });
})();
