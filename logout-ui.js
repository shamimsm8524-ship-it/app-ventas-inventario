(()=>{
  if(window.__vareliaLogoutUI)return;
  window.__vareliaLogoutUI=true;
  const style=document.createElement('style');
  style.textContent=`
    #vareliaUserBar{margin:18px 0 4px!important;padding:11px 12px!important;border-radius:16px!important;background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:none!important;color:#e5e7eb!important;gap:10px!important;align-items:center!important}
    #vareliaUserEmail{font-size:12px!important;font-weight:800!important;color:#cbd5e1!important}
    #vareliaLogout{background:linear-gradient(135deg,var(--p),var(--p2))!important;color:#fff!important;border:0!important;border-radius:12px!important;padding:9px 12px!important;font-weight:900!important;white-space:nowrap!important}
  `;
  document.head.appendChild(style);
  const fix=()=>{
    const side=document.querySelector('.side');
    const bar=document.getElementById('vareliaUserBar');
    const btn=document.getElementById('vareliaLogout');
    if(!side||!bar||!btn)return false;
    btn.textContent='Cerrar sesión';
    if(bar.parentElement!==side||bar!==side.lastElementChild)side.appendChild(bar);
    return true;
  };
  if(!fix()){
    const timer=setInterval(()=>{if(fix())clearInterval(timer)},120);
    setTimeout(()=>clearInterval(timer),10000);
  }
})();