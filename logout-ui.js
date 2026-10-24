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

  let closing=false;
  function clearLocalAuth(){
    try{
      Object.keys(localStorage).filter(k=>/^sb-.*-auth-token$/.test(k)).forEach(k=>localStorage.removeItem(k));
      localStorage.removeItem('varelia_active_business_id');
      sessionStorage.clear();
    }catch{}
    try{window.vareliaCurrentUserProfile=null}catch{}
    try{window.VareliaPaymentSnapshot=null}catch{}
    try{window.__vareliaLastReceipt=null}catch{}
  }

  function logout(){
    if(closing)return;
    closing=true;
    const btn=document.getElementById('vareliaLogout')||document.getElementById('vareliaLogoutFallback');
    if(btn){btn.disabled=true;btn.textContent='Cerrando sesión…'}

    // Cerrar solo esta sesión/dispositivo. No esperamos una operación global de red
    // para que el usuario salga de la app inmediatamente.
    try{
      const auth=window.vareliaSupabase?.auth;
      if(auth?.signOut){
        Promise.resolve(auth.signOut({scope:'local'})).catch(error=>console.warn('Cerrar sesión local',error));
      }
    }catch(error){console.warn('Cerrar sesión local',error)}

    // La sesión persistida se elimina enseguida; así una red lenta nunca deja la UI esperando.
    clearLocalAuth();
    try{document.body.classList.add('varelia-auth-locked')}catch{}
    requestAnimationFrame(()=>location.replace('/'));
  }

  function bindFastLogout(button){
    if(!button)return null;
    // supabase-auth.js añadió antes otro listener al mismo botón. Clonarlo elimina
    // ese listener antiguo para evitar dos cierres de sesión ejecutándose a la vez.
    if(!button.dataset.vareliaFastLogout){
      const fresh=button.cloneNode(true);
      fresh.dataset.vareliaFastLogout='1';
      button.replaceWith(fresh);
      button=fresh;
    }
    button.textContent='Cerrar sesión';
    button.disabled=false;
    button.onclick=logout;
    return button;
  }

  function ensure(){
    let btn=document.getElementById('vareliaLogout');
    const bar=document.getElementById('vareliaUserBar');
    if(bar){
      if(!btn){btn=document.createElement('button');btn.type='button';btn.id='vareliaLogout';bar.appendChild(btn)}
      bindFastLogout(btn);
      document.getElementById('vareliaLogoutFallback')?.remove();
      return true;
    }
    const side=document.getElementById('sidebar')||document.querySelector('.side');
    if(side&&!document.getElementById('vareliaLogoutFallback')){
      const fallback=document.createElement('button');fallback.type='button';fallback.id='vareliaLogoutFallback';fallback.textContent='Cerrar sesión';fallback.onclick=logout;side.appendChild(fallback);
      return true;
    }
    const fallback=document.getElementById('vareliaLogoutFallback');
    if(fallback){fallback.onclick=logout;return true}
    return false;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
  let tries=0;const timer=setInterval(()=>{tries++;ensure();if(tries>50)clearInterval(timer)},200);
})();
