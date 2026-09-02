(()=>{
  const money=n=>'S/ '+(Number(n)||0).toFixed(2);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const icon=(name)=>({
    dashboard:'⌂',products:'◇',inventory:'▥',categories:'◇',suppliers:'▱',purchases:'▣',sales:'⌁',cash:'▣',appearance:'⚙',reports:'◔',profit:'⌁',help:'?'
  }[name]||'•');
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    const side=document.getElementById('sidebar'),nav=side?.querySelector('.nav'),main=document.querySelector('main.content');
    if(!side||!nav||!main)return;

    /* Preserve original buttons and actions; only re-present them. */
    if(!side.querySelector('.premiumBrand')){
      const brand=document.createElement('div');brand.className='premiumBrand';brand.innerHTML='<div class="premiumBrandTop"><span></span><b>VARELIA</b></div><strong>STORE</strong>';side.insertBefore(brand,nav);
    }
    const labels={products:'Productos',inventory:'Inventario',categories:'Categorías',suppliers:'Proveedores',purchases:'Órdenes',sales:'Ventas',cash:'Caja',appearance:'Ajustes'};
    nav.querySelectorAll('[data-view]').forEach(b=>{const k=b.dataset.view;if(labels[k])b.innerHTML=`<span class="premiumNavIcon">${icon(k)}</span><span>${labels[k]}</span>`});
    const supplierMenu=document.getElementById('supplierMenu');if(supplierMenu)supplierMenu.innerHTML=`<span class="premiumNavIcon">${icon('suppliers')}</span><span>COMPRAS</span><span class="premiumChevron">⌃</span>`;

    if(!nav.querySelector('[data-view="dashboard"]')){
      const dashBtn=document.createElement('button');dashBtn.type='button';dashBtn.className='premiumDashBtn';dashBtn.dataset.view='dashboard';dashBtn.innerHTML=`<span class="premiumNavIcon">${icon('dashboard')}</span><span>Dashboard</span>`;nav.insertBefore(dashBtn,nav.firstChild);
    }
    const dashBtn=nav.querySelector('[data-view="dashboard"]');

    const ensureSection=(cls,text,before)=>{if(nav.querySelector('.'+cls))return;const d=document.createElement('div');d.className='premiumNavSection '+cls;d.textContent=text;before?nav.insertBefore(d,before):nav.appendChild(d)};
    ensureSection('premiumSecPurch','COMPRAS',document.getElementById('supplierGroup'));
    const salesBtn=nav.querySelector('[data-view="sales"]');ensureSection('premiumSecSales','VENTAS',salesBtn);
    const appearanceBtn=nav.querySelector('[data-view="appearance"]');ensureSection('premiumSecReports','REPORTES',appearanceBtn);
    if(appearanceBtn&&!nav.querySelector('.premiumReportsItem')){
      const reports=document.createElement('button');reports.type='button';reports.className='premiumReportsItem';reports.innerHTML=`<span class="premiumNavIcon">${icon('reports')}</span><span>Reportes</span>`;reports.onclick=()=>{try{switchView('cash')}catch{}};nav.insertBefore(reports,appearanceBtn);
      const gain=document.createElement('button');gain.type='button';gain.className='premiumGainItem';gain.innerHTML=`<span class="premiumNavIcon">${icon('profit')}</span><span>Ganancias</span>`;gain.onclick=()=>{try{switchView('cash')}catch{}};nav.insertBefore(gain,appearanceBtn);
    }
    if(!nav.querySelector('.premiumHelpItem')){const h=document.createElement('button');h.type='button';h.className='premiumHelpItem';h.innerHTML=`<span class="premiumNavIcon">?</span><span>Ayuda</span>`;h.onclick=()=>window.vareliaToast?.('Centro de ayuda próximamente');nav.appendChild(h)}
    if(!side.querySelector('.premiumPlan')){const p=document.createElement('div');p.className='premiumPlan';p.innerHTML='<div>♛ <b>Plan Premium</b></div><small>Tu sistema está actualizado</small><a href="#" onclick="return false">Ver beneficios →</a>';side.appendChild(p)}

    let section=document.getElementById('dashboard');
    if(!section){section=document.createElement('section');section.id='dashboard';section.className='view vareliaDashboard';main.insertBefore(section,main.firstChild)}
    section.innerHTML=`
      <div class="premiumWelcome">
        <div class="premiumHello"><div class="helloAvatar">●</div><div><h2>¡Hola, <span id="dashBusinessName">Milagros</span>! 👋</h2><p>Ventas e inventario</p><span class="dashSync"><i></i> Sincronizado <span id="dashSyncCount"></span></span></div></div>
        <button class="premiumNewSale" id="dashNewSale">＋ Nueva venta</button>
      </div>
      <div class="premiumKpis premiumKpisTop">
        <article class="premiumKpi"><span class="kIcon pink">↗</span><div><small>Ventas hoy</small><strong id="dashToday">S/ 0.00</strong><em id="dashTodaySub">0 ventas</em></div></article>
        <article class="premiumKpi"><span class="kIcon purple">▣</span><div><small>Ventas del mes</small><strong id="dashMonth">S/ 0.00</strong><em class="positive">↑ 0% vs mes anterior</em></div></article>
        <article class="premiumKpi"><span class="kIcon blue">◇</span><div><small>Productos</small><strong id="dashProducts">0</strong><em>En catálogo</em></div></article>
      </div>
      <div class="premiumKpis premiumKpisSecond">
        <article class="premiumKpi wide"><span class="kIcon orange">△</span><div><small>Stock bajo</small><strong id="dashLow">0</strong><em>Productos</em></div></article>
        <article class="premiumKpi wide"><span class="kIcon green">▣</span><div><small>Caja actual</small><strong id="dashCash">S/ 0.00</strong><em>Ventas de caja activa</em></div></article>
      </div>
      <div class="premiumCharts">
        <article class="premiumPanel chartPanel"><div class="panelHead"><b>Ventas de los últimos 7 días</b><span>Esta semana⌄</span></div><div class="lineChart" id="dashChart"></div><div class="chartLegend"><i></i> Ventas (S/)</div></article>
        <article class="premiumPanel donutPanel"><div class="panelHead"><b>Ventas por categoría</b></div><div class="donutArea"><div class="dashDonut" id="dashDonut"></div><div class="dashLegend" id="dashLegend"></div></div></article>
      </div>
      <article class="premiumPanel activityPanel"><div class="panelHead"><b>Actividad reciente</b><a>Ver todas →</a></div><div id="dashActivity"></div></article>
      <div class="premiumBottom">
        <article class="premiumPanel"><div class="panelHead"><b>Últimas ventas</b><a id="dashSeeSales">Ver todas →</a></div><div id="dashSales"></div></article>
        <article class="premiumPanel"><div class="panelHead"><b>Alertas importantes</b><a>Ver todas →</a></div><div id="dashAlerts"></div></article>
      </div>
      <div class="premiumGoal"><div class="goalTrophy">🏆</div><div class="goalText"><b>¡Vas excelente<br>este mes! 🎉</b><span>Llevas <strong id="dashPctText">0%</strong> más en ventas<br>comparado con el mes anterior.</span></div><div class="goalMetric"><span>Meta mensual</span><b>S/ 30,000</b><div class="goalBar"><i id="dashGoalBar"></i></div><em id="dashGoalPct">0%</em></div><div class="goalRocket">🚀</div></div>
      <footer class="premiumFooter">© 2026 Varelia Store. Todos los derechos reservados.</footer>`;

    document.getElementById('dashNewSale')?.addEventListener('click',()=>document.getElementById('newSaleTop')?.click());
    document.getElementById('dashSeeSales')?.addEventListener('click',()=>{try{switchView('sales')}catch{}});
    dashBtn?.addEventListener('click',()=>{try{switchView('dashboard')}catch{};refreshDashboard()});

    function data(){let ps=[],ss=[],ms=[];try{if(Array.isArray(products))ps=products}catch{}try{if(Array.isArray(sales))ss=sales}catch{}try{if(Array.isArray(movements))ms=movements}catch{}return{ps,ss,ms}}
    function refreshDashboard(){
      const {ps,ss,ms}=data(),now=new Date();const sod=new Date(now);sod.setHours(0,0,0,0);
      const today=ss.filter(s=>new Date(s.date)>=sod),month=ss.filter(s=>{const d=new Date(s.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()});
      const todayTotal=today.reduce((a,s)=>a+(+s.total||0),0),monthTotal=month.reduce((a,s)=>a+(+s.total||0),0),low=ps.filter(p=>(+p.stock||0)<=Math.max(0,+p.reorderLevel||0)),noStock=ps.filter(p=>(+p.stock||0)<=0).length;
      let active=[];try{active=typeof activeSales==='function'?activeSales():ss}catch{active=ss}const cash=active.reduce((a,s)=>a+(+s.total||0),0);
      const brand=document.querySelector('.brand h1')?.textContent?.trim();if(brand)dashBusinessName.textContent=brand;dashToday.textContent=money(todayTotal);dashTodaySub.textContent=`${today.length} venta${today.length===1?'':'s'}`;dashMonth.textContent=money(monthTotal);dashProducts.textContent=ps.length;dashLow.textContent=low.length;dashCash.textContent=money(cash);dashSyncCount.textContent=`(${ps.length} prod.)`;
      const goal=30000,pct=Math.min(100,Math.round(monthTotal/goal*100));dashGoalBar.style.width=pct+'%';dashGoalPct.textContent=pct+'%';dashPctText.textContent='0%';
      const days=[];for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);d.setHours(0,0,0,0);const e=new Date(d);e.setDate(d.getDate()+1);const total=ss.filter(s=>{const x=new Date(s.date);return x>=d&&x<e}).reduce((a,s)=>a+(+s.total||0),0);days.push({label:d.toLocaleDateString('es-PE',{weekday:'short'}).replace('.',''),total})}
      const max=Math.max(1000,...days.map(x=>x.total));dashChart.innerHTML='<div class="yAxis"><span>S/ 1000</span><span>S/ 750</span><span>S/ 500</span><span>S/ 250</span><span>S/ 0</span></div><div class="plot"><div class="gridLines"></div><svg viewBox="0 0 700 220" preserveAspectRatio="none"><polyline fill="none" stroke="#f0066e" stroke-width="4" points="'+days.map((x,i)=>`${20+i*110},${205-(x.total/max*180)}`).join(' ')+'"/>'+days.map((x,i)=>`<circle cx="${20+i*110}" cy="${205-(x.total/max*180)}" r="6" fill="#f0066e"/>`).join('')+'</svg><div class="xAxis">'+days.map(x=>`<span>${esc(x.label)}</span>`).join('')+'</div></div>';
      const counts={};ps.forEach(p=>{const c=String(p.category||'Otros');counts[c]=(counts[c]||0)+1});const cats=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4),total=Math.max(1,cats.reduce((a,x)=>a+x[1],0));const vals=cats.map(x=>x[1]/total*100);dashDonut.style.setProperty('--d1',(vals[0]||25)+'%');dashDonut.style.setProperty('--d2',((vals[0]||25)+(vals[1]||25))+'%');dashDonut.style.setProperty('--d3',((vals[0]||25)+(vals[1]||25)+(vals[2]||25))+'%');dashLegend.innerHTML=(cats.length?cats:[['Accesorios',0],['Tecnología',0],['Hogar',0],['Otros',0]]).map(([n,c],i)=>`<div><i class="c${i}"></i><span>${esc(n)}</span><b>${ps.length?Math.round(c/total*100):0}%</b></div>`).join('');
      const recent=[...ss].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3).map((s,i)=>({icon:i?'◇':'🛒',title:'Nueva venta #'+String(s.id||'').slice(-8),sub:money(s.total),time:new Date(s.date).toLocaleDateString('es-PE')}));if(ms[0])recent.push({icon:'▣',title:'Producto actualizado',sub:ms[0].name||'Inventario',time:'Reciente'});dashActivity.innerHTML=(recent.length?recent:[{icon:'🛒',title:'Sin actividad reciente',sub:'Tus movimientos aparecerán aquí',time:''}]).map((r,i)=>`<div class="activityRow"><span class="aIcon a${i%4}">${r.icon}</span><div><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></div><em>${esc(r.time)}</em></div>`).join('');
      const last=[...ss].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);dashSales.innerHTML=last.length?`<table class="premiumTable"><thead><tr><th>ID</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody>${last.map(s=>`<tr><td>#${esc(String(s.id||'').slice(-6))}</td><td>${new Date(s.date).toLocaleDateString('es-PE')}</td><td>${money(s.total)}</td><td><span>✓</span></td></tr>`).join('')}</tbody></table>`:'<div class="premiumEmpty">Todavía no hay ventas registradas.</div>';
      dashAlerts.innerHTML=`<div class="premiumAlert pink"><span>△</span><div><b>${low.length} productos con stock bajo</b><small>Revisa el inventario y realiza nuevos pedidos.</small></div><em>→</em></div><div class="premiumAlert orange"><span>△</span><div><b>${noStock} productos sin stock</b><small>Estos productos no están disponibles.</small></div><em>→</em></div><div class="premiumAlert blue"><span>▥</span><div><b>Ventas del mes</b><small>Total ${money(monthTotal)}</small></div><em>→</em></div>`;
    }
    window.refreshVareliaDashboard=refreshDashboard;
    setTimeout(()=>{refreshDashboard();try{switchView('dashboard')}catch{}},250);
  });
})();