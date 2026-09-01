(()=>{
// Mantener un solo origen para que PKCE conserve el code_verifier.
// Si alguien entra con www, enviarlo al dominio principal antes de iniciar OAuth.
if(location.hostname.toLowerCase()==='www.vareliastore.tech'){
  const canonical='https://vareliastore.tech'+location.pathname+location.search+location.hash;
  location.replace(canonical);
  return;
}
const SUPABASE_URL='https://onvdcaohnftrjunwdvjp.supabase.co';
const SUPABASE_KEY=atob('c2JfcHVibGlzaGFibGVfYnoyejV1Z2xmX0VBTEplenF2NHJDd19TNzNHTU5yaA==');
if(!window.supabase){console.error('Supabase no cargó');return;}
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
window.vareliaSupabase=sb;

const BASE_KEYS={products:'miNegocio_products_v1',categories:'miNegocio_categories_v1',sales:'miNegocio_sales_v1',closures:'miNegocio_closures_v1',cashStart:'miNegocio_cashStart_v1',theme:'miNegocio_theme_v1',movements:'miNegocio_movements_v1',suppliers:'miNegocio_suppliers_v1',purchases:'miNegocio_purchases_v1'};
const scopedKey=(base,scope)=>base+'__'+String(scope).replace(/[^a-zA-Z0-9_-]/g,'_');
const readJson=(key,fallback)=>{try{const v=localStorage.getItem(key);return v==null?fallback:(JSON.parse(v)??fallback)}catch{return fallback}};

async function activateBusinessScope(user,profile){
  const scope=String(profile?.business_id||user.id);
  const safeScope=scope.replace(/[^a-zA-Z0-9_-]/g,'_');

  // La información que existía antes de separar cuentas se conserva una sola vez
  // para la primera cuenta que abra Varelia después de esta actualización.
  if(!localStorage.getItem('varelia_legacy_migrated')){
    for(const base of Object.values(BASE_KEYS)){
      const target=scopedKey(base,safeScope);
      if(localStorage.getItem(target)==null&&localStorage.getItem(base)!=null){
        localStorage.setItem(target,localStorage.getItem(base));
      }
    }
    localStorage.setItem('varelia_legacy_migrated',safeScope);
  }

  localStorage.setItem('varelia_active_business_id',safeScope);

  // K es el mapa de almacenamiento usado por toda la app. Sus propiedades son mutables,
  // por lo que desde aquí cada sesión queda apuntando exclusivamente a su negocio.
  try{
    if(typeof K!=='undefined'){
      for(const [name,base] of Object.entries(BASE_KEYS))K[name]=scopedKey(base,safeScope);
    }

    if(typeof products!=='undefined')products=readJson(K.products,[]);
    if(typeof categories!=='undefined')categories=readJson(K.categories,[]);
    if(typeof sales!=='undefined')sales=readJson(K.sales,[]);
    if(typeof closures!=='undefined')closures=readJson(K.closures,[]);
    if(typeof cashStart!=='undefined')cashStart=readJson(K.cashStart,new Date().toISOString());
    if(typeof theme!=='undefined')theme=readJson(K.theme,{color:'#be185d',dark:false,updatedAt:0});
    if(typeof movements!=='undefined')movements=readJson(K.movements,[]);
    if(typeof suppliers!=='undefined')suppliers=readJson(K.suppliers,[]);
    if(typeof purchases!=='undefined')purchases=readJson(K.purchases,[]);
    if(typeof activeCategory!=='undefined')activeCategory='Todos';
    if(typeof cart!=='undefined')cart=[];
    if(typeof purchaseCart!=='undefined')purchaseCart=[];
    if(typeof inventoryProductId!=='undefined')inventoryProductId=null;
    if(typeof products!=='undefined')window.products=products;
    if(typeof applyTheme==='function')applyTheme();
    if(typeof render==='function')render();
  }catch(e){console.error('No se pudo activar el inventario privado',e)}

  // El respaldo Firebase antiguo era una colección compartida para todos los usuarios.
  // Se desactiva para impedir que una cuenta vuelva a recibir productos de otra.
  try{if(typeof syncProductToCloud==='function')syncProductToCloud=()=>{}}catch{}
  try{if(typeof syncMetaToCloud==='function')syncMetaToCloud=()=>{}}catch{}
  try{
    if(typeof db!=='undefined'&&db&&typeof db.terminate==='function')await db.terminate();
  }catch(e){console.warn('Firebase compartido desactivado',e)}

  window.vareliaBusinessScope=safeScope;
  window.dispatchEvent(new CustomEvent('varelia:business-scope-ready',{detail:{businessId:safeScope,userId:user.id}}));
}

const style=document.createElement('style');style.textContent=`body.varelia-auth-locked>.top,body.varelia-auth-locked>.shell,body.varelia-auth-locked>.fab{display:none!important}#vareliaAuth{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;background:linear-gradient(145deg,#f8fafc,#eef2ff)}#vareliaAuth.show{display:flex}#vareliaAuth *{box-sizing:border-box}.va-card{width:min(100%,430px);background:#fff;border:1px solid #e5e7eb;border-radius:28px;padding:26px;box-shadow:0 24px 60px rgba(15,23,42,.14)}.va-brand{display:flex;align-items:center;gap:12px;margin-bottom:18px}.va-logo{width:52px;height:52px;border-radius:17px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;display:grid;place-items:center;font-weight:950;font-size:22px}.va-title{margin:0;font-size:26px}.va-sub{margin:3px 0 0;color:#64748b;font-size:13px}.va-tabs{display:grid;grid-template-columns:1fr 1fr;background:#f1f5f9;border-radius:14px;padding:4px;margin:16px 0}.va-tab{border:0;border-radius:11px;padding:10px;background:transparent;font-weight:850}.va-tab.active{background:#fff;color:#4f46e5;box-shadow:0 3px 10px #0f172a12}.va-form{display:grid;gap:11px}.va-form label{display:grid;gap:6px;font-size:13px;font-weight:800}.va-form input{border:1px solid #dbe2ea;border-radius:14px;padding:12px 13px;background:#fff;color:#111827;outline:none}.va-form input:focus{border-color:#6366f1;box-shadow:0 0 0 3px #6366f11c}.va-btn{border:0;border-radius:14px;padding:13px 15px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:900;margin-top:4px}.va-msg{min-height:20px;margin:10px 0 0;font-size:13px;color:#475569}.va-msg.error{color:#b91c1c}.va-msg.ok{color:#047857}.va-hide{display:none!important}#vareliaUserBar{position:static;z-index:90;display:none;flex-direction:column;gap:8px;align-items:stretch;width:100%;margin:0 0 16px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:10px 11px;box-shadow:0 8px 22px #0f172a18;font-size:12px;color:#111827}#vareliaUserEmail{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;width:100%;font-weight:800}.vub-btn{border:0;border-radius:12px;padding:9px 11px;background:#f1f5f9;font-weight:900;width:100%;flex:0 0 auto}`;document.head.appendChild(style);
const auth=document.createElement('div');auth.id='vareliaAuth';auth.innerHTML=`<div class="va-card"><div class="va-brand"><div class="va-logo">V</div><div><h1 class="va-title">Varelia</h1><p class="va-sub">Ventas · Inventario · Caja</p></div></div><div class="va-tabs"><button class="va-tab active" data-va-tab="login">Iniciar sesión</button><button class="va-tab" data-va-tab="register">Crear cuenta</button></div><form class="va-form" id="vaLogin"><label>Correo<input id="vaLoginEmail" type="email" autocomplete="email" required></label><label>Contraseña<input id="vaLoginPass" type="password" autocomplete="current-password" minlength="6" required></label><button class="va-btn">Entrar a Varelia</button></form><form class="va-form va-hide" id="vaRegister"><label>Tu nombre<input id="vaName" autocomplete="name" required></label><label>Nombre del negocio<input id="vaBusiness" required></label><label>Correo<input id="vaEmail" type="email" autocomplete="email" required></label><label>Contraseña<input id="vaPass" type="password" autocomplete="new-password" minlength="6" required></label><button class="va-btn">Crear mi cuenta</button></form><div id="vaMsg" class="va-msg"></div></div>`;document.body.appendChild(auth);
const userBar=document.createElement('div');userBar.id='vareliaUserBar';userBar.innerHTML='<span id="vareliaUserEmail"></span><button class="vub-btn" id="vareliaLogout">Cerrar sesión</button>';
const side=document.querySelector('.side');if(side)side.insertBefore(userBar,side.firstChild);else document.body.appendChild(userBar);
const $=s=>document.querySelector(s),msg=(t,type='')=>{const m=$('#vaMsg');if(!m)return;m.textContent=t;m.className='va-msg '+type};
function showAuth(){document.body.classList.add('varelia-auth-locked');auth.classList.add('show');userBar.style.display='none'}
function showApp(user){document.body.classList.remove('varelia-auth-locked');auth.classList.remove('show');$('#vareliaUserEmail').textContent=user?.email||'';userBar.style.display='flex'}
async function ensureAccount(user){let {data:profile,error}=await sb.from('profiles').select('id,business_id,role').eq('id',user.id).maybeSingle();if(error)throw error;if(profile)return profile;let pending={};try{pending=JSON.parse(localStorage.getItem('varelia_pending_account')||'{}')}catch{}const meta=user.user_metadata||{};const fullName=pending.fullName||meta.full_name||meta.name||user.email?.split('@')[0]||'Usuario';const businessName=pending.businessName||meta.business_name||('Negocio de '+fullName);const {data:biz,error:be}=await sb.from('businesses').insert({name:businessName,owner_id:user.id}).select('id').single();if(be)throw be;const {data:pr,error:pe}=await sb.from('profiles').insert({id:user.id,full_name:fullName,business_id:biz.id,role:'owner'}).select('id,business_id,role').single();if(pe)throw pe;localStorage.removeItem('varelia_pending_account');return pr}
async function enterWithSession(session){if(!session?.user){showAuth();return}try{const profile=await ensureAccount(session.user);await activateBusinessScope(session.user,profile);showApp(session.user)}catch(e){showAuth();msg('No se pudo cargar tu cuenta: '+(e.message||e),'error')}}
auth.addEventListener('click',e=>{const b=e.target.closest('[data-va-tab]');if(!b)return;document.querySelectorAll('.va-tab').forEach(x=>x.classList.toggle('active',x===b));$('#vaLogin').classList.toggle('va-hide',b.dataset.vaTab!=='login');$('#vaRegister').classList.toggle('va-hide',b.dataset.vaTab!=='register');msg('')});
$('#vaLogin').addEventListener('submit',async e=>{e.preventDefault();msg('Ingresando...');const {data,error}=await sb.auth.signInWithPassword({email:$('#vaLoginEmail').value.trim(),password:$('#vaLoginPass').value});if(error){msg(error.message,'error');return}await enterWithSession(data.session)});
$('#vaRegister').addEventListener('submit',async e=>{e.preventDefault();const fullName=$('#vaName').value.trim(),businessName=$('#vaBusiness').value.trim(),email=$('#vaEmail').value.trim(),password=$('#vaPass').value;localStorage.setItem('varelia_pending_account',JSON.stringify({fullName,businessName}));msg('Creando cuenta...');const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:fullName,business_name:businessName}}});if(error){msg(error.message,'error');return}if(data.session){await enterWithSession(data.session)}else{msg('Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.','ok')}});
$('#vareliaLogout').addEventListener('click',async()=>{await sb.auth.signOut();localStorage.removeItem('varelia_active_business_id');showAuth();msg('Sesión cerrada.','ok')});
sb.auth.onAuthStateChange((_event,session)=>{if(session)enterWithSession(session)});
(async()=>{
  showAuth();
  const params=new URLSearchParams(location.search);
  const code=params.get('code');
  if(code){
    msg('Completando inicio con Google...');
    const {data,error}=await sb.auth.exchangeCodeForSession(code);
    if(error){msg('No se pudo completar Google: '+error.message,'error');return}
    history.replaceState({},document.title,location.origin+location.pathname);
    await enterWithSession(data.session);
    return;
  }
  const {data,error}=await sb.auth.getSession();
  if(error){msg(error.message,'error');return}
  await enterWithSession(data.session);
})();
})();