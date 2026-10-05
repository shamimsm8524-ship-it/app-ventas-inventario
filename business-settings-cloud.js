(()=>{ 
  if(window.__vareliaBusinessSettingsCloud)return;
  window.__vareliaBusinessSettingsCloud=true;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const sb=()=>window.vareliaSupabase;
  const scopeKey=()=>window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_video_settings_v1'):'varelia_video_settings_v1__no_account';
  const defaults={businessName:'',businessSlogan:'',logo:'',ruc:'',phone:'',address:'',businessHours:'',publicMapUrl:'',ticketMessage:'Gracias por su compra.',currency:'S/',publicAllowDelivery:true,publicAllowPickup:true,publicPaymentMethods:'Efectivo,Yape,Plin,Transferencia'};
  const localGet=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(scopeKey())||'{}')}}catch{return {...defaults}}};
  const localSet=v=>{try{localStorage.setItem(scopeKey(),JSON.stringify(v));window.vareliaVideoSettings=v}catch{}};
  const columns=['business_slogan','logo_data','ruc','phone','address','business_hours','public_map_url','ticket_message','currency','public_allow_delivery','public_allow_pickup','public_payment_methods'];
  const toRow=s=>({business_slogan:String(s.businessSlogan||''),logo_data:String(s.logo||''),ruc:String(s.ruc||''),phone:String(s.phone||''),address:String(s.address||''),business_hours:String(s.businessHours||''),public_map_url:String(s.publicMapUrl||''),ticket_message:String(s.ticketMessage||defaults.ticketMessage),currency:String(s.currency||defaults.currency),public_allow_delivery:s.publicAllowDelivery!==false,public_allow_pickup:s.publicAllowPickup!==false,public_payment_methods:String(s.publicPaymentMethods||defaults.publicPaymentMethods)});
  const fromRow=(s,r)=>({...s,businessSlogan:r.business_slogan||'',logo:r.logo_data||'',ruc:r.ruc||'',phone:r.phone||'',address:r.address||'',businessHours:r.business_hours||'',publicMapUrl:r.public_map_url||'',ticketMessage:r.ticket_message||defaults.ticketMessage,currency:r.currency||defaults.currency,publicAllowDelivery:r.public_allow_delivery!==false,publicAllowPickup:r.public_allow_pickup!==false,publicPaymentMethods:r.public_payment_methods||defaults.publicPaymentMethods});
  async function profile(){
    const c=sb(); if(!c)return null;
    const {data:u}=await c.auth.getUser(); if(!u?.user)return null;
    const {data:p,error}=await c.from('profiles').select('business_id,role').eq('id',u.user.id).maybeSingle();
    if(error)throw error; if(!p?.business_id)return null;
    return p;
  }
  async function syncFromCloud(){
    const c=sb(); const p=await profile(); if(!c||!p)return false;
    const {data,error}=await c.from('varelia_business_settings').select('*').eq('business_id',p.business_id).maybeSingle();
    if(error)throw error;
    if(data){
      const next=fromRow(localGet(),data); localSet(next);
      window.dispatchEvent(new CustomEvent('varelia:business-settings-cloud-ready',{detail:{businessId:p.business_id}}));
      return true;
    }
    const local=localGet();
    const payload={business_id:p.business_id,...toRow(local)};
    const ins=await c.from('varelia_business_settings').insert(payload).select('*').single();
    if(ins.error)throw ins.error;
    localSet(fromRow(local,ins.data));
    return true;
  }
  async function syncToCloud(){
    const c=sb(); const p=await profile(); if(!c||!p||p.role!=='owner')return false;
    const local=localGet();
    const {data,error}=await c.from('varelia_business_settings').upsert({business_id:p.business_id,...toRow(local)},{onConflict:'business_id'}).select('*').single();
    if(error)throw error;
    localSet(fromRow(local,data)); return true;
  }
  function wrapSave(){
    const btn=document.getElementById('vsettingsSave');
    if(!btn||btn.dataset.cloudWrapped==='1')return;
    const old=btn.onclick;
    if(typeof old!=='function')return;
    btn.onclick=async e=>{
      await old.call(btn,e);
      try{await syncToCloud(); window.vareliaToast?.('Datos del negocio guardados en tu cuenta.')}catch(err){console.warn('Cloud business settings',err)}
    };
    btn.dataset.cloudWrapped='1';
  }
  async function init(){
    for(let i=0;i<120&&!sb();i++)await sleep(100);
    if(!sb())return;
    try{await syncFromCloud()}catch(e){console.warn('No se pudieron cargar los datos privados del negocio',e)}
    let tries=0; const timer=setInterval(()=>{tries++;wrapSave();if(tries>120)clearInterval(timer)},250);
    sb().auth.onAuthStateChange(()=>setTimeout(async()=>{try{await syncFromCloud()}catch(e){console.warn('Business settings auth sync',e)}},300));
    window.addEventListener('varelia:business-scope-ready',()=>setTimeout(()=>syncFromCloud().catch(()=>{}),150));
  }
  init();
})();