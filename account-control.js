(()=>{
  if(window.__vareliaAccountControl)return;window.__vareliaAccountControl=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmtDate=value=>{try{return value?new Date(value).toLocaleString('es-PE'):''}catch{return ''}};
    const style=document.createElement('style');style.textContent=`
#vareliaAccountControl{width:min(94vw,1040px);max-height:92dvh;border:0;border-radius:20px;padding:20px;background:var(--card,#fff);color:var(--ink,#111)}
#vareliaAccountControl::backdrop{background:#0f172aa6}
#vareliaAccountControl header{display:flex;justify-content:space-between;align-items:center;gap:12px}
#vareliaAccountControl h2{margin:0}
#vareliaAccountControl .acToolbar{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
#vareliaAccountControl .acToolbar>*{flex:1;min-width:140px}
#vareliaAccountControl .acNotice{padding:12px;border-radius:12px;background:#ecfdf5;color:#065f46;line-height:1.5;margin:12px 0}
#vareliaAccountControl .acBusiness{border:1px solid var(--line,#ddd);border-radius:16px;padding:15px;margin:12px 0}
#vareliaAccountControl .acAccount{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--line,#ddd)}
#vareliaAccountControl .acEmail{overflow-wrap:anywhere;font-size:14px;color:var(--muted,#64748b)}
#vareliaAccountControl .acActions{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
#vareliaAccountControl button{cursor:pointer;min-height:42px}
#vareliaAccountControl .acBadge{display:inline-block;padding:4px 8px;background:var(--bg,#eef2ff);border-radius:8px;font-size:12px;margin-left:6px}
#vareliaAccountControl .acInvite{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:15px;border:1px solid var(--line,#ddd);border-radius:14px}
#vareliaAccountControl label{display:grid;gap:6px}
#vareliaAccountControl .acInvite button{align-self:end}
#vareliaAccountControl .acCode{margin-top:10px;padding:10px 12px;border:1px dashed #10b981;border-radius:12px;background:#f0fdf4;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
#vareliaAccountControl .acCode strong{font-size:21px;letter-spacing:2px;color:#065f46}
#vareliaAccountControl .acCode small{color:#475569}
#vareliaAccountControl [hidden]{display:none!important}
@media(max-width:600px){#vareliaAccountControl{padding:14px}#vareliaAccountControl .acInvite{grid-template-columns:1fr}}
`;
    document.head.appendChild(style);

    let isPrincipal=false,rows=[],activity=[],busy=false,checking=false,generation=0,context={};
    const dialog=document.createElement('dialog');dialog.id='vareliaAccountControl';dialog.innerHTML=`
<header><div><h2>Panel principal</h2><p>Administradores afiliados y vendedores</p></div><button type="button" class="close" data-ac-close aria-label="Cerrar">×</button></header>
<p id="acStatus" role="status" aria-live="polite"></p>
<div class="acNotice" id="acApprovalNotice">Las cuentas nuevas requieren tu autorización. El código aparece aquí y solo es visible desde tu cuenta principal.</div>
<div class="acToolbar"><input id="acSearch" type="search" placeholder="Buscar correo, nombre o negocio" aria-label="Buscar cuentas"><select id="acFilter" aria-label="Filtrar estado"><option value="current">Cuentas actuales</option><option value="active">Activas</option><option value="pending">Pendientes</option><option value="blocked">Bloqueadas</option><option value="removed">Accesos retirados</option><option value="all">Todas</option></select><button type="button" class="btn secondary" data-ac-refresh>Actualizar</button></div>
<details id="acInviteDetails"><summary>Agregar administrador o vendedor</summary><form class="acInvite" id="acInviteForm"><label>Nombre<input name="name" required minlength="2" maxlength="100"></label><label>Correo Gmail<input name="email" type="email" required maxlength="254"></label><label>Tipo de cuenta<select name="role"><option value="owner">Administrador afiliado</option><option value="cashier">Vendedor</option></select></label><label id="acBusinessName">Nombre del negocio<input name="businessName" maxlength="100"></label><label id="acBusinessPick" hidden>Negocio al que pertenece<select name="businessId" id="acBusinessSelect"></select></label><button class="btn primary" type="submit">Agregar cuenta</button></form></details>
<p id="acCounts"></p><div id="acAccounts"></div><details><summary>Actividad reciente</summary><div id="acActivity"></div></details>`;
    document.body.appendChild(dialog);
    const $=id=>dialog.querySelector('#'+id);
    const status=(message,error=false)=>{const el=$('acStatus');el.textContent=message;el.style.color=error?'#b91c1c':''};
    const clearPrivateView=()=>{rows=[];activity=[];context={};if(dialog.open)dialog.close();$('acAccounts').textContent='';$('acActivity').textContent='';$('acCounts').textContent='';$('acStatus').textContent='';$('acInviteForm').reset()};
    const names={active:'Activa',pending:'Pendiente',blocked:'Bloqueada',removed:'Acceso retirado',approved:'Aprobada',code_generated:'Código generado'};

    function actionsFor(row){
      if(row.principal)return '';
      if(row.status==='pending')return `<div class="acActions"><button class="btn primary" data-ac-approve data-id="${esc(row.id)}">Aprobar</button><button class="btn danger" data-ac-access="removed" data-id="${esc(row.id)}">Rechazar</button></div>`;
      if(row.status==='active')return `<div class="acActions"><button class="btn secondary" data-ac-access="blocked" data-id="${esc(row.id)}">Bloquear</button><button class="btn danger" data-ac-access="removed" data-id="${esc(row.id)}">Eliminar acceso</button></div>`;
      return `<div class="acActions"><button class="btn secondary" data-ac-reissue data-id="${esc(row.id)}">Generar código</button></div>`;
    }

    function accountHtml(row){
      const code=row.status==='pending'&&row.approval_code?`<div class="acCode"><span>Código</span><strong>${esc(row.approval_code)}</strong><button type="button" class="btn secondary" data-ac-copy="${esc(row.approval_code)}">Copiar</button><small>Vence: ${esc(fmtDate(row.approval_expires_at))}</small></div>`:'';
      return `<div class="acAccount" data-ac-account="${esc(row.id)}"><div><b>${esc(row.name||'Sin nombre')}</b><span class="acBadge">${row.principal?'Cuenta principal':row.role==='owner'?'Administrador':'Vendedor'}</span><span class="acBadge">${esc(names[row.status]||row.status)}</span><div class="acEmail">${esc(row.email)}</div><small>${row.confirmed?'Correo confirmado':'Correo sin confirmar'}</small>${code}</div>${actionsFor(row)}</div>`;
    }

    function paint(){
      const query=$('acSearch').value.trim().toLowerCase(),filter=$('acFilter').value;
      const matches=row=>(filter==='all'||filter==='current'&&row.status!=='removed'||row.status===filter)&&(!query||[row.name,row.email,row.business_name].some(v=>String(v||'').toLowerCase().includes(query)));
      const groups=new Map();for(const row of rows){const key=row.business_id||row.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
      $('acAccounts').innerHTML=[...groups.values()].map(group=>{const selected=group.filter(matches);if(!selected.length)return '';const owner=group.find(r=>r.role==='owner'&&!r.principal);const title=group[0].business_name||owner?.business_name||'Negocio sin nombre';return `<section class="acBusiness"><h3>${esc(title)}</h3>${owner?`<p class="acEmail">Administrador: ${esc(owner.email)}</p>`:''}${selected.sort((a,b)=>Number(b.role==='owner')-Number(a.role==='owner')).map(accountHtml).join('')}</section>`}).join('')||'<p>No hay cuentas con este filtro.</p>';
      $('acCounts').textContent=`${rows.filter(r=>r.role==='owner'&&!r.principal&&r.status!=='removed').length} administradores afiliados · ${rows.filter(r=>r.role!=='owner'&&r.status!=='removed').length} vendedores · ${rows.filter(r=>r.status==='pending').length} pendientes`;
      const current=$('acBusinessSelect').value;const businesses=[...groups.values()].map(g=>g.find(r=>r.role==='owner'&&!r.principal&&r.status==='active'&&r.business_id)).filter(Boolean);
      $('acBusinessSelect').innerHTML=businesses.map(r=>`<option value="${esc(r.business_id)}">${esc(r.business_name||r.email)}</option>`).join('');if(businesses.some(b=>b.business_id===current))$('acBusinessSelect').value=current;
      $('acActivity').innerHTML=activity.map(log=>{const target=rows.find(r=>r.id===log.target_id);return `<p>${esc(fmtDate(log.created_at))} · ${esc(target?.email||log.target_id)} · ${esc(names[log.action]||log.action)}</p>`}).join('')||'<p>Sin cambios de acceso registrados.</p>';
      $('acApprovalNotice').textContent=context?.approval_enabled===false?'La aprobación de cuentas nuevas está desactivada.':'Las cuentas nuevas requieren tu autorización. El código aparece aquí y solo es visible desde tu cuenta principal.';
    }

    async function load(){
      if(!isPrincipal||busy)return;busy=true;const mine=generation;status('Cargando cuentas…');
      try{const {data,error}=await window.vareliaSupabase.rpc('varelia_control_accounts');if(error)throw error;if(mine!==generation||!isPrincipal)return;rows=data?.accounts||[];activity=data?.activity||[];context=data?.context||context;paint();status('Cuentas actualizadas.');}
      catch(e){if(mine===generation)status(e.message||'No se pudieron cargar las cuentas.',true)}finally{busy=false}
    }

    function entry(){
      document.getElementById('vareliaControlEntry')?.remove();if(!isPrincipal)return;
      const parent=document.querySelector('#mobileAdminHub .vmobileHubGrid')||document.querySelector('#sidebar .nav');if(!parent)return;
      const button=document.createElement('button');button.id='vareliaControlEntry';button.type='button';button.className='vmobileHubCard';button.textContent='Panel principal · Cuentas afiliadas';button.onclick=()=>{if(!isPrincipal)return;if(!dialog.open)dialog.showModal();load()};parent.prepend(button);
    }

    function gateMessage(state){
      if(state==='pending')return 'Tu cuenta está pendiente de aprobación. El administrador principal debe autorizar tu acceso.';
      if(state==='blocked')return 'Tu cuenta está bloqueada. Contacta al administrador principal para revisar tu acceso.';
      if(state==='removed')return 'El acceso de esta cuenta fue retirado. Contacta al administrador principal.';
      return 'Esta cuenta no tiene acceso a Varelia.';
    }

    async function check(){
      const sb=window.vareliaSupabase;if(!sb||checking)return;checking=true;const mine=++generation;
      try{
        const {data,error}=await sb.rpc('varelia_access_context');
        if(mine!==generation)return;
        if(error||!data||typeof data.principal!=='boolean'){isPrincipal=false;entry();clearPrivateView();return}
        context=data;isPrincipal=data.principal;entry();if(!isPrincipal)clearPrivateView();
        if(data.allowed===false){
          isPrincipal=false;entry();if(dialog.open)dialog.close();let gate=document.getElementById('vareliaAccountAccessGate');
          if(!gate){gate=document.createElement('div');gate.id='vareliaAccountAccessGate';gate.style.cssText='position:fixed;inset:0;z-index:999999;background:#f8fafc;display:grid;place-items:center;padding:24px;text-align:center';gate.innerHTML='<div style="max-width:460px;background:white;padding:28px;border-radius:22px;box-shadow:0 20px 60px #0f172a20"><h2>Acceso pendiente</h2><p data-ac-gate-message></p><button type="button" class="btn primary">Cerrar sesión</button></div>';gate.querySelector('button').onclick=()=>window.vareliaSignOut?.();document.body.appendChild(gate)}
          gate.querySelector('[data-ac-gate-message]').textContent=gateMessage(data.status);
        }else document.getElementById('vareliaAccountAccessGate')?.remove();
      }catch{isPrincipal=false;entry();clearPrivateView()}finally{checking=false}
    }

    dialog.querySelector('[data-ac-close]').onclick=()=>dialog.close();
    dialog.querySelector('[data-ac-refresh]').onclick=load;
    $('acSearch').oninput=paint;$('acFilter').onchange=paint;
    $('acInviteForm').elements.role.onchange=()=>{const seller=$('acInviteForm').elements.role.value==='cashier';$('acBusinessPick').hidden=!seller;$('acBusinessName').hidden=seller};

    $('acInviteForm').onsubmit=async e=>{
      e.preventDefault();if(busy)return;const button=e.target.querySelector('[type=submit]');button.disabled=true;status('Agregando cuenta…');
      try{const body=Object.fromEntries(new FormData(e.target));const {data,error}=await window.vareliaSupabase.functions.invoke('varelia-control',{body:{action:'invite',...body}});if(error||data?.error)throw Error(data?.error||error.message);e.target.reset();$('acBusinessPick').hidden=true;$('acBusinessName').hidden=false;await load();status(data.message||'Cuenta agregada.')}catch(err){status(err.message||'No se pudo agregar la cuenta.',true)}finally{button.disabled=false}
    };

    dialog.addEventListener('click',async e=>{
      const copy=e.target.closest('[data-ac-copy]');
      if(copy){const value=copy.dataset.acCopy||'';try{await navigator.clipboard.writeText(value);status('Código copiado.')}catch{status('Código: '+value)}return}
      if(busy)return;
      const approve=e.target.closest('[data-ac-approve]');
      if(approve){const row=rows.find(r=>r.id===approve.dataset.id);if(!row?.approval_code)return status('Actualiza el panel para obtener el código.',true);if(!confirm(`¿Aprobar el acceso de ${row.email}?`))return;approve.disabled=true;status('Aprobando cuenta…');try{const {data,error}=await window.vareliaSupabase.functions.invoke('varelia-control',{body:{action:'approve',userId:row.id,code:row.approval_code}});if(error||data?.error)throw Error(data?.error||error.message);await load();status(data.session_notice||'Cuenta aprobada. Ya puede ingresar a Varelia.')}catch(err){status(err.message||'No se pudo aprobar.',true)}finally{approve.disabled=false}return}
      const reissue=e.target.closest('[data-ac-reissue]');
      if(reissue){const row=rows.find(r=>r.id===reissue.dataset.id);if(!row)return;if(!confirm(`¿Generar un nuevo código para ${row.email}?`))return;reissue.disabled=true;status('Generando código…');try{const {data,error}=await window.vareliaSupabase.functions.invoke('varelia-control',{body:{action:'reissue',userId:row.id}});if(error||data?.error)throw Error(data?.error||error.message);await load();status('Nuevo código generado.')}catch(err){status(err.message||'No se pudo generar el código.',true)}finally{reissue.disabled=false}return}
      const button=e.target.closest('[data-ac-access]');if(!button)return;const row=rows.find(r=>r.id===button.dataset.id);if(!row)return;const next=button.dataset.acAccess;
      if(!confirm(next==='removed'?(row.status==='pending'?`¿Rechazar la solicitud de ${row.email}?`:`¿Eliminar el acceso de ${row.email}? Se conservan sus ventas y tickets.`):`¿Bloquear la cuenta ${row.email}?`))return;
      button.disabled=true;status('Actualizando acceso…');
      try{const {data,error}=await window.vareliaSupabase.functions.invoke('varelia-control',{body:{action:'access',userId:row.id,status:next}});if(error||data?.error)throw Error(data?.error||error.message);await load();status(data.session_notice||'Acceso actualizado.')}catch(err){status(err.message||'No se pudo actualizar el acceso.',true)}finally{button.disabled=false}
    });

    ['varelia:business-scope-ready','varelia:account-isolation-ready','focus'].forEach(event=>window.addEventListener(event,()=>check()));
    setInterval(()=>{if(document.visibilityState==='visible')check()},30000);
    let count=0;const timer=setInterval(()=>{if(window.vareliaSupabase){clearInterval(timer);check();window.vareliaSupabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation++;isPrincipal=false;entry();clearPrivateView();document.getElementById('vareliaAccountAccessGate')?.remove()}else setTimeout(check,0)})}else if(++count>80)clearInterval(timer)},250);
    document.addEventListener('click',e=>{if(e.target.closest('[data-mobile-tab="mobileAdminHub"]'))setTimeout(()=>{if(isPrincipal&&!document.getElementById('vareliaControlEntry'))entry()},0)});
  });
})();
