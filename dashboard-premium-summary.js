(()=>{
  if(window.__vareliaPremiumSummary)return;
  window.__vareliaPremiumSummary=true;

  const money=n=>'S/ '+(Number(n)||0).toFixed(2);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const arr=n=>{try{return Array.isArray(window[n])?window[n]:eval(`typeof ${n}!=='undefined'&&Array.isArray(${n})?${n}:[]`)}catch{return[]}};

  const style=document.createElement('style');
  style.id='vareliaPremiumSummaryCss';
  style.textContent=`
    .dashPremiumSummary{margin-top:14px;border:1px solid #eadcff;border-radius:20px;background:linear-gradient(135deg,#fff,#fbf7ff 55%,#fff5fa);padding:17px;box-shadow:0 10px 26px rgba(83,35,145,.06)}
    .dashPremiumSummaryHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.dashPremiumSummaryHead h3{margin:0;font-size:15px;letter-spacing:-.01em}.dashPremiumSummaryHead p{margin:4px 0 0;color:#7b8190;font-size:10px}.dashPremiumBadge{padding:6px 9px;border-radius:999px;background:#f3e8ff;color:#7e22ce;font-size:9px;font-weight:950;white-space:nowrap}
    .dashPremiumGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.dashPremiumMetric{min-height:98px;padding:13px;border:1px solid #ece8f3;border-radius:15px;background:#fff;position:relative;overflow:hidden}.dashPremiumMetric small{display:block;color:#7b8190;font-size:10px;font-weight:800;margin-bottom:7px}.dashPremiumMetric strong{display:block;font-size:19px;letter-spacing:-.025em}.dashPremiumMetric em{display:block;margin-top:6px;color:#858b98;font-size:9px;font-style:normal;line-height:1.35}.dashPremiumMetric .good{color:#16a34a}.dashPremiumMetric .bad{color:#dc2626}
    .dashPremiumSummary.locked{cursor:pointer}.dashPremiumSummary.locked .dashPremiumMetric{background:#fafafa}.dashPremiumSummary.locked .dashPremiumMetric strong{filter:blur(5px);user-select:none;color:#6b7280}.dashPremiumSummary.locked .dashPremiumMetric:after{content:'🔒';position:absolute;right:10px;top:10px;font-size:12px}.dashPremiumUnlock{margin-top:12px;width:100%;border:0;border-radius:13px;padding:11px 14px;background:linear-gradient(135deg,#ec4899,#7c3aed);color:#fff;font-size:11px;font-weight:950}.dashPremiumFoot{margin-top:10px;color:#7b8190;font-size:9px;line-height:1.4}
    @media(max-width:820px){.dashPremiumGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:520px){.dashPremiumSummary{padding:13px;border-radius:17px}.dashPremiumMetric{min-height:88px;padding:11px}.dashPremiumMetric strong{font-size:17px}.dashPremiumSummaryHead h3{font-size:14px}}
  `;
  document.head.appendChild(style);

  function saleCost(s,products){
    return (Array.isArray(s.items)?s.items:[]).reduce((sum,it)=>{
      const q=Number(it.qty||it.quantity||1)||1;
      const p=products.find(x=>String(x.id)===String(it.id||it.productId));
      const c=Number(it.buyPrice??it.cost??p?.buyPrice??0)||0;
      return sum+c*q;
    },0);
  }

  function monthSales(offset=0){
    const now=new Date(),target=new Date(now.getFullYear(),now.getMonth()+offset,1),y=target.getFullYear(),m=target.getMonth();
    return arr('sales').filter(s=>{const d=new Date(s.date);return d.getFullYear()===y&&d.getMonth()===m});
  }

  function premiumData(){
    const ps=arr('products'),ss=monthSales(0),prev=monthSales(-1);
    const revenue=ss.reduce((a,s)=>a+(Number(s.total)||0),0);
    const cost=ss.reduce((a,s)=>a+saleCost(s,ps),0);
    const profit=revenue-cost,margin=revenue>0?profit/revenue*100:0;
    const prevRevenue=prev.reduce((a,s)=>a+(Number(s.total)||0),0);
    const change=prevRevenue>0?((revenue-prevRevenue)/prevRevenue*100):(revenue>0?100:0);
    const by={};
    ss.forEach(s=>(Array.isArray(s.items)?s.items:[]).forEach(it=>{
      const id=String(it.id||it.productId||it.name||'');
      const p=ps.find(x=>String(x.id)===id);
      const name=it.name||p?.name||'Producto';
      const q=Number(it.qty||it.quantity||1)||1;
      const sell=Number(it.sellPrice??it.price??p?.sellPrice??0)||0;
      const buy=Number(it.buyPrice??it.cost??p?.buyPrice??0)||0;
      by[name]=(by[name]||0)+(sell-buy)*q;
    }));
    const best=Object.entries(by).sort((a,b)=>b[1]-a[1])[0]||['Sin datos',0];
    return{revenue,cost,profit,margin,change,best};
  }

  function isPremium(){try{return typeof window.vareliaIsPremium==='function'&&window.vareliaIsPremium()}catch{return false}}

  function ensure(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return null;
    let box=document.getElementById('dashPremiumSummary');
    if(box)return box;
    box=document.createElement('section');box.id='dashPremiumSummary';box.className='dashPremiumSummary';
    const anchor=dashboard.querySelector('.premiumKpisSecond')||dashboard.querySelector('.premiumKpisTop');
    if(anchor)anchor.insertAdjacentElement('afterend',box);else dashboard.appendChild(box);
    box.addEventListener('click',e=>{
      if(isPremium())return;
      if(!e.target.closest('.dashPremiumUnlock')&&!box.classList.contains('locked'))return;
      e.preventDefault();
      if(typeof window.vareliaRequirePremium==='function')window.vareliaRequirePremium('Resumen avanzado de Inicio');
      else document.querySelector('.premiumPlan a')?.click();
    });
    return box;
  }

  function render(){
    const box=ensure();if(!box)return;
    if(!isPremium()){
      box.classList.add('locked');
      box.innerHTML=`<div class="dashPremiumSummaryHead"><div><h3>👑 Resumen Premium</h3><p>Rentabilidad, comparativas y productos más rentables.</p></div><span class="dashPremiumBadge">PREMIUM</span></div><div class="dashPremiumGrid"><div class="dashPremiumMetric"><small>Ganancia bruta del mes</small><strong>S/ 888.88</strong><em>Ingresos menos costo de productos</em></div><div class="dashPremiumMetric"><small>Margen del mes</small><strong>88.8%</strong><em>Rentabilidad sobre ventas</em></div><div class="dashPremiumMetric"><small>Producto más rentable</small><strong>Producto Premium</strong><em>Detalle calculado por producto</em></div><div class="dashPremiumMetric"><small>Comparativa mensual</small><strong>+88.8%</strong><em>Ventas vs mes anterior</em></div></div><button type="button" class="dashPremiumUnlock">🔒 Desbloquear Resumen Premium</button><div class="dashPremiumFoot">El Inicio básico, ventas, stock y accesos rápidos siguen disponibles sin Premium.</div>`;
      return;
    }
    box.classList.remove('locked');
    const d=premiumData(),changeClass=d.change>=0?'good':'bad',changeText=(d.change>=0?'+':'')+d.change.toFixed(1)+'%';
    box.innerHTML=`<div class="dashPremiumSummaryHead"><div><h3>👑 Resumen Premium</h3><p>Análisis avanzado de tu negocio en este mes.</p></div><span class="dashPremiumBadge">✓ ACTIVO</span></div><div class="dashPremiumGrid"><div class="dashPremiumMetric"><small>Ganancia bruta del mes</small><strong class="${d.profit>=0?'good':'bad'}">${money(d.profit)}</strong><em>Ingresos ${money(d.revenue)} · costo ${money(d.cost)}</em></div><div class="dashPremiumMetric"><small>Margen del mes</small><strong class="${d.margin>=0?'good':'bad'}">${d.margin.toFixed(1)}%</strong><em>Rentabilidad calculada con costo de compra</em></div><div class="dashPremiumMetric"><small>Producto más rentable</small><strong>${esc(d.best[0])}</strong><em>Ganancia estimada: ${money(d.best[1])}</em></div><div class="dashPremiumMetric"><small>Comparativa mensual</small><strong class="${changeClass}">${changeText}</strong><em>Ventas vs mes anterior</em></div></div><div class="dashPremiumFoot">Los cálculos dependen de los costos de compra registrados en tus productos y ventas.</div>`;
  }

  let tries=0;const boot=setInterval(()=>{tries++;render();if(document.getElementById('dashPremiumSummary')&&tries>12)clearInterval(boot);if(tries>40)clearInterval(boot)},500);
  setTimeout(render,1800);setTimeout(render,3500);
  window.addEventListener('varelia:business-scope-ready',()=>setTimeout(render,350));
  window.addEventListener('focus',render);window.addEventListener('pageshow',render);
  document.addEventListener('click',e=>{if(e.target.closest('#dashNewSale,.premiumDashBtn,[data-view="dashboard"]'))setTimeout(render,250)},true);
  setInterval(render,30000);
  window.refreshVareliaPremiumSummary=render;
})();