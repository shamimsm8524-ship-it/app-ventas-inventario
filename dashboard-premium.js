(()=>{
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  const money=n=>'S/ '+(Number(n)||0).toFixed(2);
  const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
  const sameMonth=(d,ref)=>d.getFullYear()===ref.getFullYear()&&d.getMonth()===ref.getMonth();
  const esc=s=>String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));

  ready(()=>{
    const nav=document.querySelector('#sidebar .nav');
    const main=document.querySelector('main.content');
    if(!nav||!main||document.getElementById('dashboard'))return;

    const icon=(name)=>`<span class="vNavIcon" aria-hidden="true">${name}</span>`;
    const labels={products:['Productos','▱'],inventory:['Inventario','▥'],categories:['Categorías','◇'],suppliers:['Proveedores','◫'],purchases:['Ingreso de mercadería','⇩'],sales:['Ventas','⌁'],cash:['Caja','▣'],appearance:['Apariencia','◌']};
    nav.querySelectorAll('[data-view]').forEach(b=>{const x=labels[b.dataset.view];if(x)b.innerHTML=icon(x[1])+`<span class="vNavText">${x[0]}</span>`});
    const supplierMenu=document.getElementById('supplierMenu');
    if(supplierMenu)supplierMenu.innerHTML=icon('▣')+'<span class="vNavText">Compras y proveedores</span><span class="arrow">⌄</span>';

    const btn=document.createElement('button');
    btn.type='button';btn.className='dashboardNav';btn.dataset.view='dashboard';btn.innerHTML=icon('⌂')+'<span class="vNavText">Dashboard</span>';
    nav.insertBefore(btn,nav.firstChild);

    const section=document.createElement('section');
    section.id='dashboard';section.className='view vareliaDashboard';
    section.innerHTML=`
      <div class="dashWelcome"><div><h2>¡Hola, <span id="dashBusinessName">Varelia</span>! 👋</h2><p>Ventas e inventario</p><span class="dashSync">● Sistema sincronizado</span></div><div class="dashQuick"><input class="dashSearch" id="dashSearch" placeholder="Buscar productos, ventas..."><button class="btn primary" id="dashNewSale">+ Nueva venta</button></div></div>
      <div class="dashKpis">
        <article class="dashKpi pink"><div class="dashKpiTop"><span class="dashKpiIcon">↗</span><span>Ventas hoy</span></div><div class="dashKpiValue" id="dashToday">S/ 0.00</div><div class="dashKpiSub" id="dashTodaySub">0 ventas</div></article>
        <article class="dashKpi purple"><div class="dashKpiTop"><span class="dashKpiIcon">▣</span><span>Ventas del mes</span></div><div class="dashKpiValue" id="dashMonth">S/ 0.00</div><div class="dashKpiSub" id="dashMonthSub">Mes actual</div></article>
        <article class="dashKpi blue"><div class="dashKpiTop"><span class="dashKpiIcon">◇</span><span>Productos</span></div><div class="dashKpiValue" id="dashProducts">0</div><div class="dashKpiSub">En catálogo</div></article>
        <article class="dashKpi orange"><div class="dashKpiTop"><span class="dashKpiIcon">△</span><span>Stock bajo</span></div><div class="dashKpiValue" id="dashLow">0</div><div class="dashKpiSub">Productos por reponer</div></article>
        <article class="dashKpi green"><div class="dashKpiTop"><span class="dashKpiIcon">$</span><span>Caja actual</span></div><div class="dashKpiValue" id="dashCash">S/ 0.00</div><div class="dashKpiSub">Ventas de caja activa</div></article>
      </div>
      <div class="dashMainGrid">
        <article class="dashPanel"><div class="dashPanelTitle"><strong>Ventas de los últimos 7 días</strong><span>Esta semana</span></div><div class="dashChart" id="dashChart"></div></article>
        <article class="dashPanel"><div class="dashPanelTitle"><strong>Productos por categoría</strong><span id="dashCatTotal"></span></div><div class="dashDonutWrap"><div class="dashDonut" id="dashDonut"></div></div><div class="dashLegend" id="dashLegend"></div></article>
        <article class="dashPanel"><div class="dashPanelTitle"><strong>Actividad reciente</strong><span>Últimos movimientos</span></div><div class="dashActivity" id="dashActivity"></div></article>
      </div>
      <div class="dashBottomGrid">
        <article class="dashPanel"><div class="dashPanelTitle"><strong>Últimas ventas</strong><button class="btn secondary" id="dashSeeSales" style="padding:7px 10px;min-height:auto">Ver todas</button></div><div id="dashSales"></div></article>
        <article class="dashPanel"><div class="dashPanelTitle"><strong>Alertas importantes</strong><span>Inventario</span></div><div class="dashAlerts" id="dashAlerts"></div></article>
      </div>
      <div class="dashBanner"><div><strong>¡Vas excelente este mes! ✨</strong><p>Resumen mensual según tus ventas registradas.</p></div><div class="dashBannerMetric" id="dashBannerMetric">S/ 0.00</div></div>`;
    main.insertBefore(section,main.firstChild);

    btn.addEventListener('click',()=>{try{switchView('dashboard')}catch{};refreshDashboard()});
    document.getElementById('dashNewSale')?.addEventListener('click',()=>document.getElementById('newSaleTop')?.click());
    document.getElementById('dashSeeSales')?.addEventListener('click',()=>{try{switchView('sales')}catch{}});
    document.getElementById('dashSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){try{switchView('products')}catch{};const q=document.getElementById('search');if(q){q.value=e.currentTarget.value;q.dispatchEvent(new Event('input',{bubbles:true}))}}});

    function data(){let ps=[],ss=[],ms=[];try{if(Array.isArray(products))ps=products}catch{}try{if(Array.isArray(sales))ss=sales}catch{}try{if(Array.isArray(movements))ms=movements}catch{}return{ps,ss,ms}}
    function refreshDashboard(){
      const {ps,ss,ms}=data(),now=new Date(),today=startOfDay(now);
      const todaySales=ss.filter(s=>new Date(s.date)>=today),monthSales=ss.filter(s=>sameMonth(new Date(s.date),now));
      let active=[];try{active=typeof activeSales==='function'?activeSales():ss}catch{active=ss}
      const low=ps.filter(p=>(+p.stock||0)<=Math.max(0,+p.reorderLevel||0));
      const todayTotal=todaySales.reduce((a,s)=>a+(+s.total||0),0),monthTotal=monthSales.reduce((a,s)=>a+(+s.total||0),0),cashTotal=active.reduce((a,s)=>a+(+s.total||0),0);
      dashToday.textContent=money(todayTotal);dashTodaySub.textContent=`${todaySales.length} venta${todaySales.length===1?'':'s'}`;dashMonth.textContent=money(monthTotal);dashProducts.textContent=ps.length;dashLow.textContent=low.length;dashCash.textContent=money(cashTotal);dashBannerMetric.textContent=money(monthTotal);
      const brand=document.querySelector('.brand h1')?.textContent?.trim();if(brand)dashBusinessName.textContent=brand;
      const days=[];for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);d.setHours(0,0,0,0);const n=new Date(d);n.setDate(d.getDate()+1);const total=ss.filter(s=>{const x=new Date(s.date);return x>=d&&x<n}).reduce((a,s)=>a+(+s.total||0),0);days.push({label:d.toLocaleDateString('es-PE',{weekday:'short'}).replace('.',''),total})}
      const max=Math.max(1,...days.map(x=>x.total));dashChart.innerHTML=days.map(x=>`<div class="dashDay"><div class="dashBarWrap"><div class="dashBar" style="height:${Math.max(4,Math.round((x.total/max)*100))}%"></div></div><small>${esc(x.label)}</small></div>`).join('');
      const counts={};ps.forEach(p=>{const c=String(p.category||'Sin categoría');counts[c]=(counts[c]||0)+1});const cats=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4);const totalCats=Math.max(1,cats.reduce((a,x)=>a+x[1],0));const perc=cats.map(x=>x[1]/totalCats*100);dashDonut.style.setProperty('--d1',(perc[0]||0).toFixed(1)+'%');dashDonut.style.setProperty('--d2',((perc[0]||0)+(perc[1]||0)).toFixed(1)+'%');dashDonut.style.setProperty('--d3',((perc[0]||0)+(perc[1]||0)+(perc[2]||0)).toFixed(1)+'%');dashCatTotal.textContent=`${ps.length} productos`;dashLegend.innerHTML=cats.length?cats.map(([name,count])=>`<div class="dashLegendRow"><span>${esc(name)}</span><b>${count}</b></div>`).join(''):'<div class="dashEmpty">Sin categorías todavía.</div>';
      const recentSales=[...ss].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3).map(s=>({date:s.date,title:'Nueva venta',text:money(s.total),icon:'↗'}));const recentMoves=[...ms].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,2).map(m=>({date:m.date,title:m.type==='add'?'Ingreso de inventario':'Movimiento de inventario',text:m.name||'',icon:'◇'}));const recent=[...recentSales,...recentMoves].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);dashActivity.innerHTML=recent.length?recent.map(r=>`<div class="dashActivityRow"><div class="dashActivityIcon">${r.icon}</div><div class="dashActivityText"><strong>${esc(r.title)}</strong><span>${esc(r.text)}</span></div><span class="dashActivityTime">${new Date(r.date).toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'})}</span></div>`).join(''):'<div class="dashEmpty">Aún no hay actividad.</div>';
      const last=[...ss].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);dashSales.innerHTML=last.length?`<div style="overflow:auto"><table class="dashSalesTable"><thead><tr><th>ID</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody>${last.map(s=>`<tr><td>#${esc(String(s.id||'').slice(-8))}</td><td>${new Date(s.date).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td>${money(s.total)}</td><td><span class="dashStatus">Completada</span></td></tr>`).join('')}</tbody></table></div>`:'<div class="dashEmpty">Todavía no hay ventas registradas.</div>';
      const noStock=ps.filter(p=>(+p.stock||0)<=0).length;dashAlerts.innerHTML=`<div class="dashAlert pink"><div class="dashAlertIcon">!</div><div><strong>${low.length} productos con stock bajo</strong><span>Revisa inventario y reposición.</span></div><span>›</span></div><div class="dashAlert orange"><div class="dashAlertIcon">!</div><div><strong>${noStock} productos sin stock</strong><span>No están disponibles para venta.</span></div><span>›</span></div><div class="dashAlert blue"><div class="dashAlertIcon">↗</div><div><strong>${monthSales.length} ventas este mes</strong><span>Total ${money(monthTotal)}</span></div><span>›</span></div>`;
    }
    window.refreshVareliaDashboard=refreshDashboard;
    document.addEventListener('click',()=>setTimeout(refreshDashboard,120));document.addEventListener('change',()=>setTimeout(refreshDashboard,120));
    setTimeout(()=>{try{switchView('dashboard')}catch{};refreshDashboard()},150);
  });
})();