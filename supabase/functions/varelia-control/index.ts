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

    if(body.action==='approve'){
      const userId=String(body.userId||''),code=String(body.code||'').trim();
      if(!/^[0-9a-f-]{36}$/i.test(userId)||!/^\d{6}$/.test(code))return respond(400,{error:'Cuenta o código no válido'});
      const {data,error}=await userClient.rpc('varelia_control_approve',{p_user_id:userId,p_code:code});
      if(error)return respond(400,{error:error.message});
      const unban=await service.auth.admin.updateUserById(userId,{ban_duration:'none'});
      return respond(200,{...data,session_notice:unban.error?'La cuenta ya tiene acceso a datos, pero falta liberar su inicio de sesión.':null});
    }

    if(body.action==='reissue'){
      const userId=String(body.userId||'');
      if(!/^[0-9a-f-]{36}$/i.test(userId))return respond(400,{error:'Cuenta no válida'});
      const {data,error}=await userClient.rpc('varelia_control_reissue_code',{p_user_id:userId});
      if(error)return respond(400,{error:error.message});
      // Al emitir un código nuevo la cuenta debe poder autenticarse para llegar
      // a la pantalla de validación. El acceso a datos sigue bloqueado por RLS
      // mientras permanezca en estado pending.
      const unban=await service.auth.admin.updateUserById(userId,{ban_duration:'none'});
      return respond(200,{...data,session_notice:unban.error?'El código se generó, pero no se pudo liberar el inicio de sesión. Intenta generar otro código.':null});
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

      // Si la cuenta fue agregada directamente desde el panel principal, autorizarla
      // en el mismo flujo. Los registros creados por su cuenta propia sí quedan pendientes.
      const {data:request,error:requestError}=await userClient.rpc('varelia_control_reissue_code',{p_user_id:data.user.id});
      if(requestError||!request?.code){
        return respond(200,{ok:true,message:'Invitación enviada. La cuenta quedó pendiente para aprobación desde el panel.'});
      }
      const {error:approveError}=await userClient.rpc('varelia_control_approve',{p_user_id:data.user.id,p_code:request.code});
      if(approveError){
        return respond(200,{ok:true,message:'Invitación enviada. La cuenta quedó pendiente para aprobación desde el panel.'});
      }
      await service.auth.admin.updateUserById(data.user.id,{ban_duration:'none'});
      return respond(200,{ok:true,message:'Invitación enviada y acceso autorizado.'});
    }
    return respond(400,{error:'Acción no válida'});
  } catch {return respond(500,{error:'No se pudo completar la operación. Actualiza el panel antes de reintentar.'});}
});
