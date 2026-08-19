(()=>{
  if(window.__vareliaCashDailySummary)return;
  window.__vareliaCashDailySummary=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    if(typeof sales==='undefined'||typeof closures==='undefined')return;
    const cashSection=document.getElementById('cash'),closeBtn=document.getElementById('closeCash');
    if(!cashSection||!closeBtn)return;
    const style=document.createElement('style');style.textContent=`.dailySalesCard{margin:12px 0 14px;padding:16px;border:1px solid color-mix(in srgb,var(--p) 22%,var(--line));border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--p) 9%,var(--card)),var(--card));box-shadow:var(--shadow)}.dailySalesCard small{display:block;color:var(--muted);font-weight:800}.dailySalesAmount{font-size:31px;font-weight:950;color:var(--p);margin:4px 0}.dailySalesMeta{font-size:12px;color:var(--muted)}.closureSummary{display:grid;gap:4px}.closureSummary .closureDaily{color:var(--muted);font-weight:800;font-size:12px}.closureSummary .closureCash{font-size:15px;color:var(--p);font-weight:950}.closureAmount{text-align:right}.closureAmount small{display:block;color:var(--muted);font-size:10px;font-weight:800}.closureAmount strong{font-size:20px}`;document.head.appendChild(style);
    const mainCard=cashSection.querySelector('.card'),box=document.createElement('div');box.id='dailySalesSummary';box.className='dailySalesCard';box.innerHTML='<small>💰 Total vendido hoy</small><div class="dailySalesAmount" id="dailySalesAmount">S/ 0.00</div><div class="dailySalesMeta" id="dailySalesMeta">0 ventas · 0 unidades</div>';mainCard?.insertAdjacentElement('afterend',box);
    function localDayKey(value){const d=value?new Date(value):new Date();if(Number.isNaN(d.getTime()))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
    function calcDay(dayKey=localDayKey()){const list=sales.filter(s=>localDayKey(s.date)===dayKey);let total=0,units=0;for(const s of list){total+=Number(s.total)||0;for(const i of s.items||[])units+=Number(i.qty)||0}return{dayKey,list,total,units,count:list.length}}
    const money2=n=>'S/ '+Number(n||0).toFixed(2);
    function updateDaily(){const x=calcDay(),a=document.getElementById('dailySalesAmount'),m=document.getElementById('dailySalesMeta');if(a)a.textContent=money2(x.total);if(m)m.textContent=`${x.count} venta${x.count===1?'':'s'} · ${x.units} unidad${x.units===1?'':'es'}`}
    function closureTotal(c){if(Number.isFinite(+c.closureTotal))return +c.closureTotal;if(Number.isFinite(+c.total))return +c.total;return 0}
    function enhanceClosures(){const list=document.getElementById('closuresList');if(!list)return;list.innerHTML=[...closures].reverse().map(c=>{const total=closureTotal(c);return `<div class="row"><div class="closureSummary"><strong>${new Date(c.closedAt).toLocaleString('es-PE')}</strong><span class="closureCash">Total de este cierre: ${money2(total)}</span><span class="closureDaily">Cierre guardado · no cambia con ventas posteriores</span></div><div class="closureAmount"><small>CIERRE</small><strong>${money2(total)}</strong></div></div>`}).join('')}
    if(typeof renderCash==='function'){const original=renderCash;renderCash=function(){original();updateDaily();enhanceClosures()}}
    closeBtn.addEventListener('click',()=>{
      const before=closures.length;
      setTimeout(()=>{
        if(closures.length<=before)return;
        const last=closures[closures.length-1];if(!last)return;
        const fixed=Number(last.total)||0;
        last.closureTotal=fixed;
        last.dayKey=localDayKey(last.closedAt);
        const snap=calcDay(last.dayKey);last.dayTotalAtClose=snap.total;last.daySalesCount=snap.count;last.dayUnits=snap.units;
        try{localStorage.setItem(K.closures,JSON.stringify(closures))}catch{}
        updateDaily();enhanceClosures();
      },30)
    },true);
    updateDaily();enhanceClosures();
  });
})();