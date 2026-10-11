(()=>{
  if(window.__vareliaBusinessNameEditor)return;
  window.__vareliaBusinessNameEditor=true;

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const title=document.querySelector('.brand h1');
    if(!title)return;
    const logo=document.querySelector('.logo');
    if(logo){logo.textContent='VS';logo.title='Varelia Store';logo.setAttribute('aria-label','Varelia Store')}
    const titleWrap=title.parentElement;
    let visibleEdit=document.getElementById('vareliaHeaderEditName');
    if(!visibleEdit&&titleWrap){
      visibleEdit=document.createElement('button');
      visibleEdit.type='button';visibleEdit.id='vareliaHeaderEditName';
      visibleEdit.textContent='✏️';visibleEdit.title='Editar nombre del negocio';
      visibleEdit.setAttribute('aria-label','Editar nombre del negocio');
      visibleEdit.style.cssText='margin-left:6px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#1d4ed8;padding:5px 8px;font-size:14px;vertical-align:middle;cursor:pointer';
      title.insertAdjacentElement('afterend',visibleEdit);
      visibleEdit.addEventListener('click',()=>{
        const input=document.getElementById('businessBrandInput');
        const save=document.getElementById('businessBrandSave');
        if(input&&save){
          const section=document.getElementById('appearance');
          document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
          if(section)section.classList.add('active');
          input.value=currentName==='Mi Negocio'?'':currentName;
          input.focus();
          section?.scrollIntoView({behavior:'smooth',block:'start'});
          return;
        }
        const value=prompt('Nombre de tu negocio',currentName);
        if(value===null)return;
        const next=value.trim().replace(/\\s+/g,' ');
        if(next.length<2||next.length>60){alert('Escribe un nombre de 2 a 60 caracteres.');return}
        const input2=document.getElementById('businessBrandInput');
        const save2=document.getElementById('businessBrandSave');
        if(input2&&save2){input2.value=next;save2.click()}
        else alert('No se encontró el formulario para guardar el nombre.');
      });
    }
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
      @media(max-width:560px){
        .brand{align-items:center!important;gap:8px!important}
        .brand .left{flex:1 1 auto!important;min-width:0!important;gap:8px!important}
        .brand .left>div:last-child{flex:1 1 auto!important;min-width:0!important}
        .brand .logo{flex:0 0 44px!important;font-size:22px!important}
        #vareliaAppName{display:inline-block!important;max-width:100%!important;width:auto!important;font-size:clamp(15px,4.4vw,21px)!important;line-height:1.15!important;vertical-align:middle!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
        #vareliaHeaderEditName{display:inline-block!important;margin-left:4px!important;padding:4px 6px!important;font-size:12px!important;vertical-align:middle!important}
        .brand .meta{font-size:10px!important;line-height:1.35!important;margin-top:5px!important}
        #newSaleTop{flex:0 0 auto!important;padding:12px 10px!important;font-size:12px!important;white-space:nowrap!important;border-radius:14px!important}
      }
    `;
    document.head.appendChild(style);

    let businessId='',role='',currentName='Mi Negocio';
    const applyName=name=>{
      currentName=(name||'').trim()||'Mi Negocio';
      hiddenName.textContent=currentName;
      title.textContent=currentName;
      document.title=currentName+' · Varelia Store';
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