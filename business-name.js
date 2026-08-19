(()=>{
  if(window.__vareliaBusinessNameEditor)return;
  window.__vareliaBusinessNameEditor=true;

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const title=document.querySelector('.brand h1');
    if(!title)return;
    title.id='vareliaBusinessName';

    const row=document.createElement('div');
    row.className='vareliaBusinessNameRow';
    title.parentNode.insertBefore(row,title);
    row.appendChild(title);

    const edit=document.createElement('button');
    edit.type='button';
    edit.id='vareliaEditBusinessName';
    edit.className='vareliaBusinessNameEdit';
    edit.textContent='✏️';
    edit.title='Editar nombre del negocio';
    edit.setAttribute('aria-label','Editar nombre del negocio');
    edit.hidden=true;
    row.appendChild(edit);

    const style=document.createElement('style');
    style.textContent=`
      .vareliaBusinessNameRow{display:flex;align-items:center;gap:6px;min-width:0}
      #vareliaBusinessName{max-width:min(52vw,420px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .vareliaBusinessNameEdit{width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font-size:13px;padding:0;cursor:pointer;flex:0 0 auto}
      .vareliaBusinessNameEdit:active{transform:scale(.96)}
      @media(max-width:560px){#vareliaBusinessName{max-width:42vw}.vareliaBusinessNameEdit{width:28px;height:28px}}
    `;
    document.head.appendChild(style);

    let businessId='',role='',currentName='Mi Negocio';
    const applyName=name=>{
      currentName=(name||'').trim()||'Mi Negocio';
      title.textContent=currentName;
      document.title=currentName+' · Varelia';
    };
    const toast=text=>window.vareliaToast?window.vareliaToast(text):alert(text);

    async function loadBusiness(){
      for(let i=0;i<50&&!window.vareliaSupabase;i++)await new Promise(r=>setTimeout(r,120));
      const sb=window.vareliaSupabase;
      if(!sb){applyName('Mi Negocio');edit.hidden=true;return}
      try{
        const {data:sessionData}=await sb.auth.getSession();
        const user=sessionData?.session?.user;
        if(!user){applyName('Mi Negocio');edit.hidden=true;return}
        const {data:profile,error:profileError}=await sb.from('profiles').select('business_id,role').eq('id',user.id).maybeSingle();
        if(profileError)throw profileError;
        businessId=profile?.business_id||'';
        role=profile?.role||'';
        if(!businessId){applyName('Mi Negocio');edit.hidden=true;return}
        const {data:business,error:businessError}=await sb.from('businesses').select('id,name').eq('id',businessId).maybeSingle();
        if(businessError)throw businessError;
        applyName(business?.name||'Mi Negocio');
        edit.hidden=role!=='owner';
      }catch(err){
        console.warn('No se pudo cargar el nombre del negocio',err);
        applyName('Mi Negocio');
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
        const sb=window.vareliaSupabase;
        const {data,error}=await sb.from('businesses').update({name:next}).eq('id',businessId).select('name').single();
        if(error)throw error;
        applyName(data?.name||next);
        toast('Nombre del negocio actualizado.');
      }catch(err){
        console.error(err);
        alert('No se pudo guardar el nombre del negocio. Inténtalo otra vez.');
      }finally{edit.disabled=false}
    });

    loadBusiness();
    const waitAuth=setInterval(()=>{
      if(!window.vareliaSupabase)return;
      clearInterval(waitAuth);
      window.vareliaSupabase.auth.onAuthStateChange(()=>setTimeout(loadBusiness,80));
    },150);
    setTimeout(()=>clearInterval(waitAuth),12000);
  });
})();