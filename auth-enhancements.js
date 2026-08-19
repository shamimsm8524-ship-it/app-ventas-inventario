(()=>{
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
  ready(()=>{
    const wait=setInterval(()=>{
      const auth=document.getElementById('vareliaAuth');
      const sb=window.vareliaSupabase;
      if(!auth||!sb)return;
      clearInterval(wait);

      if(!document.getElementById('vareliaAuthEnhanceStyle')){
        const style=document.createElement('style');
        style.id='vareliaAuthEnhanceStyle';
        style.textContent=`.va-passwrap{position:relative}.va-passwrap input{padding-right:48px!important}.va-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;border-radius:10px;background:transparent;font-size:20px;display:grid;place-items:center;cursor:pointer}.va-eye:active{background:#f1f5f9}.va-divider{display:flex;align-items:center;gap:10px;margin:14px 0;color:#94a3b8;font-size:12px}.va-divider:before,.va-divider:after{content:'';height:1px;background:#e5e7eb;flex:1}.va-google,.va-resend{width:100%;border:1px solid #dbe2ea;border-radius:14px;padding:12px 14px;background:#fff;color:#111827;font-weight:850;display:flex;align-items:center;justify-content:center;gap:9px}.va-google:active,.va-resend:active{background:#f8fafc}.va-google-logo{font-size:18px;font-weight:900}.va-resend{margin-top:10px;color:#4f46e5}.va-verified{display:none;margin-top:10px;padding:12px 14px;border:1px solid #a7f3d0;border-radius:14px;background:#ecfdf5;color:#047857;font-size:13px;font-weight:850;line-height:1.4}.va-verified.show{display:block}.va-password-gate{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.72);backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:20px}.va-password-gate.show{display:flex}.va-password-card{width:min(100%,430px);background:#fff;border-radius:24px;padding:24px;box-shadow:0 30px 80px rgba(15,23,42,.35);color:#111827}.va-password-card h2{margin:0 0 7px;font-size:23px}.va-password-card p{margin:0 0 18px;color:#64748b;font-size:14px;line-height:1.45}.va-password-form{display:grid;gap:12px}.va-password-form label{font-size:13px;font-weight:800;display:grid;gap:6px}.va-password-form input{width:100%;border:1px solid #dbe2ea;border-radius:14px;padding:12px 13px;background:#fff;color:#111827}.va-password-save{border:0;border-radius:14px;padding:13px 15px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:900}.va-password-msg{min-height:20px;font-size:13px;color:#b91c1c}`;
        document.head.appendChild(style);
      }

      function addEye(input){
        if(!input||input.parentElement?.classList.contains('va-passwrap'))return;
        const wrap=document.createElement('div');wrap.className='va-passwrap';
        input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
        const eye=document.createElement('button');eye.type='button';eye.className='va-eye';eye.setAttribute('aria-label','Mostrar contraseña');eye.textContent='👁️';
        eye.onclick=()=>{const show=input.type==='password';input.type=show?'text':'password';eye.textContent=show?'🙈':'👁️';eye.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña')};
        wrap.appendChild(eye);
      }
      addEye(document.getElementById('vaLoginPass'));
      addEye(document.getElementById('vaPass'));

      if(!document.getElementById('vaGoogleBtn')){
        const login=document.getElementById('vaLogin');
        const divider=document.createElement('div');divider.className='va-divider';divider.textContent='o';
        const google=document.createElement('button');google.id='vaGoogleBtn';google.type='button';google.className='va-google';google.innerHTML='<span class="va-google-logo">G</span><span>Continuar con Google</span>';
        login.insertAdjacentElement('afterend',divider);divider.insertAdjacentElement('afterend',google);
        google.onclick=async()=>{
          const msg=document.getElementById('vaMsg');
          if(msg){msg.textContent='Abriendo Google...';msg.className='va-msg'}
          try{
            const redirectTo='https://vareliastore.tech/auth-callback.html';
            const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
            if(error)throw error;
          }catch(e){if(msg){msg.textContent='No se pudo iniciar con Google: '+(e.message||e);msg.className='va-msg error'}}
        };
      }

      let verified=document.getElementById('vaVerifiedStatus');
      if(!verified){
        verified=document.createElement('div');verified.id='vaVerifiedStatus';verified.className='va-verified';verified.innerHTML='✅ Tu correo ya está verificado.<br>Ya puedes iniciar sesión.';
      }

      let resend=document.getElementById('vaResendBtn');
      if(!resend){
        const register=document.getElementById('vaRegister');
        resend=document.createElement('button');
        resend.id='vaResendBtn';
        resend.type='button';
        resend.className='va-resend';
        resend.textContent='Reenviar correo de confirmación';
        register.insertAdjacentElement('afterend',resend);
        resend.insertAdjacentElement('afterend',verified);
        resend.onclick=async()=>{
          const msg=document.getElementById('vaMsg');
          const email=(document.getElementById('vaEmail')?.value||document.getElementById('vaLoginEmail')?.value||'').trim();
          if(!email){if(msg){msg.textContent='Escribe primero tu correo.';msg.className='va-msg error'}return;}
          const {data:{user}}=await sb.auth.getUser();
          if(user&&user.email?.toLowerCase()===email.toLowerCase()&&(user.email_confirmed_at||user.confirmed_at)){
            resend.style.display='none';verified.classList.add('show');
            if(msg){msg.textContent='';msg.className='va-msg'}
            return;
          }
          resend.disabled=true;
          if(msg){msg.textContent='Reenviando correo...';msg.className='va-msg'}
          try{
            const {error}=await sb.auth.resend({type:'signup',email,options:{emailRedirectTo:'https://vareliastore.tech/'}});
            if(error)throw error;
            if(msg){msg.textContent='Si tu correo aún no está verificado, recibirás un nuevo enlace. Revisa también Spam.';msg.className='va-msg ok'}
          }catch(e){if(msg){msg.textContent='No se pudo reenviar: '+(e.message||e);msg.className='va-msg error'}}
          finally{resend.disabled=false;}
        };
      }else if(!verified.isConnected){resend.insertAdjacentElement('afterend',verified)}

      async function syncVerificationState(){
        const {data:{user}}=await sb.auth.getUser();
        const confirmed=!!(user&&(user.email_confirmed_at||user.confirmed_at));
        if(confirmed){resend.style.display='none';verified.classList.add('show')}
        else{resend.style.display='flex';verified.classList.remove('show')}
      }

      let gate=document.getElementById('vaPasswordGate');
      if(!gate){
        gate=document.createElement('div');
        gate.id='vaPasswordGate';gate.className='va-password-gate';
        gate.innerHTML=`<div class="va-password-card"><h2>Crea tu contraseña de Varelia</h2><p>Ingresaste con Google. Crea una contraseña para que también puedas entrar con tu correo y contraseña.</p><form id="vaPasswordForm" class="va-password-form"><label>Nueva contraseña<input id="vaGooglePass1" type="password" minlength="8" autocomplete="new-password" required></label><label>Repite la contraseña<input id="vaGooglePass2" type="password" minlength="8" autocomplete="new-password" required></label><button class="va-password-save" type="submit">Guardar contraseña</button><div id="vaPasswordMsg" class="va-password-msg"></div></form></div>`;
        document.body.appendChild(gate);
        addEye(document.getElementById('vaGooglePass1'));addEye(document.getElementById('vaGooglePass2'));
        document.getElementById('vaPasswordForm').addEventListener('submit',async e=>{
          e.preventDefault();
          const p1=document.getElementById('vaGooglePass1').value;
          const p2=document.getElementById('vaGooglePass2').value;
          const m=document.getElementById('vaPasswordMsg');
          if(p1.length<8){m.textContent='La contraseña debe tener al menos 8 caracteres.';return}
          if(p1!==p2){m.textContent='Las contraseñas no coinciden.';return}
          m.style.color='#475569';m.textContent='Guardando contraseña...';
          const {data:{user}}=await sb.auth.getUser();
          const currentMeta=user?.user_metadata||{};
          const {error}=await sb.auth.updateUser({password:p1,data:{...currentMeta,varelia_password_created:true}});
          if(error){m.style.color='#b91c1c';m.textContent='No se pudo guardar: '+error.message;return}
          m.style.color='#047857';m.textContent='Contraseña creada correctamente.';
          setTimeout(()=>gate.classList.remove('show'),650);
        });
      }

      async function checkGooglePassword(){
        const {data:{user}}=await sb.auth.getUser();
        if(!user){gate.classList.remove('show');return}
        const providers=user.app_metadata?.providers||[];
        const isGoogle=(user.app_metadata?.provider==='google'||providers.includes('google')||user.identities?.some(i=>i.provider==='google'));
        if(isGoogle&&!user.user_metadata?.varelia_password_created){gate.classList.add('show')}else{gate.classList.remove('show')}
      }
      sb.auth.onAuthStateChange(()=>{setTimeout(checkGooglePassword,150);setTimeout(syncVerificationState,150)});
      setTimeout(checkGooglePassword,250);
      setTimeout(syncVerificationState,250);
    },120);
  });
})();