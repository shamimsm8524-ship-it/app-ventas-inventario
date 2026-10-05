(()=>{
  if(window.__vareliaBusinessSettingsCloudV2)return;
  window.__vareliaBusinessSettingsCloudV2=true;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const sb=()=>window.vareliaSupabase;
  const clean=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  const defaults={businessName:'',businessSlogan:'',logo:'',ruc:'',phone:'',address:'',businessHours:'',publicMapUrl:'',ticketMessage:'Gracias por su compra.',currency:'S/',publicAllowDelivery:true,publicAllowPickup:true,publicPaymentMethods:'Efectivo,Yape,Plin,Transferencia'};
  const scopeKey=businessId=>'varelia_video_settings_v1__'+clean(businessId);
  const localGet=(businessId)=>{
    try{
      const active=clean(localStorage.getItem('varelia_active_business_id')||'');
      if(active!==clean(businessId))return {...defaults};
      return {...defaults,...JSON.parse(localStorage.getItem(scopeKey(businessId))||'{}')};
    }catch{return {...defaults}}
  };
  const localSet=(businessId,v)=>{
    try{
      localStorage.setItem(scopeKey(businessId),JSON.stringify(v));
      window.vareliaVideoSettings=v;
    }catch(e){console.warn('Varelia settings local save',e)}
  };
  const toRow=s=>({
    business_slogan:String(s.businessSlogan||''),
    logo_data:String(s.logo||''),
    ruc:String(s.ruc||''),
    phone:String(s.phone||''),
    address:String(s.address||''),
    business_hours:String(s.businessHours||''),
    public_map_url:String(s.publicMapUrl||''),
    ticket_message:String(s.ticketMessage||defaults.ticketMessage),
    currency:String(s.currency||defaults.currency),
    public_allow_delivery:s.publicAllowDelivery!==false,
    public_allow_pickup:s.publicAllowPickup!==false,
    public_payment_methods:Array.isArray(s.publicPaymentMethods)?s.publicPaymentMethods.join(','):String(s.publicPaymentMethods||defaults.publicPaymentMethods)
  });
  const fromRow=(s,r)=>({...s,
    businessSlogan:r.business_slogan||'',
    logo:r.logo_data||'',
    ruc:r.ruc||'',
    phone:r.phone||'',
    address:r.address||'',
    businessHours:r.business_hours||'',
    publicMapUrl:r.public_map_url||'',
    ticketMessage:r.ticket_message||defaults.ticketMessage,
    currency:r.currency||defaults.currency,
    publicAllowDelivery:r.public_allow_delivery!==false,
    publicAllowPickup:r.public_allow_pickup!==false,
    publicPaymentMethods:r.public_payment_methods||defaults.publicPaymentMethods
  });
  async function profile(){
    const c=sb();if(!c)return null;
    const {data:u,error:ue}=await c.auth.getUser();if(ue||!u?.user)return null;
    const {data:p,error}=await c.from('profiles').select('business_id,role').eq('id',u.user.id).maybeSingle();
    if(error)throw error;if(!p?.business_id)return null;
    return {businessId:String(p.business_id),role:String(p.role||'')};
  }
  async function syncFromCloud(){
    const c=sb(),p=await profile();if(!c||!p)return false;
    const active=clean(localStorage.getItem('varelia_active_business_id')||'');
    // Nunca leer/escribir ajustes usando la cuenta anterior.
    if(active!==clean(p.businessId)){localStorage.setItem('varelia_active_business_id',p.businessId);return false}
    const {data,error}=await c.from('varelia_business_settings').select('*').eq('business_id',p.businessId).maybeSingle();
    if(error)throw error;
    if(data){
      const next=fromRow(localGet(p.businessId),data);
      localSet(p.businessId,next);
      window.dispatchEvent(new CustomEvent('varelia:business-settings-cloud-ready',{detail:{businessId:p.businessId}}));
      return true;
    }
    // Cuenta nueva: crear valores vacíos/default, jamás copiar datos de otra cuenta.
    const fresh={...defaults};
    const ins=await c.from('varelia_business_settings').insert({business_id:p.businessId,...toRow(fresh)}).select('*').single();
    if(ins.error)throw ins.error;
    localSet(p.businessId,fromRow(fresh,ins.data));
    return true;
  }
  async function syncToCloud(){
    const c=sb(),p=await profile();if(!c||!p||p.role!=='owner')return false;
    const active=clean(localStorage.getItem('varelia_active_business_id')||'');
    if(active!==clean(p.businessId))return false;
    const local=localGet(p.businessId);
    const {data,error}=await c.from('varelia_business_settings').upsert({business_id:p.businessId,...toRow(local)},{onConflict:'business_id'}).select('*').single();
    if(error)throw error;
    localSet(p.businessId,fromRow(local,data));
    return true;
  }
  async function waitForScope(p){
    for(let i=0;i<100;i++){
      const a=clean(localStorage.getItem('varelia_active_business_id')||'');
      if(a===clean(p.businessId))return true;
      await sleep(100);
    }
    return false;
  }
  function hookSave(){
    const btn=document.getElementById('vsettingsSave');
    if(!btn||btn.dataset.cloudWrappedV2==='1')return;
    const old=btn.onclick;
    if(typeof old!=='function')return;
    btn.onclick=async e=>{
      await old.call(btn,e);
      await sleep(50);
      try{await syncToCloud();window.vareliaToast?.('Datos del negocio guardados en tu cuenta.')}catch(err){console.warn('Cloud business settings save',err)}
    };
    btn.dataset.cloudWrappedV2='1';
  }
  function hookLogo(){
    const input=document.getElementById('vsetLogo');
    if(!input||input.dataset.cloudLogoHook==='1')return;
    input.addEventListener('change',async()=>{
      // video-features actualiza cfg; esperamos un instante y luego guardamos ese cfg.
      await sleep(100);
      try{
        const p=await profile();
        if(!p||!(await waitForScope(p)))return;
        const local=localGet(p.businessId);
        const live=window.vareliaVideoSettings||{};
        if(live.logo) local.logo=live.logo;
        localSet(p.businessId,local);
        await syncToCloud();
      }catch(e){console.warn('Cloud logo save',e)}
    });
    input.dataset.cloudLogoHook='1';
  }
  async function init(){
    for(let i=0;i<150&&!sb();i++)await sleep(100);
    if(!sb())return;
    try{
      const p=await profile();
      if(p&&await waitForScope(p))await syncFromCloud();
    }catch(e){console.warn('No se pudieron cargar los datos privados del negocio',e)}
    let tries=0;
    const timer=setInterval(()=>{hookSave();hookLogo();if(++tries>160)clearInterval(timer)},250);
    window.addEventListener('varelia:business-scope-ready',()=>setTimeout(()=>syncFromCloud().catch(()=>{}),250));
    window.addEventListener('varelia:business-settings-local-changed',()=>setTimeout(()=>syncToCloud().catch(()=>{}),100));
    sb().auth.onAuthStateChange(()=>setTimeout(async()=>{try{
      const p=await profile();if(p&&await waitForScope(p))await syncFromCloud();
    }catch(e){console.warn('Business settings auth sync',e)}},500));
  }
  init();
})();