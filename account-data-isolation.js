(()=>{
  if(window.__vareliaAccountIsolation)return;
  window.__vareliaAccountIsolation=true;
  const clean=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  const PRIVATE_KEYS=[
    'varelia_video_settings_v1','varelia_qr_yape_v2','varelia_qr_plin_v2',
    'varelia_qr_yape_holder_v2','varelia_qr_plin_holder_v2','varelia_product_specs_v1',
    'varelia_last_payment_method','varelia_bt_printer_name','varelia_last_weekly_backup',
    'varelia_last_weekly_reset'
  ];
  window.vareliaScopedLocalKey=(base)=>{
    const s=clean(localStorage.getItem('varelia_active_business_id')||window.vareliaBusinessScope||'');
    return s?base+'__'+s:base+'__no_account';
  };
  function migrateLegacy(scope){
    const ownerKey='varelia_private_legacy_owner_scope';
    let owner=clean(localStorage.getItem(ownerKey)||localStorage.getItem('varelia_legacy_owner_scope')||'');
    if(!owner){owner=scope;localStorage.setItem(ownerKey,owner)}
    if(owner!==scope)return;
    localStorage.setItem(ownerKey,owner);
    for(const base of PRIVATE_KEYS){
      const target=base+'__'+scope;
      if(localStorage.getItem(target)==null&&localStorage.getItem(base)!=null)localStorage.setItem(target,localStorage.getItem(base));
    }
  }
  async function resolve(){
    const sb=window.vareliaSupabase;
    if(!sb)return false;
    const {data:u}=await sb.auth.getUser();
    if(!u?.user)return false;
    const {data:p}=await sb.from('profiles').select('business_id').eq('id',u.user.id).maybeSingle();
    const scope=clean(p?.business_id||u.user.id);if(!scope)return false;
    migrateLegacy(scope);
    const prev=clean(localStorage.getItem('varelia_active_business_id')||'');
    localStorage.setItem('varelia_active_business_id',scope);
    window.vareliaBusinessScope=scope;
    if(prev!==scope){location.reload();return true}
    window.dispatchEvent(new CustomEvent('varelia:account-isolation-ready',{detail:{businessId:scope,userId:u.user.id}}));
    return true;
  }
  const timer=setInterval(()=>{if(window.vareliaSupabase){clearInterval(timer);resolve().catch(console.error)}},50);
  addEventListener('varelia:business-scope-ready',()=>resolve().catch(console.error));
})();