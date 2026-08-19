(()=>{
  if(window.__vareliaCashDailySummary)return;
  window.__vareliaCashDailySummary=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    if(typeof sales==='undefined'||typeof closures==='undefined')return;
    const cashSection=document.getElementById('cash'),closeBtn=document.getElementById('closeCash');
    if(!cashSection||!closeBtn)return;
    const style=document.createElement('style');style.textContent=`.dailySalesCard{margin:12px 0 14px;padding:16px;border:1px solid color-mix(in srgb,var(--p) 22%,var(--line));border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--p) 9%,var(--card)),var(--card));box-shadow:var(--shadow)}.dailySalesCard small{display:block;color:var(--muted);font-weight:800}.dailySalesAmount{font-size:31px;font-weight:950;color:var(--p);margin:4px 0}.dailySalesMeta{font-size:12px;color:var(--muted)}.closureSummary{display:grid;gap:4px}.closureSummary .closureDaily{color:var(--p);font-weight:850;font-size:13px}.closureSummary .closureCash{font-size:14px;color:var(--ink);font-weight:950}.closureAmount{text-align:right}.closureAmount small{display:block;color:var(--muted);font-size:11px;font-weight:800}.closureAmount strong{font-size:20px}`;document.head.appendChild(style);
    const mainCard=cashSection.querySelector('.card'),box=document.createElement('div');box.id='dailySalesSummary';box.className='dailySalesCard';box.innerHTML='<small>💰 Total vendido hoy</small><div class="dailySalesAmount" id="dailySalesAmount">S/ 0.00</div><div class="dailySalesMeta" id="dailySalesMeta">0 ventas · 0 unidades</div>';mainCard?.insertAdjacentElement('afterend',box);
    function localDayKey(value){const d=value?new Date(value):new Date();if(Number.isNaN(d.getTime()))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
    function calcDay(dayKey=localDayKey()){const list=sales.filter(s=>localDayKey(s.date)===dayKey);let total=0,units=0;for(const s of list){total+=Number(s.total)||0;for(const i of s.items||[])units+=Number(i.qty)||0}return{dayKey,list,total,units,count:list.length}}
    const money2=n=>'S/ '+Number(n||0).toFixed(2);
    function updateDaily(){const x=calcDay(),a=document.getElementById('dailySalesAmount'),m=document.getElementById('dailySalesMeta');if(a)a.textContent=money2(x.total);if(m)m.textContent=`${x.count} venta${x.count===1?'':'s'} · ${x.units} unidad${x.units===1?'':'es'}`}
    function enhanceClosures(){const list=document.getElementById('closuresList');if(!list)return;list.innerHTML=[...closures].reverse().map(c=>{const dayKey=c.dayKey||localDayKey(c.closedAt),daily=Number.isFinite(+c.dayTotal)?+c.dayTotal:calcDay(dayKey).total,cash=Number(c.total)||0;return `<div class="row"><div class="closureSummary"><strong>${new Date(c.closedAt).toLocaleString('es-PE')}</strong><span class="closureCash">Cierre de esta caja: ${money2(cash)}</span><span class="closureDaily">Acumulado vendido del día: ${money2(daily)}</span></div><div class="closureAmount"><small>ESTE CIERRE</small><strong>${money2(cash)}</strong></div></div>`}).join('')}
    if(typeof renderCash==='function'){const original=renderCash;renderCash=function(){original();updateDaily();enhanceClosures()}}
    closeBtn.addEventListener('click',()=>{const snap=calcDay();setTimeout(()=>{const last=closures[closures.length-1];if(!last)return;if(!last.dayKey)last.dayKey=snap.dayKey;last.dayTotal=snap.total;last.daySalesCount=snap.count;last.dayUnits=snap.units;try{localStorage.setItem(K.closures,JSON.stringify(closures))}catch{}updateDaily();enhanceClosures()},0)},true);
    updateDaily();enhanceClosures();
  });
})();