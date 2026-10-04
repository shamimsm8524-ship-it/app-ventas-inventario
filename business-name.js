(()=>{
  if(window.__vareliaBusinessNameEditor)return;
  window.__vareliaBusinessNameEditor=true;

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const title=document.querySelector('.brand h1');
    if(!title)return;
    const logo=document.querySelector('.logo');
    if(logo){logo.textContent='VS';logo.title='Varelia Store';logo.setAttribute('aria-label','Varelia Store')}
    title.textContent='Varelia';
    title.id='vareliaAppName';
    document.title='Varelia Store';

    let hiddenName=document.getElementById('vareliaBusinessName');
    if(!hiddenName){
      hiddenName=document.createElement('span');
      hiddenName.id='vareliaBusinessName';
      hiddenName.hidden=true;
      document.body.appendChild(hiddenName);
    }

    const edit=document.createElement('button');
    edit.type='button';
    edit.id='vareliaEditBusinessName';
    edit.hidden=true;

    const style=document.createElement('style');
    style.textContent=`
      .brand .logo{font-size:23px!important;font-weight:950!important;letter-spacing:-.06em;line-height:1}
      #vareliaAppName{max-width:min(52vw,420px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      @media(max-width:560px){.brand .logo{font-size:22px!important}#vareliaAppName{max-width:42vw}}
    `;
    document.head.appendChild(style);

    let businessId='',role='',currentName='Mi Negocio';
    const applyName=name=>{
      currentName=(name||'').trim()||'Mi Negocio';
      hiddenName.textContent=currentName;
      title.textContent='Varelia';
      document.title='Varelia Store';
    };
    const toast=text=>window.vareliaToast?window.vareliaToast(text):alert(text);

    async function loadBusiness(){
      for(let i=0;i<50&&!window.vareliaSupabase&&!window.supabaseClient;i++)await new Promise(r=>setTimeout(r,120));
      const sb=window.vareliaSupabase||window.supabaseClient;
      if(!sb){console.warn('Cliente Supabase no disponible para business-name');return}
      try{
        const {data:sessionData}=await sb.auth.getSession();
        const user=sessionData?.session?.user;
        if(!user){edit.hidden=true;return}
        const {data:profile,error:profileError}=await sb.from('profiles').select('business_id,role').eq('id',user.id).maybeSingle();
        if(profileError)throw profileError;
        businessId=profile?.business_id||'';
        role=profile?.role||'';
        if(!businessId){edit.hidden=true;return}
        const {data:business,error:businessError}=await sb.from('businesses').select('id,name').eq('id',businessId).maybeSingle();
        if(businessError)throw businessError;
        applyName(business?.name||'Mi Negocio');
        edit.hidden=role!=='owner';
      }catch(err){
        console.warn('No se pudo cargar el nombre del negocio',err);
        edit.hidden=true;
      }
    }

    edit.addEventListener('click',async()=>{
      if(!businessId||role!=='owner')return;
      const value=prompt('Nombre de tu negocio',currentName);
      if(value===null)return;
      const next=value.trim().replace(/\s+/g,' ');
      if(next.length<2)return alert('Escribe un nombre de negocio válido.');
      if(next.length>60)return alert('El nombre puede tener hasta 60 caracteres.');
      edit.disabled=true;
      try{
        const sb=window.vareliaSupabase||window.supabaseClient;
        const {data,error}=await sb.from('businesses').update({name:next}).eq('id',businessId).select('name').single();
        if(error)throw error;
        const savedName=data?.name||next;
        applyName(savedName);
        try{
          const {error:catalogError}=await sb.from('public_catalogs').update({business_name:savedName}).eq('business_id',businessId);
          if(catalogError)console.warn('No se pudo sincronizar el nombre del catálogo',catalogError);
        }catch(syncErr){console.warn('No se pudo sincronizar el nombre público',syncErr)}
        try{
          const local=JSON.parse(localStorage.getItem(window.vareliaScopedLocalKey('varelia_video_settings_v1'))||'{}');
          local.businessName=savedName;
          localStorage.setItem(window.vareliaScopedLocalKey('varelia_video_settings_v1'),JSON.stringify(local));
          window.vareliaVideoSettings={...(window.vareliaVideoSettings||{}),businessName:savedName};
        }catch{}
        window.dispatchEvent(new CustomEvent('varelia:business-name-changed',{detail:{businessId,name:savedName}}));
        toast('Nombre del negocio actualizado en todo Varelia.');
      }catch(err){
        console.error(err);
        alert('No se pudo guardar el nombre del negocio. Inténtalo otra vez.');
      }finally{edit.disabled=false}
    });

    loadBusiness();
    const waitAuth=setInterval(()=>{
      const sb=window.vareliaSupabase||window.supabaseClient;
      if(!sb)return;
      clearInterval(waitAuth);
      sb.auth.onAuthStateChange(()=>setTimeout(loadBusiness,80));
    },150);
    setTimeout(()=>clearInterval(waitAuth),12000);
  });
})();