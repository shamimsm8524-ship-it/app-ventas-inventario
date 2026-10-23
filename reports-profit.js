(()=>{
  const money=n=>'S/ '+(Number(n)||0).toFixed(2);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const arr=n=>{try{return Array.isArray(window[n])?window[n]:eval(`typeof ${n}!=='undefined'&&Array.isArray(${n})?${n}:[]`)}catch{return[]}};
  const style=()=>{if(document.getElementById('vareliaReportsCss'))return;const s=document.createElement('style');s.id='vareliaReportsCss';s.textContent=`
  .vareliaExtraView{padding:2px 0 30px}.extraHead{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:18px}.extraHead h2{margin:0;font-size:27px;letter-spacing:-.035em}.extraHead p{margin:5px 0 0;color:var(--muted);font-size:13px}.extraActions{display:flex;gap:8px;flex-wrap:wrap}.dayPickerWrap{margin:0 0 18px;background:linear-gradient(145deg,color-mix(in srgb,var(--p) 5%,var(--card)),var(--card));border:1px solid var(--line);border-radius:22px;padding:14px;box-shadow:0 10px 28px rgba(15,23,42,.055)}.monthNav{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:10px;margin-bottom:12px}.monthArrow{width:44px;height:44px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);font-size:23px;font-weight:900;cursor:pointer}.monthCenter{text-align:center;min-width:0}.monthTitle{display:block;font-size:19px;font-weight:950;letter-spacing:-.025em;text-transform:capitalize}.monthSub{display:block;margin-top:2px;font-size:11px;color:var(--muted);font-weight:700}.monthTools{display:flex;justify-content:center;margin:0 0 10px}.monthAll{border:1px solid color-mix(in srgb,var(--p) 25%,var(--line));background:color-mix(in srgb,var(--p) 5%,var(--card));color:var(--p);padding:9px 15px;border-radius:999px;font-weight:900;cursor:pointer}.monthAll.active{background:linear-gradient(135deg,#f0066e,#a92bf5);color:#fff;border-color:transparent}.dayStrip{display:flex;gap:8px;overflow-x:auto;padding:2px 1px 6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}.dayBtn{scroll-snap-align:center;flex:0 0 54px;height:64px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:16px;font-weight:900;cursor:pointer;display:grid;place-items:center;align-content:center;gap:2px;box-shadow:0 3px 10px rgba(15,23,42,.035)}.dayBtn small{font-size:9px;line-height:1;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.dayBtn b{font-size:19px;line-height:1}.dayBtn.active{background:linear-gradient(145deg,#f0066e,#b820f7);color:#fff;border-color:transparent;box-shadow:0 10px 22px rgba(229,0,113,.24)}.dayBtn.active small{color:#ffe7f4}@media(max-width:560px){.dayPickerWrap{padding:12px;border-radius:19px}.monthTitle{font-size:18px}.monthArrow{width:40px;height:40px}.dayBtn{flex-basis:50px;height:60px;border-radius:14px}}.extraBtn{border:1px solid var(--line);background:var(--card);color:var(--ink);padding:10px 13px;border-radius:12px;font-weight:800;cursor:pointer}.extraBtn.active,.extraBtn.primary{background:linear-gradient(135deg,#f0066e,#a92bf5);color:#fff;border-color:transparent}.extraGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.extraCard{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 10px 28px rgba(15,23,42,.055)}.extraCard small{display:block;color:var(--muted);font-size:11px;font-weight:800}.extraCard strong{display:block;font-size:23px;margin-top:7px;letter-spacing:-.03em}.extraPanel{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:17px;box-shadow:0 10px 30px rgba(15,23,42,.055);margin-bottom:14px}.extraPanel h3{margin:0 0 13px;font-size:15px}.extraTable{width:100%;border-collapse:collapse}.extraTable th,.extraTable td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);font-size:11px}.extraTable th{color:var(--muted);font-weight:800}.profitGood{color:#16a34a}.profitBad{color:#dc2626}.extraEmpty{padding:24px;text-align:center;color:var(--muted);font-size:12px}.reportOpsGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.reportOpsCard{border:1px solid var(--line);border-radius:18px;padding:16px;background:linear-gradient(145deg,color-mix(in srgb,var(--p) 4%,var(--card)),var(--card))}.reportOpsCard h4{margin:0 0 6px;font-size:15px}.reportOpsCard p{margin:0 0 12px;color:var(--muted);font-size:11px;line-height:1.45}.reportOpsEmail{display:block;margin:0 0 11px;color:var(--p);font-weight:900;font-size:11px;word-break:break-all}.reportOpsBtns{display:grid;gap:8px}.reportOpsBtn{width:100%;min-height:46px;border:1px solid var(--line);border-radius:13px;background:var(--card);color:var(--ink);font-weight:900;padding:10px 12px}.reportOpsBtn.primary{background:linear-gradient(135deg,#f0066e,#a92bf5);color:#fff;border-color:transparent}.reportOpsBtn.danger{background:#fff1f2;color:#be123c;border-color:#fecdd3}.reportCashValue{display:block;font-size:24px;font-weight:950;margin:2px 0 12px}@media(max-width:760px){.reportOpsGrid{grid-template-columns:1fr}}.extraHelpGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.extraHelpItem{padding:15px;border:1px solid var(--line);border-radius:16px;background:var(--card)}.extraHelpItem b{display:block;margin-bottom:5px}.extraHelpItem span{font-size:12px;color:var(--muted);line-height:1.45}@media(max-width:760px){.extraHead{flex-direction:column}.extraGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.extraCard strong{font-size:19px}.extraActions{width:100%}.extraBtn{flex:1}.extraHelpGrid{grid-template-columns:1fr}.extraTable th:nth-child(2),.extraTable td:nth-child(2){display:none}}
  `;document.head.appendChild(s)};
  function show(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('#sidebar .nav button').forEach(b=>b.classList.remove('active'));const cls=id==='reports'?'.premiumReportsItem':id==='profit'?'.premiumGainItem':id==='help'?'.premiumHelpItem':null;if(cls)document.querySelector(cls)?.classList.add('active');document.getElementById('sidebar')?.classList.remove('open','show');document.querySelector('.overlay')?.classList.remove('show');}
  function saleCost(s,products){return (Array.isArray(s.items)?s.items:[]).reduce((sum,it)=>{const q=Number(it.qty||it.quantity||1)||1;const p=products.find(x=>String(x.id)===String(it.id||it.productId));const c=Number(it.buyPrice??it.cost??p?.buyPrice??0)||0;return sum+c*q},0)}
  function periodSales(days){const sales=arr('sales'),now=new Date();if(days==='month')return sales.filter(s=>{const d=new Date(s.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()});if(String(days).startsWith('day:')){const n=Number(String(days).split(':')[1]);return sales.filter(s=>{const d=new Date(s.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===n})}const cutoff=new Date(now);cutoff.setDate(now.getDate()-Number(days||30));return sales.filter(s=>new Date(s.date)>=cutoff)}
  function paymentName(s){const v=String(s?.paymentMethod||'').trim();return v||'No registrado'}
  function sellerName(s){const v=String(s?.sellerName||'').trim();return v||'Sin registrar'}
  function soldDetail(s){return (Array.isArray(s.items)?s.items:[]).map(i=>{const q=Number(i.qty??i.quantity??1)||1,name=String(i.name||i.productName||'Producto').trim()||'Producto';const bits=[name+' ×'+q];const color=String(i.color||i.variantColor||'').trim(),weight=String(i.weight||i.peso||'').trim(),size=String(i.size||i.talla||'').trim();if(color)bits.push('Color: '+color);if(weight)bits.push('Peso: '+weight);if(size)bits.push('Talla: '+size);return bits.map(esc).join(' · ')}).join('<br>')}
  function reportPeriodSales(range,monthDate){const sales=arr('sales'),y=monthDate.getFullYear(),m=monthDate.getMonth();return sales.filter(s=>{const d=new Date(s.date);if(d.getFullYear()!==y||d.getMonth()!==m)return false;if(range==='month')return true;if(String(range).startsWith('day:'))return d.getDate()===Number(String(range).split(':')[1]);return true})}
  function monthLabel(d){const x=d.toLocaleDateString('es-PE',{month:'long',year:'numeric'});return x.charAt(0).toUpperCase()+x.slice(1)}
  function weekdayLabel(y,m,d){const x=new Date(y,m,d).toLocaleDateString('es-PE',{weekday:'short'}).replace('.','');return x.slice(0,3)}
  function makeReports(main){let sec=document.getElementById('reports');if(!sec){sec=document.createElement('section');sec.id='reports';sec.className='view vareliaExtraView';main.appendChild(sec)}const now=new Date();let monthDate=new Date(now.getFullYear(),now.getMonth(),1),range='day:'+now.getDate();const render=()=>{const ss=reportPeriodSales(range,monthDate),ps=arr('products'),pu=arr('purchases'),mv=arr('movements');const revenue=ss.reduce((a,s)=>a+(Number(s.total)||0),0);const units=ss.reduce((a,s)=>a+(Array.isArray(s.items)?s.items.reduce((x,i)=>x+(Number(i.qty||i.quantity||1)||1),0):0),0);const low=ps.filter(p=>(Number(p.stock)||0)<=Math.max(0,Number(p.reorderLevel)||0)).length;const purchaseTotal=pu.reduce((a,p)=>a+(Number(p.total)||0),0);const payTotals={Efectivo:0,Yape:0,Plin:0,Transferencia:0,Tarjeta:0,Otro:0,'No registrado':0},payCounts={Efectivo:0,Yape:0,Plin:0,Transferencia:0,Tarjeta:0,Otro:0,'No registrado':0},sellerTotals={},soldByProduct={};ss.forEach(s=>{const raw=paymentName(s),methodMap={'cash':'Efectivo','efectivo':'Efectivo','yape':'Yape','plin':'Plin','transferencia':'Transferencia','transfer':'Transferencia','tarjeta':'Tarjeta','card':'Tarjeta','pago mixto':'Pago mixto'};let k=methodMap[raw.toLowerCase()]||raw;const total=Number(s.total)||0;let breakdown=s.paymentBreakdown||s.paymentDetails?.breakdown||s.payment?.breakdown||null;if(!breakdown&&s.paymentMethodBreakdown)breakdown=s.paymentMethodBreakdown;if(breakdown&&typeof breakdown==='object'){let any=false;Object.entries(breakdown).forEach(([name,value])=>{const mk=methodMap[String(name).toLowerCase()]||name;const amount=Number(value)||0;if(amount>0){payTotals[mk]=(payTotals[mk]||0)+amount;any=true}});if(any){const keys=Object.keys(breakdown).filter(name=>Number(breakdown[name])>0);keys.forEach(name=>{const mk=methodMap[String(name).toLowerCase()]||name;payCounts[mk]=(payCounts[mk]||0)+1})}else{payTotals[k]=(payTotals[k]||0)+total;payCounts[k]=(payCounts[k]||0)+1}}else{payTotals[k]=(payTotals[k]||0)+total;payCounts[k]=(payCounts[k]||0)+1}const sk=sellerName(s);if(!sellerTotals[sk])sellerTotals[sk]={total:0,count:0};sellerTotals[sk].total+=total;sellerTotals[sk].count+=1;(Array.isArray(s.items)?s.items:[]).forEach(it=>{const id=String(it.id||it.productId||it.name||'');const p=ps.find(x=>String(x.id)===id);const name=String(it.name||p?.name||'Producto');const q=Number(it.qty??it.quantity??1)||1;const rawUnit=String(it.unit||it.saleUnit||it.unitType||it.measureUnit||it.measure||it.presentation||p?.unit||p?.saleUnit||p?.unitType||p?.measureUnit||p?.measure||p?.presentation||p?.unidad||p?.unidades||'').trim();const unitText=rawUnit.toLowerCase();const itemQty=Number(it.qty??it.quantity??1)||1;const isWeight=it.saleType==='weight'||it.byWeight===true||p?.saleType==='weight'||p?.byWeight===true||['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos'].includes(unitText)||(!Number.isInteger(itemQty)&&itemQty>0);const unit=isWeight?'kg':(rawUnit||'unid.');if(!soldByProduct[name])soldByProduct[name]={qty:0,unit,weighted:false};soldByProduct[name].qty+=q;if(isWeight){soldByProduct[name].unit='kg';soldByProduct[name].weighted=true}else if(unit!==soldByProduct[name].unit&&!soldByProduct[name].weighted)soldByProduct[name].unit='unid.'})});const topProducts=Object.entries(soldByProduct).sort((a,b)=>b[1].qty-a[1].qty).slice(0,8);const validSales=ss.filter(s=>!s.cancelled&&!s.canceled&&!s.voided&&!['cancelada','anulada','cancelled','voided'].includes(String(s.status||s.state||'').toLowerCase()));const validRevenue=validSales.reduce((a,s)=>a+(Number(s.total)||0),0);const generatedTicketCount=new Set(validSales.map(s=>String(s.receiptNumber||s.receipt_number||s.receiptNo||s.ticketNumber||s.ticket_number||s.ticketNo||s.ticket||'').trim().toUpperCase()).filter(Boolean)).size;const averageTicket=generatedTicketCount?validRevenue/generatedTicketCount:0;const sellerRows=Object.entries(sellerTotals).sort((a,b)=>b[1].total-a[1].total);const top=[...ss].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);let currentCashSales=[];try{currentCashSales=typeof activeSales==='function'?activeSales():arr('sales').filter(s=>new Date(s.date)>=new Date(typeof cashStart!=='undefined'?cashStart:0))}catch{}const currentCashTotal=currentCashSales.reduce((a,s)=>a+(Number(s.total)||0),0);sec.innerHTML=`<div class="extraHead"><div><h2>Reportes</h2><p>Análisis general de ventas, inventario, compras y movimientos.</p></div><div class="extraActions"><button class="extraBtn primary" id="exportReportCsv">Exportar CSV</button></div></div><div class="dayPickerWrap"><div class="monthNav"><button class="monthArrow" type="button" data-month-shift="-1" aria-label="Mes anterior">‹</button><div class="monthCenter"><span class="monthTitle">${monthLabel(monthDate)}</span><span class="monthSub">Elige un día para ver su reporte</span></div><button class="monthArrow" type="button" data-month-shift="1" aria-label="Mes siguiente">›</button></div><div class="monthTools"><button class="monthAll ${range==='month'?'active':''}" type="button" data-r="month">Todo el mes</button></div><div class="dayStrip">${Array.from({length:new Date(monthDate.getFullYear(),monthDate.getMonth()+1,0).getDate()},(_,i)=>i+1).map(d=>`<button type="button" class="dayBtn ${range==='day:'+d?'active':''}" data-day="${d}"><small>${weekdayLabel(monthDate.getFullYear(),monthDate.getMonth(),d)}</small><b>${d}</b></button>`).join('')}</div></div><div class="extraGrid"><div class="extraCard"><small>Ventas</small><strong>${money(revenue)}</strong></div><div class="extraCard"><small>Transacciones válidas</small><strong>${validSales.length}</strong></div><div class="extraCard"><small>Ticket promedio</small><strong>${money(averageTicket)}</strong></div><div class="extraCard"><small>Unidades vendidas</small><strong>${Number(units.toFixed(3))}</strong></div><div class="extraCard"><small>Stock bajo</small><strong>${low}</strong></div></div><div class="extraGrid"><div class="extraCard"><small>Productos</small><strong>${ps.length}</strong></div><div class="extraCard"><small>Compras registradas</small><strong>${pu.length}</strong></div><div class="extraCard"><small>Valor de compras</small><strong>${money(purchaseTotal)}</strong></div><div class="extraCard"><small>Movimientos inventario</small><strong>${mv.length}</strong></div></div><div class="extraPanel"><h3>Pagos por método</h3><div class="extraGrid"><div class="extraCard"><small>Efectivo · ${payCounts.Efectivo} trans.</small><strong>${money(payTotals.Efectivo)}</strong></div><div class="extraCard"><small>Yape · ${payCounts.Yape} trans.</small><strong>${money(payTotals.Yape)}</strong></div><div class="extraCard"><small>Plin · ${payCounts.Plin} trans.</small><strong>${money(payTotals.Plin)}</strong></div><div class="extraCard"><small>Transferencia · ${payCounts.Transferencia} trans.</small><strong>${money(payTotals.Transferencia)}</strong></div><div class="extraCard"><small>Tarjeta · ${payCounts.Tarjeta} trans.</small><strong>${money(payTotals.Tarjeta)}</strong></div></div></div><div class="extraPanel"><h3>Productos más vendidos</h3>${topProducts.length?`<div style="overflow:auto"><table class="extraTable"><thead><tr><th>Producto</th><th>Cantidad vendida</th></tr></thead><tbody>${topProducts.map(([n,v])=>`<tr><td>${esc(n)}</td><td>${Number(v.qty.toFixed(3))} ${esc(v.unit)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="extraEmpty">No hay productos vendidos en este período.</div>'}</div><div class="extraPanel"><h3>Ventas por vendedor</h3>${sellerRows.length?`<div class="extraGrid">${sellerRows.map(([n,v])=>`<div class="extraCard"><small>${esc(n)} · ${v.count} venta${v.count===1?'':'s'}</small><strong>${money(v.total)}</strong></div>`).join('')}</div>`:'<div class="extraEmpty">Todavía no hay ventas registradas por vendedor en este período.</div>'}</div><div class="extraPanel"><h3>Opciones del reporte</h3><div class="reportOpsGrid"><div class="reportOpsCard"><h4>📧 Guardar copia del reporte</h4><p>Envía una copia de tus Ventas + Caja al correo afiliado antes de hacer un cierre.</p><span class="reportOpsEmail" id="reportBackupEmail">Correo afiliado: Detectando…</span><div class="reportOpsBtns"><button type="button" class="reportOpsBtn primary" id="reportBackupSend">Guardar copia en Gmail</button><button type="button" class="reportOpsBtn danger" id="reportWeekClose">Cerrar semana</button></div></div><div class="reportOpsCard"><h4>💵 Cierre de caja</h4><p>Cierra únicamente la caja activa y guarda el cierre en el historial.</p><span class="reportCashValue">${money(currentCashTotal)}</span><button type="button" class="reportOpsBtn danger" id="reportCashClose">Cerrar caja y poner en S/ 0.00</button></div></div></div><div class="extraPanel"><h3>Ventas recientes del período</h3>${top.length?`<div style="overflow:auto"><table class="extraTable"><thead><tr><th>ID</th><th>Fecha</th><th>Vendedor</th><th>Método de pago</th><th>Total</th><th>Productos</th><th>Detalle vendido</th></tr></thead><tbody>${top.map(s=>`<tr><td>#${esc(String(s.id||'').slice(-7))}</td><td>${new Date(s.date).toLocaleString('es-PE')}</td><td>${esc(sellerName(s))}</td><td>${esc(paymentName(s))}</td><td>${money(s.total)}</td><td>${Array.isArray(s.items)?s.items.reduce((n,i)=>n+(Number(i.qty??i.quantity??1)||1),0):0}</td><td>${soldDetail(s)||'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="extraEmpty">No hay ventas en este período.</div>'}</div>`;sec.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{range=b.dataset.r;render()});sec.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{range='day:'+b.dataset.day;render()});requestAnimationFrame(()=>{const strip=sec.querySelector('.dayStrip'),active=sec.querySelector('.dayBtn.active');if(strip&&active){strip.scrollLeft=Math.max(0,active.offsetLeft-(strip.clientWidth-active.offsetWidth)/2)}});sec.querySelectorAll('[data-month-shift]').forEach(b=>b.onclick=()=>{const currentDay=String(range).startsWith('day:')?Number(String(range).split(':')[1]):1;monthDate=new Date(monthDate.getFullYear(),monthDate.getMonth()+Number(b.dataset.monthShift),1);const maxDay=new Date(monthDate.getFullYear(),monthDate.getMonth()+1,0).getDate();if(String(range).startsWith('day:'))range='day:'+Math.min(currentDay,maxDay);render()});const backupEmail=sec.querySelector('#reportBackupEmail');if(backupEmail){const fill=async()=>{let e='';try{e=await window.VareliaWeeklyReport?.getEmail?.()}catch{}if(!e)e=document.getElementById('vareliaUserEmail')?.textContent?.trim()||'';backupEmail.textContent='Correo afiliado: '+(e||'No disponible')};fill()}sec.querySelector('#reportBackupSend')?.addEventListener('click',()=>{if(window.VareliaWeeklyReport?.send)return window.VareliaWeeklyReport.send();document.getElementById('weeklySend')?.click()});sec.querySelector('#reportWeekClose')?.addEventListener('click',()=>{if(window.VareliaWeeklyReport?.close)return window.VareliaWeeklyReport.close();document.getElementById('weeklyReset')?.click()});sec.querySelector('#reportCashClose')?.addEventListener('click',()=>{if(!currentCashSales.length)return alert('No hay ventas en la caja activa.');if(!confirm('¿Cerrar la caja actual y ponerla en S/ 0.00?'))return;document.getElementById('closeCash')?.click();setTimeout(render,120)});sec.querySelector('#exportReportCsv').onclick=async()=>{const rows=[['ID','Fecha','Vendedor','Método de pago','Total'],...ss.map(s=>[s.id||'',s.date||'',sellerName(s),paymentName(s),Number(s.total)||0])];const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const periodTag=range==='month'?`${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}`:`${monthDate.getFullYear()}-${String(monthDate.getMonth()+1).padStart(2,'0')}-${String(String(range).split(':')[1]).padStart(2,'0')}`,name=`reporte-varelia-${periodTag}.csv`,blob=new Blob([csv],{type:'text/csv;charset=utf-8'});try{if(typeof File==='function'&&navigator.share&&navigator.canShare){const file=new File([blob],name,{type:'text/csv'});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Reporte Varelia'});window.vareliaToast?.('Reporte listo para guardar o compartir.');return}}}catch(e){if(e&&e.name==='AbortError')return}try{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);window.vareliaToast?.('CSV descargado.')}catch(e){const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove()}};};render();return sec}
  function profitCostSummary(salesList, productList){
    let total=0, estimatedLines=0, unknownLines=0;
    for(const sale of salesList){
      for(const item of Array.isArray(sale.items)?sale.items:[]){
        const qty=Number(item.qty??item.quantity??1);
        if(!Number.isFinite(qty)){unknownLines++;continue}
        const product=productList.find(p=>String(p.id)===String(item.id??item.productId??item.product_id));
        const originalCost=item.buyPriceAtSale??item.buy_price_at_sale??item.buyPrice??item.buy_price??item.costAtSale??item.cost;
        const saved=originalCost!==null&&originalCost!==undefined&&originalCost!==''&&Number.isFinite(Number(originalCost));
        const currentCost=product?.buyPrice??product?.buy_price;
        if(!saved)estimatedLines++;
        const cost=saved?originalCost:currentCost;
        if(cost===null||cost===undefined||cost===''||!Number.isFinite(Number(cost))){unknownLines++;continue}
        total+=Number(cost)*qty;
      }
    }
    return {total,estimatedLines,unknownLines};
  }
  function makeProfit(main){
    let sec=document.getElementById('profit');
    if(!sec){sec=document.createElement('section');sec.id='profit';sec.className='view vareliaExtraView';main.appendChild(sec)}
    const render=()=>{
      const ss=periodSales('month').filter(s=>!s.cancelled&&!s.canceled&&!s.voided&&!['cancelada','anulada','cancelled','voided'].includes(String(s.status||s.state||'').toLowerCase()));
      const ps=arr('products');
      const revenue=ss.reduce((a,s)=>a+(Number(s.total)||0),0);
      const summary=profitCostSummary(ss,ps);
      const cost=summary.total,profit=revenue-cost;
      const isEstimate=summary.estimatedLines>0;
      const costLabel=isEstimate?' (estimado)':'';
      const costDisplay=summary.unknownLines?'No disponible':money(cost);
      const by={};
      ss.forEach(s=>(s.items||[]).forEach(it=>{
        const id=String(it.id||it.productId||it.name||'');
        const p=ps.find(x=>String(x.id)===id);
        const name=it.name||p?.name||'Producto';
        const q=Number(it.qty??it.quantity??1)||1;
        const sell=Number(it.sellPrice??it.price??p?.sellPrice??0)||0;
        const buy=Number(it.buyPriceAtSale??it.buy_price_at_sale??it.buyPrice??it.buy_price??it.costAtSale??it.cost??p?.buyPrice??p?.buy_price??0)||0;
        by[name]=(by[name]||0)+(sell-buy)*q
      }));
      const tops=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,8);
      const note=summary.unknownLines
        ?'<p class="notice">⚠️ Faltan datos de costo en '+summary.unknownLines+' línea(s) vendida(s). No se presenta un total incompleto como si fuera exacto.</p>'
        :(isEstimate?'<p class="notice">⚠️ Costo estimado: '+summary.estimatedLines+' línea(s) no guardaron su costo histórico; se usó el precio de compra actual.</p>':'<p class="notice">Costos calculados con los precios de compra guardados en las ventas.</p>');
      sec.innerHTML=`<div class="extraHead"><div><h2>Ganancias</h2><p>Rentabilidad del mes calculada con ventas y costo de compra.</p></div><div class="extraActions"><button class="extraBtn" id="refreshProfit">Actualizar</button></div></div>
      <div class="extraGrid">
        <div class="extraCard"><small>Ventas del mes</small><strong>${money(revenue)}</strong></div>
        <div class="extraCard"><small>Costo total de productos vendidos${costLabel}</small><strong>${costDisplay}</strong></div>
        <div class="extraCard"><small>Ganancia bruta${costLabel}</small><strong class="${profit>=0?'profitGood':'profitBad'}">${summary.unknownLines?'No disponible':money(profit)}</strong></div>
      </div>
      ${note}
      <div class="extraPanel"><h3>Detalle por producto</h3>${tops.length?`<table class="extraTable"><thead><tr><th>Producto</th><th>Ganancia</th></tr></thead><tbody>${tops.map(([n,v])=>`<tr><td>${esc(n)}</td><td class="${v>=0?'profitGood':'profitBad'}">${money(v)}</td></tr>`).join('')}</tbody></table>`:'<div class="extraEmpty">Aún no hay datos suficientes para calcular ganancias por producto.</div>'}</div>`;
      sec.querySelector('#refreshProfit').onclick=render;
    };
    render();return sec
  }

  // Costos, precios y ganancias por artículo. Solo lectura.
  function gainValidSales(){
    return arr('sales').filter(s=>s&&!s.cancelled&&!s.canceled&&!s.voided&&
      !['cancelada','anulada','cancelled','voided'].includes(String(s.status||s.state||'').toLowerCase()));
  }
  // Conservar las ventas que Ganancias ya vio durante esta sesión.
  // Una recarga asíncrona de perfil/Supabase no puede convertirlas en cero.
  let gainStickyLocalSales=[];
  const gainSaleIdentity=s=>{
    const ids=[s?.cloudSaleId,s?.cloud_sale_id,s?.saleId,s?.sale_id,s?.id,s?.receiptNumber,s?.receipt_number,s?.receiptNo,s?.ticketNumber,s?.ticket_number].map(v=>String(v??'').trim()).filter(Boolean);
    if(ids.length)return 'id:'+ids[0];
    return 'fallback:'+String(s?.date??s?.created_at??s?.createdAt??'')+'|'+String(Number(s?.total)||0);
  };
  const gainIsValidSale=s=>s&&!s.cancelled&&!s.canceled&&!s.voided&&!['cancelada','anulada','cancelled','voided'].includes(String(s.status||s.state||'').toLowerCase());
  function gainRememberLocalSales(list){
    for(const sale of Array.isArray(list)?list:[]){
      if(!gainIsValidSale(sale))continue;
      const key=gainSaleIdentity(sale);
      const at=gainStickyLocalSales.findIndex(x=>gainSaleIdentity(x)===key);
      if(at>=0)gainStickyLocalSales[at]={...gainStickyLocalSales[at],...sale};else gainStickyLocalSales.push({...sale});
    }
    return gainStickyLocalSales;
  }
  function gainStoredSales(){
    try{
      const key=(typeof K!=='undefined'&&K?.sales)?K.sales:'';
      if(!key)return [];
      const parsed=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(parsed)?parsed.filter(gainIsValidSale):[];
    }catch{return []}
  }
  function gainLocalSales(){
    gainRememberLocalSales(gainStoredSales());
    gainRememberLocalSales(gainValidSales());
    return [...gainStickyLocalSales];
  }
  gainRememberLocalSales(gainStoredSales());
  gainRememberLocalSales(gainValidSales());
  // Leer la fecha escogida en Historial, no la fecha de hoy ni la de un ticket.
  function gainHistoryDate(){
    const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const pattern=/^(?:📅\s*|🗓️\s*)?(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i;
    const valid=(year,month,day)=>{
      const y=Number(year),m=Number(month),d=Number(day);
      const dt=new Date(y,m-1,d);
      return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d
        ?[String(y),String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-'):'';
    };
    const elements=document.querySelectorAll('button,[role="button"],label,span,strong,div');
    for(const element of elements){
      if(element.closest('[data-gain-date-picker],[data-gain-period-buttons],[data-report-synced],[data-gain-per-product]'))continue;
      const value=String(element.textContent||'').trim().replace(/\s+/g,' ');
      if(value.length>56)continue;
      const match=value.match(pattern);
      if(!match)continue;
      const index=months.indexOf(match[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
      if(index>=0){
        const result=valid(match[3],index+1,match[1]);
        if(result)return result;
      }
    }
    // Cuando el botón muestra únicamente "Día", el calendario puede guardar
    // la selección en un input o un atributo data-*.
    for(const field of document.querySelectorAll('input[type="date"]')){
      if(field.closest('[data-gain-date-picker],#profit,[data-report-synced]'))continue;
      const value=String(field.value||'');
      if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&valid(...[value.slice(0,4),value.slice(5,7),value.slice(8,10)]))return value;
    }
    return '';
  }
  function gainSalesPeriod(salesList,period,now=new Date(),chosenDay=''){
    if(period==='all')return salesList;
    return salesList.filter(s=>{
      const date=new Date(s.date??s.created_at??s.createdAt??'');
      if(!Number.isFinite(date.getTime()))return false;
      if(period==='day'){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(chosenDay))return false;
        const iso=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
        return iso===chosenDay;
      }
      if(date.getFullYear()!==now.getFullYear())return false;
      if(period==='month')return date.getMonth()===now.getMonth();
      return date.getMonth()===now.getMonth()&&date.getDate()===now.getDate();
    });
  }
  function gainItemData(item,products){
    const id=String(item.productId??item.product_id??item.id??'');
    const name=String(item.name??item.product_name??item.productName??'').trim();
    const match=products.find(p=>String(p.id)===id||String(p._cloudId||'')===id||String(p.legacy_id||'')===id)||
      products.find(p=>String(p.name||'').trim().toLowerCase()===name.toLowerCase());
    const title=name||String(match?.name||'Producto');
    const normalizeUnit=value=>String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const rawUnit=normalizeUnit(item.sale_unit??item.saleUnit??item.unit??match?.unit??'Unidad');
    const productUnit=normalizeUnit((match?.unit??item.product_unit??item.productUnit??rawUnit)||'unidad');
    const kgUnits=['kg','kilo','kilos','kilogramo','kilogramos'];
    const gramUnits=['g','gr','gramo','gramos'];
    const rawIsKg=kgUnits.includes(rawUnit),rawIsGram=gramUnits.includes(rawUnit);
    const productIsKg=kgUnits.includes(productUnit),productIsGram=gramUnits.includes(productUnit);
    const unit=productIsKg?'kg':productIsGram?'g':(rawIsKg?'kg':rawIsGram?'g':(rawUnit||'unidad'));
    const saleQty=Number(item.qty??item.quantity??1);
    const stockQty=item.stock_qty??item.stockQty;
    const stockNumber=stockQty==null||stockQty===''?NaN:Number(stockQty);
    const presentationId=String(item.sale_presentation_id??item.salePresentationId??item.presentation_id??item.presentationId??'').trim();
    const presentationUnits=Number(item.sale_presentation_units??item.salePresentationUnits??item.presentation_units??item.presentationUnits??0)||0;
    const medicinePresentation=!!match?.medicine&&['caja','cajas','box','boxes','blister','blisters','blisteres','pastilla','pastillas','pill','pills','tableta','tabletas'].includes(rawUnit);
    const presentationSale=!!presentationId||presentationUnits>1||medicinePresentation;

    // Cantidad visible en Ganancias: presentaciones para packs/cajas/blísteres,
    // peso real para kg/g y unidades reales para ventas unitarias.
    let qty;
    if(presentationSale)qty=saleQty;
    else if(Number.isFinite(stockNumber))qty=stockNumber;
    else if(rawIsGram&&productIsKg)qty=saleQty/1000;
    else qty=saleQty;

    const rawBuy=item.buyPriceAtSale??item.buy_price_at_sale??item.medicineBuyPriceAtSale??item.medicine_buy_price_at_sale??item.buyPrice??item.buy_price??item.costAtSale??item.cost;
    const saved=rawBuy!=null&&rawBuy!==''&&Number.isFinite(Number(rawBuy));
    const currentRaw=match?.buyPrice??match?.buy_price;
    const current=currentRaw!=null&&currentRaw!==''&&Number.isFinite(Number(currentRaw))?Number(currentRaw):NaN;
    let buy=saved?Number(rawBuy):NaN;
    let costQty=presentationSale?saleQty:qty;

    if(!saved){
      if(medicinePresentation){
        // Medicamentos: costo propio de caja, blíster o unidad.
        const medCost=(rawUnit==='caja'||rawUnit==='cajas'||rawUnit==='box'||rawUnit==='boxes')
          ?Number(match?.medicineBuyBoxPrice??match?.medicine_buy_box_price)
          :((rawUnit==='blister'||rawUnit==='blisters'||rawUnit==='blisteres')
            ?Number(match?.medicineBuyBlisterPrice??match?.medicine_buy_blister_price)
            :Number(match?.medicineBuyUnitPrice??match?.medicine_buy_unit_price));
        if(Number.isFinite(medCost)&&medCost>=0)buy=medCost;
        else if(Number.isFinite(current))buy=current;
        costQty=saleQty;
      }else if(presentationSale){
        // Six Pack, docena y otras presentaciones: costo base por unidad x unidades del pack.
        let units=presentationUnits;
        if(!(units>0)&&Number.isFinite(stockNumber)&&Number.isFinite(saleQty)&&saleQty>0)units=stockNumber/saleQty;
        const presentation=(match?.salePresentations||[]).find(p=>String(p.id)===presentationId);
        const explicitCost=presentation?.buyCost;
        if(explicitCost!=null&&explicitCost!==''&&Number.isFinite(Number(explicitCost)))buy=Number(explicitCost);
        else if(Number.isFinite(current)&&units>0)buy=current*units;
        else if(Number.isFinite(current))buy=current;
        costQty=saleQty;
      }else{
        // Unidad, kg y g: costo por la unidad real de inventario x cantidad real vendida.
        buy=current;
        costQty=qty;
      }
    }

    const rawPrice=item.unit_price??item.unitPrice??item.sellPrice??item.price??match?.sellPrice??match?.sell_price;
    const sell=rawPrice!=null&&rawPrice!==''&&Number.isFinite(Number(rawPrice))?Number(rawPrice):NaN;
    const rawSubtotal=item.subtotal??item.lineTotal??item.line_total;
    const subtotal=rawSubtotal!=null&&rawSubtotal!==''&&Number.isFinite(Number(rawSubtotal))?Number(rawSubtotal):saleQty*sell;
    return {id:id||title.toLowerCase(),name:title,unit,qty,costQty,saleQty,buy,sell,subtotal,estimated:!saved,presentationId,presentationUnits,presentationSale};
  }
  function gainProductSummary(salesList){
    const products=arr('products'),by=new Map();
    let revenue=0,missing=0,estimated=0,cost=0,unallocated=0;
    for(const sale of salesList){
      const total=Number(sale.total)||0;
      revenue+=total;
      const items=(Array.isArray(sale.items)?sale.items:[]).map(it=>gainItemData(it,products));
      if(!items.length){missing++;continue}
      const preTotal=items.reduce((sum,it)=>sum+(Number.isFinite(it.subtotal)?Math.max(0,it.subtotal):0),0);
      for(const it of items){
        const key=it.id+'|'+it.unit;
        if(!by.has(key))by.set(key,{name:it.name,unit:it.unit,qty:0,cost:0,revenue:0,buyWeighted:0,sellWeighted:0,buyQty:0,sellQty:0,minBuy:Infinity,maxBuy:-Infinity,minSell:Infinity,maxSell:-Infinity,estimated:0,missing:0});
        const p=by.get(key);
        const quantity=Number.isFinite(it.qty)?it.qty:0;
        p.qty+=quantity;
        let lineRevenue=NaN;
        if(preTotal>0&&Number.isFinite(it.subtotal)){
          lineRevenue=total*Math.max(0,it.subtotal)/preTotal;
        }else if(items.length===1){
          lineRevenue=total;
        }
        if(Number.isFinite(lineRevenue))p.revenue+=lineRevenue;
        else {p.missing++;unallocated++}
        if(!Number.isFinite(it.costQty)||!Number.isFinite(it.buy)){missing++;p.missing++}
        else{
          const lineCost=it.costQty*it.buy;
          cost+=lineCost;p.cost+=lineCost;
          p.buyWeighted+=lineCost;p.buyQty+=it.costQty;
          p.minBuy=Math.min(p.minBuy,it.buy);p.maxBuy=Math.max(p.maxBuy,it.buy);
        }
        // Mostrar precio de venta en la misma unidad que la cantidad reportada.
        const reportSell=Number.isFinite(lineRevenue)&&quantity>0
          ?lineRevenue/quantity
          :(Number.isFinite(it.subtotal)&&quantity>0?it.subtotal/quantity:it.sell);
        if(Number.isFinite(reportSell)&&quantity>0){
          p.sellWeighted+=reportSell*quantity;p.sellQty+=quantity;
          p.minSell=Math.min(p.minSell,reportSell);p.maxSell=Math.max(p.maxSell,reportSell);
        }else {p.missing++;missing++}
        if(it.estimated){p.estimated++;estimated++}
      }
    }
    const list=[...by.values()].sort((a,b)=>b.revenue-a.revenue||a.name.localeCompare(b.name,'es'));
    return {revenue,cost,count:salesList.length,estimated,missing,unallocated,list};
  }
  // Detalle de Ganancias por venta real. Mantiene la misma lógica de costo/precio
  // de gainItemData, pero no suma transacciones distintas entre sí.
  function gainSaleDetailLines(salesList){
    const products=arr('products'),lines=[];
    for(const sale of salesList){
      const items=(Array.isArray(sale.items)?sale.items:[]).map(it=>gainItemData(it,products));
      if(!items.length)continue;
      const total=Number(sale.total)||0;
      const preTotal=items.reduce((sum,it)=>sum+(Number.isFinite(it.subtotal)?Math.max(0,it.subtotal):0),0);
      const date=new Date(sale.date??sale.created_at??sale.createdAt??'');
      const saleTs=Number.isFinite(date.getTime())?date.getTime():0;
      const saleTime=saleTs?date.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false}):'Sin hora';
      items.forEach((it,itemIndex)=>{
        const quantity=Number.isFinite(it.qty)?it.qty:0;
        let lineRevenue=NaN;
        if(preTotal>0&&Number.isFinite(it.subtotal))lineRevenue=total*Math.max(0,it.subtotal)/preTotal;
        else if(items.length===1)lineRevenue=total;
        const hasCost=Number.isFinite(it.costQty)&&Number.isFinite(it.buy);
        const lineCost=hasCost?it.costQty*it.buy:NaN;
        const reportSell=Number.isFinite(lineRevenue)&&quantity>0
          ?lineRevenue/quantity
          :(Number.isFinite(it.subtotal)&&quantity>0?it.subtotal/quantity:it.sell);
        const hasSell=Number.isFinite(reportSell)&&quantity>0;
        let missing=0;
        if(!Number.isFinite(lineRevenue))missing++;
        if(!hasCost)missing++;
        if(!hasSell)missing++;
        lines.push({
          name:it.name,unit:it.unit,qty:quantity,
          cost:hasCost?lineCost:0,revenue:Number.isFinite(lineRevenue)?lineRevenue:0,
          buyWeighted:hasCost?lineCost:0,buyQty:hasCost?it.costQty:0,
          sellWeighted:hasSell?reportSell*quantity:0,sellQty:hasSell?quantity:0,
          minBuy:hasCost?it.buy:Infinity,maxBuy:hasCost?it.buy:-Infinity,
          minSell:hasSell?reportSell:Infinity,maxSell:hasSell?reportSell:-Infinity,
          estimated:it.estimated?1:0,missing,saleTime,saleTs,itemIndex
        });
      });
    }
    return lines.sort((a,b)=>b.saleTs-a.saleTs||a.itemIndex-b.itemIndex);
  }
  function gainPeriodTotals(salesList){
    const d=gainProductSummary(salesList);
    return {revenue:d.revenue,cost:d.cost,count:d.count,estimated:d.estimated,missing:d.missing};
  }

  // Los costos históricos están en Supabase; se leen usando la sesión activa y RLS del negocio.
  const gainCloud={sales:null,loadedAt:0,pending:null,error:''};
  async function gainReadCloud(){
    const sb=window.vareliaSupabase;
    if(!sb||!sb.auth||!sb.from)throw new Error('Conexión a la nube no disponible');
    const auth=await sb.auth.getUser();
    const user=auth?.data?.user;
    if(auth?.error||!user?.id)throw new Error('Sin sesión de nube');
    const p=await sb.from('profiles').select('business_id,role').eq('id',user.id).maybeSingle();
    const business=p?.data?.business_id;
    const isCashier=p?.data?.role!=='owner';
    if(p?.error||!business)throw new Error('Sin negocio vinculado');
    async function paginated(table,fields){
      let all=[],offset=0,step=500;
      while(true){
        const result=await sb.from(table).select(fields).eq('business_id',business).range(offset,offset+step-1);
        if(result.error)throw result.error;
        const batch=result.data||[];
        all=all.concat(batch);
        if(batch.length<step)return all;
        offset+=step;
        if(offset>=20000)throw new Error('El historial supera el límite de lectura del reporte');
      }
    }
    const rows=await paginated('varelia_sales','id,total,created_at,created_by');
    // RLS applies cashier ownership on the server. Repeat the ownership filter defensively.
    const scopedRows=isCashier?rows.filter(s=>String(s.created_by)===String(user.id)):rows;
    const details=await paginated('varelia_sale_items','sale_id,product_id,product_name,qty,stock_qty,sale_unit,unit_price,buy_price_at_sale,sale_presentation_id,sale_presentation_units');
    const bySale=new Map();
    for(const item of details){
      const k=String(item.sale_id);
      if(!bySale.has(k))bySale.set(k,[]);
      bySale.get(k).push(item);
    }
    return scopedRows.map(s=>({id:s.id,date:s.created_at,total:Number(s.total)||0,items:bySale.get(String(s.id))||[]}));
  }
  function gainLoadCloud(onDone){
    if(gainCloud.sales&&Date.now()-gainCloud.loadedAt<45000){
      if(onDone)onDone();
      return Promise.resolve(gainCloud.sales);
    }
    if(!gainCloud.pending){
      gainCloud.pending=gainReadCloud().then(sales=>{
        gainCloud.sales=sales;gainCloud.loadedAt=Date.now();gainCloud.error='';
        return sales;
      }).catch(err=>{
        gainCloud.error=String(err?.message||err||'Sin datos de nube');
        // No mostrar los valores anteriores de otra cuenta ni un historial de nube obsoleto.
        gainCloud.sales=null;gainCloud.loadedAt=0;
        return null;
      }).finally(()=>{gainCloud.pending=null});
    }
    return gainCloud.pending.then(()=>{if(onDone)onDone();return gainCloud.sales});
  }
  // La venta puede confirmarse mientras Ganancias o Reportes están abiertos.
  // Invalidar la copia previa y repintar sin recargar la APK.
  function gainInvalidateAndRefresh(){
    gainCloud.sales=null;gainCloud.loadedAt=0;
    if(document.querySelector('[data-gain-period-buttons]')){
      gainLoadCloud(()=>{
        const active=document.querySelector('[data-gain-period-buttons] [aria-pressed="true"]');
        // Cambiar el filtro al mismo valor provoca el repintado completo.
        if(active)active.click();
      });
    }
    if(document.querySelector('[data-report-synced]')){
      const box=document.querySelector('[data-report-synced]');
      if(box)delete box.dataset.reportSignature;
      reportEnhancePopup();
    }
  }
  window.addEventListener('varelia:sale-recorded',event=>{
    const detail=event?.detail||{};
    if(detail.sale)gainRememberLocalSales([detail.sale]);
    if(detail.sale||detail.source==='cloud-confirmed')gainInvalidateAndRefresh();
  });
  window.addEventListener('varelia:checkout-confirmed',event=>{
    if(event?.detail?.sale)gainRememberLocalSales([event.detail.sale]);
  });
  function enhanceGainPopup(){
    const headings=[...document.querySelectorAll('h1,h2,h3,h4')].filter(
      el=>el.textContent.trim().endsWith('Ganancias')&&!el.textContent.includes(' y ')
    );
    for(const heading of headings){
      let panel=null,revenueLabel=null,gainLabel=null;
      for(let e=heading.parentElement,depth=0;e&&e!==document.body&&depth<10;e=e.parentElement,depth++){
        const leaves=[...e.querySelectorAll('small,span,div,p,label')].filter(child=>child.children.length===0);
        const rev=leaves.find(child=>child.textContent.trim()==='Ventas');
        const gain=leaves.find(child=>/^(Ganancia estimada|Ganancia bruta)$/.test(child.textContent.trim()));
        if(rev&&gain){panel=e;revenueLabel=rev;gainLabel=gain;break}
      }
      if(!panel)continue;
      if(panel.querySelector('[data-gain-period-buttons]')){
        const selected=reportHistoryFilter();
        const day=selected.mode==='day'?(gainHistoryDate()||selected.date||''):'';
        const marker=selected.mode+':'+day;
        if(selected.known&&marker!==panel.dataset.gainHistoryMarker){
          panel.dataset.gainHistoryMarker=marker;
          if(typeof panel.__gainUseHistoryDate==='function')panel.__gainUseHistoryDate(selected,day);
        }
        continue;
      }
      const findCard=(label,otherLabel)=>{
        for(let e=label.parentElement,depth=0;e&&e!==panel&&depth<6;e=e.parentElement,depth++){
          if(e.contains(otherLabel))return null;
          if(/S\/\s*-?\s*[\d.,]+/.test(e.textContent||''))return e;
        }
        return null;
      };
      const revenueCard=findCard(revenueLabel,gainLabel),gainCard=findCard(gainLabel,revenueLabel);
      if(!revenueCard||!gainCard||revenueCard.parentElement!==gainCard.parentElement)continue;
      const row=revenueCard.parentElement;
      if(row.contains(heading))continue;
      const numberLeaf=card=>[...card.querySelectorAll('strong,b,span,div')].find(el=>
        el.children.length===0&&/S\/\s*-?\s*[\d.,]+/.test(el.textContent||''));
      const revValue=numberLeaf(revenueCard),gainValue=numberLeaf(gainCard);
      if(!revValue||!gainValue)continue;
      const selectedHistory=reportHistoryFilter();
      let chosenDay=selectedHistory.mode==='day'?(gainHistoryDate()||selectedHistory.date||''):'';
      let activePeriod=selectedHistory.known&&selectedHistory.mode==='day'?'day':
        selectedHistory.mode==='today'?'today':
        selectedHistory.mode==='month'?'month':
        selectedHistory.known&&selectedHistory.mode==='all'?'all':'today';
      const dateBar=document.createElement('div');
      dateBar.dataset.gainDatePicker='true';
      dateBar.style.cssText='display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin:12px 0 7px;width:100%;box-sizing:border-box;min-width:0;';
      const dateLabel=document.createElement('label');
      dateLabel.textContent='📅 Día elegido';
      dateLabel.style.cssText='font-size:13px;font-weight:800;color:#555;';
      const dateInput=document.createElement('input');
      dateInput.type='date';
      dateInput.setAttribute('aria-label','Fecha para calcular ganancias');
      dateInput.style.cssText='border:1px solid #ddd;border-radius:12px;padding:10px 8px;max-width:100%;min-width:0;background:#fff;color:#333;font-size:14px;box-sizing:border-box;';
      dateInput.value=chosenDay||[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-');
      dateBar.append(dateLabel,dateInput);
      const selector=document.createElement('div');
      selector.dataset.gainPeriodButtons='true';
      selector.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;width:100%;min-width:0;margin:5px 0 16px;box-sizing:border-box;';
      const buttons=[['today','Hoy'],['month','Este mes'],['all','Todo']].map(([value,title])=>{
        const btn=document.createElement('button');
        btn.type='button';btn.dataset.gainPeriod=value;btn.textContent=title;
        btn.style.cssText='min-width:0;padding:11px 4px;border-radius:12px;border:1px solid #ddd;background:#fff;color:#383838;font-weight:800;font-size:13px;cursor:pointer;box-sizing:border-box;';
        selector.append(btn);return btn;
      });
      const extras=document.createElement('div');
      extras.dataset.gainCosts='true';
      extras.style.cssText='display:grid;grid-template-columns:minmax(0,1fr);gap:12px;width:100%;min-width:0;margin:12px 0;box-sizing:border-box;';
      function card(label){
        const box=document.createElement('div');
        box.style.cssText='min-width:0;border:1px solid #ddd;border-radius:18px;padding:13px;box-sizing:border-box;overflow-wrap:anywhere;';
        const caption=document.createElement('div');caption.style.cssText='font-size:12px;color:#737782;line-height:1.35;';caption.textContent=label;
        const amount=document.createElement('strong');amount.style.cssText='display:block;font-size:clamp(18px,4.5vw,27px);line-height:1.3;margin-top:8px;overflow-wrap:anywhere;';
        box.append(caption,amount);extras.append(box);return {caption,amount};
      }
      const costCard=card('Costo total de productos vendidos');
      const sourceNote=document.createElement('p');
      sourceNote.style.cssText='font-size:12px;color:#64748b;line-height:1.4;margin:0 0 12px;';
      sourceNote.dataset.gainPeriodNote='true';
      const detail=document.createElement('section');
      detail.dataset.gainPerProduct='true';
      detail.style.cssText='width:100%;min-width:0;box-sizing:border-box;margin-top:12px;';
      const title=document.createElement('h3');title.textContent='Ganancia por producto';
      title.style.cssText='font-size:17px;margin:10px 0 12px;';
      const itemsBox=document.createElement('div');
      itemsBox.style.cssText='display:grid;gap:11px;max-height:350px;overflow-y:auto;min-width:0;';
      detail.append(title,itemsBox);
      row.insertAdjacentElement('beforebegin',dateBar);
      dateBar.insertAdjacentElement('afterend',selector);
      row.insertAdjacentElement('afterend',extras);
      extras.insertAdjacentElement('afterend',sourceNote);
      sourceNote.insertAdjacentElement('afterend',detail);
      panel.dataset.gainHistoryMarker=selectedHistory.mode+':'+(chosenDay||'');
      const draw=()=>{
        if(!document.contains(selector))return;
        const usingCloud=Array.isArray(gainCloud.sales);
        const localSales=gainLocalSales();
        let sourceSales=usingCloud?[...gainCloud.sales]:localSales;
        let pendingLocal=0;
        if(usingCloud&&localSales.length){
          const ids=s=>[s?.cloudSaleId,s?.cloud_sale_id,s?.saleId,s?.sale_id,s?.id].map(v=>String(v??'').trim()).filter(Boolean);
          const sameSale=(a,b)=>{
            const A=new Set(ids(a));
            if(ids(b).some(id=>A.has(id)))return true;
            const ta=new Date(a?.date??a?.created_at??'').getTime(),tb=new Date(b?.date??b?.created_at??'').getTime();
            const va=Number(a?.total),vb=Number(b?.total);
            return Number.isFinite(ta)&&Number.isFinite(tb)&&Math.abs(ta-tb)<=120000&&Number.isFinite(va)&&Number.isFinite(vb)&&Math.abs(va-vb)<0.001;
          };
          for(const sale of localSales){
            if(sourceSales.some(remote=>sameSale(remote,sale)))continue;
            sourceSales.push({...sale,__vareliaPendingCloud:true});
            pendingLocal++;
          }
        }
        const periodSales=gainSalesPeriod(sourceSales,activePeriod,new Date(),chosenDay);
        const pendingPeriod=periodSales.filter(s=>s?.__vareliaPendingCloud).length;
        const result=gainProductSummary(periodSales);
        const saleLines=gainSaleDetailLines(periodSales);
        const complete=result.missing===0;
        const estimated=result.estimated>0;
        const verifiedHistorical=usingCloud&&pendingPeriod===0&&complete&&!estimated;
        revValue.textContent=money(result.revenue);
        gainValue.textContent=complete?money(result.revenue-result.cost):'Sin datos';
        gainLabel.textContent=verifiedHistorical?'Ganancia bruta':'Ganancia estimada';
        // El popup original siempre muestra un aviso genérico que es falso
        // cuando todas las líneas de este período tienen costo histórico.
        // Suprimirlo aquí; los avisos reales se generan con los datos del período.
        const oldWarnings=[...panel.querySelectorAll('p,div,span,small,li')].filter(el=>{
          if(el.closest('[data-gain-period-note],[data-gain-per-product],[data-gain-costs]'))return false;
          const message=String(el.textContent||'').trim();
          return message.length<360&&
            /Algunas ventas usan el precio de compra actual del producto/i.test(message)&&
            /costo hist[oó]rico/i.test(message);
        }).sort((a,b)=>a.textContent.length-b.textContent.length);
        if(oldWarnings.length){
          const oldWarning=oldWarnings[0];
          oldWarning.style.setProperty('display','none','important');
        }
        const suffix=estimated?' (estimado)':'';
        costCard.caption.textContent='Costo total de productos vendidos'+suffix;
        costCard.amount.textContent=complete?money(result.cost):'Sin datos';
        const dayBadge=activePeriod==='day'?(chosenDay?' · Fecha: '+chosenDay:' · Elige una fecha válida'):'';
        sourceNote.textContent=(usingCloud?(pendingPeriod?'Supabase + '+pendingPeriod+' venta(s) local(es) pendiente(s) de sincronizar':'Costos históricos de Supabase'):'Datos locales; esperando costos históricos de la nube')+
          dayBadge+' · '+result.count+' venta(s)'+
          (result.missing?' · ⚠️ Faltan datos en '+result.missing+' línea(s)':'')+
          (estimated?' · ⚠️ '+result.estimated+' costo(s) calculado(s) con precio actual':'')+
          (!usingCloud&&gainCloud.error?' · '+gainCloud.error:'');
        dateBar.style.border=activePeriod==='day'?'1px solid #7c3aed':'1px solid transparent';
        dateBar.style.borderRadius='12px';
        buttons.forEach(btn=>{
          const active=btn.dataset.gainPeriod===activePeriod;
          btn.style.background=active?'#7c3aed':'#fff';
          btn.style.color=active?'#fff':'#383838';
          btn.style.borderColor=active?'#7c3aed':'#ddd';
          btn.setAttribute('aria-pressed',String(active));
        });
        itemsBox.replaceChildren();
        if(!saleLines.length){
          const empty=document.createElement('p');empty.textContent='No hay productos vendidos en este período.';
          empty.style.cssText='color:#64748b;font-size:13px;margin:5px 0;';
          itemsBox.append(empty);
        }
        function valueRow(container,label,value,highlight=false){
          const el=document.createElement('div');el.style.cssText='min-width:0;';
          const cap=document.createElement('div');cap.style.cssText='font-size:11px;color:#64748b;line-height:1.3;';cap.textContent=label;
          const big=document.createElement('strong');big.style.cssText='font-size:15px;line-height:1.4;overflow-wrap:anywhere;color:'+(highlight?'#16803b':'inherit')+';';
          big.textContent=value;el.append(cap,big);container.append(el);
        }
        for(const item of saleLines){
          const card=document.createElement('article');
          card.style.cssText='border:1px solid #ddd;border-radius:17px;padding:13px;min-width:0;box-sizing:border-box;';
          const name=document.createElement('h4');name.textContent=item.name;
          name.style.cssText='font-size:15px;margin:0 0 4px;font-weight:900;overflow-wrap:anywhere;';
          const time=document.createElement('div');time.textContent='Hora de venta: '+item.saleTime;
          time.style.cssText='font-size:11px;color:#64748b;font-weight:700;margin:0 0 11px;';
          const grid=document.createElement('div');
          grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0;';
          const avgBuy=item.buyQty>0?item.buyWeighted/item.buyQty:NaN;
          const avgSell=item.sellQty>0?item.sellWeighted/item.sellQty:NaN;
          const profitUnit=avgSell-avgBuy;
          const unitLabel=item.unit==='kg'?'kg':item.unit;
          const valid=item.missing===0;
          const buyLabel='Precio compra por '+unitLabel+(item.estimated?' (estimado)':'');
          valueRow(grid,buyLabel,Number.isFinite(avgBuy)?money(avgBuy):'Sin datos');
          valueRow(grid,'Precio venta por '+unitLabel,Number.isFinite(avgSell)?money(avgSell):'Sin datos');
          valueRow(grid,'Ganancia por '+unitLabel,valid&&Number.isFinite(profitUnit)?money(profitUnit):'Sin datos',true);
          valueRow(grid,'Cantidad vendida',Number(item.qty.toFixed(3))+' '+unitLabel);
          // Importe de la venta, no costo de compra:
          // 1.5 kg a S/ 3 por kg = S/ 4.50 vendidos.
          valueRow(grid,'Total vendido',money(item.revenue));
          valueRow(grid,'Costo total de compra',valid?money(item.cost):'Sin datos');
          valueRow(grid,'Ganancia total',valid?money(item.revenue-item.cost):'Sin datos',true);
          card.append(name,time,grid);
          if((item.maxBuy-item.minBuy)>0.000001||(item.maxSell-item.minSell)>0.000001){
            const note=document.createElement('div');note.style.cssText='font-size:11px;color:#64748b;margin-top:8px;';
            note.textContent='Precios unitarios promedio ponderados del período.';
            card.append(note);
          }
          itemsBox.append(card);
        }
      };
      dateInput.addEventListener('change',()=>{
        chosenDay=dateInput.value;
        activePeriod='day';
        draw();
        gainLoadCloud(draw);
      });
      buttons.forEach(btn=>btn.addEventListener('click',()=>{
        activePeriod=btn.dataset.gainPeriod;draw();gainLoadCloud(draw);
      }));
      panel.__gainUseHistoryDate=(selected,date)=>{
        if(!selected?.known)return;
        if(selected.mode==='day'){
          chosenDay=date||'';
          dateInput.value=chosenDay||dateInput.value;
          activePeriod='day';
        }else if(['today','month','all'].includes(selected.mode)){
          activePeriod=selected.mode;
        }
        draw();gainLoadCloud(draw);
      };
      draw();gainLoadCloud(draw);
    }
  }
  function setupGainPopupObserver(){
    let scheduled=false;
    const observer=new MutationObserver(()=>{
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;enhanceGainPopup()});
    });
    observer.observe(document.body,{childList:true,subtree:true});
    enhanceGainPopup();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupGainPopupObserver);
  else setupGainPopupObserver();

  // Reportes: aplicar siempre el período activo de Historial. Solo lectura.
  function reportHistoryFilter(){
    const words=['Hoy','Día','Semana','Mes','Todo'];
    const norm=s=>String(s||'').replace(/[📅🗓️]/gu,'').trim().replace(/^[^a-záéíóú]+/i,'').trim().toLowerCase();
    const buttons=[...document.querySelectorAll('button')].filter(b=>words.some(w=>norm(b.textContent)===w.toLowerCase()));
    let group=null;
    for(const btn of buttons){
      for(let e=btn.parentElement,d=0;e&&e!==document.body&&d<5;e=e.parentElement,d++){
        const opts=[...e.querySelectorAll('button')].filter(b=>words.some(w=>norm(b.textContent)===w.toLowerCase()));
        if(opts.length===5){group=opts;break}
      }
      if(group)break;
    }
    if(!group)return {mode:'all',description:'Todo',known:false};
    const chosen=group.find(b=>{
      if(b.getAttribute('aria-pressed')==='true'||b.getAttribute('aria-selected')==='true')return true;
      if(/\b(active|selected|is-active|is-selected)\b/.test(b.className||''))return true;
      const bg=getComputedStyle(b).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if(!bg)return false;
      const r=Number(bg[1]),g=Number(bg[2]),bl=Number(bg[3]);
      return bl>125&&r>55&&r<205&&g<130&&bl>r*1.17;
    });
    let mode=chosen?norm(chosen.textContent):'';
    // Si el botón no expone su estado, el resumen numérico del Historial
    // permitirá reconocer el período correcto sin inventar cifras.
    const displayNames={hoy:'Hoy','día':'Día',semana:'Semana',mes:'Mes',todo:'Todo'};
    if(!mode||!displayNames[mode]){
      const totals=reportHistorySummary();
      const ss=gainValidSales(),now=new Date();
      for(const kind of ['today','week','month','all']){
        const filtered=reportSalesFor(ss,{mode:kind},now);
        const revenue=filtered.reduce((a,s)=>a+(Number(s.total)||0),0);
        if(totals.count===filtered.length&&Math.abs(totals.revenue-revenue)<0.011){
          return {mode:kind,description:({today:'Hoy',week:'Semana',month:'Mes',all:'Todo'})[kind],known:true};
        }
      }
      return {mode:'all',description:'Todo',known:false};
    }
    if(mode==='hoy')return {mode:'today',description:'Hoy',known:true};
    if(mode==='mes')return {mode:'month',description:'Mes',known:true};
    if(mode==='todo')return {mode:'all',description:'Todo',known:true};
    if(mode==='semana')return {mode:'week',description:'Semana',known:true};
    const parent=group[0]?.parentElement?.parentElement;
    const candidates=[...document.querySelectorAll('input[type="date"]')].filter(el=>
      (parent&&parent.contains(el))||el.offsetParent!==null);
    let day=gainHistoryDate()||candidates.find(el=>el.value&&!el.closest('[data-gain-date-picker]'))?.value||'';
    if(!day){
      const t=(parent?.textContent||'').toLowerCase();
      const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const pattern=/\b(\d{1,2})\s+de\s+([a-zñ]+)\s+de\s+(\d{4})/g;
      let match;while((match=pattern.exec(t))){
        const month=months.indexOf(match[2]);
        if(month>=0)day=match[3]+'-'+String(month+1).padStart(2,'0')+'-'+match[1].padStart(2,'0');
      }
    }
    return {mode:'day',date:day,description:day?'Día '+day:'Día seleccionado',known:!!day};
  }
  function reportSalesFor(salesList,filter,now=new Date()){
    const mode=filter?.mode||'all';
    if(mode==='all')return salesList;
    const mon=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    // La semana va de lunes a domingo. Si Historial usa 7 días móviles,
    // se detecta por el resumen numérico visible y se usa la misma opción.
    const monday=new Date(mon);monday.setDate(mon.getDate()-((mon.getDay()+6)%7));
    const rolling=new Date(mon);rolling.setDate(mon.getDate()-6);
    return salesList.filter(s=>{
      const d=new Date(s.date??s.created_at??s.createdAt??'');
      if(!Number.isFinite(d.getTime()))return false;
      const dd=new Date(d.getFullYear(),d.getMonth(),d.getDate());
      if(mode==='today')return dd.getTime()===mon.getTime();
      if(mode==='month')return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
      if(mode==='week')return dd>=monday&&dd<=mon;
      if(mode==='week-rolling')return dd>=rolling&&dd<=mon;
      if(mode==='day'){
        if(!filter?.date)return false;
        const day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        return day===filter.date;
      }
      return false;
    });
  }
  function reportHistorySummary(){
    const labels=[...document.querySelectorAll('small,span,p,div')].filter(x=>x.children.length===0);
    const match=labels.find(x=>/^(venta total acumulada|total vendido hoy|total vendido)$/i.test(x.textContent.trim()));
    const tickets=labels.find(x=>/^(transacciones|ventas realizadas|tickets generados)$/i.test(x.textContent.trim()));
    const read=(el,pattern)=>{
      if(!el)return NaN;
      for(let e=el.parentElement,i=0;e&&i<4;e=e.parentElement,i++){
        const m=(e.textContent||'').match(pattern);
        if(m)return Number(m[1].replace(/,/g,''));
      }
      return NaN;
    };
    return {revenue:read(match,/S\/\s*([\d.,]+)/),count:read(tickets,/\b(\d+)\b/)};
  }
  function reportSelectSales(){
    const sales=gainValidSales();
    let filter=reportHistoryFilter();
    const history=reportHistorySummary();
    // Semana puede ser "semana actual" o "últimos 7 días". Igualar Historial.
    if(filter.mode==='week'&&Number.isFinite(history.revenue)&&Number.isFinite(history.count)){
      const a=reportSalesFor(sales,filter);
      const va=a.reduce((n,s)=>n+(Number(s.total)||0),0);
      if(a.length!==history.count||Math.abs(va-history.revenue)>0.011){
        const other={mode:'week-rolling',description:'Semana (últimos 7 días)',known:true};
        const b=reportSalesFor(sales,other);
        const vb=b.reduce((n,s)=>n+(Number(s.total)||0),0);
        if(b.length===history.count&&Math.abs(vb-history.revenue)<0.011)filter=other;
      }
    }
    return {filter,sales:reportSalesFor(sales,filter)};
  }
  function reportPaymentLabel(value){
    const raw=String(value??'').trim();
    const key=raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
    if(key.includes('yape'))return 'Yape';
    if(key.includes('plin'))return 'Plin';
    if(key==='efectivo'||key==='cash'||key.includes('contado'))return 'Efectivo';
    if(key.includes('transfer'))return 'Transferencia';
    if(key.includes('tarjeta')||key.includes('card')||key.includes('visa')||key.includes('mastercard')||key==='debito'||key==='credito')return 'Pago con tarjeta';
    if(!raw||key==='no registrado'||key==='no especificado'||key==='sin desglosar')return 'Sin especificar';
    return raw;
  }
  function reportSummary(salesList){
    // Contabilizar en céntimos por ticket: S/ 0.015 cobrado se registra
    // como S/ 0.02 (mismo redondeo que el ticket), no como 1.5 céntimos.
    // Esto evita que 1.50 + 0.015 + 0.30 se muestre como S/ 1.81.
    const mainMethods=['Yape','Plin','Efectivo','Transferencia','Pago con tarjeta'];
    const methods=new Map(mainMethods.map(name=>[name,0]));
    const products=new Map();
    const cents=value=>{
      const amount=Number(value);
      return Number.isFinite(amount)?Math.round((amount+Number.EPSILON)*100):0;
    };
    let revenueCents=0,unverifiedCents=0,unverifiedSales=0,mismatchCents=0,mismatchSales=0;
    const catalog=arr('products');
    const addPayment=(name,amountCents)=>{
      if(!Number.isFinite(amountCents)||amountCents===0)return;
      const label=reportPaymentLabel(name);
      methods.set(label,(methods.get(label)||0)+amountCents);
    };
    for(const sale of salesList){
      const ticketCents=cents(sale.total);
      revenueCents+=ticketCents;
      const breakdown=sale.paymentBreakdown??sale.payment_breakdown;
      const entries=breakdown&&typeof breakdown==='object'&&!Array.isArray(breakdown)
        ?Object.entries(breakdown).filter(([,value])=>Number.isFinite(Number(value))&&Number(value)>0):[];
      const method=String(sale.paymentMethod??sale.payment_method??'').trim();
      if(method==='Fiado'){
        // El crédito es venta, pero NO constituye un cobro.
        // Los abonos se contabilizarán por separado al tener su método registrado.
      }else if(entries.length){
        let paidCents=0;
        for(const [name,value] of entries){
          const partCents=cents(value);
          paidCents+=partCents;
          addPayment(name,partCents);
        }
        const difference=ticketCents-paidCents;
        if(difference!==0){
          // Nunca asignar a Yape/Efectivo/etc. un céntimo sin identificar.
          mismatchSales++;
          mismatchCents+=difference;
          addPayment('Diferencia por aclarar',difference);
        }
      }else if(method){
        // Cobro con método único: usar el importe final del ticket.
        addPayment(method,ticketCents);
      }else{
        unverifiedCents+=ticketCents;
        unverifiedSales++;
        addPayment('Sin especificar',ticketCents);
      }
      for(const it of Array.isArray(sale.items)?sale.items:[]){
        const id=String(it.productId??it.product_id??it.id??'');
        const matched=catalog.find(p=>String(p.id)===id||String(p.legacy_id||'')===id)||
          catalog.find(p=>String(p.name||'').trim().toLowerCase()===String(it.name??it.productName??it.product_name??'').trim().toLowerCase());
        const name=String(it.name??it.productName??it.product_name??matched?.name??'Producto').trim()||'Producto';
        const unitRaw=String(it.sale_unit??it.saleUnit??it.unit??matched?.unit??'Unidad').trim().toLowerCase();
        const unit=['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos'].includes(unitRaw)?'kg':(unitRaw||'unidad');
        const stock=it.stock_qty??it.stockQty;
        const qtyRaw=Number(it.qty??it.quantity??1);
        const quantity=(stock!==undefined&&stock!==null&&stock!==''&&Number.isFinite(Number(stock)))
          ?Number(stock):(unitRaw==='g'||unitRaw==='gr'||unitRaw==='gramo'||unitRaw==='gramos'?qtyRaw/1000:qtyRaw);
        if(!Number.isFinite(quantity))continue;
        const key=id||name.toLowerCase()+'|'+unit;
        const existing=products.get(key)||{name,unit,quantity:0};
        existing.quantity+=quantity;products.set(key,existing);
      }
    }
    const revenue=revenueCents/100;
    const unverifiedAmount=unverifiedCents/100;
    return {count:salesList.length,revenue,unverifiedAmount,unverifiedSales,mismatchCents,mismatchSales,
      average:salesList.length?revenue/salesList.length:0,
      methods:[...methods.entries()].map(([name,value])=>[name,value/100]),
      products:[...products.values()].sort((a,b)=>b.quantity-a.quantity)};
  }
  function reportLocateModal(){
    const titles=[...document.querySelectorAll('h1,h2,h3,h4')].filter(el=>
      /^(\s*📊\s*)?Reportes\s*$/i.test(el.textContent.trim()));
    for(const title of titles){
      for(let panel=title.parentElement,d=0;panel&&panel!==document.body&&d<9;panel=panel.parentElement,d++){
        const content=panel.textContent||'';
        if(!content.includes('Ticket promedio')||!content.includes('Productos más vendidos'))continue;
        const close=[...panel.querySelectorAll('button')].find(b=>b.textContent.trim()==='Cerrar');
        if(!close)continue;
        const parts=[...panel.children];
        const headerIndex=parts.findIndex(el=>el.contains(title));
        const footerIndex=parts.findIndex(el=>el.contains(close));
        if(headerIndex<0||footerIndex<=headerIndex||footerIndex-headerIndex<2)continue;
        return {panel,title,parts,headerIndex,footerIndex};
      }
    }
    return null;
  }
  function reportEnhancePopup(){
    const found=reportLocateModal();
    if(!found)return;
    const {panel,parts,headerIndex,footerIndex}=found;
    const data=reportSelectSales(),summary=reportSummary(data.sales);
    // Solo mostramos indicadores del período seleccionado. La comparación
    // previa confundía los números del modal con los del Historial y generaba
    // una alerta falsa, incluso cuando ambos sumaban 4 ventas y S/ 11.00.
    const signature=JSON.stringify([data.filter.mode,data.filter.date,summary.count,summary.revenue,summary.unverifiedAmount,summary.unverifiedSales,summary.mismatchCents,summary.mismatchSales,
      summary.products.map(x=>[x.name,x.quantity]),summary.methods]);
    let box=panel.querySelector('[data-report-synced]');
    if(box&&box.dataset.reportSignature===signature)return;
    if(!box){
      const mids=parts.slice(headerIndex+1,footerIndex);
      // No tocar el encabezado ni el botón Cerrar; conservar el contenido original oculto.
      if(!mids.length)return;
      mids.forEach(el=>{el.style.display='none';el.dataset.reportOriginal='true'});
      box=document.createElement('div');
      box.dataset.reportSynced='true';
      box.style.cssText='padding:4px 0 10px;width:100%;min-width:0;max-width:100%;box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;max-height:min(62vh,680px);';
      panel.insertBefore(box,parts[footerIndex]);
    }
    box.dataset.reportSignature=signature;
    box.replaceChildren();
    const line=(tag,value,style)=>{const x=document.createElement(tag);x.textContent=value;if(style)x.style.cssText=style;return x};
    const period=line('div','Período: '+data.filter.description,
      'font-size:13px;font-weight:800;color:#7c3aed;margin:6px 0 14px;');
    box.appendChild(period);
    if(!data.filter.known){
      box.appendChild(line('p','El período exacto no pudo reconocerse en Historial; se muestra Todo.',
        'font-size:12px;color:#a16207;margin:0 0 10px;'));
    }

    const grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;box-sizing:border-box;min-width:0;';
    const metric=(label,value,full)=>{
      const card=document.createElement('div');
      card.style.cssText='min-width:0;border:1px solid #e5e5e5;border-radius:22px;padding:16px 13px;box-sizing:border-box;overflow-wrap:anywhere;'+(full?'grid-column:1/-1;':'');
      card.append(line('div',label,'font-size:13px;color:#737782;line-height:1.35;'),
        line('strong',value,'display:block;font-size:clamp(20px,5.8vw,32px);line-height:1.25;margin-top:8px;'));
      grid.appendChild(card);
    };
    metric('Total vendido',money(summary.revenue),false);
    metric('Ventas realizadas',String(summary.count),false);
    box.appendChild(grid);
    const section=(label)=>{
      const h=line('h3',label,'font-size:19px;margin:23px 0 8px;font-weight:900;');
      box.append(h);return h;
    };
    section('Total por medio de pago');
    const confirmedPayments=summary.unverifiedSales===0&&summary.mismatchSales===0;
    const problems=[];
    if(summary.unverifiedSales)problems.push(summary.unverifiedSales+' venta(s) sin medio registrado: '+money(summary.unverifiedAmount));
    if(summary.mismatchSales)problems.push(summary.mismatchSales+' ticket(s) con diferencia por aclarar: '+money(summary.mismatchCents/100));
    box.appendChild(line('p',confirmedPayments
      ?'Desglose de cobros registrado en los tickets, redondeado a céntimos por venta.'
      :'⚠️ '+problems.join(' · ')+'. Los importes por método podrían ser parciales.',
      'font-size:12px;line-height:1.45;color:'+(confirmedPayments?'#64748b':'#a16207')+';margin:5px 0 12px;'));
    if(!summary.methods.length)box.appendChild(line('p','No hay pagos en este período.','font-size:13px;color:#64748b;'));
    for(const [method,amount] of summary.methods){
      const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #e5e5e5;align-items:center;';
      row.append(line('span',method,'font-size:15px;overflow-wrap:anywhere;'),
        line('strong',money(amount),'font-size:16px;white-space:nowrap;'));
      box.appendChild(row);
    }
    section('Productos más vendidos');
    if(!summary.products.length)box.appendChild(line('p','No hay productos vendidos en este período.','font-size:13px;color:#64748b;'));
    for(const p of summary.products){
      const formatted=Number(p.quantity.toFixed(3)).toLocaleString('es-PE',{maximumFractionDigits:3});
      const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #e5e5e5;align-items:center;';
      row.append(line('span',p.name,'font-size:15px;overflow-wrap:anywhere;'),
        line('strong',formatted+' '+p.unit,'font-size:16px;white-space:nowrap;'));
      box.appendChild(row);
    }
  }
  // El usuario prefiere la cantidad de ventas, no el promedio monetario por ticket.
  // Ocultar SOLO esa tarjeta del resumen principal; no tocar los datos de las ventas.
  function simplifyHistoryTickets(){
    const labels=[...document.querySelectorAll('small,span,p,div,label')].filter(el=>
      el.childElementCount===0&&el.textContent.trim()==='Ticket promedio'&&
      !el.closest('dialog,[role="dialog"],[data-report-synced],[data-report-original]'));
    for(const label of labels){
      let card=null;
      for(let e=label.parentElement,steps=0;e&&e!==document.body&&steps<8;e=e.parentElement,steps++){
        const content=String(e.textContent||'').trim();
        if(/Venta total acumulada|Transacciones|Ventas realizadas|Fiado pendiente|Desglose por método de pago|Métodos de pago/i.test(content))break;
        if(content.includes('Ticket promedio')&&/S\/\s*[\d.,]+/.test(content))card=e;
      }
      if(card&&card!==document.body&&card.dataset.vareliaAverageHidden!=='true'){
        card.dataset.vareliaAverageHidden='true';
        card.style.setProperty('display','none','important');
      }
    }
    const counter=[...document.querySelectorAll('small,span,p,div,label')].filter(el=>
      el.childElementCount===0&&el.textContent.trim()==='Transacciones'&&
      !el.closest('dialog,[role="dialog"],[data-report-synced],[data-report-original]'));
    for(const label of counter){
      label.textContent='Ventas realizadas';
    }
  }
  function reportWatchPopup(){
    let scheduled=false;
    function update(){
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        simplifyHistoryTickets();
        reportEnhancePopup();
      });
    }
    // La ventana de Reportes se genera una sola vez. Las ventas cambian en
    // memoria después de cobrar, sin que el DOM cambie necesariamente.
    // Mientras se visualiza, recalcular las cifras locales de esta cuenta.
    const reportIsOpen=()=>{
      const modal=document.getElementById('vareliaHistoryExtraModal');
      return !!(modal&&modal.isConnected&&modal.querySelector('h2')?.textContent?.includes('Reportes'));
    };
    const refreshReport=()=>{if(reportIsOpen())update()};
    const ob=new MutationObserver(update);
    ob.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',ev=>{
      const btn=ev.target?.closest?.('button');
      if(!btn)return;
      if(/Reportes|^(Hoy|Día|Semana|Mes|Todo)$/i.test(btn.textContent.trim().replace(/^[📅🗓️]\s*/u,''))){
        requestAnimationFrame(update);
      }
    },true);
    document.addEventListener('change',ev=>{
      if(ev.target?.matches?.('input[type="date"]'))requestAnimationFrame(update);
    },true);
    // Primera pasada al confirmar la venta, y otra cuando el ticket ya terminó
    // de guardar el medio de pago (Yape, Plin, efectivo, etc.).
    window.addEventListener('varelia:sale-recorded',()=>{
      refreshReport();
      setTimeout(refreshReport,160);
      setTimeout(refreshReport,650);
    });
    window.addEventListener('storage',event=>{
      if(String(event.key||'').includes('miNegocio_sales_v1'))refreshReport();
    });
    window.addEventListener('focus',refreshReport);
    window.addEventListener('pageshow',refreshReport);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')refreshReport();
    });
    // Respaldo para cobros que actualizan el arreglo de ventas sin emitir eventos.
    // No llama a Supabase ni mezcla el historial de ninguna otra caja.
    setInterval(()=>{
      if(document.visibilityState==='visible')refreshReport();
    },2000);
    update();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reportWatchPopup);
  else reportWatchPopup();
  function makeHelp(main){let sec=document.getElementById('help');if(!sec){sec=document.createElement('section');sec.id='help';sec.className='view vareliaExtraView';main.appendChild(sec)}sec.innerHTML=`<div class="extraHead"><div><h2>Ayuda</h2><p>Guía rápida de cada módulo de Varelia.</p></div></div><div class="extraHelpGrid"><div class="extraHelpItem"><b>Productos</b><span>Crear, editar y organizar el catálogo.</span></div><div class="extraHelpItem"><b>Inventario</b><span>Controlar stock y movimientos.</span></div><div class="extraHelpItem"><b>Compras</b><span>Gestionar proveedores e ingreso de mercadería.</span></div><div class="extraHelpItem"><b>Ventas</b><span>Registrar ventas y consultar operaciones.</span></div><div class="extraHelpItem"><b>Caja</b><span>Controlar apertura, movimientos y cierres.</span></div><div class="extraHelpItem"><b>Reportes</b><span>Analizar el negocio en conjunto.</span></div><div class="extraHelpItem"><b>Ganancias</b><span>Revisar utilidad, margen y detalle por producto en un solo lugar.</span></div><div class="extraHelpItem"><b>Ajustes</b><span>Personalizar apariencia y preferencias.</span></div></div>`;return sec}
  function removeDuplicateProfit(){document.querySelectorAll('[data-view="profits"]').forEach(el=>el.remove());document.getElementById('profits')?.remove()}
  function init(){style();removeDuplicateProfit();const main=document.querySelector('main.content'),r=document.querySelector('.premiumReportsItem'),g=document.querySelector('.premiumGainItem'),h=document.querySelector('.premiumHelpItem');if(!main||!r||!g||!h){setTimeout(init,350);return}makeReports(main);makeProfit(main);makeHelp(main);r.dataset.view='reports';g.dataset.view='profit';h.dataset.view='help';r.onclick=e=>{e.preventDefault();makeReports(main);show('reports')};g.onclick=e=>{e.preventDefault();makeProfit(main);show('profit')};h.onclick=e=>{e.preventDefault();makeHelp(main);show('help')};if(!window.__vareliaExtraNavBound){window.__vareliaExtraNavBound=true;document.addEventListener('click',e=>{const b=e.target&&e.target.closest?e.target.closest('.premiumReportsItem,.premiumGainItem,.premiumHelpItem'):null;if(!b)return;e.preventDefault();e.stopImmediatePropagation();const m=document.querySelector('main.content');if(!m)return;if(b.classList.contains('premiumReportsItem')){makeReports(m);show('reports')}else if(b.classList.contains('premiumGainItem')){makeProfit(m);show('profit')}else{makeHelp(m);show('help')}try{window.scrollTo(0,0)}catch{}},true)}window.vareliaShowExtraView=show;setTimeout(removeDuplicateProfit,1200)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1900)):setTimeout(init,1900);
})();
