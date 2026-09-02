(()=>{
  if(window.__vareliaPlanAccess)return;
  window.__vareliaPlanAccess=true;

  const PLAN_CACHE='varelia_subscription_plan_v1';
  let currentPlan='basic',expiresAt=null,businessId='',pendingRequest=false,loadedBusiness='';
  const validPremium=()=>currentPlan==='premium'&&(!expiresAt||new Date(expiresAt)>new Date());

  const style=document.createElement('style');
  style.textContent=`
    .vareliaPremiumLocked{position:relative;opacity:.72}.vareliaPremiumLocked::after{content:'🔒';margin-left:auto;font-size:12px}
    .vareliaPlanModal{position:fixed;inset:0;z-index:100050;display:none;align-items:center;justify-content:center;padding:18px;background:#0f172ab5;backdrop-filter:blur(8px)}.vareliaPlanModal.show{display:flex}
    .vareliaPlanCard{width:min(94vw,520px);max-height:90vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#111827);border-radius:24px;padding:22px;box-shadow:0 28px 80px #0005}
    .vareliaPlanHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.vareliaPlanHead h2{margin:0;font-size:22px}.vareliaPlanHead p{margin:5px 0 0;color:var(--muted,#64748b);font-size:13px;line-height:1.5}.vareliaPlanClose{border:0;width:38px;height:38px;border-radius:12px;background:var(--bg,#f1f5f9);font-size:22px;color:inherit}
    .vareliaPlanBenefits{display:grid;gap:9px;margin:18px 0}.vareliaPlanBenefit{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border:1px solid var(--line,#e5e7eb);border-radius:14px}.vareliaPlanBenefit b{display:block;font-size:13px}.vareliaPlanBenefit span{display:block;margin-top:2px;color:var(--muted,#64748b);font-size:12px;line-height:1.35}
    .vareliaPlanCta{width:100%;border:0;border-radius:14px;padding:13px 15px;background:linear-gradient(135deg,#ec4899,#7c3aed);color:#fff;font-weight:950;font-size:14px}.vareliaPlanCta:disabled{opacity:.7;cursor:not-allowed}
    .premiumPlan.basic{background:linear-gradient(145deg,#18213f,#2b1745)!important}.premiumPlan.premiumActive{box-shadow:0 0 0 1px #f472b655,0 14px 30px #7c3aed25}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.className='vareliaPlanModal';
  overlay.innerHTML=`<div class="vareliaPlanCard" role="dialog" aria-modal="true" aria-labelledby="vareliaPlanTitle"><div class="vareliaPlanHead"><div><h2 id="vareliaPlanTitle">👑 Varelia Premium</h2><p id="vareliaPlanText">Desbloquea herramientas avanzadas para administrar y analizar tu negocio con mayor control.</p></div><button class="vareliaPlanClose" type="button" aria-label="Cerrar">×</button></div><div class="vareliaPlanBenefits"><div class="vareliaPlanBenefit"><div>📊</div><div><b>Reportes y ganancias avanzadas</b><span>Rentabilidad, márgenes y detalle por producto.</span></div></div><div class="vareliaPlanBenefit"><div>📄</div><div><b>Comprobantes avanzados</b><span>PDF, WhatsApp e impresión mejorada.</span></div></div><div class="vareliaPlanBenefit"><div>☁️</div><div><b>Respaldo y funciones en la nube</b><span>Copias de seguridad y recuperación.</span></div></div><div class="vareliaPlanBenefit"><div>👥</div><div><b>Funciones profesionales</b><span>Preparado para usuarios/cajeros, clientes y futuras integraciones.</span></div></div></div><button type="button" class="vareliaPlanCta">Solicitar Plan Premium</button></div>`;
  document.body.appendChild(overlay);
  const title=overlay.querySelector('#vareliaPlanTitle'),text=overlay.querySelector('#vareliaPlanText'),cta=overlay.querySelector('.vareliaPlanCta');
  overlay.querySelector('.vareliaPlanClose').onclick=()=>overlay.classList.remove('show');
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
  const showPremium=(label='👑 Varelia Premium')=>{title.textContent=label;overlay.classList.add('show');updateCta()};

  function updateCta(){
    if(validPremium()){cta.disabled=true;cta.textContent='✓ Premium activo';return}
    if(pendingRequest){cta.disabled=true;cta.textContent='✓ Solicitud enviada';return}
    cta.disabled=false;cta.textContent='Solicitar Plan Premium';
  }

  window.vareliaIsPremium=()=>validPremium();
  window.vareliaRequirePremium=(feature='Esta función')=>{if(validPremium())return true;showPremium('🔒 '+feature+' es Premium');return false};

  function applyCard(){
    const card=document.querySelector('.premiumPlan');if(!card)return;
    const state=validPremium()?'premium':'basic';
    card.classList.toggle('basic',state==='basic');card.classList.toggle('premiumActive',state==='premium');
    const marker=state+(pendingRequest?'-pending':'');if(card.dataset.planRendered===marker)return;card.dataset.planRendered=marker;
    card.innerHTML=state==='premium'
      ?'<div>♛ <b>Plan Premium</b></div><small>Todas las funciones Premium activas</small><a href="#" class="vareliaPlanLink">Ver beneficios →</a>'
      :pendingRequest
        ?'<div>◇ <b>Plan Básico</b></div><small>Solicitud Premium enviada</small><a href="#" class="vareliaPlanLink">Ver solicitud →</a>'
        :'<div>◇ <b>Plan Básico</b></div><small>Funciones esenciales activas</small><a href="#" class="vareliaPlanLink">Mejorar a Premium →</a>';
  }

  function lockPremiumControls(){
    const controls=[[document.querySelector('.premiumReportsItem'),'Reportes avanzados'],[document.querySelector('.premiumGainItem'),'Ganancias'],[document.getElementById('vreceiptPdf'),'Guardar comprobante en PDF'],[document.getElementById('vreceiptShare'),'Compartir comprobante por WhatsApp']];
    controls.forEach(([el,label])=>{if(!el)return;el.classList.toggle('vareliaPremiumLocked',!validPremium());if(el.dataset.planGuard==='1')return;el.dataset.planGuard='1';el.addEventListener('click',e=>{if(validPremium())return;e.preventDefault();e.stopImmediatePropagation();window.vareliaRequirePremium(label)},true)});
  }

  function apply(){document.documentElement.dataset.vareliaPlan=validPremium()?'premium':'basic';applyCard();lockPremiumControls();updateCta()}

  async function checkPending(){
    if(!businessId||validPremium()||!window.vareliaSupabase)return;
    try{
      const {data,error}=await window.vareliaSupabase.from('premium_requests').select('id,status').eq('business_id',businessId).eq('status','pending').limit(1);
      if(error)throw error;pendingRequest=Array.isArray(data)&&data.length>0;apply();
    }catch(e){console.warn('No se pudo comprobar la solicitud Premium',e)}
  }

  async function requestPremium(){
    if(validPremium()||pendingRequest)return;
    const sb=window.vareliaSupabase;
    businessId=businessId||window.vareliaBusinessScope||(()=>{try{return localStorage.getItem('varelia_active_business_id')||''}catch{return''}})();
    if(!sb||!businessId){window.vareliaToast?.('Espera a que tu cuenta termine de cargar.','warn');return}
    cta.disabled=true;cta.textContent='Enviando solicitud...';
    try{
      const {data:userData,error:userError}=await sb.auth.getUser();if(userError)throw userError;const user=userData?.user;if(!user)throw new Error('Sesión no disponible');
      const {data:existing,error:checkError}=await sb.from('premium_requests').select('id').eq('business_id',businessId).eq('status','pending').limit(1);if(checkError)throw checkError;
      if(!existing?.length){const {error}=await sb.from('premium_requests').insert({business_id:businessId,user_id:user.id,status:'pending'});if(error&&error.code!=='23505')throw error}
      pendingRequest=true;title.textContent='✓ Solicitud Premium enviada';text.textContent='Tu solicitud quedó registrada correctamente. Cuando se apruebe, las funciones Premium se activarán en esta cuenta.';apply();window.vareliaToast?.('Solicitud Premium enviada correctamente.','ok');
    }catch(e){console.error('Solicitud Premium',e);cta.disabled=false;cta.textContent='Solicitar Plan Premium';window.vareliaToast?.('No se pudo enviar la solicitud. Intenta nuevamente.','warn')}
  }

  cta.addEventListener('click',requestPremium);
  document.addEventListener('click',e=>{const link=e.target.closest('.vareliaPlanLink');if(!link)return;e.preventDefault();if(validPremium())showPremium('👑 Tus beneficios Premium');else if(pendingRequest){text.textContent='Tu solicitud ya está registrada y pendiente de aprobación.';showPremium('✓ Solicitud Premium enviada')}else showPremium('👑 Mejorar a Varelia Premium')},true);

  async function loadPlan(id){
    if(!id)return;businessId=String(id);if(loadedBusiness===businessId)return;loadedBusiness=businessId;
    try{
      const sb=window.vareliaSupabase;if(!sb)throw new Error('Supabase no disponible');
      const {data,error}=await sb.from('businesses').select('plan,plan_expires_at').eq('id',businessId).maybeSingle();if(error)throw error;
      currentPlan=data?.plan==='premium'?'premium':'basic';expiresAt=data?.plan_expires_at||null;try{localStorage.setItem(PLAN_CACHE,JSON.stringify({businessId,plan:currentPlan,expiresAt}))}catch{}
    }catch(e){console.warn('No se pudo comprobar el plan',e);try{const c=JSON.parse(localStorage.getItem(PLAN_CACHE)||'{}');if(c.businessId===businessId){currentPlan=c.plan==='premium'?'premium':'basic';expiresAt=c.expiresAt||null}}catch{}}
    apply();await checkPending();window.dispatchEvent(new CustomEvent('varelia:plan-ready',{detail:{plan:validPremium()?'premium':'basic',expiresAt,pendingRequest}}));
  }

  window.addEventListener('varelia:business-scope-ready',e=>loadPlan(e.detail?.businessId));
  const init=setInterval(()=>{let id='';try{id=window.vareliaBusinessScope||localStorage.getItem('varelia_active_business_id')||''}catch{}if(id&&window.vareliaSupabase){clearInterval(init);loadPlan(id)}},300);setTimeout(()=>clearInterval(init),15000);
  setInterval(()=>{applyCard();lockPremiumControls()},1200);
  apply();
})();