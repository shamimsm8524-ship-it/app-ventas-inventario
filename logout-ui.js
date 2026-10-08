(()=>{
  if(window.__vareliaLogoutUI)return;
  window.__vareliaLogoutUI=true;
  const style=document.createElement('style');
  style.textContent=`
    #vareliaUserBar{margin:0 0 16px!important;padding:11px 12px!important;border-radius:16px!important;background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:none!important;color:#e5e7eb!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px!important;width:100%!important}
    #vareliaUserEmail{font-size:12px!important;font-weight:800!important;color:#cbd5e1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;width:100%!important}
    #vareliaLogout{width:100%!important;background:linear-gradient(135deg,var(--p),var(--p2))!important;color:#fff!important;border:0!important;border-radius:12px!important;padding:9px 12px!important;font-weight:900!important;white-space:nowrap!important;text-align:center!important}
  `;
  document.head.appendChild(style);
  const fix=()=>{
    const bar=document.getElementById('vareliaUserBar');
    const btn=document.getElementById('vareliaLogout');
    if(!bar||!btn)return false;
    btn.textContent='Cerrar sesión';
    return true;
  };
  if(!fix()){
    const timer=setInterval(()=>{if(fix())clearInterval(timer)},120);
    setTimeout(()=>clearInterval(timer),10000);
  }
})();