import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const allowedOrigins = new Set(['https://vareliastore.tech','https://www.vareliastore.tech']);
Deno.serve(async req => {
  const origin=req.headers.get('origin');
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin&&allowedOrigins.has(origin)?origin:'https://vareliastore.tech','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
  const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowedOrigins.has(origin))return respond(403,{error:'Origen no permitido'});
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return respond(405,{error:'Método no permitido'});
  const authorization=req.headers.get('authorization');
  if(!authorization)return respond(401,{error:'Inicia sesión'});
  try {
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:user,error:authError}=await userClient.auth.getUser();
    if(authError||!user.user)return respond(401,{error:'Sesión no válida'});
    const {data:context,error:contextError}=await userClient.rpc('varelia_access_context');
    if(contextError||!context?.principal)return respond(403,{error:'Solo la cuenta principal puede gestionar accesos'});
    const body=await req.json();
    const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    if(body.action==='access'){
      if(!/^[0-9a-f-]{36}$/i.test(String(body.userId||''))||!['active','blocked','removed'].includes(body.status))return respond(400,{error:'Cuenta o estado no válido'});
      const {data,error}=await userClient.rpc('varelia_control_set_access',{p_user_id:body.userId,p_status:body.status});
      if(error)return respond(400,{error:error.message});
      // Database policies revoke data access immediately, including existing JWTs.
      const result=await service.auth.admin.updateUserById(body.userId,{ban_duration:body.status==='active'?'none':'876000h'});
      return respond(200,{...data,session_notice:result.error?'El acceso a datos ya cambió; la revocación de inicio de sesión está pendiente.':null});
    }
    if(body.action==='invite'){
      const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim();
      const role=body.role==='cashier'?'cashier':body.role==='owner'?'owner':'';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||name.length<2||name.length>100||!role)return respond(400,{error:'Revisa nombre, correo y tipo de cuenta'});
      if(role==='cashier'){
        const {data:business,error}=await service.from('businesses').select('id,owner_id').eq('id',body.businessId).maybeSingle();
        if(error||!business)return respond(400,{error:'Selecciona un negocio existente'});
      }
      const {data,error}=await service.auth.admin.inviteUserByEmail(email,{data:{full_name:name,business_name:role==='owner'?String(body.businessName||name).slice(0,100):name},redirectTo:'https://vareliastore.tech/'});
      if(error||!data.user)return respond(400,{error:error?.message||'No se pudo enviar la invitación'});
      if(role==='cashier'){
        const {error:profileError}=await service.from('profiles').update({full_name:name,role:'cashier',business_id:body.businessId,permissions:{sales:true,products:true,inventory:true,cash:true,reports:false,profit:false}}).eq('id',data.user.id);
        if(profileError){
          await userClient.rpc('varelia_control_set_access',{p_user_id:data.user.id,p_status:'blocked'});
          await service.auth.admin.updateUserById(data.user.id,{ban_duration:'876000h'});
          return respond(409,{error:'La invitación se creó, pero la cuenta quedó bloqueada porque no se pudo vincular al negocio. Revisa la cuenta antes de activarla.'});
        }
      }
      return respond(200,{ok:true,message:'Invitación enviada al correo indicado'});
    }
    return respond(400,{error:'Acción no válida'});
  } catch {return respond(500,{error:'No se pudo completar la operación. Actualiza el panel antes de reintentar.'});}
});
