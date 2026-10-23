(()=>{
  if(window.__vareliaAccountIsolation)return;
  window.__vareliaAccountIsolation=true;

  const clean=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'_');
  const PRIVATE_KEYS=[
    'miNegocio_products_v1','miNegocio_categories_v1','miNegocio_sales_v1',
    'miNegocio_closures_v1','miNegocio_cashStart_v1','miNegocio_theme_v1',
    'miNegocio_movements_v1','miNegocio_suppliers_v1','miNegocio_purchases_v1',
    'varelia_active_sale_cart_v1',
    'varelia_video_settings_v1','varelia_qr_yape_v2','varelia_qr_plin_v2',
    'varelia_qr_yape_holder_v2','varelia_qr_plin_holder_v2','varelia_product_specs_v1',
    'varelia_last_payment_method','varelia_bt_printer_name','varelia_last_weekly_backup',
    'varelia_last_weekly_reset'
  ];

  window.vareliaScopedLocalKey=(base)=>{
    const scope=clean(localStorage.getItem('varelia_active_business_id')||window.vareliaBusinessScope||'');
    return scope?base+'__'+scope:base+'__no_account';
  };

  function migrateLegacy(scope){
    let changed=false;
    const ownerKey='varelia_private_legacy_owner_scope';
    let owner=clean(localStorage.getItem(ownerKey)||localStorage.getItem('varelia_legacy_owner_scope')||'');
    if(!owner){owner=scope;localStorage.setItem(ownerKey,owner)}
    if(owner!==scope)return false;
    localStorage.setItem(ownerKey,owner);
    for(const base of PRIVATE_KEYS){
      const target=base+'__'+scope;
      if(localStorage.getItem(target)==null&&localStorage.getItem(base)!=null){
        localStorage.setItem(target,localStorage.getItem(base));
        changed=true;
      }
    }
    return changed;
  }

  function activateFromConfirmedSession(detail){
    const scope=clean(detail?.userId||detail?.businessId||window.vareliaBusinessScope||'');
    if(!scope)return false;

    // IMPORTANTE: este módulo ya no llama getUser/getSession ni recarga la página.
    // supabase-auth.js es el único responsable de confirmar la sesión. Así evitamos
    // que dos lecturas de Auth compitan durante el arranque del WebView de Android.
    migrateLegacy(scope);
    localStorage.setItem('varelia_active_business_id',scope);
    window.vareliaBusinessScope=scope;
    window.dispatchEvent(new CustomEvent('varelia:account-isolation-ready',{
      detail:{businessId:scope,userId:detail?.userId||scope}
    }));
    return true;
  }

  window.addEventListener('varelia:business-scope-ready',e=>{
    try{activateFromConfirmedSession(e?.detail||{})}catch(err){console.warn('Varelia: no se pudo completar el aislamiento local',err)}
  });
})();