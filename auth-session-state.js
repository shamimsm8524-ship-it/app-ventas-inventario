// One public session reader shared by the UI and Supabase's authenticated fetches.
(function(root){
  function attachSessionState(client,options={}){
    const auth=client.auth;
    if(auth.getSession.__vareliaSharedSession)return;
    const storage=options.storage||root.localStorage;
    const key=options.key||'sb-onvdcaohnftrjunwdvjp-auth-token';
    const now=options.now||Date.now;
    const timeoutMs=options.timeoutMs||9000;
    let cached=null,pending=null,generation=0,signedOut=false;
    const original=auth.getSession.bind(auth);
    function usable(session){
      if(!session?.access_token||!session.refresh_token||!session.user?.id)return false;
      try{
        const jwt=JSON.parse(root.atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
        const expiry=Math.min(Number(jwt.exp),Number(session.expires_at||jwt.exp));
        return jwt.sub===session.user.id&&Number.isFinite(expiry)&&expiry*1000>now()+5000;
      }catch{return false}
    }
    function current(){
      if(signedOut)return null;
      try{
        const raw=JSON.parse(storage.getItem(key)||'null');
        const stored=raw?.currentSession||raw?.session||raw;
        if(usable(stored)&&(!cached||(stored.user.id===cached.user.id&&Number(stored.expires_at||0)>=Number(cached.expires_at||0))))cached=stored;
      }catch{}
      return usable(cached)?cached:null;
    }
    const getSession=function(){
      const session=current();
      if(session)return Promise.resolve({data:{session},error:null});
      if(signedOut)return Promise.resolve({data:{session:null},error:null});
      if(pending)return pending;
      const version=generation;
      let timer;
      const timeout=new Promise(resolve=>{timer=setTimeout(()=>{
        const error=new Error('No se pudo completar la lectura o renovación de la sesión. Reintentando conexión.');
        error.code='VARELIA_SESSION_TIMEOUT';resolve({data:{session:null},error});
      },timeoutMs)});
      const request=Promise.race([Promise.resolve().then(original),timeout]).then(result=>{
        if(version!==generation)return {data:{session:current()},error:null};
        if(usable(result?.data?.session))cached=result.data.session;
        return result;
      }).finally(()=>{clearTimeout(timer);if(pending===request)pending=null});
      pending=request;return request;
    };
    getSession.__vareliaSharedSession=true;
    auth.getSession=getSession;
    auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){generation++;signedOut=true;cached=null;pending=null;return}
      if(session){generation++;signedOut=false;cached=usable(session)?session:null}
    });
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={attachSessionState};
  if(root)root.VareliaSessionState={attach:attachSessionState};
})(typeof window!=='undefined'?window:globalThis);
