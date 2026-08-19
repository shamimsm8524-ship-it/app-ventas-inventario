(()=>{
  if(window.__vareliaMerchandiseReminders)return;
  window.__vareliaMerchandiseReminders=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const section=document.getElementById('purchases');
    if(!section)return;

    const style=document.createElement('style');
    style.id='vareliaReminderStyles';
    style.textContent=`
      .vr-wrap{margin:0 0 18px}.vr-card{background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);padding:16px}.vr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.vr-head h3{margin:0;font-size:18px}.vr-head p{margin:4px 0 0;color:var(--muted);font-size:12px}.vr-grid{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(300px,1.1fr);gap:14px}.vr-calendar,.vr-formbox{border:1px solid var(--line);border-radius:17px;background:color-mix(in srgb,var(--p) 3%,var(--card));padding:14px}.vr-monthbar{display:grid;grid-template-columns:40px 1fr 40px;gap:8px;align-items:center;margin-bottom:10px}.vr-monthbar button{width:40px;height:40px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font-weight:900}.vr-monthtitle{text-align:center;font-weight:950;text-transform:capitalize}.vr-week,.vr-days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.vr-week span{text-align:center;color:var(--muted);font-size:10px;font-weight:900;padding:5px 0}.vr-day{position:relative;min-height:42px;border:1px solid transparent;border-radius:12px;background:transparent;color:var(--ink);font-weight:850}.vr-day.other{opacity:.33}.vr-day.today{border-color:color-mix(in srgb,var(--p) 45%,var(--line));background:color-mix(in srgb,var(--p) 7%,var(--card))}.vr-day.selected{background:var(--p);color:#fff}.vr-day.has:after{content:'';position:absolute;left:50%;bottom:4px;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:var(--p)}.vr-day.selected.has:after{background:#fff}.vr-fields{display:grid;gap:10px}.vr-fields .two{margin:0}.vr-formbox textarea{min-height:86px;resize:vertical}.vr-actions{display:flex;gap:8px;flex-wrap:wrap}.vr-actions .btn{flex:1}.vr-banner{display:none;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding:11px 13px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}.vr-banner.show{display:flex}.vr-listtitle{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:16px 0 9px}.vr-listtitle h4{margin:0}.vr-reminders{display:grid;gap:8px}.vr-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:14px;background:var(--card)}.vr-item.done{opacity:.6}.vr-item.done .vr-desc{text-decoration:line-through}.vr-datebox{width:54px;text-align:center;border-radius:12px;padding:7px 5px;background:color-mix(in srgb,var(--p) 8%,var(--card));color:var(--p);font-weight:950}.vr-datebox small{display:block;font-size:9px;text-transform:uppercase}.vr-datebox strong{display:block;font-size:19px;line-height:1}.vr-desc{font-weight:850;line-height:1.25}.vr-meta{margin-top:4px;color:var(--muted);font-size:11px}.vr-state{display:inline-flex;margin-top:5px;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:900}.vr-state.today{background:#fef3c7;color:#92400e}.vr-state.late{background:#fee2e2;color:#b91c1c}.vr-state.next{background:#dbeafe;color:#1d4ed8}.vr-itemactions{display:flex;gap:5px}.vr-iconbtn{width:34px;height:34px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font-weight:900}.vr-empty{text-align:center;padding:18px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);font-size:12px}.vr-loading{color:var(--muted);font-size:12px;padding:10px 0}.vr-sync{font-size:10px;color:var(--muted);margin-top:8px}.vr-error{color:#b91c1c}.vr-daycount{position:absolute;right:3px;top:3px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:var(--p);color:#fff;font-size:9px;display:grid;place-items:center}.vr-day.selected .vr-daycount{background:#fff;color:var(--p)}
      @media(max-width:820px){.vr-grid{grid-template-columns:1fr}}@media(max-width:560px){.vr-card{padding:12px}.vr-head{flex-direction:column}.vr-day{min-height:39px}.vr-item{grid-template-columns:auto minmax(0,1fr)}.vr-itemactions{grid-column:1/-1;justify-content:flex-end}}
    `;
    document.head.appendChild(style);

    const wrap=document.createElement('div');
    wrap.className='vr-wrap';
    wrap.innerHTML=`
      <div class="vr-card">
        <div class="vr-head"><div><h3>📅 Calendario y recordatorios</h3><p>Programa llegadas de mercadería, visitas de proveedores u otras tareas de abastecimiento.</p></div><button type="button" class="btn secondary" id="vrToday">Hoy</button></div>
        <div class="vr-banner" id="vrBanner"><strong id="vrBannerText"></strong><button type="button" class="btn secondary" id="vrBannerGo" style="padding:8px 10px">Ver</button></div>
        <div class="vr-grid">
          <div class="vr-calendar">
            <div class="vr-monthbar"><button type="button" id="vrPrev" aria-label="Mes anterior">‹</button><div class="vr-monthtitle" id="vrMonthTitle"></div><button type="button" id="vrNext" aria-label="Mes siguiente">›</button></div>
            <div class="vr-week"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>
            <div class="vr-days" id="vrDays"></div>
          </div>
          <div class="vr-formbox">
            <strong>🔔 Nuevo recordatorio</strong>
            <div class="vr-fields" style="margin-top:10px">
              <div class="two"><label><span>Fecha</span><input id="vrDate" type="date" required></label><label><span>Hora (opcional)</span><input id="vrTime" type="time"></label></div>
              <label><span>Proveedor (opcional)</span><select id="vrSupplier"><option value="">Sin proveedor</option></select></label>
              <label><span>Descripción</span><textarea id="vrDescription" maxlength="500" placeholder="Ej.: Recibir 20 cajas de bebidas / Llega proveedor de abarrotes"></textarea></label>
              <div class="vr-actions"><button type="button" class="btn primary" id="vrSave">Guardar recordatorio</button><button type="button" class="btn secondary" id="vrClear">Limpiar</button></div>
              <div class="vr-sync" id="vrSync">Conectando con tu cuenta…</div>
            </div>
          </div>
        </div>
        <div class="vr-listtitle"><h4>Próximos recordatorios</h4><button type="button" class="btn secondary" id="vrRefresh" style="padding:8px 10px">Actualizar</button></div>
        <div class="vr-reminders" id="vrList"><div class="vr-loading">Cargando recordatorios…</div></div>
      </div>`;
    const role=section.querySelector('.flowRole');
    const head=section.querySelector('.head');
    (role||head)?.insertAdjacentElement('afterend',wrap);

    const el=id=>document.getElementById(id);
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const pad=n=>String(n).padStart(2,'0');
    const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const parseDate=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12,0,0)};
    const today=()=>ymd(new Date());
    const monthFmt=new Intl.DateTimeFormat('es-PE',{month:'long',year:'numeric'});
    const dayMonthFmt=new Intl.DateTimeFormat('es-PE',{month:'short'});

    let reminders=[];
    let currentMonth=new Date();currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth(),1,12);
    let selectedDate=today();
    let sb=null,user=null,businessId=null,loading=false;

    function toast(msg){if(window.vareliaToast)window.vareliaToast(msg);else alert(msg)}
    function populateSuppliers(){
      const select=el('vrSupplier');if(!select)return;
      const old=select.value;
      let list=[];
      try{if(typeof suppliers!=='undefined'&&Array.isArray(suppliers))list=suppliers}catch{}
      select.innerHTML='<option value="">Sin proveedor</option>'+list.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es')).map(s=>`<option value="${esc(s.name||'')}">${esc(s.name||'Proveedor')}</option>`).join('');
      if([...select.options].some(o=>o.value===old))select.value=old;
    }

    function statusFor(r){
      if(r.completed)return {text:'Completado',cls:'next'};
      const t=today();
      if(r.event_date<t)return {text:'Vencido',cls:'late'};
      if(r.event_date===t)return {text:'Hoy',cls:'today'};
      const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
      if(r.event_date===ymd(tomorrow))return {text:'Mañana',cls:'next'};
      return {text:'Próximo',cls:'next'};
    }

    function renderCalendar(){
      el('vrMonthTitle').textContent=monthFmt.format(currentMonth);
      const first=new Date(currentMonth.getFullYear(),currentMonth.getMonth(),1,12);
      const mondayOffset=(first.getDay()+6)%7;
      const start=new Date(first);start.setDate(first.getDate()-mondayOffset);
      const counts={};
      for(const r of reminders)if(!r.completed)counts[r.event_date]=(counts[r.event_date]||0)+1;
      let html='';
      for(let i=0;i<42;i++){
        const d=new Date(start);d.setDate(start.getDate()+i);
        const ds=ymd(d),other=d.getMonth()!==currentMonth.getMonth();
        const count=counts[ds]||0;
        html+=`<button type="button" class="vr-day${other?' other':''}${ds===today()?' today':''}${ds===selectedDate?' selected':''}${count?' has':''}" data-vrdate="${ds}">${d.getDate()}${count?`<span class="vr-daycount">${count}</span>`:''}</button>`;
      }
      el('vrDays').innerHTML=html;
    }

    function renderList(){
      const list=[...reminders].sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))||String(a.event_time||'99:99').localeCompare(String(b.event_time||'99:99'))||String(a.created_at||'').localeCompare(String(b.created_at||'')));
      const upcoming=list.filter(r=>!r.completed||r.event_date>=today()).slice(0,20);
      el('vrList').innerHTML=upcoming.length?upcoming.map(r=>{
        const d=parseDate(r.event_date),st=statusFor(r),time=r.event_time?String(r.event_time).slice(0,5):'';
        return `<div class="vr-item${r.completed?' done':''}" data-vrid="${r.id}"><div class="vr-datebox"><small>${esc(dayMonthFmt.format(d).replace('.',''))}</small><strong>${d.getDate()}</strong></div><div><div class="vr-desc">${esc(r.description)}</div><div class="vr-meta">${time?'🕒 '+esc(time)+' · ':''}${r.supplier_name?'🤝 '+esc(r.supplier_name):'Sin proveedor'}</div><span class="vr-state ${st.cls}">${st.text}</span></div><div class="vr-itemactions"><button type="button" class="vr-iconbtn" data-vrdone="${r.id}" title="${r.completed?'Reabrir':'Marcar cumplido'}">${r.completed?'↩':'✓'}</button><button type="button" class="vr-iconbtn" data-vrdelete="${r.id}" title="Eliminar">🗑</button></div></div>`;
      }).join(''):'<div class="vr-empty">No tienes recordatorios pendientes.</div>';
      const due=reminders.filter(r=>!r.completed&&r.event_date<=today());
      const banner=el('vrBanner');
      if(due.length){
        const todayCount=due.filter(r=>r.event_date===today()).length,late=due.length-todayCount;
        el('vrBannerText').textContent=`🔔 ${todayCount?`${todayCount} para hoy`:''}${todayCount&&late?' · ':''}${late?`${late} vencido${late===1?'':'s'}`:''}`;
        banner.classList.add('show');
      }else banner.classList.remove('show');
    }

    function renderAll(){renderCalendar();renderList()}

    async function waitSupabase(){
      for(let i=0;i<80&&!window.vareliaSupabase;i++)await new Promise(r=>setTimeout(r,100));
      return window.vareliaSupabase||null;
    }

    async function ensureContext(){
      if(sb&&user&&businessId)return true;
      sb=await waitSupabase();
      if(!sb){el('vrSync').textContent='No se pudo conectar con Supabase.';el('vrSync').classList.add('vr-error');return false}
      const {data:{user:u},error:ue}=await sb.auth.getUser();
      if(ue||!u){el('vrSync').textContent='Inicia sesión para usar tus recordatorios.';return false}
      user=u;
      const {data:p,error:pe}=await sb.from('profiles').select('business_id').eq('id',u.id).maybeSingle();
      if(pe||!p?.business_id){el('vrSync').textContent='No se encontró el negocio asociado a tu cuenta.';el('vrSync').classList.add('vr-error');return false}
      businessId=p.business_id;
      el('vrSync').classList.remove('vr-error');
      el('vrSync').textContent='Guardado en tu cuenta de Varelia.';
      return true;
    }

    async function loadReminders(showState=true){
      if(loading)return;loading=true;
      if(showState)el('vrSync').textContent='Actualizando…';
      try{
        if(!await ensureContext())return;
        const {data,error}=await sb.from('business_reminders').select('id,business_id,created_by,event_date,event_time,description,supplier_name,completed,created_at,updated_at').order('event_date',{ascending:true}).order('event_time',{ascending:true,nullsFirst:false});
        if(error)throw error;
        reminders=Array.isArray(data)?data:[];
        renderAll();
        el('vrSync').classList.remove('vr-error');el('vrSync').textContent='Guardado en tu cuenta de Varelia.';
      }catch(e){console.error('Recordatorios:',e);el('vrSync').textContent='No se pudieron cargar los recordatorios.';el('vrSync').classList.add('vr-error');}
      finally{loading=false}
    }

    async function saveReminder(){
      const date=el('vrDate').value,description=el('vrDescription').value.trim();
      if(!date)return toast('Elige una fecha para el recordatorio.');
      if(!description)return toast('Escribe una descripción.');
      if(!await ensureContext())return;
      el('vrSave').disabled=true;el('vrSync').textContent='Guardando…';
      try{
        const row={business_id:businessId,created_by:user.id,event_date:date,event_time:el('vrTime').value||null,description,supplier_name:el('vrSupplier').value||null};
        const {error}=await sb.from('business_reminders').insert(row);
        if(error)throw error;
        selectedDate=date;currentMonth=new Date(parseDate(date).getFullYear(),parseDate(date).getMonth(),1,12);
        clearForm(false);await loadReminders(false);toast('Recordatorio guardado.');
      }catch(e){console.error(e);el('vrSync').textContent='No se pudo guardar el recordatorio.';el('vrSync').classList.add('vr-error');}
      finally{el('vrSave').disabled=false}
    }

    function clearForm(resetDate=true){
      if(resetDate)selectedDate=today();
      el('vrDate').value=selectedDate;el('vrTime').value='';el('vrDescription').value='';el('vrSupplier').value='';populateSuppliers();renderCalendar();
    }

    async function toggleDone(id){
      const r=reminders.find(x=>x.id===id);if(!r||!await ensureContext())return;
      const {error}=await sb.from('business_reminders').update({completed:!r.completed,updated_at:new Date().toISOString()}).eq('id',id);
      if(error){toast('No se pudo actualizar.');return}
      await loadReminders(false);
    }

    async function removeReminder(id){
      if(!confirm('¿Eliminar este recordatorio?'))return;
      if(!await ensureContext())return;
      const {error}=await sb.from('business_reminders').delete().eq('id',id);
      if(error){toast('No se pudo eliminar.');return}
      await loadReminders(false);toast('Recordatorio eliminado.');
    }

    el('vrDays').onclick=e=>{const b=e.target.closest('[data-vrdate]');if(!b)return;selectedDate=b.dataset.vrdate;el('vrDate').value=selectedDate;const d=parseDate(selectedDate);currentMonth=new Date(d.getFullYear(),d.getMonth(),1,12);renderCalendar();el('vrDescription').focus({preventScroll:true})};
    el('vrPrev').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1,12);renderCalendar()};
    el('vrNext').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1,12);renderCalendar()};
    el('vrToday').onclick=()=>{selectedDate=today();currentMonth=new Date();currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth(),1,12);el('vrDate').value=selectedDate;renderCalendar()};
    el('vrDate').onchange=()=>{if(!el('vrDate').value)return;selectedDate=el('vrDate').value;const d=parseDate(selectedDate);currentMonth=new Date(d.getFullYear(),d.getMonth(),1,12);renderCalendar()};
    el('vrSave').onclick=saveReminder;
    el('vrClear').onclick=()=>clearForm();
    el('vrRefresh').onclick=()=>loadReminders();
    el('vrBannerGo').onclick=()=>{selectedDate=today();el('vrDate').value=selectedDate;currentMonth=new Date();currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth(),1,12);renderCalendar();wrap.scrollIntoView({behavior:'smooth',block:'start'})};
    el('vrSupplier').onfocus=populateSuppliers;
    el('vrList').onclick=e=>{const done=e.target.closest('[data-vrdone]'),del=e.target.closest('[data-vrdelete]');if(done)toggleDone(done.dataset.vrdone);if(del)removeReminder(del.dataset.vrdelete)};

    populateSuppliers();clearForm(false);renderAll();loadReminders();
    setInterval(()=>{if(document.visibilityState==='visible')loadReminders(false)},60000);
    window.addEventListener('focus',()=>loadReminders(false));
  });
})();