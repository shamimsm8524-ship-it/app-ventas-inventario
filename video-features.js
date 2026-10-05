(()=>{
  if(window.__vareliaVideoFeatures)return;
  window.__vareliaVideoFeatures=true;

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    const STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_video_settings_v1'):'varelia_video_settings_v1__no_account';
    const QR_YAPE_STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_qr_yape_v2'):'varelia_qr_yape_v2__no_account';
    const QR_PLIN_STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_qr_plin_v2'):'varelia_qr_plin_v2__no_account';
    const QR_YAPE_HOLDER_STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_qr_yape_holder_v2'):'varelia_qr_yape_holder_v2__no_account';
    const QR_PLIN_HOLDER_STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_qr_plin_holder_v2'):'varelia_qr_plin_holder_v2__no_account';
    const DEFAULTS={businessName:'',businessSlogan:'',logo:'',ruc:'',phone:'',address:'',businessHours:'',publicMapUrl:'',publicAllowDelivery:true,publicAllowPickup:true,publicPaymentMethods:'Efectivo,Yape,Plin,Transferencia',deliveryInDriveEnabled:true,deliveryInDriveCost:12,deliveryOlvaEnabled:true,deliveryOlvaCost:15,deliveryShalomEnabled:true,deliveryShalomCost:0,deliveryShalomPayAgency:true,ticketMessage:'Gracias por su compra.',currency:'S/',yapeHolder:'',yapeQr:'',plinHolder:'',plinQr:'',transferDetails:'',thermalWidth:'80',autoBarcode:true,enableVariants:false,socialTikTok:'',socialFacebook:'',socialInstagram:'',socialWhatsApp:'',socialYouTube:'',socialOther:''};
    const loadSettings=()=>{try{
      const base={...DEFAULTS,...JSON.parse(localStorage.getItem(STORE)||'{}')};
      const y=localStorage.getItem(QR_YAPE_STORE),p=localStorage.getItem(QR_PLIN_STORE);
      const yh=localStorage.getItem(QR_YAPE_HOLDER_STORE),ph=localStorage.getItem(QR_PLIN_HOLDER_STORE);
      if(y)base.yapeQr=y;if(p)base.plinQr=p;if(yh!==null)base.yapeHolder=yh;if(ph!==null)base.plinHolder=ph;
      return base;
    }catch{return {...DEFAULTS}}};
    let cfg=loadSettings();
    const saveCfg=()=>{try{
      localStorage.setItem(STORE,JSON.stringify(cfg));
      if(cfg.yapeQr)localStorage.setItem(QR_YAPE_STORE,cfg.yapeQr);
      if(cfg.plinQr)localStorage.setItem(QR_PLIN_STORE,cfg.plinQr);
      localStorage.setItem(QR_YAPE_HOLDER_STORE,String(cfg.yapeHolder||''));
      localStorage.setItem(QR_PLIN_HOLDER_STORE,String(cfg.plinHolder||''));
      window.vareliaVideoSettings={...cfg};
    }catch{}};window.vareliaVideoSettings={...cfg};

    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    let cloudPaymentSyncPromise=null;
    async function cloudPaymentContext(){
      for(let i=0;i<80&&!window.vareliaSupabase;i++)await sleep(100);
      const sb=window.vareliaSupabase;if(!sb)return null;
      const {data:u,error:ue}=await sb.auth.getUser();if(ue||!u?.user)return null;
      const {data:p,error:pe}=await sb.from('profiles').select('business_id,role').eq('id',u.user.id).maybeSingle();
      if(pe||!p?.business_id)return null;
      return {sb,businessId:String(p.business_id),role:String(p.role||'')};
    }
    async function pushCloudPaymentSettings(context=null){
      const ctx=context||await cloudPaymentContext();
      if(!ctx||ctx.role!=='owner')return false;
      const payload={
        business_id:ctx.businessId,
        payment_methods:['Efectivo','Yape','Plin','Transferencia','Tarjeta'],
        payment_qr_data:cfg.yapeQr||cfg.plinQr||null,
        yape_qr_data:cfg.yapeQr||null,
        plin_qr_data:cfg.plinQr||null,
        payment_qr_yape:cfg.yapeQr||null,
        payment_qr_plin:cfg.plinQr||null,
        payment_holder:cfg.yapeHolder||cfg.plinHolder||null,
        transfer_details:cfg.transferDetails||null,
        updated_at:new Date().toISOString()
      };
      const {error}=await ctx.sb.from('varelia_business_settings').upsert(payload,{onConflict:'business_id'});
      if(error)throw error;
      return true;
    }
    async function pullCloudPaymentSettings(){
      if(cloudPaymentSyncPromise)return cloudPaymentSyncPromise;
      cloudPaymentSyncPromise=(async()=>{
        const ctx=await cloudPaymentContext();if(!ctx)return false;
        const {data,error}=await ctx.sb.from('varelia_business_settings')
          .select('yape_qr_data,plin_qr_data,payment_qr_yape,payment_qr_plin,payment_qr_data,payment_holder,transfer_details')
          .eq('business_id',ctx.businessId).maybeSingle();
        if(error)throw error;
        const cloudYape=String(data?.yape_qr_data||data?.payment_qr_yape||'');
        const cloudPlin=String(data?.plin_qr_data||data?.payment_qr_plin||'');
        const localYape=String(localStorage.getItem(QR_YAPE_STORE)||cfg.yapeQr||'');
        const localPlin=String(localStorage.getItem(QR_PLIN_STORE)||cfg.plinQr||'');
        const hadLocalYape=!!localYape,hadLocalPlin=!!localPlin;
        // Nunca pisar un QR específico ya elegido en este dispositivo con una copia antigua de la nube.
        if(!hadLocalYape&&cloudYape)cfg.yapeQr=cloudYape;
        if(!hadLocalPlin&&cloudPlin)cfg.plinQr=cloudPlin;
        if(data?.payment_holder){
          if(!cfg.yapeHolder)cfg.yapeHolder=String(data.payment_holder);
          if(!cfg.plinHolder)cfg.plinHolder=String(data.payment_holder);
        }
        if(data?.transfer_details)cfg.transferDetails=String(data.transfer_details);
        saveCfg();
        const y=document.getElementById('vYapePreview'),p=document.getElementById('vPlinPreview');
        if(y)y.src=cfg.yapeQr||'';if(p)p.src=cfg.plinQr||'';
        const yh=document.getElementById('vsetYapeHolder'),ph=document.getElementById('vsetPlinHolder'),td=document.getElementById('vsetTransferDetails');
        if(yh&&!yh.value)yh.value=cfg.yapeHolder||'';if(ph&&!ph.value)ph.value=cfg.plinHolder||'';if(td&&!td.value)td.value=cfg.transferDetails||'';
        window.VareliaSaleExtrasUpdate?.();
        // Si el QR local falta en nube o es distinto, el QR elegido por el dueño en la APK gana y se sincroniza.
        if(ctx.role==='owner'&&(
          (hadLocalYape&&localYape!==cloudYape)||
          (hadLocalPlin&&localPlin!==cloudPlin)
        ))await pushCloudPaymentSettings(ctx);
        return true;
      })().catch(err=>{console.warn('Varelia cloud payment sync',err);return false});
      return cloudPaymentSyncPromise;
    }
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const money=n=>(cfg.currency||'S/')+' '+Number(n||0).toFixed(2);
    const arr=name=>{try{return typeof window[name]!=='undefined'&&Array.isArray(window[name])?window[name]:(eval('typeof '+name+"!=='undefined'?"+name+':[]'))}catch{return[]}};
    const salesList=()=>{try{return typeof sales!=='undefined'&&Array.isArray(sales)?sales:[]}catch{return[]}};
    const productsList=()=>{try{return typeof products!=='undefined'&&Array.isArray(products)?products:[]}catch{return[]}};
    const saveAll=()=>{try{if(typeof save==='function')save()}catch{}};

    const style=document.createElement('style');
    style.id='vareliaVideoFeaturesCss';
    style.textContent=`
      .vrefHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px}.vrefHead h2{margin:0;font-size:25px}.vrefHead p{margin:4px 0 0;color:var(--muted);font-size:11px}
      .vrefTabs{display:flex;gap:7px;overflow:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}.vrefTabs::-webkit-scrollbar{display:none}.vrefTab{border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--muted);padding:9px 13px;font-weight:900;font-size:11px;white-space:nowrap}.vrefTab.active{background:var(--p);border-color:var(--p);color:#fff}
      .vrefStats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.vrefStat{border:1px solid var(--line);border-radius:16px;background:var(--card);padding:13px}.vrefStat small{display:block;color:var(--muted);font-size:10px}.vrefStat strong{display:block;margin-top:4px;font-size:21px}
      .vrefPanel{margin-top:12px;border:1px solid var(--line);border-radius:18px;background:var(--card);padding:14px}.vrefPanel h3{margin:0 0 11px;font-size:14px}.vrefPayments{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.vrefPayment{padding:10px;border-radius:13px;background:var(--bg);display:flex;justify-content:space-between;gap:8px;font-size:11px}.vrefPayment b{color:var(--p)}
      .vrefTicket{border-top:1px solid var(--line);padding:11px 0}.vrefTicket:first-of-type{border-top:0}.vrefTicketTop{display:flex;justify-content:space-between;gap:8px}.vrefTicketTop b{font-size:12px}.vrefTicketTop strong{color:var(--p)}.vrefTicketMeta{font-size:10px;color:var(--muted);margin-top:3px}.vrefTicketBtns{display:flex;gap:7px;margin-top:8px}.vrefTicketBtns button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:10px;padding:7px 9px;font-size:10px;font-weight:850}
      .vrefCredit{border:1px solid color-mix(in srgb,#9333ea 25%,var(--line));background:color-mix(in srgb,#9333ea 4%,var(--card));border-radius:15px;padding:12px;margin-top:9px}.vrefCreditTop{display:flex;justify-content:space-between;gap:10px}.vrefCredit strong{color:#9333ea}.vrefCredit small{display:block;color:var(--muted);margin-top:3px}.vrefCredit button{width:100%;margin-top:9px;border:0;border-radius:10px;padding:9px;background:#9333ea;color:#fff;font-weight:900}
      .vrefTools{display:flex;gap:7px;overflow:auto;margin-top:12px}.vrefTools button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:11px;padding:9px 11px;font-size:10px;font-weight:850;white-space:nowrap}
      .vsettingsSection{border:1px solid var(--line);border-radius:18px;background:var(--card);padding:14px;margin-bottom:11px}.vsettingsSection h3{margin:0 0 4px;font-size:14px}.vsettingsSection>p{margin:0 0 12px;color:var(--muted);font-size:10px}.vsettingsGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.vsettingsGrid .full{grid-column:1/-1}.vsettingsSection label{display:grid;gap:5px;font-size:10px;font-weight:850}.vsettingsSection input,.vsettingsSection textarea,.vsettingsSection select{border-radius:11px;padding:10px 11px;font-size:12px}.vsettingsAction{width:100%;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:10px 11px;font-weight:900;margin-top:7px}.vsettingsAction.primary{border:0;background:linear-gradient(135deg,#f0066e,#a92bf5);color:#fff}.vsettingsAction.danger{background:#fff1f2;color:#be123c;border-color:#fecdd3}.vsettingsLinks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.vsettingsLink{min-height:76px;border:1px solid var(--line);border-radius:14px;background:var(--bg);color:var(--ink);padding:11px;text-align:left}.vsettingsLink span{display:block;font-size:18px;margin-bottom:6px}.vsettingsLink b{font-size:11px}.vsettingsLink small{display:block;color:var(--muted);font-size:9px;margin-top:2px}
      .vqrPreview{width:82px;height:82px;border:1px dashed var(--line);border-radius:12px;object-fit:contain;background:#fff}.vqrRow{display:grid;grid-template-columns:90px 1fr;gap:10px;align-items:center}
      .vposExtras{margin-top:12px;display:grid;gap:9px}.vposExtraGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vposExtraGrid label{display:grid;gap:5px;font-size:11px;font-weight:850;color:var(--muted)}.vposExtraGrid input,.vposExtraGrid textarea{border-radius:11px;padding:9px 10px}.vposExtraGrid .full{grid-column:1/-1}.vposDue{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--p) 6%,var(--card));font-size:12px}.vposDue strong{font-size:18px;color:var(--p)}
      .vposQrBox{display:none;grid-template-columns:220px 1fr;gap:18px;align-items:center;border:1px solid var(--line);border-radius:18px;padding:16px;background:var(--card)}.vposQrBox.show{display:grid}.vposQrBox img{width:220px;height:220px;object-fit:contain;background:#fff;border-radius:14px;padding:8px;border:1px solid var(--line)}.vposQrBox b{display:block;font-size:18px;line-height:1.25}.vposQrBox small{display:block;color:var(--muted);font-size:12px;margin-top:6px}
      .vprodExtras{display:grid;gap:10px;border:1px solid var(--line);border-radius:14px;padding:11px;background:var(--bg)}.vbarcodeRow{display:grid;grid-template-columns:1fr auto;gap:7px}.vbarcodeGen{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:10px;padding:8px 10px;font-weight:850;font-size:11px}
      @media(max-width:560px){.vsettingsGrid,.vposExtraGrid{grid-template-columns:1fr}.vsettingsGrid .full,.vposExtraGrid .full{grid-column:auto}.vsettingsLinks{grid-template-columns:1fr 1fr}.vrefPayments{grid-template-columns:1fr 1fr}.vposQrBox{grid-template-columns:1fr;text-align:center;padding:18px}.vposQrBox img{width:min(72vw,280px);height:min(72vw,280px);margin:0 auto}.vposQrBox b{font-size:20px}.vposQrBox small{font-size:13px}}
    `;
    document.head.appendChild(style);

    function ean13(){
      const base=Array.from({length:12},()=>Math.floor(Math.random()*10));
      let sum=0;for(let i=0;i<12;i++)sum+=base[i]*(i%2===0?1:3);
      const check=(10-(sum%10))%10;return base.join('')+check;
    }

    function periodSales(period){
      const all=salesList(),now=new Date();
      if(period==='all')return [...all];
      return all.filter(s=>{
        const d=new Date(s.date);
        if(period==='today')return d.toDateString()===now.toDateString();
        if(period==='week'){const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));return d>=start}
        if(period==='month')return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
        return true;
      });
    }

    function showView(id){
      const target=document.getElementById(id);if(!target)return false;
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v===target));
      try{scrollTo({top:0,behavior:'smooth'})}catch{}
      return true;
    }
    function openExisting(kind){
      if(kind==='reports'||kind==='profit'||kind==='help'){
        try{window.vareliaShowExtraView?.(kind)}catch{}
        setTimeout(()=>showView(kind),20);return;
      }
      if(kind==='sellers'){if(showView('sellers'))return;document.querySelector('.premiumSellersItem')?.click();return}
      const b=document.querySelector('#sidebar .nav [data-view="'+kind+'"]');
      if(b){b.click();return}
      showView(kind);
    }

    function setupHistory(){
      const sec=document.getElementById('mobileHistoryHub');if(!sec)return false;if(sec.__vHistoryReady){window.VareliaVideoHistory?.render?.();return true}sec.__vHistoryReady=true;
      let period='today',mode='tickets';
      const render=()=>{
        const ss=periodSales(period),total=ss.reduce((a,s)=>a+(Number(s.total)||0),0),avg=ss.length?total/ss.length:0;
        const payments={};ss.forEach(s=>{const k=s.paymentMethod||'No registrado';payments[k]=(payments[k]||0)+(Number(s.total)||0)});
        const fiados=salesList().filter(s=>(s.paymentMethod||'')==='Fiado'&&Math.max(0,(Number(s.total)||0)-(Number(s.paidAmount)||0))>0);
        sec.innerHTML=`
          <div class="vrefHead"><div><h2>Historial</h2><p>Tickets, fiados y resumen de ventas.</p></div></div>
          <div class="vrefTabs">
            <button class="vrefTab ${mode==='tickets'?'active':''}" data-hmode="tickets">Historial de tickets</button>
            <button class="vrefTab ${mode==='credits'?'active':''}" data-hmode="credits">Cuaderno de fiados</button>
          </div>
          <div class="vrefStats">
            <div class="vrefStat"><small>Venta total acumulada</small><strong>${money(total)}</strong></div>
            <div class="vrefStat"><small>Ticket promedio</small><strong>${money(avg)}</strong></div>
            <div class="vrefStat"><small>Transacciones</small><strong>${ss.length}</strong></div>
            <div class="vrefStat"><small>Fiado pendiente</small><strong>${money(fiados.reduce((a,s)=>a+Math.max(0,(Number(s.total)||0)-(Number(s.paidAmount)||0)),0))}</strong></div>
          </div>
          <div class="vrefPanel"><h3>Desglose por método de pago</h3><div class="vrefPayments">${Object.keys(payments).length?Object.entries(payments).map(([k,v])=>`<div class="vrefPayment"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join(''):'<div class="vrefPayment"><span>Sin ventas</span><b>${money(0)}</b></div>'}</div></div>
          <div class="vrefTabs" style="margin-top:12px;margin-bottom:0">
            ${[['today','Hoy'],['week','Semana'],['month','Mes'],['all','Todo']].map(([k,l])=>`<button class="vrefTab ${period===k?'active':''}" data-period="${k}">${l}</button>`).join('')}
          </div>
          <div class="vrefPanel" id="vhistoryBody"></div>
          <div class="vrefTools"><button data-open-existing="reports">Reportes</button><button data-open-existing="profit">Ganancias</button><button data-open-existing="cash">Caja y cierres</button></div>
        `;
        const body=sec.querySelector('#vhistoryBody');
        if(mode==='credits'){
          body.innerHTML='<h3>Cuaderno de fiados</h3>'+(
            fiados.length?fiados.map(s=>{
              const bal=Math.max(0,(Number(s.total)||0)-(Number(s.paidAmount)||0));
              return `<div class="vrefCredit" data-credit-id="${esc(s.id)}"><div class="vrefCreditTop"><div><b>${esc(s.customerName||'Cliente sin nombre')}</b><small>${new Date(s.date).toLocaleString('es-PE')}</small></div><strong>${money(bal)}</strong></div><small>Vendido al crédito: ${money(s.total)} · Abonado: ${money(s.paidAmount||0)}</small><button type="button" data-credit-pay="${esc(s.id)}">Registrar abono</button></div>`
            }).join(''):'<div class="empty">No hay fiados pendientes.</div>'
          );
        }else{
          const list=[...ss].reverse();
          body.innerHTML='<h3>Historial de tickets</h3>'+(
            list.length?list.map(s=>`<div class="vrefTicket"><div class="vrefTicketTop"><div><b>#${esc(s.receiptNumber||String(s.id||'').slice(-8).toUpperCase())}</b><div class="vrefTicketMeta">${new Date(s.date).toLocaleString('es-PE')} · ${esc(s.paymentMethod||'No registrado')}${s.customerName?' · '+esc(s.customerName):''}</div></div><strong>${money(s.total)}</strong></div><div class="vrefTicketMeta">${(s.items||[]).map(i=>esc(i.name)+' x'+Number(i.qty||0)).join(', ')||'Venta registrada'}</div><div class="vrefTicketBtns"><button type="button" data-ticket-print="${esc(s.id)}">🖨️ Imprimir</button><button type="button" data-ticket-share="${esc(s.id)}">↗ Compartir</button></div></div>`).join(''):'<div class="empty">No hay ventas en este período.</div>'
          );
        }
      };
      sec.onclick=e=>{
        const hm=e.target.closest('[data-hmode]');if(hm){mode=hm.dataset.hmode;render();return}
        const pr=e.target.closest('[data-period]');if(pr){period=pr.dataset.period;render();return}
        const op=e.target.closest('[data-open-existing]');if(op){openExisting(op.dataset.openExisting);return}
        const pp=e.target.closest('[data-credit-pay]');if(pp){
          const s=salesList().find(x=>String(x.id)===String(pp.dataset.creditPay));if(!s)return;
          const bal=Math.max(0,(Number(s.total)||0)-(Number(s.paidAmount)||0));
          const raw=prompt('Saldo pendiente: '+money(bal)+'\n¿Cuánto está abonando?',String(bal.toFixed(2)));if(raw===null)return;
          const amount=Math.max(0,Math.min(bal,Number(String(raw).replace(',','.'))||0));if(!amount)return;
          s.paidAmount=(Number(s.paidAmount)||0)+amount;s.payments=Array.isArray(s.payments)?s.payments:[];s.payments.push({amount,date:new Date().toISOString()});saveAll();render();window.vareliaToast?.('Abono registrado: '+money(amount),'ok');return
        }
        const pi=e.target.closest('[data-ticket-print]');if(pi){const s=salesList().find(x=>String(x.id)===String(pi.dataset.ticketPrint));if(s)window.VareliaReceipt?.print?.(s);return}
        const sh=e.target.closest('[data-ticket-share]');if(sh){const s=salesList().find(x=>String(x.id)===String(sh.dataset.ticketShare));if(s)window.VareliaReceipt?.share?.(s);return}
      };
      window.VareliaVideoHistory={render:()=>render()};
      render();return true;
    }

    const readImage=input=>new Promise(resolve=>{
      const f=input.files?.[0];if(!f)return resolve('');
      const r=new FileReader();r.onload=e=>resolve(String(e.target.result||''));r.onerror=()=>resolve('');r.readAsDataURL(f);
    });

    function setupSettings(){
      const sec=document.getElementById('mobileSettingsHub');if(!sec)return false;if(sec.__vSettingsReady)return true;sec.__vSettingsReady=true;
      const render=()=>{
        cfg=loadSettings();
        sec.innerHTML=`
          <div class="vrefHead"><div><h2>Ajustes</h2><p>Configura tu negocio, pagos, tickets y equipo desde un solo lugar.</p></div></div>
          <div class="vsettingsSection"><h3>Datos del negocio</h3><p>Estos datos pueden aparecer en tus comprobantes.</p><div class="vqrRow" style="margin-bottom:12px"><img class="vqrPreview" id="vLogoPreview" src="${cfg.logo||''}"><div><label>Logo del negocio<input type="file" accept="image/*" id="vsetLogo"></label><small style="color:var(--muted)">Se usará en la vista del ticket.</small></div></div><div class="vsettingsGrid">
            <label class="full">Nombre del negocio<input id="vsetBusiness" value="${esc(cfg.businessName)}" placeholder="Varelia"></label>
            <label class="full">Lema del negocio <small style="color:var(--muted);font-weight:600">(opcional)</small><input id="vsetBusinessSlogan" value="${esc(cfg.businessSlogan||'')}" maxlength="120" placeholder="Ej.: Calidad y buenos precios para ti"></label>
            <label>RUC / Documento<input id="vsetRuc" value="${esc(cfg.ruc)}"></label>
            <label>Teléfono<input id="vsetPhone" value="${esc(cfg.phone)}"></label>
            <label class="full">Dirección<input id="vsetAddress" value="${esc(cfg.address)}" placeholder="Dirección que verán tus clientes"></label>
            <label class="full">Horario de atención<input id="vsetBusinessHours" value="${esc(cfg.businessHours||'')}" placeholder="Ej.: Lun–Sáb 9:00 a. m. – 8:00 p. m."></label>
            <label class="full">Enlace de ubicación / Google Maps<input id="vsetMapUrl" value="${esc(cfg.publicMapUrl||'')}" placeholder="Opcional: https://maps.google.com/..."></label>
            <label class="full">Mensaje al pie del ticket<textarea id="vsetMessage" rows="2">${esc(cfg.ticketMessage)}</textarea></label>
            <label>Moneda<select id="vsetCurrency"><option value="S/" ${cfg.currency==='S/'?'selected':''}>S/ Soles</option><option value="$" ${cfg.currency==='$'?'selected':''}>$ Dólares</option></select></label>
          </div></div>

          <div class="vsettingsSection"><h3>Redes sociales</h3><p>Estos enlaces aparecerán en tu catálogo público y tus clientes podrán abrirlos con un toque.</p><div class="vsettingsGrid">
            <label class="full">TikTok<input id="vsetTikTok" value="${esc(cfg.socialTikTok||'')}" placeholder="https://www.tiktok.com/@tuusuario"></label>
            <label class="full">Facebook<input id="vsetFacebook" value="${esc(cfg.socialFacebook||'')}" placeholder="https://www.facebook.com/tupagina"></label>
            <label class="full">Instagram<input id="vsetInstagram" value="${esc(cfg.socialInstagram||'')}" placeholder="https://www.instagram.com/tuusuario"></label>
            <label class="full">WhatsApp<input id="vsetWhatsApp" value="${esc(cfg.socialWhatsApp||'')}" placeholder="Número o enlace de WhatsApp"></label>
            <label class="full">YouTube<input id="vsetYouTube" value="${esc(cfg.socialYouTube||'')}" placeholder="https://www.youtube.com/@tucanal"></label>
            <label class="full">Otras plataformas<textarea id="vsetSocialOther" rows="4" placeholder="Una por línea: Nombre | https://enlace.com">${esc(cfg.socialOther||'')}</textarea><small style="color:var(--muted)">Ej.: Telegram | https://t.me/tuusuario</small></label>
          </div></div>

          <div class="vsettingsSection"><h3>Catálogo público y pedidos</h3><p>Elige cómo pueden comprar tus clientes desde el catálogo.</p><div class="vsettingsGrid">
            <label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:9px"><input type="checkbox" id="vsetAllowDelivery" ${cfg.publicAllowDelivery!==false?'checked':''} style="width:18px">Permitir Delivery</label>
            <label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:9px"><input type="checkbox" id="vsetAllowPickup" ${cfg.publicAllowPickup!==false?'checked':''} style="width:18px">Permitir Recojo en tienda</label>
            <div class="full" style="margin-top:8px"><b style="font-size:12px">Envíos y entregas</b>
              <div style="display:grid;gap:10px;margin-top:9px">
                <div style="border:1px solid var(--line);border-radius:14px;padding:12px"><label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:8px"><input type="checkbox" id="vsetInDriveEnabled" ${cfg.deliveryInDriveEnabled!==false?'checked':''} style="width:18px">InDrive</label><label style="margin-top:8px">Costo (S/)<input id="vsetInDriveCost" type="number" min="0" step="0.10" value="${Number(cfg.deliveryInDriveCost??12)}"></label></div>
                <div style="border:1px solid var(--line);border-radius:14px;padding:12px"><label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:8px"><input type="checkbox" id="vsetOlvaEnabled" ${cfg.deliveryOlvaEnabled!==false?'checked':''} style="width:18px">Olva</label><label style="margin-top:8px">Costo (S/)<input id="vsetOlvaCost" type="number" min="0" step="0.10" value="${Number(cfg.deliveryOlvaCost??15)}"></label></div>
                <div style="border:1px solid var(--line);border-radius:14px;padding:12px"><label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:8px"><input type="checkbox" id="vsetShalomEnabled" ${cfg.deliveryShalomEnabled!==false?'checked':''} style="width:18px">Shalom</label><label style="margin-top:8px">Costo (S/)<input id="vsetShalomCost" type="number" min="0" step="0.10" value="${Number(cfg.deliveryShalomCost??0)}"></label><label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:8px;margin-top:8px"><input type="checkbox" id="vsetShalomPayAgency" ${cfg.deliveryShalomPayAgency!==false?'checked':''} style="width:18px">El cliente paga el envío en la agencia</label></div>
              </div>
            </div>
            <div class="full"><b style="font-size:12px">Métodos de pago aceptados</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:9px">
              ${['Efectivo','Yape','Plin','Transferencia','Tarjeta','Otro'].map(m=>`<label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:7px"><input type="checkbox" data-public-payment="${m}" ${String(cfg.publicPaymentMethods||'Efectivo,Yape,Plin,Transferencia').split(',').map(x=>x.trim()).includes(m)?'checked':''} style="width:18px">${m}</label>`).join('')}
            </div></div>
          </div></div>

          <div class="vsettingsSection"><h3>Métodos de pago</h3><p>Sube tus QR para mostrarlos al cobrar con Yape o Plin.</p>
            <div class="vqrRow"><img class="vqrPreview" id="vYapePreview" src="${cfg.yapeQr||''}"><div><label>QR de Yape<input type="file" accept="image/*" id="vsetYapeQr"></label><label style="margin-top:7px">Titular<input id="vsetYapeHolder" value="${esc(cfg.yapeHolder)}"></label></div></div>
            <div class="vqrRow" style="margin-top:12px"><img class="vqrPreview" id="vPlinPreview" src="${cfg.plinQr||''}"><div><label>QR de Plin<input type="file" accept="image/*" id="vsetPlinQr"></label><label style="margin-top:7px">Titular<input id="vsetPlinHolder" value="${esc(cfg.plinHolder)}"></label></div></div>
            <label style="display:grid;gap:6px;margin-top:14px;font-size:11px;font-weight:850">Datos para transferencia<textarea id="vsetTransferDetails" rows="4" placeholder="Banco, número de cuenta, CCI y titular">${esc(cfg.transferDetails||'')}</textarea></label>
          </div>

          <div class="vsettingsSection"><h3>Tickets e impresora</h3><p>Conecta tu impresora y elige el ancho del rollo térmico.</p><div class="vsettingsGrid">
            <label>Ancho del rollo<select id="vsetThermal"><option value="58" ${cfg.thermalWidth==='58'?'selected':''}>58 mm</option><option value="80" ${cfg.thermalWidth==='80'?'selected':''}>80 mm</option></select></label>
          </div><button class="vsettingsAction" data-vsetting-action="printer">🖨️ Conectar impresora Bluetooth</button><button class="vsettingsAction" data-vsetting-action="test-ticket">Imprimir ticket de prueba</button></div>

          <div class="vsettingsSection"><h3>Respaldo</h3><p>Descarga una copia de los datos de este dispositivo o restaura una copia.</p><button class="vsettingsAction primary" data-vsetting-action="download">⬇ Descargar respaldo</button><button class="vsettingsAction" data-vsetting-action="upload">⬆ Subir respaldo</button><input type="file" id="vbackupFile" accept="application/json" hidden></div>

          <div class="vsettingsSection"><h3>Avanzado</h3><p>Opciones adicionales del catálogo.</p><label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:9px"><input type="checkbox" id="vsetAutoBarcode" ${cfg.autoBarcode?'checked':''} style="width:18px">Generar código de barras automáticamente</label><label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:9px;margin-top:10px"><input type="checkbox" id="vsetVariants" ${cfg.enableVariants?'checked':''} style="width:18px">Activar campo de tallas / colores / variantes</label></div>
          <button class="vsettingsAction primary" id="vsettingsSave">Guardar configuración</button>
        `;
        sec.querySelector('#vsetLogo').onchange=async e=>{const v=await readImage(e.target);if(v){cfg.logo=v;sec.querySelector('#vLogoPreview').src=v;saveCfg();window.dispatchEvent(new CustomEvent('varelia:business-settings-local-changed'));}};
        const persistQrNow=async(kind,v)=>{
          if(!v)return;
          if(kind==='yape'){cfg.yapeQr=v;localStorage.setItem(QR_YAPE_STORE,v)}
          else{cfg.plinQr=v;localStorage.setItem(QR_PLIN_STORE,v)}
          const holderId=kind==='yape'?'#vsetYapeHolder':'#vsetPlinHolder';
          const holder=sec.querySelector(holderId)?.value?.trim()||'';
          if(kind==='yape'){cfg.yapeHolder=holder;localStorage.setItem(QR_YAPE_HOLDER_STORE,holder)}
          else{cfg.plinHolder=holder;localStorage.setItem(QR_PLIN_HOLDER_STORE,holder)}
          cfg.transferDetails=sec.querySelector('#vsetTransferDetails')?.value?.trim()||cfg.transferDetails||'';
          saveCfg();
          window.dispatchEvent(new CustomEvent('varelia:payment-settings-changed',{detail:{kind}}));
          try{
            const synced=await pushCloudPaymentSettings();
            window.vareliaToast?.(synced?'QR de '+(kind==='yape'?'Yape':'Plin')+' guardado.':'QR guardado en este dispositivo.','ok');
          }catch(err){
            console.error('Varelia QR autosave',err);
            window.vareliaToast?.('QR guardado en el teléfono; falta sincronizarlo con la nube.','warn');
          }
        };
        sec.querySelector('#vsetYapeQr').onchange=async e=>{const v=await readImage(e.target);if(v){cfg.yapeQr=v;sec.querySelector('#vYapePreview').src=v;await persistQrNow('yape',v)}};
        sec.querySelector('#vsetPlinQr').onchange=async e=>{const v=await readImage(e.target);if(v){cfg.plinQr=v;sec.querySelector('#vPlinPreview').src=v;await persistQrNow('plin',v)}};
        sec.querySelector('#vsettingsSave').onclick=async()=>{
          cfg.businessName=sec.querySelector('#vsetBusiness').value.trim();cfg.businessSlogan=sec.querySelector('#vsetBusinessSlogan').value.trim();cfg.ruc=sec.querySelector('#vsetRuc').value.trim();cfg.phone=sec.querySelector('#vsetPhone').value.trim();cfg.address=sec.querySelector('#vsetAddress').value.trim();cfg.businessHours=sec.querySelector('#vsetBusinessHours').value.trim();cfg.publicMapUrl=sec.querySelector('#vsetMapUrl').value.trim();cfg.publicAllowDelivery=sec.querySelector('#vsetAllowDelivery').checked;cfg.publicAllowPickup=sec.querySelector('#vsetAllowPickup').checked;cfg.deliveryInDriveEnabled=sec.querySelector('#vsetInDriveEnabled').checked;cfg.deliveryInDriveCost=Math.max(0,Number(sec.querySelector('#vsetInDriveCost').value)||0);cfg.deliveryOlvaEnabled=sec.querySelector('#vsetOlvaEnabled').checked;cfg.deliveryOlvaCost=Math.max(0,Number(sec.querySelector('#vsetOlvaCost').value)||0);cfg.deliveryShalomEnabled=sec.querySelector('#vsetShalomEnabled').checked;cfg.deliveryShalomCost=Math.max(0,Number(sec.querySelector('#vsetShalomCost').value)||0);cfg.deliveryShalomPayAgency=sec.querySelector('#vsetShalomPayAgency').checked;cfg.publicPaymentMethods=[...sec.querySelectorAll('[data-public-payment]:checked')].map(x=>x.dataset.publicPayment).join(',');cfg.ticketMessage=sec.querySelector('#vsetMessage').value.trim()||DEFAULTS.ticketMessage;cfg.currency=sec.querySelector('#vsetCurrency').value;cfg.socialTikTok=sec.querySelector('#vsetTikTok').value.trim();cfg.socialFacebook=sec.querySelector('#vsetFacebook').value.trim();cfg.socialInstagram=sec.querySelector('#vsetInstagram').value.trim();cfg.socialWhatsApp=sec.querySelector('#vsetWhatsApp').value.trim();cfg.socialYouTube=sec.querySelector('#vsetYouTube').value.trim();cfg.socialOther=sec.querySelector('#vsetSocialOther').value.trim();cfg.yapeHolder=sec.querySelector('#vsetYapeHolder').value.trim();cfg.plinHolder=sec.querySelector('#vsetPlinHolder').value.trim();cfg.transferDetails=sec.querySelector('#vsetTransferDetails').value.trim();cfg.thermalWidth=sec.querySelector('#vsetThermal').value;cfg.autoBarcode=sec.querySelector('#vsetAutoBarcode').checked;cfg.enableVariants=sec.querySelector('#vsetVariants').checked;saveCfg();applyBusinessName();setupProductExtras(true);window.dispatchEvent(new CustomEvent('varelia:catalog-settings-changed'));try{window.vareliaPublicCatalogSync?.()}catch{}
          const btn=sec.querySelector('#vsettingsSave');if(btn)btn.disabled=true;
          try{
            const synced=await pushCloudPaymentSettings();
            window.vareliaToast?.(synced?'Configuración y QR guardados.':'Configuración guardada en este dispositivo.','ok');
          }catch(err){
            console.error('Varelia save payment settings',err);
            window.vareliaToast?.('Se guardó localmente, pero no se pudo guardar el QR en la nube.','warn');
          }finally{if(btn)btn.disabled=false}
        };
      };
      sec.onclick=e=>{
        const op=e.target.closest('[data-open-existing]');if(op){openExisting(op.dataset.openExisting);return}
        const act=e.target.closest('[data-vsetting-action]');if(!act)return;
        const a=act.dataset.vsettingAction;
        if(a==='printer'){const b=document.getElementById('btPrinterBtn');if(b)b.click();else window.vareliaToast?.('La impresora todavía está cargando.','warn');return}
        if(a==='test-ticket'){
          const sample={id:'PRUEBA',date:new Date().toISOString(),paymentMethod:'Efectivo',items:[{name:'Producto de prueba',qty:1,price:1}],total:1,receiptNumber:'PRUEBA-001'};
          if(window.VareliaReceipt?.print)window.VareliaReceipt.print(sample);else alert('El módulo de impresión todavía está cargando.');return
        }
        if(a==='download'){
          const data={version:1,exportedAt:new Date().toISOString(),settings:cfg,products:productsList(),sales:salesList(),categories:(typeof categories!=='undefined'?categories:[]),closures:(typeof closures!=='undefined'?closures:[]),movements:(typeof movements!=='undefined'?movements:[]),suppliers:(typeof suppliers!=='undefined'?suppliers:[]),purchases:(typeof purchases!=='undefined'?purchases:[])};
          const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),x=document.createElement('a');x.href=url;x.download='varelia-respaldo-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return
        }
        if(a==='upload'){sec.querySelector('#vbackupFile').click();return}
      };
      sec.addEventListener('change',async e=>{
        if(e.target.id!=='vbackupFile')return;const f=e.target.files?.[0];if(!f)return;
        try{
          const data=JSON.parse(await f.text());if(!confirm('¿Restaurar este respaldo? Reemplazará los datos locales actuales.'))return;
          const map=[[K?.products||'miNegocio_products_v1',data.products],[K?.categories||'miNegocio_categories_v1',data.categories],[K?.sales||'miNegocio_sales_v1',data.sales],[K?.closures||'miNegocio_closures_v1',data.closures],[K?.movements||'miNegocio_movements_v1',data.movements],[K?.suppliers||'miNegocio_suppliers_v1',data.suppliers],[K?.purchases||'miNegocio_purchases_v1',data.purchases]];
          map.forEach(([k,v])=>{if(Array.isArray(v))localStorage.setItem(k,JSON.stringify(v))});if(data.settings)localStorage.setItem(STORE,JSON.stringify({...DEFAULTS,...data.settings}));alert('Respaldo restaurado. Varelia se recargará.');location.reload()
        }catch(err){alert('Ese archivo no es un respaldo válido de Varelia.')}
      });
      render();return true;
    }

    function applyBusinessName(){
      cfg=loadSettings();if(!cfg.businessName)return;
      document.querySelectorAll('#vareliaBusinessName,#dashBusinessName').forEach(el=>el.textContent=cfg.businessName);
    }

    function setupSaleExtras(){
      const pos=document.getElementById('vareliaPosSales'),payment=document.getElementById('vposPaymentMethod');if(!pos||!payment||document.getElementById('vposVideoExtras'))return false;
      if(![...payment.options].some(o=>o.value==='Fiado'))payment.add(new Option('Fiado','Fiado'));
      const bottom=pos.querySelector('.vposPaymentBar');
      const box=document.createElement('div');box.id='vposVideoExtras';box.className='vposExtras';
      box.innerHTML=`<div class="vposExtraGrid"><label>Descuento (S/)<input id="vposDiscount" type="number" min="0" step="0.01" value="0"></label><label id="vposCustomerWrap" style="display:none">Cliente / Fiado<input id="vposCustomer" placeholder="Nombre del cliente"></label><label class="full">Notas / Observaciones<textarea id="vposNotes" rows="2" placeholder="Opcional"></textarea></label></div><div class="vposQrBox" id="vposQrBox" style="display:none!important"><img id="vposQrImg"><div><b id="vposQrTitle"></b><small id="vposQrHolder"></small></div></div><div class="vposDue"><span>Total después del descuento</span><strong id="vposDue">S/ 0.00</strong></div>`;
      bottom.insertAdjacentElement('afterend',box);
      const discount=box.querySelector('#vposDiscount'),customer=box.querySelector('#vposCustomer'),notes=box.querySelector('#vposNotes'),due=box.querySelector('#vposDue'),cw=box.querySelector('#vposCustomerWrap'),qb=box.querySelector('#vposQrBox'),qi=box.querySelector('#vposQrImg'),qt=box.querySelector('#vposQrTitle'),qh=box.querySelector('#vposQrHolder');
      const baseTotal=()=>{try{return Number(window.VareliaPOS?.sync?.().total||0)}catch{return 0}};
      const update=()=>{
        cfg=loadSettings();const method=payment.value,d=Math.max(0,Number(discount.value)||0),total=Math.max(0,baseTotal()-d);due.textContent=money(total);cw.style.display=method==='Fiado'?'grid':'none';
        const qr=method==='Yape'?cfg.yapeQr:method==='Plin'?cfg.plinQr:'';const holder=method==='Yape'?cfg.yapeHolder:cfg.plinHolder;
        qb.classList.toggle('show',!!qr);if(qr){qi.src=qr;qt.textContent='Escanea para pagar con '+method;qh.textContent=holder?('Titular: '+holder):''}
        window.VareliaSaleExtras={discount:d,notes:notes.value.trim(),customerName:customer.value.trim(),paymentMethod:method,total};
      };
      ['input','change'].forEach(ev=>box.addEventListener(ev,update));payment.addEventListener('change',update);setTimeout(update,30);
      document.addEventListener('click',e=>{if(e.target.closest('#vposCheckout'))update()},true);
      window.VareliaSaleExtrasUpdate=update;return true;
    }

    function setupProductExtras(force=false){
      const form=document.getElementById('productForm'),barcode=document.getElementById('barcode');if(!form||!barcode)return false;
      let root=document.getElementById('vproductExtras');
      if(!root){
        root=document.createElement('div');root.id='vproductExtras';root.className='vprodExtras';root.innerHTML=`<div><b style="font-size:11px">Herramientas del producto</b></div><div class="vbarcodeRow"><button type="button" class="vbarcodeGen" id="vGenerateBarcode">Generar código de barras</button><button type="button" class="vbarcodeGen" id="vPrintLabel">Imprimir etiqueta</button></div><label id="vVariantWrap" style="display:none"><span>Variantes / Tallas / Colores</span><textarea id="vProductVariants" rows="2" placeholder="Ej.: S rojo, M negro, 500 ml..."></textarea></label>`;
        barcode.closest('.two')?.insertAdjacentElement('afterend',root);
        root.querySelector('#vGenerateBarcode').onclick=()=>{barcode.value=ean13();window.vareliaToast?.('Código generado.','ok')};
        root.querySelector('#vPrintLabel').onclick=()=>{
          const name=document.getElementById('productName')?.value||'Producto',price=document.getElementById('sellPrice')?.value||0,bc=barcode.value||'SIN CÓDIGO';const w=window.open('','_blank','width=360,height=400');if(!w)return;
          w.document.write('<html><head><meta charset="utf-8"><style>@page{size:58mm 35mm;margin:2mm}body{font-family:Arial;text-align:center;margin:0}.n{font-weight:800;font-size:12px}.b{font-family:monospace;font-size:18px;letter-spacing:1px;margin:6px 0}.p{font-size:16px;font-weight:900}</style></head><body><div class="n">'+esc(name)+'</div><div class="b">'+esc(bc)+'</div><div class="p">'+money(price)+'</div><script>onload=()=>{print();setTimeout(()=>close(),500)}<\/script></body></html>');w.document.close()
        };
        form.addEventListener('submit',()=>{
          const id=document.getElementById('productId')?.value,name=document.getElementById('productName')?.value.trim(),variants=document.getElementById('vProductVariants')?.value.trim()||'';
          if(cfg.autoBarcode&&!barcode.value.trim())barcode.value=ean13();
          setTimeout(()=>{const p=productsList().find(x=>(id&&String(x.id)===String(id))||(!id&&x.name===name));if(p){p.variants=variants;saveAll()}},60);
        },true);
      }
      cfg=loadSettings();root.querySelector('#vVariantWrap').style.display=cfg.enableVariants?'grid':'none';
      const dlg=document.getElementById('productDialog');
      if(dlg&&!dlg.__vVariantBound){dlg.__vVariantBound=true;dlg.addEventListener('click',(e)=>{if(e.target?.closest?.('#vProductVariants'))return;const ta=document.getElementById('vProductVariants');if(!ta||ta===document.activeElement||ta.dataset.userEditing==='1')return;setTimeout(()=>{if(ta===document.activeElement||ta.dataset.userEditing==='1')return;const id=document.getElementById('productId')?.value,p=productsList().find(x=>String(x.id)===String(id));ta.value=p?.variants||''},0)},true);const ta=dlg.querySelector('#vProductVariants');if(ta){ta.addEventListener('input',()=>{ta.dataset.userEditing='1'});ta.addEventListener('blur',()=>{setTimeout(()=>{ta.dataset.userEditing='0'},150)})}}
      return true;
    }

    function updateInventorySummary(){
      const sec=document.getElementById('inventory');if(!sec||document.getElementById('vInventoryVideoSummary'))return false;
      const head=sec.querySelector('.head');if(!head)return false;
      const box=document.createElement('div');box.id='vInventoryVideoSummary';box.className='vrefStats';box.style.marginBottom='13px';
      head.insertAdjacentElement('afterend',box);
      const render=()=>{const ps=productsList(),val=ps.reduce((a,p)=>a+(Number(p.stock)||0)*(Number(p.buyPrice)||0),0),low=ps.filter(p=>(Number(p.stock)||0)<=Math.max(0,Number(p.reorderLevel)||0)).length,out=ps.filter(p=>(Number(p.stock)||0)<=0).length;box.innerHTML=`<div class="vrefStat"><small>SKUs / Productos</small><strong>${ps.length}</strong></div><div class="vrefStat"><small>Valor del stock</small><strong>${money(val)}</strong></div><div class="vrefStat"><small>Por reponer</small><strong>${low}</strong></div><div class="vrefStat"><small>Agotados</small><strong>${out}</strong></div>`};
      render();window.VareliaInventorySummary={render};return true;
    }

    function init(){
      pullCloudPaymentSettings();
      applyBusinessName();
      setupHistory();
      setupSettings();
      setupSaleExtras();
      setupProductExtras();
      updateInventorySummary();
      setTimeout(()=>{setupHistory();setupSettings();setupSaleExtras();setupProductExtras();updateInventorySummary()},1200);
    }
    let tries=0;const t=setInterval(()=>{tries++;init();if(tries>30)clearInterval(t)},300);
    window.addEventListener('focus',()=>{window.VareliaVideoHistory?.render?.();window.VareliaInventorySummary?.render?.()});
  });
})();