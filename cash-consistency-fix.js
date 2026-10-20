(()=>{
  if(window.__vareliaCashConsistencyFixV1)return;
  window.__vareliaCashConsistencyFixV1=true;

  const money=n=>'S/ '+Number(n||0).toFixed(2);
  const norm=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const fmt=(n,max=3)=>Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:0,maximumFractionDigits:max});
  const dayKey=value=>{
    const d=value?new Date(value):new Date();
    if(Number.isNaN(d.getTime()))return'';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const allSales=()=>Array.isArray(window.sales)?window.sales:[];
  const profile=()=>window.vareliaCurrentUserProfile||{};
  const isSeller=()=>{const r=String(profile().role||window.vareliaSellerRole||'');return !!r&&r!=='owner'};
  const sellerId=()=>String(profile().id||window.vareliaSellerId||'');
  const visible=list=>isSeller()?list.filter(s=>String(s?.sellerId||'')===sellerId()):list;
  const productFor=item=>(Array.isArray(window.products)?window.products:[]).find(p=>String(p.id)===String(item?.id))||{};

  function quantitySummary(list){
    let discrete=0;
    const continuous=new Map();
    const add=(key,label,value,decimals=3)=>{
      const old=continuous.get(key)||{label,value:0,decimals};
      old.value+=value;continuous.set(key,old);
    };
    for(const sale of list||[]){
      for(const item of sale?.items||[]){
        const q=Number(item?.qty)||0;
        if(!q)continue;
        const p=productFor(item);
        const u=norm(item?.unit||p?.unit||'Unidad');
        if(/^(kg|kilo|kilos|kilogramo|kilogramos)$/.test(u))add('kg','kg',q,3);
        else if(/^(g|gr|gramo|gramos)$/.test(u))add('g','g',q,2);
        else if(/^(l|lt|litro|litros)$/.test(u))add('l','L',q,3);
        else if(/^(ml|mililitro|mililitros)$/.test(u))add('ml','ml',q,2);
        else if(/^(m|metro|metros)$/.test(u))add('m','m',q,3);
        else if(/^(m2|m²|metro cuadrado|metros cuadrados)$/.test(u))add('m2','m²',q,3);
        else if(/^(docena|docenas)$/.test(u))add('docena','doc.',q,2);
        else discrete+=q;
      }
    }
    const parts=[];
    if(Math.abs(discrete)>1e-9)parts.push(fmt(discrete,3)+' un.');
    for(const x of continuous.values())if(Math.abs(x.value)>1e-9)parts.push(fmt(x.value,x.decimals)+' '+x.label);
    return parts.length?parts.join(' · '):'0';
  }

  function readCashStart(){
    try{
      const scope=String(localStorage.getItem('varelia_active_business_id')||'no_account').replace(/[^a-zA-Z0-9_-]/g,'_');
      const raw=localStorage.getItem('miNegocio_cashStart_v1__'+scope);
      if(raw==null)return null;
      const parsed=JSON.parse(raw);
      const d=new Date(parsed);
      return Number.isNaN(d.getTime())?null:d;
    }catch{return null}
  }

  function activeList(){
    try{
      if(typeof window.activeSales==='function')return visible(window.activeSales()||[]);
    }catch{}
    const start=readCashStart();
    const time=start?start.getTime():0;
    return visible(allSales().filter(s=>{const d=new Date(s?.date||0);return !Number.isNaN(d.getTime())&&d.getTime()>=time}));
  }

  function todayList(){
    const k=dayKey();
    return visible(allSales().filter(s=>dayKey(s?.date)===k));
  }

  function ensurePeriodNote(card){
    let note=document.getElementById('cashPeriodNote');
    if(note)return note;
    note=document.createElement('div');
    note.id='cashPeriodNote';
    note.style.cssText='margin:8px 0 2px;color:var(--muted);font-size:12px;line-height:1.45;font-weight:700';
    const total=card?.querySelector('#cashTotal');
    if(total)total.insertAdjacentElement('afterend',note);
    return note;
  }

  function update(){
    const sec=document.getElementById('cash');
    if(!sec)return;
    const card=sec.querySelector('.card');
    if(!card)return;

    const headNotice=sec.querySelector('.head .notice');
    if(headNotice)headNotice.textContent='Acumulado desde el último cierre de caja. Se muestra aparte de las ventas de hoy.';
    const title=card.querySelector(':scope > small');
    if(title)title.textContent='Caja activa · desde el último cierre';
    const miniLabels=card.querySelectorAll('.cashGrid .mini small');
    if(miniLabels[0])miniLabels[0].textContent='Ventas desde último cierre';
    if(miniLabels[1])miniLabels[1].textContent='Cantidad vendida';

    const active=activeList();
    const today=todayList();
    const activeTotal=active.reduce((a,s)=>a+(Number(s?.total)||0),0);
    const todayTotal=today.reduce((a,s)=>a+(Number(s?.total)||0),0);
    const activeToday=active.filter(s=>dayKey(s?.date)===dayKey());
    const activeTodayTotal=activeToday.reduce((a,s)=>a+(Number(s?.total)||0),0);
    const older=Math.max(0,activeTotal-activeTodayTotal);

    const totalEl=document.getElementById('cashTotal');
    const countEl=document.getElementById('cashCount');
    const qtyEl=document.getElementById('cashUnits');
    if(totalEl)totalEl.textContent=money(activeTotal);
    if(countEl)countEl.textContent=String(active.length);
    if(qtyEl){qtyEl.textContent=quantitySummary(active);qtyEl.style.fontSize='16px';qtyEl.style.lineHeight='1.25'}

    const note=ensurePeriodNote(card);
    const start=readCashStart();
    const startText=start?start.toLocaleString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'el último cierre';
    if(note){
      if(older>0.0001)note.textContent=`Abierta desde ${startText}. Incluye ${money(older)} de días anteriores; por eso no tiene que coincidir con “Total vendido hoy”.`;
      else if(Math.abs(activeTotal-todayTotal)>0.0001)note.textContent=`Abierta desde ${startText}. “Total vendido hoy” considera todo el día, mientras esta caja cuenta solo desde su apertura.`;
      else note.textContent=`Abierta desde ${startText}.`;
    }

    const daily=document.getElementById('dailySalesSummary');
    if(daily){
      const label=daily.querySelector('small');
      if(label)label.textContent=isSeller()?'MI CAJA · SOLO HOY':'💰 TOTAL VENDIDO · SOLO HOY';
      const amount=daily.querySelector('.dailySalesAmount');
      if(amount)amount.textContent=money(todayTotal);
      const meta=daily.querySelector('.dailySalesMeta');
      if(meta)meta.textContent=`${today.length} venta${today.length===1?'':'s'} · ${quantitySummary(today)}${isSeller()?' · '+String(profile().full_name||window.vareliaSellerName||'Vendedor'):''}`;
    }
  }

  function installRenderHook(){
    const current=window.renderCash;
    if(typeof current!=='function'||current.__vareliaCashConsistencyWrapped)return;
    const wrapped=function(){const out=current.apply(this,arguments);setTimeout(update,0);return out};
    wrapped.__vareliaCashConsistencyWrapped=true;
    window.renderCash=wrapped;
  }

  const boot=()=>{
    installRenderHook();
    update();
    [100,400,1000,2200].forEach(ms=>setTimeout(()=>{installRenderHook();update()},ms));
    setInterval(()=>{installRenderHook();update()},2500);
    ['varelia:business-scope-ready','varelia:central-stock-updated','varelia:forced-sync-complete','varelia:sync-connected'].forEach(name=>window.addEventListener(name,()=>setTimeout(update,80)));
    window.addEventListener('focus',()=>setTimeout(update,80));
    window.addEventListener('pageshow',()=>setTimeout(update,80));
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
