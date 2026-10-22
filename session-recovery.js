(()=>{
  if(window.__vareliaSessionRecoveryV1)return;
  window.__vareliaSessionRecoveryV1=true;

  const BACKUP_KEY='varelia_auth_session_backup_v1';
  const PROJECT='onvdcaohnftrjunwdvjp';
  const SUPABASE_URL='https://'+PROJECT+'.supabase.co';
  const SUPABASE_KEY=atob('c2JfcHVibGlzaGFibGVfYnoyejV1Z2xmX0VBTEplenF2NHJDd19TNzNHTU5yaA==');

  const saveBackup=session=>{
    try{
      if(session?.access_token&&session?.refresh_token){
        localStorage.setItem(BACKUP_KEY,JSON.stringify({access_token:session.access_token,refresh_token:session.refresh_token}));
      }
    }catch{}
  };

  const extractPair=value=>{
    try{
      const root=typeof value==='string'?JSON.parse(value):value;
      const seen=new Set();
      const walk=(obj,depth=0)=>{
        if(!obj||typeof obj!=='object'||depth>5||seen.has(obj))return null;
        seen.add(obj);
        if(typeof obj.access_token==='string'&&obj.access_token&&typeof obj.refresh_token==='string'&&obj.refresh_token){
          return {access_token:obj.access_token,refresh_token:obj.refresh_token};
        }
        for(const v of Object.values(obj)){
          const found=walk(v,depth+1);if(found)return found;
        }
        return null;
      };
      return walk(root);
    }catch{return null}
  };

  function ensureGoogleButton(sb){
    if(document.getElementById('vaGoogleBtn'))return;
    const login=document.getElementById('vaLogin');
    if(!login?.parentNode)return;
    let divider=document.getElementById('vaGoogleRecoveryDivider');
    if(!divider){
      divider=document.createElement('div');
      divider.id='vaGoogleRecoveryDivider';
      divider.className='va-divider';
      divider.textContent='o';
      divider.style.cssText='display:flex;align-items:center;gap:10px;margin:14px 0;color:#94a3b8;font-size:12px';
      login.insertAdjacentElement('afterend',divider);
    }
    const google=document.createElement('button');
    google.id='vaGoogleBtn';
    google.type='button';
    google.className='va-google';
    google.innerHTML='<span style="font-size:18px;font-weight:900">G</span><span>Continuar con Google</span>';
    google.style.cssText='width:100%;border:1px solid #dbe2ea;border-radius:14px;padding:13px 14px;background:#fff;color:#111827;font-weight:850;display:flex;align-items:center;justify-content:center;gap:9px';
    divider.insertAdjacentElement('afterend',google);
    google.addEventListener('click',async()=>{
      const msg=document.getElementById('vaMsg');
      if(msg){msg.textContent='Abriendo Google...';msg.className='va-msg'}
      try{
        const isNative=!!window.VareliaAndroid;
        const client=isNative
          ? window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit'}})
          : sb;
        const redirectTo=isNative?'https://vareliastore.tech/auth-callback.html?app=1':'https://vareliastore.tech/auth-callback.html';
        const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
        if(error)throw error;
      }catch(e){
        if(msg){msg.textContent='No se pudo iniciar con Google: '+(e?.message||String(e));msg.className='va-msg error'}
      }
    });
  }

  async function boot(){
    const sb=window.vareliaSupabase;
    if(!sb){setTimeout(boot,120);return}

    sb.auth.onAuthStateChange((event,session)=>{
      if(session)saveBackup(session);
      if(event==='SIGNED_OUT'){
        try{localStorage.removeItem(BACKUP_KEY)}catch{}
      }
    });

    try{
      const current=await sb.auth.getSession();
      if(current?.data?.session){saveBackup(current.data.session);return}
    }catch{}

    const candidates=[];
    const add=pair=>{
      if(!pair?.access_token||!pair?.refresh_token)return;
      const key=pair.refresh_token+'|'+pair.access_token.slice(-24);
      if(candidates.some(x=>x.key===key))return;
      candidates.push({key,pair});
    };

    try{add(extractPair(localStorage.getItem(BACKUP_KEY)))}catch{}
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||'';
        if(key===BACKUP_KEY||key===`sb-${PROJECT}-auth-token`||/supabase|auth-token|session/i.test(key)){
          add(extractPair(localStorage.getItem(key)));
        }
      }
    }catch{}

    for(const item of candidates){
      try{
        const {data,error}=await sb.auth.setSession(item.pair);
        if(!error&&data?.session){
          saveBackup(data.session);
          return;
        }
      }catch{}
    }

    // Si la sesión anterior ya no existe, no crear otra cuenta ni tocar los datos.
    // Solo garantizar que el mismo acceso por Google esté disponible otra vez.
    ensureGoogleButton(sb);
    setTimeout(()=>ensureGoogleButton(sb),500);
    setTimeout(()=>ensureGoogleButton(sb),1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
