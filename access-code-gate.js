(()=>{
  if(window.__vareliaAccessCodeGateV1)return;
  window.__vareliaAccessCodeGateV1=true;

  const style=document.createElement('style');
  style.textContent=`
    body.varelia-access-code-locked>.top,
    body.varelia-access-code-locked>.shell,
    body.varelia-access-code-locked>.fab,
    body.varelia-access-code-locked>#vmobileNav{visibility:hidden!important;pointer-events:none!important}
    #vareliaAccessCodeGate{position:fixed;inset:0;z-index:100500;display:none;align-items:center;justify-content:center;padding:20px;background:linear-gradient(145deg,#f8fafc,#eef2ff)}
    #vareliaAccessCodeGate.show{display:flex}
    #vareliaAccessCodeGate *{box-sizing:border-box}
    .vac-card{width:min(100%,430px);background:#fff;border:1px solid #e5e7eb;border-radius:28px;padding:28px;box-shadow:0 28px 80px rgba(15,23,42,.16);text-align:center}
    .vac-logo{width:58px;height:58px;margin:0 auto 14px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:25px;font-weight:950}
    .vac-card h2{margin:0;font-size:25px;letter-spacing:-.3px}.vac-card p{margin:9px 0;color:#64748b;line-height:1.5;font-size:14px}
    .vac-email{display:block;margin:10px 0 18px;padding:9px 11px;background:#f8fafc;border-radius:12px;color:#334155;font-size:13px;font-weight:800;overflow-wrap:anywhere}
    .vac-form{display:grid;gap:12px}.vac-form label{text-align:left;font-size:13px;font-weight:850;color:#334155}.vac-code{width:100%;margin-top:6px;padding:15px 14px;border:1px solid #cbd5e1;border-radius:15px;text-align:center;font-size:25px;font-weight:950;letter-spacing:8px;color:#111827;outline:none}.vac-code:focus{border-color:#2563eb;box-shadow:0 0 0 4px #2563eb18}.vac-code::placeholder{letter-spacing:3px;color:#cbd5e1}
    .vac-submit,.vac-logout{border:0;border-radius:15px;padding:14px 16px;font-weight:900;cursor:pointer}.vac-submit{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff}.vac-logout{background:#f1f5f9;color:#334155}.vac-submit:disabled{opacity:.6}
    .vac-msg{min-height:20px;font-size:13px;line-height:1.4;color:#475569}.vac-msg.error{color:#b91c1c}.vac-msg.ok{color:#047857}
    .vac-note{margin-top:14px;padding:11px 12px;border-radius:13px;background:#eff6ff;color:#1e40af;font-size:12px;line-height:1.45}
  `;
  document.head.appendChild(style);

  const gate=document.createElement('div');
  gate.id='vareliaAccessCodeGate';
  gate.innerHTML=`<div class="vac-card"><div class="vac-logo">V</div><h2 id="vacTitle">Código de acceso</h2><p id="vacText">Tu cuenta está esperando autorización.</p><span id="vacEmail" class="vac-email"></span><form id="vacForm" class="vac-form"><label>Código de 6 dígitos<input id="vacCode" class="vac-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="••••••" required></label><button id="vacSubmit" class="vac-submit" type="submit">Ingresar a Varelia</button><div id="vacMsg" class="vac-msg" role="status" aria-live="polite"></div></form><div id="vacNote" class="vac-note">El código aparece únicamente en el Panel Principal de Varelia. Pídeselo a la cuenta principal.</div><button id="vacLogout" class="vac-logout" type="button">Usar otra cuenta</button></div>`;
  document.body.appendChild(gate);

  const title=gate.querySelector('#vacTitle');
  const text=gate.querySelector('#vacText');
  const email=gate.querySelector('#vacEmail');
  const form=gate.querySelector('#vacForm');
  const code=gate.querySelector('#vacCode');
  const submit=gate.querySelector('#vacSubmit');
  const message=gate.querySelector('#vacMsg');
  const note=gate.querySelector('#vacNote');
  const logout=gate.querySelector('#vacLogout');
  let checking=false;
  let lastStatus='';

  const setMessage=(value,type='')=>{message.textContent=value||'';message.className='vac-msg '+type};
  const show=(session,context)=>{
    lastStatus=String(context?.status||'').toLowerCase();
    document.body.classList.add('varelia-access-code-locked');
    gate.classList.add('show');
    email.textContent=session?.user?.email||'Cuenta conectada';
    if(lastStatus==='pending'){
      title.textContent='Ingresa tu código';
      text.textContent='Tu solicitud de acceso fue enviada. La cuenta principal debe autorizarte antes de entrar.';
      form.hidden=false;note.hidden=false;note.textContent='El código aparece únicamente en el Panel Principal de Varelia. Pídeselo a la cuenta principal.';setMessage('');
      setTimeout(()=>code.focus(),80);
    }else{
      title.textContent=lastStatus==='removed'?'Acceso retirado':'Cuenta bloqueada';
      text.textContent='Esta cuenta no puede ingresar todavía.';
      form.hidden=true;note.hidden=false;note.textContent=lastStatus==='removed'?'Vuelve a intentarlo para enviar una nueva solicitud de acceso.':'Contacta a la cuenta principal para revisar el acceso.';
    }
  };
  const hide=()=>{
    lastStatus='active';
    document.body.classList.remove('varelia-access-code-locked');
    gate.classList.remove('show');
  };

  async function check(){
    if(checking)return;
    const sb=window.vareliaSupabase;
    if(!sb)return;
    checking=true;
    try{
      const {data:sessionData,error:sessionError}=await sb.auth.getSession();
      if(sessionError||!sessionData?.session){hide();return}
      let {data:context,error}=await sb.rpc('varelia_access_context');
      if(error){console.warn('Varelia access gate',error);return}
      if(context?.allowed===true||context?.principal===true){hide();return}

      // Si el administrador había sido retirado y vuelve a iniciar sesión,
      // crea automáticamente una nueva solicitud para el Panel Principal.
      if(String(context?.status||'').toLowerCase()==='removed'){
        const {data:request,error:requestError}=await sb.rpc('varelia_request_access');
        if(!requestError&&request?.ok&&String(request?.status||'').toLowerCase()==='pending'){
          const refreshed=await sb.rpc('varelia_access_context');
          if(!refreshed.error&&refreshed.data)context=refreshed.data;
          else context={...(context||{}),status:'pending',allowed:false};
        }else if(requestError){
          console.warn('Varelia request access',requestError);
        }
      }

      show(sessionData.session,context||{});
    }catch(error){console.warn('Varelia access gate check',error)}
    finally{checking=false}
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const value=String(code.value||'').replace(/\D/g,'').slice(0,6);
    code.value=value;
    if(!/^\d{6}$/.test(value)){setMessage('Escribe los 6 números del código.','error');return}
    const sb=window.vareliaSupabase;if(!sb)return;
    submit.disabled=true;setMessage('Verificando código…');
    try{
      const {data,error}=await sb.rpc('varelia_redeem_access_code',{p_code:value});
      if(error)throw error;
      if(!data?.ok){setMessage(data?.error||'Código no válido.','error');return}
      setMessage('Código correcto. Abriendo Varelia…','ok');
      hide();
      setTimeout(()=>location.reload(),180);
    }catch(error){setMessage(error?.message||'No se pudo verificar el código.','error')}
    finally{submit.disabled=false}
  });

  code.addEventListener('input',()=>{code.value=code.value.replace(/\D/g,'').slice(0,6)});
  logout.addEventListener('click',async()=>{
    try{await window.vareliaSupabase?.auth?.signOut()}catch{}
    location.replace('/');
  });

  const attach=()=>{
    const sb=window.vareliaSupabase;
    if(!sb)return false;
    sb.auth.onAuthStateChange((event)=>{
      if(event==='SIGNED_OUT'){hide();return}
      setTimeout(check,80);
    });
    [150,500,1100,2200,4000].forEach(ms=>setTimeout(check,ms));
    window.addEventListener('focus',check);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
    return true;
  };

  let tries=0;
  const timer=setInterval(()=>{tries++;if(attach()||tries>80)clearInterval(timer)},100);
  attach();
})();