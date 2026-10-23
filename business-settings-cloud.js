(()=>{
  if(window.__vareliaBusinessSettingsCloudV2)return;
  window.__vareliaBusinessSettingsCloudV2=true;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const sb=()=>window.vareliaSupabase;
  const clean=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  const defaults={businessName:'',businessSlogan:'',logo:'',ruc:'',phone:'',address:'',businessHours:'',publicMapUrl:'',ticketMessage:'Gracias por su compra.',currency:'S/',publicAllowDelivery:true,publicAllowPickup:true,publicPaymentMethods:'Efectivo,Yape,Plin,Transferencia'};
  const businessScopes=new Map();
  const scopeKey=businessId=>'varelia_video_settings_v1__'+clean(businessScopes.get(String(businessId))||'no_account');
  const pendingLogoKey=businessId=>'varelia_pending_business_logo_v1__'+clean(businessId);
  const localGet=(businessId)=>{
    try{
      const active=clean(localStorage.getItem('varelia_active_business_id')||'');
      if(!active||active!==clean(businessScopes.get(String(businessId))))return {...defaults};
      return {...defaults,...JSON.parse(localStorage.getItem(scopeKey(businessId))||'{}')};
    }catch{return {...defaults}}
  };
  const localSet=(businessId,v)=>{
    if(clean(localStorage.getItem('varelia_active_business_id')||'')!==clean(businessScopes.get(String(businessId))))return;
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

  let settingsSyncChain=Promise.resolve();
  let logoSyncChain=Promise.resolve();
  let logoVersion=0;
  let logoDebounceTimer=0;
  let logoFinalTimer=0;

  async function profile(){
    const c=sb();if(!c)return null;
    const {data:session,error:ue}=await c.auth.getSession();const u={user:session?.session?.user};if(ue||!u.user)return null;
    const {data:p,error}=await c.from('profiles').select('business_id,role').eq('id',u.user.id).maybeSingle();
    if(error)throw error;if(!p?.business_id)return null;
    businessScopes.set(String(p.business_id),u.user.id);
    return {businessId:String(p.business_id),userId:u.user.id,role:String(p.role||'')};
  }

  async function syncFromCloud(){
    const c=sb(),p=await profile();if(!c||!p)return false;
    const active=clean(localStorage.getItem('varelia_active_business_id')||'');
    // Nunca leer/escribir ajustes usando la cuenta anterior.
    if(active!==clean(p.userId))return false;
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

  async function syncToCloudNow(){
    const c=sb(),p=await profile();if(!c||!p||p.role!=='owner')return false;
    const active=clean(localStorage.getItem('varelia_active_business_id')||'');
    if(active!==clean(p.userId))return false;
    const local=localGet(p.businessId);
    const {data,error}=await c.from('varelia_business_settings').upsert({business_id:p.businessId,...toRow(local)},{onConflict:'business_id'}).select('*').single();
    if(error)throw error;
    localSet(p.businessId,fromRow(local,data));
    return true;
  }

  // Serializa guardados para que dos toques rápidos no terminen dejando una versión vieja.
  function syncToCloud(){
    settingsSyncChain=settingsSyncChain.catch(()=>{}).then(()=>syncToCloudNow());
    return settingsSyncChain;
  }

  function compressLogo(raw){
    return new Promise((resolve,reject)=>{
      const str=String(raw||'');
      if(!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(str))return reject(new Error('Selecciona una imagen PNG, JPG o WEBP para el logo.'));
      const img=new Image();
      img.onload=()=>{
        try{
          const scale=Math.min(1,640/Math.max(img.naturalWidth,1),360/Math.max(img.naturalHeight,1));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
          const ctx=canvas.getContext('2d');
          if(!ctx)throw new Error('No se pudo preparar la imagen.');
          ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',0.82));
        }catch(e){reject(e)}
      };
      img.onerror=()=>reject(new Error('No se pudo leer la imagen del logo.'));
      img.src=str;
    });
  }

  function setLogoStatus(text,isError=false){
    const el=document.getElementById('vsetLogoStatus');
    if(el){el.textContent=text;el.style.color=isError?'#b45309':'var(--muted)'}
  }

  async function syncLogoSnapshot(raw,version){
    const c=sb(),p=await profile();if(!c||!p||p.role!=='owner')return false;
    if(version!==logoVersion)return false;
    const active=clean(localStorage.getItem('varelia_active_business_id')||'');
    if(active!==clean(p.userId))return false;
    const compact=await compressLogo(raw);
    if(version!==logoVersion)return false;
    const current=localGet(p.businessId);
    const {data,error}=await c.from('varelia_business_settings')
      .upsert({business_id:p.businessId,...toRow(current),logo_data:compact,updated_at:new Date().toISOString()},{onConflict:'business_id'})
      .select('business_id,logo_data').single();
    if(error)throw error;
    if(version!==logoVersion)return false;
    const local=localGet(p.businessId);
    local.logo=String(data?.logo_data||compact);
    localSet(p.businessId,local);
    try{localStorage.removeItem(pendingLogoKey(p.businessId))}catch{}
    window.vareliaCloudBusinessLogo=local.logo;
    const preview=document.getElementById('vLogoPreview');
    if(preview&&local.logo)preview.src=local.logo;
    setLogoStatus('✓ Logo guardado y sincronizado con todas las cajas.');
    return true;
  }

  function enqueueLatestLogo(version,raw){
    logoSyncChain=logoSyncChain.catch(()=>{}).then(()=>syncLogoSnapshot(raw,version)).catch(err=>{
      console.warn('Cloud logo save',err);
      if(version===logoVersion)setLogoStatus('No se pudo sincronizar el logo. Se volverá a intentar.',true);
      return false;
    });
    return logoSyncChain;
  }

  async function captureLatestLogo(){
    const p=await profile();if(!p||p.role!=='owner')return false;
    if(!(await waitForScope(p)))return false;
    const live=window.vareliaVideoSettings||{};
    const raw=String(live.logo||'');
    if(!raw)return false;
    const local=localGet(p.businessId);
    local.logo=raw;
    localSet(p.businessId,local); // guardado local inmediato: el cambio no se pierde aunque se cierre Ajustes.
    try{localStorage.setItem(pendingLogoKey(p.businessId),raw)}catch{}
    return raw;
  }

  async function scheduleLogoSync(){
    const raw=await captureLatestLogo();if(!raw)return false;
    const version=++logoVersion;
    setLogoStatus('Guardando logo…');
    clearTimeout(logoDebounceTimer);
    clearTimeout(logoFinalTimer);
    // Debounce corto: si se elige otro logo enseguida, solo el último queda como definitivo.
    logoDebounceTimer=setTimeout(()=>enqueueLatestLogo(version,raw),220);
    // Segundo guardado deliberado: gana frente a una petición anterior que haya terminado tarde.
    logoFinalTimer=setTimeout(async()=>{
      if(version!==logoVersion)return;
      const latest=String((window.vareliaVideoSettings||{}).logo||raw);
      enqueueLatestLogo(version,latest);
    },1800);
    return true;
  }

  async function waitForScope(p){
    for(let i=0;i<100;i++){
      const a=clean(localStorage.getItem('varelia_active_business_id')||'');
      if(a===clean(p.userId))return true;
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
    // El cambio del selector ya emite varelia:business-settings-local-changed.
    // Aquí solo reforzamos el botón manual para no lanzar dos sincronizaciones por la misma selección.
    const share=document.getElementById('vsetShareLogo');
    if(share&&share.dataset.cloudLogoHook!=='1'){
      share.addEventListener('click',async()=>{
        await sleep(80);
        try{await scheduleLogoSync()}catch(e){console.warn('Cloud logo share',e)}
      });
      share.dataset.cloudLogoHook='1';
    }
  }

  function hookToastGuard(){
    const original=window.vareliaToast;
    if(typeof original!=='function'||original.__vareliaSettingsToastGuard)return;
    const guarded=function(message,type){
      if(String(message||'').trim()==='No se pudo sincronizar el producto.'){
        const hub=document.getElementById('mobileSettingsHub');
        if(hub){
          const style=getComputedStyle(hub),box=hub.getBoundingClientRect();
          const visible=style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;
          if(visible){
            console.warn('Se ocultó un aviso de producto ajeno a Ajustes.');
            return;
          }
        }
      }
      return original.apply(this,arguments);
    };
    guarded.__vareliaSettingsToastGuard=true;
    window.vareliaToast=guarded;
  }

  async function init(){
    for(let i=0;i<150&&!sb();i++)await sleep(100);
    if(!sb())return;
    try{
      const p=await profile();
      if(p&&await waitForScope(p)){
        let pending='';
        try{pending=String(localStorage.getItem(pendingLogoKey(p.businessId))||'')}catch{}
        await syncFromCloud();
        // Si la APK se cerró justo después de elegir un logo, la selección local pendiente
        // tiene prioridad sobre una copia vieja de la nube y se reintenta automáticamente.
        if(pending&&p.role==='owner'){
          const local=localGet(p.businessId);local.logo=pending;localSet(p.businessId,local);
          window.vareliaCloudBusinessLogo=pending;
          setTimeout(()=>scheduleLogoSync().catch(()=>{}),300);
        }
      }
    }catch(e){console.warn('No se pudieron cargar los datos privados del negocio',e)}
    let tries=0;
    const timer=setInterval(()=>{hookSave();hookLogo();hookToastGuard();if(++tries>160)clearInterval(timer)},250);
    window.addEventListener('varelia:business-scope-ready',()=>setTimeout(()=>syncFromCloud().catch(()=>{}),250));
    // Este evento se emite al cambiar el logo. No hacemos un segundo guardado general;
    // usamos una cola dedicada para que el último cambio siempre sea el que prevalezca.
    window.addEventListener('varelia:business-settings-local-changed',()=>setTimeout(()=>scheduleLogoSync().catch(()=>{}),90));
    sb().auth.onAuthStateChange(()=>setTimeout(async()=>{try{
      const p=await profile();if(p&&await waitForScope(p))await syncFromCloud();
    }catch(e){console.warn('Business settings auth sync',e)}},500));
  }
  init();
})();
