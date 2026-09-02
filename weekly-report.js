(()=>{
  if(window.__vareliaWeeklyReport)return;
  window.__vareliaWeeklyReport=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    if(typeof sales==='undefined'||typeof closures==='undefined'||typeof K==='undefined')return;
    const cash=document.getElementById('cash'),nav=document.querySelector('.nav'),main=document.querySelector('main.content');if(!cash||!nav||!main)return;
    const style=document.createElement('style');style.textContent=`.weeklyBox{margin:14px 0;padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:var(--shadow)}.weeklyBox h3{margin:0 0 5px}.weeklyEmail{font-weight:900;color:var(--p);word-break:break-all}.weeklyBtns{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.weeklyBtns button{min-height:48px}.weeklyHint{font-size:12px;color:var(--muted);margin-top:8px}.weeklyDanger{background:#fff1f2!important;color:#be123c!important;border:1px solid #fecdd3!important}.cashSubGroup{display:grid;gap:5px}.cashSubGroup .cashParent{display:flex!important;justify-content:space-between;align-items:center}.cashSubGroup .cashArrow{transition:.2s}.cashSubGroup.open .cashArrow{transform:rotate(180deg)}.cashSubmenu{display:none;gap:5px;padding-left:14px}.cashSubGroup.open .cashSubmenu{display:grid}.cashSubmenu button{font-size:13px;padding:10px 12px;color:#cbd5e1;border-left:2px solid #334155;border-radius:0 12px 12px 0}.cashSubmenu button.active{border-left-color:#fff;background:color-mix(in srgb,var(--p) 72%,#0f172a)}@media(max-width:600px){.weeklyBtns{grid-template-columns:1fr}}`;document.head.appendChild(style);

    const reportSection=document.createElement('section');reportSection.id='weeklyReport';reportSection.className='view';reportSection.innerHTML=`<div class="head"><div><h2>📧 Respaldo y cierre semanal</h2><p class="notice">Historial semanal de Ventas + Caja.</p></div></div>`;main.appendChild(reportSection);
    const box=document.createElement('div');box.className='weeklyBox';box.innerHTML=`<h3>Respaldo semanal</h3><div class="notice">Envía Ventas + Caja al correo afiliado antes de borrar la semana.</div><div style="margin-top:8px">Correo afiliado: <span class="weeklyEmail" id="weeklyEmail">Detectando…</span></div><div class="weeklyBtns"><button class="btn secondary" id="weeklySend">📧 Enviar historial al Gmail</button><button class="btn weeklyDanger" id="weeklyReset">📅 Cierre semanal: enviar y poner en 0</button></div><div class="weeklyHint">Por seguridad, Varelia no borra nada hasta que confirmes que el correo fue enviado.</div>`;reportSection.appendChild(box);

    document.querySelectorAll('[data-view="profits"]').forEach(el=>el.remove());
    document.getElementById('profits')?.remove();

    const oldCashBtn=nav.querySelector('[data-view="cash"]');
    let cashBtn=oldCashBtn,weeklyBtn=null,group=null;
    if(oldCashBtn&&!document.getElementById('cashSubGroup')){
      group=document.createElement('div');group.id='cashSubGroup';group.className='cashSubGroup';
      const parent=document.createElement('button');parent.type='button';parent.className='cashParent';parent.innerHTML='<span>💵 Caja</span><span class="cashArrow">⌄</span>';
      const sub=document.createElement('div');sub.className='cashSubmenu';
      cashBtn=document.createElement('button');cashBtn.type='button';cashBtn.dataset.view='cash';cashBtn.textContent='📊 Resumen y cierres';
      weeklyBtn=document.createElement('button');weeklyBtn.type='button';weeklyBtn.dataset.view='weeklyReport';weeklyBtn.textContent='📧 Respaldo semanal';
      sub.append(cashBtn,weeklyBtn);group.append(parent,sub);oldCashBtn.replaceWith(group);
      parent.onclick=()=>group.classList.toggle('open');
    } else {
      group=document.getElementById('cashSubGroup');weeklyBtn=group?.querySelector('[data-view="weeklyReport"]');cashBtn=group?.querySelector('[data-view="cash"]')||oldCashBtn;group?.querySelectorAll('[data-view="profits"]').forEach(el=>el.remove());
    }
    function openView(id,btn){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav [data-view]').forEach(b=>b.classList.toggle('active',b===btn));group?.classList.add('open');if(innerWidth<=980){document.getElementById('sidebar')?.classList.remove('open');document.getElementById('overlay')?.classList.remove('show')}try{history.replaceState(null,'',location.pathname+location.search+(id==='weeklyReport'?'#respaldo-semanal':'#caja'))}catch{}scrollTo({top:0,behavior:'smooth'})}
    cashBtn?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openView('cash',cashBtn)},true);
    weeklyBtn?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openView('weeklyReport',weeklyBtn)},true);
    if(location.hash==='#respaldo-semanal')setTimeout(()=>openView('weeklyReport',weeklyBtn),120);

    function money(n){return 'S/ '+Number(n||0).toFixed(2)}
    const emailEl=document.getElementById('weeklyEmail');
    async function getEmail(){let e=document.getElementById('vareliaUserEmail')?.textContent?.trim()||'';if(!e&&window.vareliaSupabase){try{const {data}=await window.vareliaSupabase.auth.getSession();e=data?.session?.user?.email||''}catch{}}emailEl.textContent=e||'No disponible';return e}
    function report(){const now=new Date(),total=sales.reduce((a,s)=>a+(Number(s.total)||0),0),units=sales.reduce((a,s)=>a+(s.items||[]).reduce((b,i)=>b+(Number(i.qty)||0),0),0);const lines=[`REPORTE SEMANAL VARELIA`,`Generado: ${now.toLocaleString('es-PE')}`,``,`RESUMEN`,`Ventas registradas: ${sales.length}`,`Unidades vendidas: ${units}`,`Total vendido: ${money(total)}`,`Cierres de caja: ${closures.length}`,``,`VENTAS`];if(!sales.length)lines.push('Sin ventas registradas.');sales.forEach((s,idx)=>{lines.push(`Venta ${idx+1} - ${new Date(s.date).toLocaleString('es-PE')} - ${money(s.total)}`);(s.items||[]).forEach(i=>lines.push(`  • ${i.name} x${i.qty} @ ${money(i.price)} = ${money((Number(i.qty)||0)*(Number(i.price)||0))}`))});lines.push('', 'CIERRES DE CAJA');if(!closures.length)lines.push('Sin cierres registrados.');closures.forEach((c,idx)=>lines.push(`Cierre ${idx+1} - ${new Date(c.closedAt).toLocaleString('es-PE')} - ${money(c.closureTotal??c.total)}`));return lines.join('\n')}
    async function openMail(subject){const email=await getEmail();if(!email)return alert('No se pudo detectar el correo afiliado. Cierra sesión y vuelve a ingresar.');const body=report();try{localStorage.setItem('varelia_last_weekly_backup',JSON.stringify({createdAt:new Date().toISOString(),email,body,sales:JSON.parse(JSON.stringify(sales)),closures:JSON.parse(JSON.stringify(closures))}))}catch{};location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;return true}
    document.getElementById('weeklySend').onclick=()=>openMail('Varelia - Historial de ventas y caja');
    document.getElementById('weeklyReset').onclick=async()=>{if(!sales.length&&!closures.length)return alert('No hay ventas ni cierres para enviar esta semana.');const ok=confirm('Primero se abrirá Gmail con todo el historial. Varelia NO borrará nada todavía. ¿Continuar?');if(!ok)return;const opened=await openMail('Varelia - Cierre semanal de ventas y caja');if(!opened)return;sessionStorage.setItem('varelia_weekly_reset_pending','1')};
    window.addEventListener('focus',()=>{setTimeout(()=>{if(sessionStorage.getItem('varelia_weekly_reset_pending')!=='1')return;const sent=confirm('¿Ya enviaste el correo con el historial semanal?\n\nAceptar = borrar Ventas y Caja y empezar la nueva semana en S/ 0.00.\nCancelar = conservar todo.');if(!sent){sessionStorage.removeItem('varelia_weekly_reset_pending');return}sales.splice(0,sales.length);closures.splice(0,closures.length);cashStart=new Date().toISOString();try{localStorage.setItem(K.sales,'[]');localStorage.setItem(K.closures,'[]');localStorage.setItem(K.cashStart,JSON.stringify(cashStart));localStorage.setItem('varelia_last_weekly_reset',new Date().toISOString())}catch{}sessionStorage.removeItem('varelia_weekly_reset_pending');try{if(typeof save==='function')save();else if(typeof render==='function')render()}catch{}window.vareliaSound?.('sale');window.vareliaToast?.('Semana cerrada. Ventas y Caja están en 0.');},500)});
    getEmail();
  });
})();