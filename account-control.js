(()=>{
  if(window.__vareliaAccountControl)return;window.__vareliaAccountControl=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmtDate=value=>{try{return value?new Date(value).toLocaleString('es-PE'):''}catch{return ''}};
    const fmtDay=value=>{try{return value?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value)):''}catch{return ''}};
    const dayStart=value=>{const d=new Date(value);return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
    const daysTo=value=>value?Math.round((dayStart(value)-dayStart(Date.now()))/86400000):null;
    const dueText=row=>{const n=daysTo(row.next_due_at);if(n===null)return '';if(n<0)return `Vencido hace ${Math.abs(n)} día${Math.abs(n)===1?'':'s'}`;if(n===0)return 'Vence hoy';if(n===1)return 'Vence mañana';return `Próximo pago en ${n} días`};
    const isDue=row=>row.role==='owner'&&!row.principal&&row.status==='active'&&daysTo(row.next_due_at)!==null&&daysTo(row.next_due_at)<=0;

    const style=document.createElement('style');style.textContent=`
#vareliaAccountControl{width:min(94vw,1040px);max-height:92dvh;border:0;border-radius:26px;padding:20px;background:#fff;color:var(--ink,#111827);box-shadow:0 28px 80px #0f172a2b}
#vareliaAccountControl::backdrop{background:#0f172aa8;backdrop-filter:blur(3px)}
#vareliaAccountControl header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:6px}
#vareliaAccountControl h2{margin:0;font-size:27px;letter-spacing:-.4px}#vareliaAccountControl header p{margin:5px 0 0;color:#64748b}
#vareliaAccountControl .close{width:42px;height:42px;border:0;border-radius:14px;background:#f1f5f9;font-size:27px;line-height:1}
#vareliaAccountControl #acStatus{min-height:0;margin:7px 0;font-size:13px;font-weight:700;color:#475569}
#vareliaAccountControl .acNotice{padding:15px 17px;border-radius:18px;background:linear-gradient(135deg,#ecfdf5,#f0fdfa);color:#065f46;line-height:1.55;margin:12px 0 16px;border:1px solid #d1fae5}
#vareliaAccountControl .acToolbar{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.9fr) auto;gap:10px;margin:14px 0}
#vareliaAccountControl .acToolbar input,#vareliaAccountControl .acToolbar select{min-width:0;border:1px solid #e2e8f0;border-radius:15px;padding:13px 14px;background:#fff;color:#111827;font-size:15px}
#vareliaAccountControl .acToolbar button{border-radius:15px;padding:0 18px}
#acInviteDetails{margin:14px 0;border:1px solid #dbeafe;border-radius:19px;background:linear-gradient(135deg,#eff6ff,#f8fbff);overflow:hidden;box-shadow:0 10px 28px #2563eb0b}
#acInviteDetails>summary{list-style:none;display:grid;grid-template-columns:48px 1fr 34px;align-items:center;gap:12px;padding:14px 15px;cursor:pointer}
#acInviteDetails>summary::-webkit-details-marker{display:none}.acInviteIcon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#2563eb,#0f5ad9);color:white;font-size:27px;font-weight:900;box-shadow:0 10px 20px #2563eb2b}.acInviteText{display:grid;gap:2px}.acInviteText b{font-size:17px}.acInviteText small{color:#64748b;line-height:1.35}.acInviteChevron{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#dbeafe;color:#2563eb;font-size:21px;transition:.2s}#acInviteDetails[open] .acInviteChevron{transform:rotate(180deg)}
#vareliaAccountControl .acInvite{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 15px 15px}#vareliaAccountControl label{display:grid;gap:6px;font-size:13px;font-weight:800;color:#334155}#vareliaAccountControl .acInvite input,#vareliaAccountControl .acInvite select{border:1px solid #dbe2ea;border-radius:14px;padding:12px 13px;background:#fff;color:#111827}#vareliaAccountControl .acInvite button{align-self:end;border-radius:14px}
#acCounts.acStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:15px 0}.acStat{padding:13px 12px;border:1px solid #e7ebf0;border-radius:17px;background:#fff;box-shadow:0 7px 20px #0f172a0b;min-width:0}.acStat strong{display:block;font-size:24px;line-height:1;margin-bottom:6px}.acStat span{display:block;font-size:11px;color:#64748b;font-weight:800;line-height:1.25}.acStat.alert{background:#fff7ed;border-color:#fed7aa}.acStat.alert strong,.acStat.alert span{color:#c2410c}
#acPaymentAlerts{display:grid;gap:9px;margin:8px 0 15px}.acPaymentAlert{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 14px;border-radius:17px;background:#fff7ed;border:1px solid #fed7aa}.acPaymentAlert b{display:block;color:#9a3412}.acPaymentAlert small{display:block;color:#c2410c;margin-top:3px}.acPaymentAlert button{white-space:nowrap;border:0;border-radius:12px;padding:9px 12px;background:#ea580c;color:#fff;font-weight:900}
#vareliaAccountControl .acBusiness{border:1px solid #e5e7eb;border-radius:21px;padding:16px;margin:12px 0;background:#fff;box-shadow:0 8px 24px #0f172a0a}#vareliaAccountControl .acBusiness h3{margin:0 0 6px;font-size:21px}.acBusinessHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:6px}.acBusinessHead .acEmail{margin-top:4px}
#vareliaAccountControl .acAccount{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:14px 0;border-top:1px solid #edf0f3}#vareliaAccountControl .acAccountMain{min-width:0;flex:1}#vareliaAccountControl .acAccountTitle{display:flex;align-items:center;gap:6px;flex-wrap:wrap}#vareliaAccountControl .acAccountTitle>b{font-size:16px}
#vareliaAccountControl .acEmail{overflow-wrap:anywhere;font-size:13px;color:#64748b}#vareliaAccountControl .acActions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}#vareliaAccountControl button{cursor:pointer;min-height:40px}#vareliaAccountControl .acBadge{display:inline-flex;align-items:center;padding:5px 8px;background:#f1f5f9;border-radius:999px;font-size:11px;font-weight:800;color:#334155}.acBadge.due{background:#ffedd5;color:#c2410c}.acBadge.pending{background:#fef3c7;color:#92400e}.acBadge.blocked,.acBadge.removed{background:#fee2e2;color:#b91c1c}.acBadge.active{background:#dcfce7;color:#166534}
.acBillingMeta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}.acMeta{padding:9px 10px;border-radius:13px;background:#f8fafc;border:1px solid #eef2f7}.acMeta span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.35px;color:#94a3b8;font-weight:900}.acMeta b{display:block;margin-top:3px;font-size:13px;color:#334155}.acMeta.due{background:#fff7ed;border-color:#fed7aa}.acMeta.due b,.acMeta.due span{color:#c2410c}
#vareliaAccountControl .acCode{margin-top:10px;padding:10px 12px;border:1px dashed #10b981;border-radius:13px;background:#f0fdf4;display:flex;align-items:center;gap:9px;flex-wrap:wrap}#vareliaAccountControl .acCode strong{font-size:21px;letter-spacing:2px;color:#065f46}#vareliaAccountControl .acCode small{color:#475569}
#vareliaAccountControl .acActivityWrap{margin-top:14px;border-top:1px solid #eef2f7;padding-top:10px}#vareliaAccountControl .acActivityWrap summary{cursor:pointer;font-weight:800;color:#475569}
#vareliaAccountControl [hidden]{display:none!important}
#vareliaControlEntry.vareliaControlEntryCard{position:relative;overflow:hidden;text-align:left!important;display:grid!important;grid-template-columns:54px 1fr 34px!important;align-items:center!important;gap:13px!important;padding:18px!important;border:1px solid #bfdbfe!important;border-radius:22px!important;background:linear-gradient(145deg,#f8fbff 0%,#eaf3ff 65%,#dbeafe 100%)!important;box-shadow:0 12px 28px #2563eb1c!important;color:#0f172a!important;min-height:156px!important}
#vareliaControlEntry.vareliaControlEntryCard:before{content:'';position:absolute;right:-35px;bottom:-50px;width:150px;height:120px;border-radius:50%;background:#2563eb12;transform:rotate(-18deg)}#vareliaControlEntry .vceIcon{width:54px;height:54px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(135deg,#2563eb,#0b5bd3);color:white;box-shadow:0 10px 22px #2563eb42;z-index:1}#vareliaControlEntry .vceIcon svg{width:31px;height:31px}#vareliaControlEntry .vceText{display:grid;gap:4px;z-index:1}#vareliaControlEntry .vceText b{font-size:17px;line-height:1.2;color:#0f172a}#vareliaControlEntry .vceText small{font-size:12px;color:#64748b;line-height:1.3}#vareliaControlEntry .vceArrow{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#dbeafe;color:#2563eb;font-size:24px;font-weight:700;z-index:1}
@media(max-width:600px){#vareliaAccountControl{width:calc(100vw - 22px);max-width:none;padding:14px;border-radius:24px}#vareliaAccountControl .acToolbar{grid-template-columns:1fr 1fr}#vareliaAccountControl .acToolbar button{grid-column:1/-1}#vareliaAccountControl .acInvite{grid-template-columns:1fr}#acCounts.acStats{grid-template-columns:repeat(2,minmax(0,1fr))}.acPaymentAlert{align-items:flex-start;flex-direction:column}.acPaymentAlert button{width:100%}#vareliaAccountControl .acBusiness{padding:14px}#vareliaAccountControl .acBusiness h3{font-size:20px}#vareliaAccountControl .acAccount{display:block;width:100%;padding:16px 0}#vareliaAccountControl .acAccountMain{width:100%;min-width:0;display:block}#vareliaAccountControl .acAccountTitle{width:100%;align-items:flex-start}#vareliaAccountControl .acAccountTitle>b{width:100%;font-size:17px;line-height:1.25;margin-bottom:2px}#vareliaAccountControl .acEmail{display:block;width:100%;max-width:100%;overflow-wrap:break-word;word-break:normal;white-space:normal;font-size:14px;line-height:1.45;margin-top:6px}#vareliaAccountControl .acAccountMain>small{display:block;margin-top:3px}#vareliaAccountControl .acActions{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}#vareliaAccountControl .acActions button{width:100%;min-width:0;padding:10px 8px;font-size:14px;white-space:normal}#vareliaAccountControl .acActions button:only-child{grid-column:1/-1}.acBillingMeta{grid-template-columns:repeat(2,minmax(0,1fr));width:100%;gap:8px}.acMeta{min-width:0}.acMeta b{font-size:12px;line-height:1.35;overflow-wrap:break-word;word-break:normal}.acBusinessHead .acEmail{overflow-wrap:break-word;word-break:normal}}
@media(max-width:360px){.acBillingMeta{grid-template-columns:1fr}#vareliaAccountControl .acActions{grid-template-columns:1fr}}
`;
    document.head.appendChild(style);

    let isPrincipal=false,rows=[],activity=[],busy=false,checking=false,generation=0,context={};
    const dialog=document.createElement('dialog');dialog.id='vareliaAccountControl';dialog.innerHTML=`
<header><div><h2>Panel principal</h2><p>Control de cuentas afiliadas y vendedores</p></div><button type="button" class="close" data-ac-close aria-label="Cerrar">×</button></header>
<p id="acStatus" role="status" aria-live="polite"></p>
<div class="acNotice" id="acApprovalNotice">Las cuentas nuevas requieren tu autorización. El código aparece aquí y solo es visible desde tu cuenta principal.</div>
<div class="acToolbar"><input id="acSearch" type="search" placeholder="Buscar correo, nombre o negocio" aria-label="Buscar cuentas"><select id="acFilter" aria-label="Filtrar estado"><option value="current">Cuentas actuales</option><option value="active">Activas</option><option value="pending">Pendientes</option><option value="blocked">Bloqueadas</option><option value="removed">Accesos retirados</option><option value="all">Todas</option></select><button type="button" class="btn secondary" data-ac-refresh>Actualizar</button></div>
<details id="acInviteDetails"><summary><span class="acInviteIcon">＋</span><span class="acInviteText"><b>Agregar cuenta</b><small>Crea un administrador afiliado o vincula un vendedor a un negocio</small></span><span class="acInviteChevron">⌄</span></summary><form class="acInvite" id="acInviteForm"><label>Nombre<input name="name" required minlength="2" maxlength="100"></label><label>Correo Gmail<input name="email" type="email" required maxlength="254"></label><label>Tipo de cuenta<select name="role"><option value="owner">Administrador afiliado</option><option value="cashier">Vendedor</option></select></label><label id="acBusinessName">Nombre del negocio<input name="businessName" maxlength="100"></label><label id="acBusinessPick" hidden>Negocio al que pertenece<select name="businessId" id="acBusinessSelect"></select></label><button class="btn primary" type="submit">Agregar cuenta</button></form></details>
<div id="acCounts" class="acStats"></div><div id="acPaymentAlerts"></div><div id="acAccounts"></div><details class="acActivityWrap"><summary>Actividad reciente</summary><div id="acActivity"></div></details>`;
    document.body.appendChild(dialog);
    const $=id=>dialog.querySelector('#'+id);
    const status=(message,error=false)=>{const el=$('acStatus');el.textContent=message;el.style.color=error?'#b91c1c':''};
    const clearPrivateView=()=>{rows=[];activity=[];context={};if(dialog.open)dialog.close();$('acAccounts').textContent='';$('acActivity').textContent='';$('acCounts').textContent='';$('acPaymentAlerts').textContent='';$('acStatus').textContent='';$('acInviteForm').reset()};
    const names={active:'Activa',pending:'Pendiente',blocked:'Bloqueada',removed:'Acceso retirado',approved:'Aprobada',code_generated:'Código generado',payment_recorded:'Pago registrado'};

    function actionsFor(row){
      if(row.principal)return '';
      if(row.status==='pending')return `<div class="acActions"><button class="btn primary" data-ac-approve data-id="${esc(row.id)}">Aprobar</button><button class="btn danger" data-ac-access="removed" data-id="${esc(row.id)}">Rechazar</button></div>`;
      if(row.status==='active')return `<div class="acActions">${isDue(row)&&row.role==='owner'?`<button class="btn primary" data-ac-paid data-id="${esc(row.id)}">Registrar pago</button>`:''}<button class="btn secondary" data-ac-access="blocked" data-id="${esc(row.id)}">Bloquear</button><button class="btn danger" data-ac-access="removed" data-id="${esc(row.id)}">Eliminar acceso</button></div>`;
      return `<div class="acActions"><button class="btn secondary" data-ac-reissue data-id="${esc(row.id)}">Generar código</button></div>`;
    }

    function accountHtml(row){
      const code=row.status==='pending'&&row.approval_code?`<div class="acCode"><span>Código</span><strong>${esc(row.approval_code)}</strong><button type="button" class="btn secondary" data-ac-copy="${esc(row.approval_code)}">Copiar</button><small>Vence: ${esc(fmtDate(row.approval_expires_at))}</small></div>`:'';
      const ownerBilling=row.role==='owner'&&!row.principal?`<div class="acBillingMeta"><div class="acMeta"><span>Afiliado desde</span><b>${esc(fmtDay(row.affiliated_at||row.created_at))}</b></div><div class="acMeta ${isDue(row)?'due':''}"><span>${isDue(row)?'Pago pendiente':'Próximo pago'}</span><b>${esc(fmtDay(row.next_due_at))}${row.next_due_at?` · ${esc(dueText(row))}`:''}</b></div></div>`:'';
      const dueBadge=isDue(row)?'<span class="acBadge due">Pago pendiente</span>':'';
      return `<div class="acAccount" data-ac-account="${esc(row.id)}"><div class="acAccountMain"><div class="acAccountTitle"><b>${esc(row.name||'Sin nombre')}</b><span class="acBadge">${row.principal?'Cuenta principal':row.role==='owner'?'Administrador':'Vendedor'}</span><span class="acBadge ${esc(row.status)}">${esc(names[row.status]||row.status)}</span>${dueBadge}</div><div class="acEmail">${esc(row.email)}</div><small>${row.confirmed?'Correo confirmado':'Correo sin confirmar'}</small>${ownerBilling}${code}</div>${actionsFor(row)}</div>`;
    }

    function paint(){
      const query=$('acSearch').value.trim().toLowerCase(),filter=$('acFilter').value;
      const matches=row=>(filter==='all'||filter==='current'&&row.status!=='removed'||row.status===filter)&&(!query||[row.name,row.email,row.business_name].some(v=>String(v||'').toLowerCase().includes(query)));
      const groups=new Map();for(const row of rows){const key=row.business_id||row.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
      $('acAccounts').innerHTML=[...groups.values()].map(group=>{const selected=group.filter(matches);if(!selected.length)return '';const owner=group.find(r=>r.role==='owner'&&!r.principal);const title=group[0].business_name||owner?.business_name||'Negocio sin nombre';return `<section class="acBusiness"><div class="acBusinessHead"><div><h3>${esc(title)}</h3>${owner?`<div class="acEmail">Administrador: ${esc(owner.email)}</div>`:''}</div></div>${selected.sort((a,b)=>Number(b.role==='owner')-Number(a.role==='owner')).map(accountHtml).join('')}</section>`}).join('')||'<p>No hay cuentas con este filtro.</p>';
      const admins=rows.filter(r=>r.role==='owner'&&!r.principal&&r.status!=='removed').length,sellers=rows.filter(r=>r.role!=='owner'&&r.status!=='removed').length,pending=rows.filter(r=>r.status==='pending').length,due=rows.filter(isDue).length;
      $('acCounts').innerHTML=`<div class="acStat"><strong>${admins}</strong><span>Administradores</span></div><div class="acStat"><strong>${sellers}</strong><span>Vendedores</span></div><div class="acStat"><strong>${pending}</strong><span>Pendientes</span></div><div class="acStat ${due?'alert':''}"><strong>${due}</strong><span>Pagos pendientes</span></div>`;
      const dueRows=rows.filter(isDue).sort((a,b)=>new Date(a.next_due_at)-new Date(b.next_due_at));
      $('acPaymentAlerts').innerHTML=dueRows.length?dueRows.map(r=>`<div class="acPaymentAlert"><div><b>Recordatorio de pago · ${esc(r.business_name||r.name||r.email)}</b><small>${esc(r.email)} · ${esc(dueText(r))} (${esc(fmtDay(r.next_due_at))})</small></div><button type="button" data-ac-paid data-id="${esc(r.id)}">Registrar pago</button></div>`).join(''):'';
      const current=$('acBusinessSelect').value;const businesses=[...groups.values()].map(g=>g.find(r=>r.role==='owner'&&!r.principal&&r.status==='active'&&r.business_id)).filter(Boolean);
      $('acBusinessSelect').innerHTML=businesses.map(r=>`<option value="${esc(r.business_id)}">${esc(r.business_name||r.email)}</option>`).join('');if(businesses.some(b=>b.business_id===current))$('acBusinessSelect').value=current;
      $('acActivity').innerHTML=activity.map(log=>{const target=rows.find(r=>r.id===log.target_id);return `<p>${esc(fmtDate(log.created_at))} · ${esc(target?.email||log.target_id)} · ${esc(names[log.action]||log.action)}</p>`}).join('')||'<p>Sin cambios registrados.</p>';
      $('acApprovalNotice').textContent=context?.approval_enabled===false?'La aprobación de cuentas nuevas está desactivada.':'Las cuentas nuevas requieren tu autorización. El código aparece aquí y solo es visible desde tu cuenta principal.';
    }

    async function load(){
      if(!isPrincipal||busy)return;busy=true;const mine=generation;status('Cargando cuentas…');
      try{const {data,error}=await window.vareliaSupabase.rpc('varelia_control_accounts');if(error)throw error;if(mine!==generation||!isPrincipal)return;rows=data?.accounts||[];activity=data?.activity||[];context=data?.context||context;paint();status('');}
      catch(e){if(mine===generation)status(e.message||'No se pudieron cargar las cuentas.',true)}finally{busy=false}
    }

    function entry(){
      document.getElementById('vareliaControlEntry')?.remove();if(!isPrincipal)return;
      const parent=document.querySelector('#mobileAdminHub .vmobileHubGrid')||document.querySelector('#sidebar .nav');if(!parent)return;
      const button=document.createElement('button');button.id='vareliaControlEntry';button.type='button';button.className='vmobileHubCard vareliaControlEntryCard';button.innerHTML=`<span class="vceIcon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span><span class="vceText"><b>Panel principal</b><small>Cuentas afiliadas y control de acceso</small></span><span class="vceArrow" aria-hidden="true">›</span>`;button.onclick=()=>{if(!isPrincipal)return;if(!dialog.open)dialog.showModal();load()};parent.prepend(button);
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
        const {data,error}=await sb.rpc('varelia_access_context');if(mine!==generation)return;
        if(error||!data||typeof data.principal!=='boolean'){isPrincipal=false;entry();clearPrivateView();return}
        context=data;isPrincipal=data.principal;entry();if(!isPrincipal)clearPrivateView();
        if(data.allowed===false){
          isPrincipal=false;entry();if(dialog.open)dialog.close();let gate=document.getElementById('vareliaAccountAccessGate');
          if(!gate){gate=document.createElement('div');gate.id='vareliaAccountAccessGate';gate.style.cssText='position:fixed;inset:0;z-index:999999;background:#f8fafc;display:grid;place-items:center;padding:24px;text-align:center';gate.innerHTML='<div style="max-width:460px;background:white;padding:28px;border-radius:22px;box-shadow:0 20px 60px #0f172a20"><h2>Acceso pendiente</h2><p data-ac-gate-message></p><button type="button" class="btn primary">Cerrar sesión</button></div>';gate.querySelector('button').onclick=()=>window.vareliaSignOut?.();document.body.appendChild(gate)}
          gate.querySelector('[data-ac-gate-message]').textContent=gateMessage(data.status);
        }else document.getElementById('vareliaAccountAccessGate')?.remove();
      }catch{isPrincipal=false;entry();clearPrivateView()}finally{checking=false}
    }

    dialog.querySelector('[data-ac-close]').onclick=()=>dialog.close();dialog.querySelector('[data-ac-refresh]').onclick=load;$('acSearch').oninput=paint;$('acFilter').onchange=paint;
    $('acInviteForm').elements.role.onchange=()=>{const seller=$('acInviteForm').elements.role.value==='cashier';$('acBusinessPick').hidden=!seller;$('acBusinessName').hidden=seller};
    $('acInviteForm').onsubmit=async e=>{e.preventDefault();if(busy)return;const button=e.target.querySelector('[type=submit]');button.disabled=true;status('Agregando cuenta…');try{const body=Object.fromEntries(new FormData(e.target));const {data,error}=await window.vareliaSupabase.functions.invoke('varelia-control',{body:{action:'invite',...body}});if(error||data?.error)throw Error(data?.error||error.message);e.target.reset();$('acBusinessPick').hidden=true;$('acBusinessName').hidden=false;await load();status(data.message||'Cuenta agregada.')}catch(err){status(err.message||'No se pudo agregar la cuenta.',true)}finally{button.disabled=false}};

    dialog.addEventListener('click',async e=>{
      const copy=e.target.closest('[data-ac-copy]');if(copy){const value=copy.dataset.acCopy||'';try{await navigator.clipboard.writeText(value);status('Código copiado.')}catch{status('Código: '+value)}return}if(busy)return;
      const paid=e.target.closest('[data-ac-paid]');if(paid){const row=rows.find(r=>r.id===paid.dataset.id);if(!row)return;if(!confirm(`¿Registrar el pago mensual de ${row.business_name||row.email}?`))return;paid.disabled=true;status('Registrando pago…');try{const {data,error}=await window.vareliaSupabase.rpc('varelia_control_mark_paid',{p_user_id:row.id});if(error)throw error;await load();status(`Pago registrado. Próximo vencimiento: ${fmtDay(data?.next_due_at)}.`)}catch(err){status(err.message||'No se pudo registrar el pago.',true)}finally{paid.disabled=false}return}
      const approve=e.target.closest('[data-ac-approve]');if(approve){const row=rows.find(r=>r.id===approve.dataset.id);if(!row?.approval_code)return status('Actualiza el panel para obtener el código.',true);if(!confirm(`¿Aprobar el acceso de ${row.email}?`))return;approve.disabled=true;status('Aprobando cuenta…');try{const {data,error}=await window.vareliaSupabase.functions.invoke('varelia-control',{body:{action:'approve',userId:row.id,code:row.approval_code}});if(error||data?.error)throw Error(data?.error||error.message);await load();status(data.session_notice||'Cuenta aprobada. Ya puede ingresar a Varelia.')}catch(err){status(err.message||'No se pudo aprobar.',true)}finally{approve.disabled=false}return}
      const reissue=e.target.closest('[data-ac-reissue]');if(reissue){const row=rows.find(r=>r.id===reissue.dataset.id);if(!row)return;if(!confirm(`¿Generar un nuevo código para ${row.email}?`))return;reissue.disabled=true;status('Generando código…');try{const {data,error}=await window.vareliaSupabase.functions.invoke('varelia-control',{body:{action:'reissue',userId:row.id}});if(error||data?.error)throw Error(data?.error||error.message);await load();status('Nuevo código generado.')}catch(err){status(err.message||'No se pudo generar el código.',true)}finally{reissue.disabled=false}return}
      const button=e.target.closest('[data-ac-access]');if(!button)return;const row=rows.find(r=>r.id===button.dataset.id);if(!row)return;const next=button.dataset.acAccess;if(!confirm(next==='removed'?(row.status==='pending'?`¿Rechazar la solicitud de ${row.email}?`:`¿Eliminar el acceso de ${row.email}? Se conservan sus ventas y tickets.`):`¿Bloquear la cuenta ${row.email}?`))return;button.disabled=true;status('Actualizando acceso…');try{const {data,error}=await window.vareliaSupabase.functions.invoke('varelia-control',{body:{action:'access',userId:row.id,status:next}});if(error||data?.error)throw Error(data?.error||error.message);await load();status(data.session_notice||'Acceso actualizado.')}catch(err){status(err.message||'No se pudo actualizar el acceso.',true)}finally{button.disabled=false}
    });

    ['varelia:business-scope-ready','varelia:account-isolation-ready','focus'].forEach(event=>window.addEventListener(event,()=>check()));
    setInterval(()=>{if(document.visibilityState==='visible')check()},30000);
    let count=0;const timer=setInterval(()=>{if(window.vareliaSupabase){clearInterval(timer);check();window.vareliaSupabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation++;isPrincipal=false;entry();clearPrivateView();document.getElementById('vareliaAccountAccessGate')?.remove()}else setTimeout(check,0)})}else if(++count>80)clearInterval(timer)},250);
    document.addEventListener('click',e=>{if(e.target.closest('[data-mobile-tab="mobileAdminHub"]'))setTimeout(()=>{if(isPrincipal&&!document.getElementById('vareliaControlEntry'))entry()},0)});
  });
})();
