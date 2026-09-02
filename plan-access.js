(()=>{
  if(window.__vareliaPlanAccess)return;
  window.__vareliaPlanAccess=true;

  const PLAN_CACHE='varelia_subscription_plan_v1';
  const style=document.createElement('style');
  style.textContent=`
    .vareliaPremiumLocked{position:relative;opacity:.72}
    .vareliaPremiumLocked::after{content:'🔒';margin-left:auto;font-size:12px}
    .vareliaPlanModal{position:fixed;inset:0;z-index:100050;display:none;align-items:center;justify-content:center;padding:18px;background:#0f172ab5;backdrop-filter:blur(8px)}
    .vareliaPlanModal.show{display:flex}
    .vareliaPlanCard{width:min(94vw,520px);max-height:90vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#111827);border-radius:24px;padding:22px;box-shadow:0 28px 80px #0005}
    .vareliaPlanHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.vareliaPlanHead h2{margin:0;font-size:22px}.vareliaPlanHead p{margin:5px 0 0;color:var(--muted,#64748b);font-size:13px;line-height:1.5}
    .vareliaPlanClose{border:0;width:38px;height:38px;border-radius:12px;background:var(--bg,#f1f5f9);font-size:22px;color:inherit}
    .vareliaPlanBenefits{display:grid;gap:9px;margin:18px 0}.vareliaPlanBenefit{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border:1px solid var(--line,#e5e7eb);border-radius:14px}.vareliaPlanBenefit b{display:block;font-size:13px}.vareliaPlanBenefit span{display:block;margin-top:2px;color:var(--muted,#64748b);font-size:12px;line-height:1.35}
    .vareliaPlanCta{width:100%;border:0;border-radius:14px;padding:13px 15px;background:linear-gradient(135deg,#ec4899,#7c3aed);color:#fff;font-weight:950;font-size:14px}
    .premiumPlan.basic{background:linear-gradient(145deg,#18213f,#2b1745)!important}.premiumPlan.premiumActive{box-shadow:0 0 0 1px #f472b655,0 14px 30px #7c3aed25}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.className='vareliaPlanModal';
  overlay.innerHTML=`<div class="vareliaPlanCard" role="dialog" aria-modal="true" aria-labelledby="vareliaPlanTitle"><div class="vareliaPlanHead"><div><h2 id="vareliaPlanTitle">👑 Varelia Premium</h2><p>Desbloquea herramientas avanzadas para administrar y analizar tu negocio con mayor control.</p></div><button class="vareliaPlanClose" type="button" aria-label="Cerrar">×</button></div><div class="vareliaPlanBenefits"><div class="vareliaPlanBenefit"><div>📊</div><div><b>Reportes y ganancias avanzadas</b><span>Rentabilidad, márgenes y detalle por producto.</span></div></div><div class="vareliaPlanBenefit"><div>📄</div><div><b>Comprobantes avanzados</b><span>PDF, WhatsApp e impresión mejorada.</span></div></div><div class="vareliaPlanBenefit"><div>☁️</div><div><b>Respaldo y funciones en la nube</b><span>Preparado para copias de seguridad y recuperación.</span></div></div><div class="vareliaPlanBenefit"><div>👥</div><div><b>Funciones profesionales</b><span>Base para usuarios/cajeros, clientes y futuras integraciones.</span></div></div></div><button type="button" class="vareliaPlanCta">Solicitar Plan Premium</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.vareliaPlanClose').onclick=()=>overlay.classList.remove('show');
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
  overlay.querySelector('.vareliaPlanCta').onclick=()=>{
    overlay.classList.remove('show');
    window.vareliaToast?.('Pronto podrás activar Premium desde tu cuenta.','ok');
  };
  const showPremium=()=>overlay.classList.add('show');

  let currentPlan='basic';
  let expiresAt=null;
  const validPremium=()=>currentPlan==='premium'&&(!expiresAt||new Date(expiresAt)>new Date());
  window.vareliaIsPremium=()=>validPremium();
  window.vareliaRequirePremium=(feature='Esta función')=>{
    if(validPremium())return true;
    const title=document.getElementById('vareliaPlanTitle');
    if(title)title.textContent='🔒 '+feature+' es Premium';
    showPremium();
    return false;
  };

  function applyCard(){
    const card=document.querySelector('.premiumPlan');
    if(!card)return;
    const state=validPremium()?'premium':'basic';
    card.classList.toggle('basic',state==='basic');
    card.classList.toggle('premiumActive',state==='premium');
    if(card.dataset.planRendered===state)return;
    card.dataset.planRendered=state;
    card.innerHTML=state==='premium'
      ?'<div>♛ <b>Plan Premium</b></div><small>Todas las funciones Premium activas</small><a href="#" class="vareliaPlanLink">Ver beneficios →</a>'
      :'<div>◇ <b>Plan Básico</b></div><small>Funciones esenciales activas</small><a href="#" class="vareliaPlanLink">Mejorar a Premium →</a>';
    card.querySelector('.vareliaPlanLink')?.addEventListener('click',e=>{
      e.preventDefault();
      const title=document.getElementById('vareliaPlanTitle');
      if(title)title.textContent=validPremium()?'👑 Tus beneficios Premium':'👑 Mejorar a Varelia Premium';
      showPremium();
    });
  }

  function lockPremiumControls(){
    const premiumControls=[
      [document.querySelector('.premiumReportsItem'),'Reportes avanzados'],
      [document.querySelector('.premiumGainItem'),'Ganancias'],
      [document.getElementById('vreceiptPdf'),'Guardar comprobante en PDF'],
      [document.getElementById('vreceiptShare'),'Compartir comprobante por WhatsApp']
    ];
    premiumControls.forEach(([el,label])=>{
      if(!el)return;
      el.classList.toggle('vareliaPremiumLocked',!validPremium());
      if(el.dataset.planGuard==='1')return;
      el.dataset.planGuard='1';
      el.addEventListener('click',e=>{
        if(validPremium())return;
        e.preventDefault();
        e.stopImmediatePropagation();
        window.vareliaRequirePremium(label);
      },true);
    });
  }

  function apply(){
    document.documentElement.dataset.vareliaPlan=validPremium()?'premium':'basic';
    applyCard();
    lockPremiumControls();
    window.dispatchEvent(new CustomEvent('varelia:plan-ready',{detail:{plan:validPremium()?'premium':'basic',expiresAt}}));
  }

  async function loadPlan(businessId){
    if(!businessId)return;
    try{
      const sb=window.vareliaSupabase;
      if(!sb)throw new Error('Supabase no disponible');
      const {data,error}=await sb.from('businesses').select('plan,plan_expires_at').eq('id',businessId).maybeSingle();
      if(error)throw error;
      currentPlan=data?.plan==='premium'?'premium':'basic';
      expiresAt=data?.plan_expires_at||null;
      try{localStorage.setItem(PLAN_CACHE,JSON.stringify({businessId,plan:currentPlan,expiresAt}))}catch{}
    }catch(e){
      console.warn('No se pudo comprobar el plan',e);
      try{
        const c=JSON.parse(localStorage.getItem(PLAN_CACHE)||'{}');
        if(c.businessId===businessId){currentPlan=c.plan==='premium'?'premium':'basic';expiresAt=c.expiresAt||null}
      }catch{}
    }
    apply();
  }

  window.addEventListener('varelia:business-scope-ready',e=>loadPlan(e.detail?.businessId));
  const init=setInterval(()=>{
    let businessId='';
    try{businessId=window.vareliaBusinessScope||localStorage.getItem('varelia_active_business_id')||''}catch{}
    if(!businessId||!window.vareliaSupabase)return;
    clearInterval(init);
    loadPlan(businessId);
  },250);
  setTimeout(()=>clearInterval(init),15000);

  let pending=false;
  const observer=new MutationObserver(()=>{
    if(pending)return;
    pending=true;
    requestAnimationFrame(()=>{
      pending=false;
      applyCard();
      lockPremiumControls();
    });
  });
  observer.observe(document.body,{childList:true,subtree:true});
  apply();
})();