(()=>{
  if(window.__vareliaPremiumAdminOpenFix)return;
  window.__vareliaPremiumAdminOpenFix=true;
  const ADMIN_EMAIL='milagroslove.1693@gmail.com';

  async function authorized(){
    const sb=window.vareliaSupabase;if(!sb)return false;
    try{
      const {data:userData,error:userError}=await sb.auth.getUser();
      if(userError)return false;
      const user=userData?.user;
      if(!user||String(user.email||'').trim().toLowerCase()!==ADMIN_EMAIL)return false;
      const {data,error}=await sb.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle();
      return !error&&!!data;
    }catch{return false}
  }

  async function openAdmin(){
    const ok=await authorized();
    if(!ok){
      document.querySelectorAll('.vpAdminModal.show').forEach(el=>el.classList.remove('show'));
      window.vareliaToast?.('Esta cuenta no tiene acceso de administración.','warn');
      return;
    }
    document.body?.classList.add('varelia-super-admin');
    const modal=document.querySelector('.vpAdminModal');
    if(!modal){
      window.vareliaToast?.('El panel todavía está cargando. Intenta de nuevo en un momento.','warn');
      return;
    }
    document.getElementById('sidebar')?.classList.remove('open','show');
    document.querySelector('.overlay')?.classList.remove('show');
    modal.classList.add('show');
    setTimeout(()=>modal.querySelector('.vpAdminRefresh')?.click(),80);
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.vpAdminNav');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openAdmin();
  },true);

  window.vareliaOpenPremiumAdmin=openAdmin;
})();

// La APK limpia/desregistra Service Workers al arrancar, por lo que una corrección
// inyectada solo desde sw.js puede no ejecutarse en esa primera carga. Cargar el
// guard de variantes directamente desde un módulo que la app ya incluye siempre.
(()=>{
  if(window.__vareliaDirectVariantGuardLoaderV5)return;
  window.__vareliaDirectVariantGuardLoaderV5=true;
  let attempts=0;
  function load(){
    if(window.__vareliaVariantStockGuardV3)return;
    attempts++;
    if(!window.VareliaCharacteristics||typeof window.addToCart!=='function'||!document.getElementById('productForm')){
      if(attempts<160)setTimeout(load,100);
      return;
    }
    if(document.querySelector('script[data-varelia-variant-guard-direct]'))return;
    const s=document.createElement('script');
    s.src='/variant-stock-guard.js?v=20261015-direct-v5';
    s.async=false;
    s.dataset.vareliaVariantGuardDirect='1';
    s.onerror=()=>{s.remove();if(attempts<160)setTimeout(load,300)};
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,0),{once:true});
  else setTimeout(load,0);
})();