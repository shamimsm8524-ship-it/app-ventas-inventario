(()=>{
  if(window.__vareliaPlanAccess)return;
  window.__vareliaPlanAccess=true;

  const PLAN_CACHE='varelia_subscription_plan_v2';
  const AMOUNT=20, MONTHS=1;
  const PAYLOADS={
    yape:'0002010102113932184b659db5b05375a402477a73bb68105204561153036045802PE5906YAPERO6004Lima63047ACC',
    plin:'0002015802PE0102115204482953036045912P2P Transfer6004Lima265600329751102dbd374d2b99a91b1c74ebda0d0116Plin Network P2P6304EE01'
  };
  let currentPlan='basic',expiresAt=null,businessId='',requestId='',pendingRequest=false,paymentSubmitted=false,paymentMethod='yape',loadedBusiness='';
  const validPremium=()=>currentPlan==='premium'&&(!expiresAt||new Date(expiresAt)>new Date());

  const style=document.createElement('style');
  style.textContent=`
    .vareliaPremiumLocked{position:relative;opacity:.72}.vareliaPremiumLocked::after{content:'🔒';margin-left:auto;font-size:12px}
    .vareliaPlanModal,.vareliaPayModal{position:fixed;inset:0;z-index:100050;display:none;align-items:center;justify-content:center;padding:18px;background:#0f172ab5;backdrop-filter:blur(8px)}
    .vareliaPlanModal.show,.vareliaPayModal.show{display:flex}
    .vareliaPlanCard,.vareliaPayCard{width:min(94vw,520px);max-height:90vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#111827);border-radius:24px;padding:22px;box-shadow:0 28px 80px #0005}
    .vareliaPlanHead,.vareliaPayHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.vareliaPlanHead h2,.vareliaPayHead h2{margin:0;font-size:22px}.vareliaPlanHead p,.vareliaPayHead p{margin:5px 0 0;color:var(--muted,#64748b);font-size:13px;line-height:1.5}
    .vareliaPlanClose,.vareliaPayClose{border:0;width:38px;height:38px;border-radius:12px;background:var(--bg,#f1f5f9);font-size:22px;color:inherit;flex:0 0 auto}
    .vareliaPlanBenefits{display:grid;gap:9px;margin:18px 0}.vareliaPlanBenefit{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border:1px solid var(--line,#e5e7eb);border-radius:14px}.vareliaPlanBenefit b{display:block;font-size:13px}.vareliaPlanBenefit span{display:block;margin-top:2px;color:var(--muted,#64748b);font-size:12px;line-height:1.35}
    .vareliaPlanCta,.vareliaPaySubmit{width:100%;border:0;border-radius:14px;padding:13px 15px;background:linear-gradient(135deg,#ec4899,#7c3aed);color:#fff;font-weight:950;font-size:14px}.vareliaPlanCta:disabled,.vareliaPaySubmit:disabled{opacity:.65}
    .premiumPlan.basic{background:linear-gradient(145deg,#18213f,#2b1745)!important}.premiumPlan.premiumActive{box-shadow:0 0 0 1px #f472b655,0 14px 30px #7c3aed25}
    .vareliaPriceBox{margin:16px 0;padding:14px;border-radius:16px;background:linear-gradient(135deg,#fdf2f8,#f5f3ff);border:1px solid #e9d5ff;display:flex;justify-content:space-between;align-items:center;gap:12px;color:#111827}.vareliaPriceBox strong{font-size:25px}.vareliaPriceBox small{display:block;color:#64748b;margin-top:2px}
    .vareliaPayTabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.vareliaPayTab{border:1px solid var(--line,#e5e7eb);background:var(--bg,#f8fafc);color:inherit;border-radius:13px;padding:11px;font-weight:900}.vareliaPayTab.active{border-color:#a855f7;background:#f5f3ff;color:#7e22ce}
    .vareliaQrWrap{display:grid;place-items:center;padding:14px;border:1px solid var(--line,#e5e7eb);border-radius:18px;background:#fff}.vareliaQrBox{width:280px;max-width:78vw;min-height:280px;display:grid;place-items:center}.vareliaQrBox img,.vareliaQrBox canvas{max-width:100%;height:auto!important}.vareliaMerchant{margin-top:8px;text-align:center;font-size:12px;color:#64748b;font-weight:800}
    .vareliaPaySteps{margin:14px 0;padding:12px 14px;border-radius:14px;background:var(--bg,#f8fafc);font-size:12px;line-height:1.55;color:var(--muted,#64748b)}
    .vareliaReceiptField{display:grid;gap:7px;margin-top:12px}.vareliaReceiptField label{font-size:12px;font-weight:900}.vareliaReceiptField input{width:100%;border:1px solid var(--line,#e5e7eb);border-radius:13px;padding:11px;background:var(--card,#fff);color:inherit}.vareliaFileName{font-size:11px;color:#64748b;word-break:break-word}.vareliaPayNote{font-size:11px;color:#64748b;margin:10px 0 14px;line-height:1.45}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.className='vareliaPlanModal';
  overlay.innerHTML=`<div class="vareliaPlanCard" role="dialog" aria-modal="true"><div class="vareliaPlanHead"><div><h2 id="vareliaPlanTitle">👑 Varelia Premium</h2><p id="vareliaPlanText">Desbloquea herramientas avanzadas para administrar y analizar tu negocio con mayor control.</p></div><button class="vareliaPlanClose" type="button" aria-label="Cerrar">×</button></div><div class="vareliaPlanBenefits"><div class="vareliaPlanBenefit"><div>📊</div><div><b>Reportes y ganancias avanzadas</b><span>Rentabilidad, márgenes y detalle por producto.</span></div></div><div class="vareliaPlanBenefit"><div>📄</div><div><b>Comprobantes avanzados</b><span>PDF, WhatsApp e impresión mejorada.</span></div></div><div class="vareliaPlanBenefit"><div>☁️</div><div><b>Respaldo y funciones en la nube</b><span>Copias de seguridad y recuperación.</span></div></div><div class="vareliaPlanBenefit"><div>👥</div><div><b>Funciones profesionales</b><span>Usuarios/cajeros, clientes y futuras integraciones.</span></div></div></div><div class="vareliaPriceBox"><div><b>Plan Premium</b><small>Duración: 1 mes</small></div><strong>S/ 20</strong></div><button type="button" class="vareliaPlanCta">Comprar Premium · S/ 20</button></div>`;
  document.body.appendChild(overlay);
  const title=overlay.querySelector('#vareliaPlanTitle'),text=overlay.querySelector('#vareliaPlanText'),cta=overlay.querySelector('.vareliaPlanCta');

  const pay=document.createElement('div');
  pay.className='vareliaPayModal';
  pay.innerHTML=`<div class="vareliaPayCard" role="dialog" aria-modal="true"><div class="vareliaPayHead"><div><h2>💳 Pagar Varelia Premium</h2><p>Plan de 1 mes por S/ 20.00. Realiza el pago y adjunta el comprobante.</p></div><button class="vareliaPayClose" type="button" aria-label="Cerrar">×</button></div><div class="vareliaPriceBox"><div><b>Total a pagar</b><small>Premium por 1 mes</small></div><strong>S/ 20</strong></div><div class="vareliaPayTabs"><button type="button" class="vareliaPayTab active" data-pay="yape">Yape</button><button type="button" class="vareliaPayTab" data-pay="plin">Plin</button></div><div class="vareliaQrWrap"><div class="vareliaQrBox" id="vareliaPayQr">Cargando QR…</div><div class="vareliaMerchant" id="vareliaMerchant"></div></div><div class="vareliaPaySteps">1. Escanea el QR con Yape o Plin.<br>2. Paga exactamente <b>S/ 20.00</b>.<br>3. Guarda la captura del pago.<br>4. Adjunta el comprobante aquí para revisión.</div><div class="vareliaReceiptField"><label>Nombre de quien realizó el pago (opcional)</label><input id="vareliaPayerName" maxlength="120" placeholder="Ej.: Milagros Quispe"></div><div class="vareliaReceiptField"><label>Comprobante de pago</label><input id="vareliaReceipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"><div class="vareliaFileName" id="vareliaFileName">Selecciona una captura o PDF (máx. 5 MB).</div></div><p class="vareliaPayNote">El Premium se activa cuando el pago sea revisado y aprobado. La vigencia será de 1 mes desde la aprobación.</p><button type="button" class="vareliaPaySubmit">Enviar comprobante</button></div>`;
  document.body.appendChild(pay);
  const qrBox=pay.querySelector('#vareliaPayQr'),merchant=pay.querySelector('#vareliaMerchant'),receipt=pay.querySelector('#vareliaReceipt'),fileName=pay.querySelector('#vareliaFileName'),payerName=pay.querySelector('#vareliaPayerName'),paySubmit=pay.querySelector('.vareliaPaySubmit');

  const closeBenefits=()=>overlay.classList.remove('show'),closePay=()=>pay.classList.remove('show');
  overlay.querySelector('.vareliaPlanClose').onclick=closeBenefits;pay.querySelector('.vareliaPayClose').onclick=closePay;
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeBenefits()});pay.addEventListener('click',e=>{if(e.target===pay)closePay()});

  function ensureQrLib(){
    if(window.QRCode)return Promise.resolve();
    if(window.__vareliaQrPromise)return window.__vareliaQrPromise;
    window.__vareliaQrPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
    return window.__vareliaQrPromise;
  }
  async function renderQr(){
    qrBox.innerHTML='Cargando QR…';
    merchant.textContent=paymentMethod==='yape'?'Yape · Milagros Olinda Quispe Venegas':'Plin · Milagros Quispe';
    try{await ensureQrLib();qrBox.innerHTML='';new window.QRCode(qrBox,{text:PAYLOADS[paymentMethod],width:280,height:280,colorDark:'#111111',colorLight:'#ffffff'})}
    catch(e){console.warn('QR',e);qrBox.textContent='No se pudo cargar el QR. Verifica tu conexión e inténtalo nuevamente.'}
  }
  function setMethod(method){paymentMethod=method==='plin'?'plin':'yape';pay.querySelectorAll('.vareliaPayTab').forEach(b=>b.classList.toggle('active',b.dataset.pay===paymentMethod));renderQr()}
  pay.addEventListener('click',e=>{const b=e.target.closest('[data-pay]');if(b)setMethod(b.dataset.pay)});setMethod('yape');
  receipt.addEventListener('change',()=>{const f=receipt.files?.[0];fileName.textContent=f?`${f.name} · ${Math.ceil(f.size/1024)} KB`:'Selecciona una captura o PDF (máx. 5 MB).'});

  function updateCta(){
    if(validPremium()){cta.disabled=true;cta.textContent='✓ Premium activo';return}
    if(paymentSubmitted){cta.disabled=true;cta.textContent='✓ Pago enviado · en revisión';return}
    cta.disabled=false;cta.textContent=pendingRequest?'Continuar pago · S/ 20':'Comprar Premium · S/ 20';
  }
  const showPremium=(label='👑 Varelia Premium',message='Desbloquea herramientas avanzadas para administrar y analizar tu negocio con mayor control.')=>{title.textContent=label;text.textContent=message;overlay.classList.add('show');updateCta()};
  const showPay=()=>{if(validPremium()||paymentSubmitted)return;closeBenefits();setMethod(paymentMethod);pay.classList.add('show')};cta.onclick=showPay;
  window.vareliaIsPremium=()=>validPremium();window.vareliaRequirePremium=(feature='Esta función')=>{if(validPremium())return true;showPremium('🔒 '+feature+' es Premium');return false};

  function applyCard(){
    const card=document.querySelector('.premiumPlan');if(!card)return;const state=validPremium()?'premium':paymentSubmitted?'review':pendingRequest?'pending':'basic';
    card.classList.toggle('basic',state!=='premium');card.classList.toggle('premiumActive',state==='premium');if(card.dataset.planRendered===state)return;card.dataset.planRendered=state;
    if(state==='premium')card.innerHTML='<div>♛ <b>Plan Premium</b></div><small>Todas las funciones Premium activas</small><a href="#" class="vareliaPlanLink">Ver beneficios →</a>';
    else if(state==='review')card.innerHTML='<div>◇ <b>Plan Básico</b></div><small>Pago Premium enviado · en revisión</small><a href="#" class="vareliaPlanLink">Ver estado →</a>';
    else if(state==='pending')card.innerHTML='<div>◇ <b>Plan Básico</b></div><small>Solicitud iniciada · falta comprobante</small><a href="#" class="vareliaPlanLink">Continuar pago →</a>';
    else card.innerHTML='<div>◇ <b>Plan Básico</b></div><small>Funciones esenciales activas</small><a href="#" class="vareliaPlanLink">Mejorar a Premium →</a>';
  }
  function lockPremiumControls(){const controls=[[document.querySelector('.premiumReportsItem'),'Reportes avanzados'],[document.querySelector('.premiumGainItem'),'Ganancias'],[document.getElementById('vreceiptPdf'),'Guardar comprobante en PDF'],[document.getElementById('vreceiptShare'),'Compartir comprobante por WhatsApp']];controls.forEach(([el,label])=>{if(!el)return;el.classList.toggle('vareliaPremiumLocked',!validPremium());if(el.dataset.planGuard==='1')return;el.dataset.planGuard='1';el.addEventListener('click',e=>{if(validPremium())return;e.preventDefault();e.stopImmediatePropagation();window.vareliaRequirePremium(label)},true)})}
  function apply(){document.documentElement.dataset.vareliaPlan=validPremium()?'premium':'basic';applyCard();lockPremiumControls();updateCta()}

  async function checkPending(){requestId='';pendingRequest=false;paymentSubmitted=false;if(!businessId||validPremium()||!window.vareliaSupabase){apply();return}try{const {data,error}=await window.vareliaSupabase.from('premium_requests').select('id,status,receipt_path,payment_method,paid_at').eq('business_id',businessId).eq('status','pending').order('created_at',{ascending:false}).limit(1);if(error)throw error;const r=data?.[0];if(r){requestId=r.id;pendingRequest=true;paymentSubmitted=!!r.receipt_path;if(r.payment_method)paymentMethod=r.payment_method}}catch(e){console.warn('No se pudo comprobar la solicitud Premium',e)}apply()}
  async function ensureRequest(user){if(requestId)return requestId;const sb=window.vareliaSupabase;const {data:existing,error:ce}=await sb.from('premium_requests').select('id,receipt_path').eq('business_id',businessId).eq('status','pending').order('created_at',{ascending:false}).limit(1);if(ce)throw ce;if(existing?.[0]){requestId=existing[0].id;pendingRequest=true;paymentSubmitted=!!existing[0].receipt_path;return requestId}const {data,error}=await sb.from('premium_requests').insert({business_id:businessId,user_id:user.id,status:'pending',amount:AMOUNT,duration_months:MONTHS}).select('id').single();if(error)throw error;requestId=data.id;pendingRequest=true;return requestId}
  const safeName=name=>String(name||'comprobante').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-80);
  async function sendPayment(){
    if(validPremium()||paymentSubmitted)return;const file=receipt.files?.[0];if(!file){window.vareliaToast?.('Adjunta el comprobante de pago.','warn');return}if(file.size>5*1024*1024){window.vareliaToast?.('El comprobante supera 5 MB.','warn');return}
    const sb=window.vareliaSupabase;businessId=businessId||window.vareliaBusinessScope||(()=>{try{return localStorage.getItem('varelia_active_business_id')||''}catch{return''}})();if(!sb||!businessId){window.vareliaToast?.('Espera a que tu cuenta termine de cargar.','warn');return}
    paySubmit.disabled=true;paySubmit.textContent='Enviando comprobante...';
    try{const {data:userData,error:userError}=await sb.auth.getUser();if(userError)throw userError;const user=userData?.user;if(!user)throw new Error('Sesión no disponible');const id=await ensureRequest(user);const path=`${user.id}/${id}/${Date.now()}-${safeName(file.name)}`;const {error:upError}=await sb.storage.from('premium-receipts').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});if(upError)throw upError;const {error:rpcError}=await sb.rpc('submit_premium_payment',{p_request_id:id,p_payment_method:paymentMethod,p_receipt_path:path,p_payer_name:payerName.value.trim()||null});if(rpcError)throw rpcError;paymentSubmitted=true;pendingRequest=true;closePay();showPremium('✓ Pago Premium enviado','Recibimos tu comprobante. Está en revisión y, al aprobarse, Varelia Premium se activará por 1 mes.');apply();window.vareliaToast?.('Comprobante enviado correctamente.','ok')}
    catch(e){console.error('Pago Premium',e);window.vareliaToast?.('No se pudo enviar el comprobante. Intenta nuevamente.','warn')}finally{paySubmit.disabled=false;paySubmit.textContent='Enviar comprobante'}
  }
  paySubmit.onclick=sendPayment;
  document.addEventListener('click',e=>{const link=e.target.closest('.vareliaPlanLink');if(!link)return;e.preventDefault();if(validPremium())showPremium('👑 Tus beneficios Premium','Tu Plan Premium está activo y todas las funciones incluidas están desbloqueadas.');else if(paymentSubmitted)showPremium('✓ Pago Premium en revisión','Tu comprobante fue enviado. Cuando sea aprobado, el plan se activará automáticamente por 1 mes.');else if(pendingRequest)showPay();else showPremium('👑 Mejorar a Varelia Premium','Activa todas las funciones Premium por S/ 20 durante 1 mes.')},true);

  async function loadPlan(id,force=false){if(!id)return;businessId=String(id);if(!force&&loadedBusiness===businessId)return;loadedBusiness=businessId;try{const sb=window.vareliaSupabase;if(!sb)throw new Error('Supabase no disponible');const {data,error}=await sb.from('businesses').select('plan,plan_expires_at').eq('id',businessId).maybeSingle();if(error)throw error;currentPlan=data?.plan==='premium'?'premium':'basic';expiresAt=data?.plan_expires_at||null;try{localStorage.setItem(PLAN_CACHE,JSON.stringify({businessId,plan:currentPlan,expiresAt}))}catch{}}catch(e){console.warn('No se pudo comprobar el plan',e);try{const c=JSON.parse(localStorage.getItem(PLAN_CACHE)||'{}');if(c.businessId===businessId){currentPlan=c.plan==='premium'?'premium':'basic';expiresAt=c.expiresAt||null}}catch{}}await checkPending();apply();window.dispatchEvent(new CustomEvent('varelia:plan-ready',{detail:{plan:validPremium()?'premium':'basic',expiresAt,pendingRequest,paymentSubmitted}}))}
  window.addEventListener('varelia:business-scope-ready',e=>loadPlan(e.detail?.businessId,true));const init=setInterval(()=>{let id='';try{id=window.vareliaBusinessScope||localStorage.getItem('varelia_active_business_id')||''}catch{}if(id&&window.vareliaSupabase){clearInterval(init);loadPlan(id,true)}},300);setTimeout(()=>clearInterval(init),15000);setInterval(()=>{applyCard();lockPremiumControls()},1200);setInterval(()=>{if(businessId&&window.vareliaSupabase)loadPlan(businessId,true)},60000);addEventListener('focus',()=>{if(businessId&&window.vareliaSupabase)loadPlan(businessId,true)});apply();
})();