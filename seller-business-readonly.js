(()=>{
  if(window.__vareliaSellerBusinessReadonly)return;
  window.__vareliaSellerBusinessReadonly=true;

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=(name,val)=>'<div class="vsbizField"><small>'+esc(name)+'</small><strong>'+esc(val||'No registrado')+'</strong></div>';
  const first=(...v)=>v.find(x=>x!==null&&x!==undefined&&String(x).trim()!=='')||'';
  const normalizeUrl=(raw)=>{
    try{
      const u=new URL(String(raw||'').trim());
      return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';
    }catch{return ''}
  };
  const stylesheet=document.createElement('style');
  stylesheet.id='vsellerBusinessReadonlyStyle';
  stylesheet.textContent=
    '.vsbizReadOnly{margin:14px 0 20px;border:1px solid var(--line,#ddd);border-radius:17px;background:var(--card,#fff);padding:17px;color:var(--ink,#111)}'+
    '.vsbizReadOnly h3{font-size:21px;margin:0 0 4px}.vsbizReadOnly p{font-size:12px;color:var(--muted,#64748b);margin:0 0 13px}'+
    '.vsbizLogo{width:78px;max-height:78px;object-fit:contain;border-radius:10px;margin:0 0 11px;display:none}'+
    '.vsbizGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}'+
    '.vsbizField{min-width:0;overflow-wrap:anywhere}.vsbizField small{display:block;color:var(--muted,#64748b);font-size:11px;margin-bottom:4px}.vsbizField strong{font-size:13px;font-weight:800;white-space:pre-wrap}'+
    '.vsbizFull{grid-column:1/-1}.vsbizReadOnly a{color:var(--p,#2563eb);font-weight:750;font-size:13px;overflow-wrap:anywhere}'+
    'body.varelia-staff-business-readonly #mobileSettingsHub .vsettingsSection,'+
    'body.varelia-staff-business-readonly #mobileSettingsHub #vsettingsSave,'+
    'body.varelia-staff-business-readonly #mobileSettingsHub .vrefPanel,'+
    'body.varelia-staff-business-readonly #vareliaHeaderEditName,'+
    'body.varelia-staff-business-readonly #vareliaEditBusinessName{display:none!important}';
  document.head.appendChild(stylesheet);

  let isStaff=false, info=null,currentBusiness='',busy=false,loadedAt=0,accessChecked=false;
  function mount(){
    const sec=$('mobileSettingsHub');
    if(!sec||!isStaff)return;
    let card=$('vsellerBusinessInfoReadOnly');
    if(!card){
      card=document.createElement('div');
      card.id='vsellerBusinessInfoReadOnly';
      card.className='vsbizReadOnly';
      const header=sec.querySelector('.vrefHead,.vmobileHubHead');
      if(header)header.insertAdjacentElement('afterend',card);
      else sec.prepend(card);
    }
    if(!card.dataset.initialized){
      card.dataset.initialized='yes';
      render();
    }
  }
  function render(){
    const card=$('vsellerBusinessInfoReadOnly');
    if(!card)return;
    if(!info){
      card.innerHTML='<h3>Datos del negocio</h3><p>Solo consulta: los vendedores no pueden modificar esta información.</p><div>Consultando información del negocio…</div>';
      return;
    }
    const fields=[
      ['Nombre del negocio',info.name],['Lema',info.slogan],
      ['RUC / Documento',info.ruc],['Teléfono',info.phone],
      ['Dirección',info.address],['Horario de atención',info.hours],
      ['Métodos de pago',info.paymentMethods],['Entregas',info.delivery],
      ['Mensaje del comprobante',info.ticketMessage]
    ];
    card.innerHTML='<h3>Datos del negocio</h3>'+
      '<p>Información compartida por el administrador. Puedes verla, pero no editarla.</p>'+
      '<img class="vsbizLogo" alt="Logo del negocio">'+
      '<div class="vsbizGrid">'+fields.map(([name,value])=>label(name,value)).join('')+'</div>'+
      '<div class="vsbizLinks" style="display:grid;gap:8px;margin-top:16px"></div>';
    const logo=card.querySelector('.vsbizLogo');
    const image=String(info.logo||'');
    if(/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(image)||/^https:\/\//i.test(image)){
      logo.src=image;logo.style.display='block';
    }
    const links=card.querySelector('.vsbizLinks');
    for(const item of info.links){
      const href=normalizeUrl(item.url);
      if(!href)continue;
      const a=document.createElement('a');
      a.href=href;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.textContent=item.label+': '+href;
      links.appendChild(a);
    }
  }
  async function refresh(force=false){
    if(busy)return;
    if(!force&&Date.now()-loadedAt<15000){mount();return}
    busy=true;
    try{
      const sb=window.vareliaSupabase;
      if(!sb)return;
      const {data:auth,error:authError}=await sb.auth.getUser();
      if(authError||!auth?.user)return;
      const {data:profile,error:profileError}=await sb.from('profiles')
        .select('business_id,role').eq('id',auth.user.id).maybeSingle();
      if(profileError||!profile?.business_id)return;
      const id=String(profile.business_id);
      isStaff=profile.role!=='owner';
      accessChecked=true;
      document.body.classList.toggle('varelia-staff-business-readonly',isStaff);
      if(!isStaff){
        $('vsellerBusinessInfoReadOnly')?.remove();
        return;
      }
      if(currentBusiness!==id){info=null;currentBusiness=id}
      mount();
      const [b,s,c]=await Promise.all([
        sb.from('businesses').select('name').eq('id',id).maybeSingle(),
        sb.from('varelia_business_settings').select('ruc,phone,address,business_hours,business_slogan,logo_data,public_map_url,ticket_message,public_payment_methods,public_allow_pickup,public_allow_delivery').eq('business_id',id).maybeSingle(),
        sb.from('public_catalogs').select('business_name,business_info,social_links').eq('business_id',id).eq('enabled',true).limit(1).maybeSingle()
      ]);
      if(b.error)throw b.error;
      if(s.error)console.warn('Datos de negocio: ajustes opcionales',s.error);
      if(c.error)console.warn('Datos de negocio: catálogo opcional',c.error);
      if(currentBusiness!==id)return;
      const biz=b.data||{},cfg=s.data||{},cat=c.data||{},extra=cat.business_info&&typeof cat.business_info==='object'?cat.business_info:{};
      const names=cat.social_links;
      const socials=Array.isArray(names)?names:Object.entries(names&&typeof names==='object'?names:{}).map(([type,url])=>({type,url}));
      const delivery=extra.delivery&&typeof extra.delivery==='object'?extra.delivery:{};
      const carriers=[['InDrive',delivery.indrive],['Olva',delivery.olva],['Shalom',delivery.shalom]].filter(([,x])=>x?.enabled).map(([name])=>name);
      const pickup=extra.allow_pickup??cfg.public_allow_pickup;
      if(pickup!==false)carriers.unshift('Recojo en tienda');
      const methods=extra.payment_methods;
      const methodText=Array.isArray(methods)?methods.join(', '):String(methods||cfg.public_payment_methods||'');
      const links=[];
      if(first(extra.map_url,cfg.public_map_url))links.push({label:'Ubicación en mapa',url:first(extra.map_url,cfg.public_map_url)});
      if(extra.whatsapp)links.push({label:'WhatsApp',url:extra.whatsapp});
      for(const social of socials){
        if(social?.url)links.push({label:String(social.label||social.type||'Red social'),url:social.url});
      }
      info={
        name:first(biz.name,cat.business_name,'Mi negocio'),
        slogan:first(extra.slogan,cfg.business_slogan),
        ruc:first(extra.ruc,cfg.ruc),
        phone:first(extra.phone,cfg.phone),
        address:first(extra.address,cfg.address),
        hours:first(extra.hours,cfg.business_hours),
        logo:first(extra.logo,cfg.logo_data),
        paymentMethods:methodText,
        delivery:carriers.join(', '),
        ticketMessage:first(cfg.ticket_message,'Gracias por su compra.'),
        links
      };
      loadedAt=Date.now();
      render();
    }catch(err){
      console.warn('No se pudieron consultar datos de negocio de vendedor',err);
      const card=$('vsellerBusinessInfoReadOnly');
      if(card)card.innerHTML='<h3>Datos del negocio</h3><p>Solo consulta</p><div>No se pudieron cargar los datos. Revisa tu conexión y vuelve a abrir Ajustes.</div>';
    }finally{busy=false}
  }
  function init(){
    const interval=setInterval(()=>{
      if($('mobileSettingsHub')){clearInterval(interval);mount()}
    },150);
    setTimeout(()=>refresh(true),600);
    const rootCheck=setInterval(()=>{
      if(accessChecked&&$('mobileSettingsHub')){clearInterval(rootCheck);mount()}
    },400);
    const bodyObserver=new MutationObserver(()=>{
      if(isStaff&&$('mobileSettingsHub')&&!$('vsellerBusinessInfoReadOnly'))mount();
    });
    const waitForSection=setInterval(()=>{
      const sec=$('mobileSettingsHub');
      if(!sec)return;
      clearInterval(waitForSection);
      bodyObserver.observe(sec,{childList:true});
    },200);
    window.addEventListener('varelia:sync-connected',()=>refresh(true));
    window.addEventListener('varelia:business-scope-ready',()=>refresh(true));
    window.addEventListener('varelia:account-isolation-ready',()=>refresh(true));
    window.addEventListener('focus',()=>{if(isStaff)refresh(true)});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&isStaff)refresh(true)});
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-mobile-tab="mobileSettingsHub"],#businessDataMenu'))setTimeout(()=>refresh(true),60);
      if(!isStaff)return;
      const locked=e.target.closest('#vsettingsSave,#businessBrandSave,#vareliaHeaderEditName,#vareliaEditBusinessName,#vdSave');
      if(locked){e.preventDefault();e.stopImmediatePropagation()}
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

// Cargar el refuerzo de color directamente. La APK 1.0.50 puede limpiar el Service Worker al arrancar.
(()=>{
  if(document.querySelector('script[data-varelia-vivid-buttons-direct]'))return;
  const s=document.createElement('script');
  s.src='/button-color-vivid.js?v=20261016-v2';
  s.async=false;
  s.dataset.vareliaVividButtonsDirect='1';
  document.head.appendChild(s);
})();
