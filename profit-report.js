(()=>{
  if(window.__vareliaProfitReport)return; window.__vareliaProfitReport=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const money=n=>'S/ '+(Number(n)||0).toFixed(2);
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const arr=n=>{try{return Array.isArray(window[n])?window[n]:eval('typeof '+n+'!=="undefined"&&Array.isArray('+n+')?'+n+':[]')}catch{return[]}};
    const products=()=>Array.isArray(window.products)?window.products:[], sales=()=>Array.isArray(window.sales)?window.sales:[];
    const findProduct=it=>products().find(p=>String(p.id)===String(it.id||it.productId))||products().find(p=>String(p.barcode||'')===String(it.barcode||'')&&String(it.barcode||''));
    const qty=it=>Number(it.qty??it.quantity??1)||1;
    const sell=it=>{const p=findProduct(it);return Number(it.sellPrice??it.price??p?.sellPrice??0)||0};
    const buy=it=>{const p=findProduct(it);return Number(it.buyPrice??it.cost??p?.buyPrice??0)||0};
    const line=it=>{const q=qty(it),s=sell(it),b=buy(it);return {name:it.name||findProduct(it)?.name||'Producto',q,s,b,revenue:s*q,cost:b*q,profit:(s-b)*q}};
    const dateOf=s=>new Date(s.date||s.createdAt||0);
    const ymd=d=>{const z=new Date(d);return z.getFullYear()+'-'+String(z.getMonth()+1).padStart(2,'0')+'-'+String(z.getDate()).padStart(2,'0')};
    const css=document.createElement('style');css.id='vareliaProfitReportCss';css.textContent=
      '.vrp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}.vrp-kpi{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:var(--shadow)}.vrp-kpi small{display:block;color:var(--muted);font-weight:800;font-size:11px}.vrp-kpi strong{display:block;font-size:22px;margin-top:5px}.vrp-table{width:100%;border-collapse:separate;border-spacing:0;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}.vrp-table th,.vrp-table td{padding:10px 11px;border-bottom:1px solid var(--line);text-align:left;font-size:12px}.vrp-table th{background:var(--bg);font-size:11px;color:var(--muted)}.vrp-table tr:last-child td{border-bottom:0}.vrp-profit{font-weight:900}.vrp-good{color:#15803d}.vrp-bad{color:#b91c1c}.vrp-sale{border:1px solid var(--line);border-radius:16px;background:var(--card);margin:10px 0;overflow:hidden}.vrp-salehead{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;background:var(--bg);font-weight:900}.vrp-salehead small{display:block;color:var(--muted);font-weight:700}.vrp-salebody{overflow:auto}.vrp-note{color:var(--muted);font-size:11px;margin-top:6px}.vrp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}@media(max-width:760px){.vrp-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.vrp-table{min-width:720px}.vrp-salebody{overflow-x:auto}}';document.head.appendChild(css);
    const reportsGroup=document.getElementById('reportsGroup');
    if(reportsGroup){const sub=reportsGroup.querySelector('.submenu');if(sub&&!sub.querySelector('[data-view="profit"]')){const b=document.createElement('button');b.dataset.view='profit';b.textContent='💰 Ganancias y reportes';sub.appendChild(b)}}
    const main=document.querySelector('main.content'); if(!main)return;
    let sec=document.getElementById('profit');
    if(!sec){sec=document.createElement('section');sec.id='profit';sec.className='view';main.appendChild(sec)}
    function render(){
      const all=sales().slice().sort((a,b)=>dateOf(b)-dateOf(a));
      const rows=[];all.forEach(s=>(Array.isArray(s.items)?s.items:[]).forEach(it=>rows.push({...line(it),sale:s})));
      const revenue=rows.reduce((a,r)=>a+r.revenue,0),cost=rows.reduce((a,r)=>a+r.cost,0),profit=revenue-cost,margin=revenue?profit/revenue*100:0;
      sec.innerHTML='<div class="head"><div><h2>Ganancias y reportes</h2><p class="notice">Aquí ves la ganancia real por producto: costo del proveedor, precio de venta y cuánto ganas.</p></div><button class="btn secondary" id="vrpRefresh">Actualizar</button></div>'+
        '<div class="vrp-actions"><label style="flex:1;min-width:170px">Desde<input id="vrpFrom" type="date"></label><label style="flex:1;min-width:170px">Hasta<input id="vrpTo" type="date"></label><button class="btn primary" id="vrpApply" style="align-self:end">Aplicar</button></div>'+
        '<div class="vrp-kpis"><div class="vrp-kpi"><small>Ventas</small><strong>'+money(revenue)+'</strong></div><div class="vrp-kpi"><small>Costo de productos</small><strong>'+money(cost)+'</strong></div><div class="vrp-kpi"><small>Ganancia</small><strong class="'+(profit>=0?'vrp-good':'vrp-bad')+'">'+money(profit)+'</strong></div><div class="vrp-kpi"><small>Margen</small><strong>'+margin.toFixed(1)+'%</strong></div></div>'+(
          rows.length?'<div style="overflow:auto"><table class="vrp-table"><thead><tr><th>Fecha</th><th>Producto</th><th>Costo proveedor</th><th>Precio venta</th><th>Cantidad</th><th>Ganancia por unidad</th><th>Ganancia total</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(ymd(r.sale.date))+'</td><td><b>'+esc(r.name)+'</b></td><td>'+money(r.b)+'</td><td>'+money(r.s)+'</td><td>'+r.q+'</td><td class="'+(r.s-r.b>=0?'vrp-good':'vrp-bad')+'">'+money(r.s-r.b)+'</td><td class="vrp-profit '+(r.profit>=0?'vrp-good':'vrp-bad')+'">'+money(r.profit)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Todavía no hay ventas registradas para calcular ganancias.</div>')+
        '<p class="vrp-note">La ganancia se calcula así: <b>precio de venta − costo del proveedor</b>, multiplicado por la cantidad vendida. Ya no se usa “ticket promedio” para esta métrica.</p>';
      const from=document.getElementById('vrpFrom'),to=document.getElementById('vrpTo');
      document.getElementById('vrpApply').onclick=()=>renderFiltered(from.value,to.value);
      document.getElementById('vrpRefresh').onclick=render;
    }
    function renderFiltered(from,to){
      const original=sales(); const filtered=original.filter(s=>{const d=ymd(dateOf(s));return (!from||d>=from)&&(!to||d<=to)});
      const rows=[];filtered.forEach(s=>(Array.isArray(s.items)?s.items:[]).forEach(it=>rows.push({...line(it),sale:s})));
      const revenue=rows.reduce((a,r)=>a+r.revenue,0),cost=rows.reduce((a,r)=>a+r.cost,0),profit=revenue-cost,margin=revenue?profit/revenue*100:0;
      const k=sec.querySelectorAll('.vrp-kpi strong');if(k.length){k[0].textContent=money(revenue);k[1].textContent=money(cost);k[2].textContent=money(profit);k[2].className=profit>=0?'vrp-good':'vrp-bad';k[3].textContent=margin.toFixed(1)+'%'}
      const tbody=sec.querySelector('.vrp-table tbody');if(tbody)tbody.innerHTML=rows.map(r=>'<tr><td>'+esc(ymd(r.sale.date))+'</td><td><b>'+esc(r.name)+'</b></td><td>'+money(r.b)+'</td><td>'+money(r.s)+'</td><td>'+r.q+'</td><td class="'+(r.s-r.b>=0?'vrp-good':'vrp-bad')+'">'+money(r.s-r.b)+'</td><td class="vrp-profit '+(r.profit>=0?'vrp-good':'vrp-bad')+'">'+money(r.profit)+'</td></tr>').join('');
    }
    document.addEventListener('click',e=>{const b=e.target.closest('[data-view="profit"]');if(!b)return;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));sec.classList.add('active');document.querySelectorAll('.nav [data-view]').forEach(x=>x.classList.remove('active'));b.classList.add('active');render();});
    let tries=0;const t=setInterval(()=>{tries++;if(arr('products').length||arr('sales').length){render();if(tries>10)clearInterval(t)}if(tries>40)clearInterval(t)},500);
    window.addEventListener('varelia:business-scope-ready',()=>setTimeout(render,300));window.addEventListener('focus',()=>{if(sec.classList.contains('active'))render()});
  });
})();