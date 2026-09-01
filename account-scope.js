(()=>{
  const wait=setInterval(async()=>{
    const sb=window.vareliaSupabase;
    if(!sb)return;
    clearInterval(wait);
    async function syncScope(session){
      if(!session?.user){
        if(localStorage.getItem('varelia_active_business_id')){
          localStorage.removeItem('varelia_active_business_id');
          location.reload();
        }
        return;
      }
      try{
        const {data:profile}=await sb.from('profiles').select('business_id').eq('id',session.user.id).maybeSingle();
        const scope=String(profile?.business_id||session.user.id);
        const current=localStorage.getItem('varelia_active_business_id')||'';
        if(current!==scope){
          localStorage.setItem('varelia_active_business_id',scope);
          location.reload();
        }
      }catch(e){console.warn('No se pudo resolver el negocio activo',e)}
    }
    const {data}=await sb.auth.getSession();
    await syncScope(data?.session);
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){
        localStorage.removeItem('varelia_active_business_id');
        location.reload();
        return;
      }
      setTimeout(()=>syncScope(session),80);
    });
  },100);
})();