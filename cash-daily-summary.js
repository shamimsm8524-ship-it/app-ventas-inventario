(()=>{
  if(window.__vareliaCashDailySummary)return;
  window.__vareliaCashDailySummary=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    if(typeof sales==='undefined'||typeof closures==='undefined')return;
    const cashSection=document.getElementById('cash'),closeBtn=document.getElementById('closeCash');
    if(!cashSection||!closeBtn)return;
    const style=document.createElement('style');style.textContent=`
      .dailySalesCard{margin:12px 0 14px;padding:16px;border:1px solid color-mix(in srgb,var(--p) 22%,var(--line));border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--p) 9%,var(--card)),var(--card));box-shadow:var(--shadow)}
      .dailySalesCard small{display:block;color:var(--muted);font-weight:800}.dailySalesAmount{font-size:31px;font-weight:950;color:var(--p);margin:4px 0}.dailySalesMeta{font-size:12px;color:var(--muted)}
      .cashHistoryTitle{display:flex;justify-content:space-between;align-items:end;gap:10px;margin:22px 0 10px}.cashHistoryTitle h3{margin:0}.cashHistoryTitle small{color:var(--muted)}
      .sellerCashGroup{border:1px solid var(--line);border-radius:18px;background:var(--card);overflow:hidden;margin:10px 0;box-shadow:var(--shadow)}
      .sellerCashHead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;background:color-mix(in srgb,var(--p) 5%,var(--card));border-bottom:1px solid var(--line)}
      .sellerCashIdentity{display:flex;align-items:center;gap:10px;min-width:0}.sellerCashAvatar{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 13%,var(--card));color:var(--p);font-weight:950}.sellerCashIdentity b{display:block}.sellerCashIdentity small{display:block;color:var(--muted);font-size:10px;margin-top:2px}.sellerCashTotal{text-align:right}.sellerCashTotal small{display:block;color:var(--muted);font-size:9px;font-weight:900}.sellerCashTotal strong{font-size:17px;font-variant-numeric:tabular-nums}
      .sellerClosure{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 15px;border-top:1px solid var(--line)}.sellerClosure:first-child{border-top:0}.sellerClosureInfo{display:grid;gap:3px}.sellerClosureInfo strong{font-size:13px}.sellerClosureInfo span{font-size:11px;color:var(--muted)}.sellerClosureAmount{text-align:right;font-weight:950;font-variant-numeric:tabular-nums;white-space:nowrap}.sellerClosureAmount small{display:block;color:var(--muted);font-size:9px}.cashHistoryEmpty{padding:24px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:17px;background:var(--card)}
      body.varelia-seller #cashProducts,body.varelia-seller #cashProducts+*{ }
      @media(max-width:560px){.sellerCashHead{align-items:flex-start}.sellerClosure{grid-template-columns:1fr auto}.sellerCashTotal strong{font-size:15px}}
    `;document.head.appendChild(style);
    const mainCard=cashSection.querySelector('.card'),box=document.createElement('div');box.id='dailySalesSummary';box.className='dailySalesCard';mainCard?.insertAdjacentElement('afterend',box);
    const money=n=>'S/ '+Number(n||0).toFixed(2);
    const dayKey=value=>{const d=value?new Date(value):new Date();if(Number.isNaN(d.getTime()))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
    const currentProfile=()=>window.vareliaCurrentUserProfile||{};
    const currentId=()=>String(currentProfile().id||window.vareliaSellerId||'');
    const currentName=()=>currentProfile().full_name||window.vareliaSellerName||'Vendedor';
    const isSeller=()=>{const r=currentProfile().role||window.vareliaSellerRole;return !!r&&r!=='owner'};
    function saleOwner(s){return String(s.sellerId||'')}
    function closureOwner(c){return String(c.sellerId||'')}
    function visibleSales(){const id=currentId();return isSeller()?sales.filter(s=>saleOwner(s)===id):sales}
    function visibleClosures(){const id=currentId();return isSeller()?closures.filter(c=>closureOwner(c)===id):closures}
    function calcDay(k=dayKey()){const list=visibleSales().filter(s=>dayKey(s.date)===k);let total=0,units=0;for(const s of list){total+=Number(s.total)||0;for(const i of s.items||[])units+=Number(i.qty)||0}return{list,total,units,count:list.length}}
    function updateDaily(){const x=calcDay();box.innerHTML=`<small>${isSeller()?'MI CAJA · VENDIDO HOY':'💰 TOTAL VENDIDO HOY'}</small><div class="dailySalesAmount">${money(x.total)}</div><div class="dailySalesMeta">${x.count} venta${x.count===1?'':'s'} · ${x.units} unidad${x.units===1?'':'es'}${isSeller()?' · '+escapeHtml(currentName()):''}</div>`}
    function escapeHtml(v){const d=document.createElement('div');d.textContent=String(v??'');return d.innerHTML}
    function closureTotal(c){if(Number.isFinite(+c.closureTotal))return +c.closureTotal;if(Number.isFinite(+c.total))return +c.total;return 0}
    function stampClosure(c){if(!c)return;c.sellerId=c.sellerId||currentId();c.sellerName=c.sellerName||currentName();c.closureTotal=Number.isFinite(+c.closureTotal)?+c.closureTotal:Number(c.total)||0;c.dayKey=c.dayKey||dayKey(c.closedAt)}
    function enhanceClosures(){
      const list=document.getElementById('closuresList');if(!list)return;
      const all=visibleClosures().slice().sort((a,b)=>new Date(b.closedAt||0)-new Date(a.closedAt||0));
      const prev=list.previousElementSibling;if(prev&&prev.tagName==='H3')prev.textContent=isSeller()?'Historial de mi caja':'Historial de caja por vendedor';
      if(!all.length){list.innerHTML='<div class="cashHistoryEmpty">'+(isSeller()?'Aún no tienes cierres de caja registrados.':'Aún no hay cierres de caja registrados.')+'</div>';return}
      if(isSeller()){
        list.innerHTML=`<div class="sellerCashGroup"><div class="sellerCashHead"><div class="sellerCashIdentity"><div class="sellerCashAvatar">${escapeHtml(currentName()).slice(0,1).toUpperCase()}</div><div><b>${escapeHtml(currentName())}</b><small>Mi historial de caja</small></div></div><div class="sellerCashTotal"><small>TOTAL CIERRES</small><strong>${money(all.reduce((a,c)=>a+closureTotal(c),0))}</strong></div></div><div>${all.map(c=>closureRow(c)).join('')}</div></div>`;
        return;
      }
      const groups=new Map();all.forEach(c=>{const key=closureOwner(c)||'owner';const name=c.sellerName|| (key==='owner'?'Administrador':'Vendedor');if(!groups.has(key))groups.set(key,{name,rows:[]});groups.get(key).rows.push(c)});
      list.innerHTML=[...groups.entries()].map(([id,g])=>{const total=g.rows.reduce((a,c)=>a+closureTotal(c),0);return `<section class="sellerCashGroup"><div class="sellerCashHead"><div class="sellerCashIdentity"><div class="sellerCashAvatar">${escapeHtml(g.name).slice(0,1).toUpperCase()}</div><div><b>${escapeHtml(g.name)}</b><small>${g.rows.length} cierre${g.rows.length===1?'':'s'} · ordenados del más reciente</small></div></div><div class="sellerCashTotal"><small>TOTAL CERRADO</small><strong>${money(total)}</strong></div></div><div>${g.rows.map(c=>closureRow(c)).join('')}</div></section>`}).join('')
    }
    function closureRow(c){const d=new Date(c.closedAt||Date.now());return `<div class="sellerClosure"><div class="sellerClosureInfo"><strong>${d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'})}</strong><span>${d.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})} · Cierre guardado</span></div><div class="sellerClosureAmount"><small>CIERRE</small>${money(closureTotal(c))}</div></div>`}
    function refresh(){updateDaily();enhanceClosures()}
    if(typeof renderCash==='function'){const original=renderCash;renderCash=function(){original();refresh()}}
    closeBtn.addEventListener('click',()=>{const before=closures.length;setTimeout(()=>{if(closures.length<=before)return;const last=closures[closures.length-1];stampClosure(last);try{if(typeof K!=='undefined'&&K.closures)localStorage.setItem(K.closures,JSON.stringify(closures))}catch{}refresh()},40)},true);
    window.addEventListener('varelia:business-scope-ready',()=>setTimeout(refresh,250));
    let tries=0;const profileWait=setInterval(()=>{tries++;refresh();if(window.vareliaCurrentUserProfile||tries>30)clearInterval(profileWait)},200);
    refresh();
  });
})();