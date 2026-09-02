(()=>{
  if(window.__vareliaAdminGuard)return;
  window.__vareliaAdminGuard=true;
  const ADMIN_EMAIL='milagroslove.1693@gmail.com';

  const style=document.createElement('style');
  style.id='vareliaAdminGuardStyle';
  style.textContent=`body:not(.varelia-super-admin) .vpAdminNav,body:not(.varelia-super-admin) .vpAdminModal{display:none!important}`;
  document.head.appendChild(style);

  let seq=0;
  const lock=()=>{
    document.body?.classList.remove('varelia-super-admin');
    document.querySelectorAll('.vpAdminModal.show').forEach(el=>el.classList.remove('show'));
  };

  async function verify(){
    const mine=++seq;
    lock();
    const sb=window.vareliaSupabase;
    if(!sb)return false;
    try{
      const {data:userData,error:userError}=await sb.auth.getUser();
      if(userError||mine!==seq)return false;
      const user=userData?.user;
      if(!user||String(user.email||'').trim().toLowerCase()!==ADMIN_EMAIL)return false;
      const {data,error}=await sb.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle();
      if(error||mine!==seq||!data)return false;
      document.body?.classList.add('varelia-super-admin');
      return true;
    }catch(e){console.warn('Admin guard',e);return false}
  }

  const wait=setInterval(()=>{
    if(!window.vareliaSupabase)return;
    clearInterval(wait);
    verify();
    window.vareliaSupabase.auth.onAuthStateChange(()=>{seq++;lock();setTimeout(verify,120)});
  },150);
  setTimeout(()=>clearInterval(wait),20000);
  window.addEventListener('varelia:business-scope-ready',()=>setTimeout(verify,80));
  window.addEventListener('pageshow',()=>setTimeout(verify,80));
})();