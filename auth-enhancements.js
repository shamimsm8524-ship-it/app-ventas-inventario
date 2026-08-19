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
        style.textContent=`.va-passwrap{position:relative}.va-passwrap input{padding-right:48px!important}.va-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;border-radius:10px;background:transparent;font-size:20px;display:grid;place-items:center;cursor:pointer}.va-eye:active{background:#f1f5f9}.va-divider{display:flex;align-items:center;gap:10px;margin:14px 0;color:#94a3b8;font-size:12px}.va-divider:before,.va-divider:after{content:'';height:1px;background:#e5e7eb;flex:1}.va-google,.va-resend{width:100%;border:1px solid #dbe2ea;border-radius:14px;padding:12px 14px;background:#fff;color:#111827;font-weight:850;display:flex;align-items:center;justify-content:center;gap:9px}.va-google:active,.va-resend:active{background:#f8fafc}.va-google-logo{font-size:18px;font-weight:900}.va-resend{margin-top:10px;color:#4f46e5}`;
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

      if(!document.getElementById('vaResendBtn')){
        const register=document.getElementById('vaRegister');
        const resend=document.createElement('button');
        resend.id='vaResendBtn';
        resend.type='button';
        resend.className='va-resend';
        resend.textContent='Reenviar correo de confirmación';
        register.insertAdjacentElement('afterend',resend);
        resend.onclick=async()=>{
          const msg=document.getElementById('vaMsg');
          const email=(document.getElementById('vaEmail')?.value||document.getElementById('vaLoginEmail')?.value||'').trim();
          if(!email){if(msg){msg.textContent='Escribe primero tu correo.';msg.className='va-msg error'}return;}
          resend.disabled=true;
          if(msg){msg.textContent='Reenviando correo...';msg.className='va-msg'}
          try{
            const {error}=await sb.auth.resend({type:'signup',email,options:{emailRedirectTo:'https://vareliastore.tech/'}});
            if(error)throw error;
            if(msg){msg.textContent='Correo reenviado. Revisa tu bandeja de entrada y Spam.';msg.className='va-msg ok'}
          }catch(e){if(msg){msg.textContent='No se pudo reenviar: '+(e.message||e);msg.className='va-msg error'}}
          finally{resend.disabled=false;}
        };
      }
    },120);
  });
})();