(()=>{
  if(window.__vareliaLogoutUI)return;
  window.__vareliaLogoutUI=true;
  const style=document.createElement('style');
  style.textContent=`
    #vareliaUserBar{margin:0 0 16px!important;padding:11px 12px!important;border-radius:16px!important;background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:none!important;color:#e5e7eb!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px!important;width:100%!important}
    #vareliaUserEmail{font-size:12px!important;font-weight:800!important;color:#cbd5e1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;width:100%!important}
    #vareliaLogout{display:block!important;width:100%!important;background:linear-gradient(135deg,var(--p),var(--p2))!important;color:#fff!important;border:0!important;border-radius:12px!important;padding:10px 12px!important;font-weight:900!important;white-space:nowrap!important;text-align:center!important;cursor:pointer!important}
    #vareliaLogoutFallback{display:block;width:100%;margin-top:10px;background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;border:0;border-radius:12px;padding:11px 12px;font-weight:900;text-align:center;cursor:pointer}
  `;
  document.head.appendChild(style);

  async function logout(){
    const btn=document.getElementById('vareliaLogout')||document.getElementById('vareliaLogoutFallback');
    if(btn){btn.disabled=true;btn.textContent='Cerrando sesión…'}
    try{
      if(window.vareliaSupabase)await window.vareliaSupabase.auth.signOut();
    }catch(e){console.warn('Cerrar sesión',e)}
    try{
      Object.keys(localStorage).filter(k=>/^sb-.*-auth-token$/.test(k)).forEach(k=>localStorage.removeItem(k));
      sessionStorage.clear();
    }catch{}
    location.replace('/login.html');
  }

  function ensure(){
    let btn=document.getElementById('vareliaLogout');
    const bar=document.getElementById('vareliaUserBar');
    if(bar){
      if(!btn){btn=document.createElement('button');btn.type='button';btn.id='vareliaLogout';bar.appendChild(btn)}
      btn.textContent='Cerrar sesión';btn.onclick=logout;
      document.getElementById('vareliaLogoutFallback')?.remove();
      return true;
    }
    const side=document.getElementById('sidebar')||document.querySelector('.side');
    if(side&&!document.getElementById('vareliaLogoutFallback')){
      const fallback=document.createElement('button');fallback.type='button';fallback.id='vareliaLogoutFallback';fallback.textContent='Cerrar sesión';fallback.onclick=logout;side.appendChild(fallback);
      return true;
    }
    return false;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
  let tries=0;const timer=setInterval(()=>{tries++;ensure();if(tries>50)clearInterval(timer)},200);
})();