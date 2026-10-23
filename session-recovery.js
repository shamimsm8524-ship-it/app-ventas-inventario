(()=>{
  if(window.__vareliaSessionRecoveryV2)return;
  window.__vareliaSessionRecoveryV2=true;

  const PROJECT='onvdcaohnftrjunwdvjp';
  const SUPABASE_URL='https://'+PROJECT+'.supabase.co';
  const SUPABASE_KEY=atob('c2JfcHVibGlzaGFibGVfYnoyejV1Z2xmX0VBTEplenF2NHJDd19TNzNHTU5yaA==');

  function ensureGoogleButton(){
    if(document.getElementById('vaGoogleBtn'))return true;
    const sb=window.vareliaSupabase;
    const login=document.getElementById('vaLogin');
    if(!sb||!login?.parentNode)return false;

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
    return true;
  }

  // Este helper NO vuelve a llamar getSession/getUser/setSession.
  // supabase-auth.js es el único dueño del arranque de sesión para evitar bloqueos
  // por lecturas concurrentes dentro del WebView Android.
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(ensureGoogleButton()||tries>60)clearInterval(timer);
  },150);
  ensureGoogleButton();
})();
