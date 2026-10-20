(()=>{
  if(window.__vareliaMedicineProfitHistoryFixV4)return;
  window.__vareliaMedicineProfitHistoryFixV4=true;

  const money=n=>'S/ '+(Number(n)||0).toFixed(2);
  const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const canonUnit=value=>{
    const n=norm(value);
    if(/^blister(?:es|s)?$/.test(n))return 'blíster';
    if(/^cajas?$/.test(n)||/^boxes?$/.test(n))return 'caja';
    if(/^pastillas?$/.test(n)||/^tabletas?$/.test(n)||/^pills?$/.test(n))return 'pastilla';
    return '';
  };
  const plural=(u,q)=>Math.abs(Number(q)-1)<1e-9?u:(u==='caja'?'cajas':u==='blíster'?'blísteres':u==='pastilla'?'pastillas':u);
  const getProducts=()=>{try{return Array.isArray(products)?products:(Array.isArray(window.products)?window.products:[])}catch{return Array.isArray(window.products)?window.products:[]}};
  const readMoney=text=>{
    const raw=String(text||'').replace(/\s/g,'');
    const m=raw.match(/S\/?(-?)[\s]*([\d.,]+)/i);
    if(!m)return NaN;
    const v=Number(m[2].replace(',','.'));
    return (m[1]==='-'?-1:1)*v;
  };
  const readNumber=text=>{
    const m=String(text||'').match(/-?\d+(?:[.,]\d+)?/);
    return m?Number(m[0].replace(',','.')):NaN;
  };
  const almostInt=n=>Number.isFinite(n)&&Math.abs(n-Math.round(n))<0.000001;

  function productByName(name){
    const n=norm(String(name||'').split(/\s+[·-]\s+/)[0]);
    return getProducts().find(p=>norm(p?.name)===n)||null;
  }
  function multiplier(p,u){
    const upb=Math.max(1,Math.floor(Number(p?.unitsPerBlister||p?.units_per_blister)||1));
    const bpb=Math.max(1,Math.floor(Number(p?.blistersPerBox||p?.blisters_per_box)||1));
    if(u==='caja')return upb*bpb;
    if(u==='blíster')return upb;
    return 1;
  }
  function configuredSell(p,u){
    if(u==='caja')return Number(p?.boxPrice??p?.box_price)||0;
    if(u==='blíster')return Number(p?.blisterPrice??p?.blister_price)||0;
    if(u==='pastilla')return Number(p?.unitMedicinePrice??p?.unit_medicine_price??p?.sellPrice??p?.sell_price)||0;
    return 0;
  }
  function rows(card){
    const out={};
    card.querySelectorAll('div').forEach(w=>{
      if(w.children.length!==2)return;
      const label=w.children[0],value=w.children[1];
      if(!label||!value||value.tagName!=='STRONG')return;
      out[String(label.textContent||'').trim()]={label,value};
    });
    return out;
  }
  function findRow(map,re){return Object.entries(map).find(([k])=>re.test(k))?.[1]||null}
  function topValue(panel,re){
    const labels=[...panel.querySelectorAll('div,span,small,label')].filter(el=>el.children.length===0&&re.test(String(el.textContent||'').trim()));
    for(const label of labels){
      for(let p=label.parentElement,depth=0;p&&p!==panel.parentElement&&depth<4;p=p.parentElement,depth++){
        const val=[...p.querySelectorAll('strong,b,span,div')].find(x=>x!==label&&x.children.length===0&&/S\//.test(String(x.textContent||'')));
        if(val)return val;
      }
    }
    return null;
  }

  function repairCard(card){
    const title=String(card.querySelector('h4')?.textContent||'').trim();
    if(!title)return null;
    const p=productByName(title);
    if(!p||!p.medicine)return null;

    const r=rows(card);
    const sellRow=findRow(r,/^Precio venta por /i);
    const buyRow=findRow(r,/^Precio compra por /i);
    const qtyRow=findRow(r,/^Cantidad vendida$/i);
    const revenueRow=findRow(r,/^Total vendido$/i);
    const costRow=findRow(r,/^Costo total de compra$/i);
    const gainRow=findRow(r,/^Ganancia total$/i);
    const gainUnitRow=findRow(r,/^Ganancia por /i);
    if(!sellRow||!buyRow||!qtyRow||!revenueRow||!costRow)return null;

    const unit=canonUnit(String(sellRow.label.textContent||'').replace(/^Precio venta por /i,''));
    if(!unit)return null;
    const mult=multiplier(p,unit);
    const targetSell=configuredSell(p,unit);
    const shownBuy=readMoney(buyRow.value.textContent);
    const shownQty=readNumber(qtyRow.value.textContent);
    const oldRevenue=readMoney(revenueRow.value.textContent);
    const oldCost=readMoney(costRow.value.textContent);

    // Para caja/blíster, la pantalla antigua suma stock_qty (unidades base).
    // Convertir SIEMPRE a cantidad de presentaciones: stock_qty / multiplicador.
    if(!(mult>1&&targetSell>0&&Number.isFinite(shownQty)&&shownQty>=mult&&almostInt(shownQty/mult)))return null;

    const realQty=shownQty/mult;
    const buyPerPresentation=Number.isFinite(shownBuy)?shownBuy:
      (Number(p?.buyPrice??p?.buy_price)||0)*mult;
    const newRevenue=targetSell*realQty;
    const newCost=buyPerPresentation*realQty;
    const gainPer=targetSell-buyPerPresentation;

    sellRow.value.textContent=money(targetSell);
    qtyRow.value.textContent=Number(realQty.toFixed(3))+' '+plural(unit,realQty);
    revenueRow.value.textContent=money(newRevenue);
    costRow.value.textContent=money(newCost);
    if(gainUnitRow)gainUnitRow.value.textContent=money(gainPer);
    if(gainRow)gainRow.value.textContent=money(newRevenue-newCost);

    card.dataset.vareliaMedicineHistoryFixed='4';
    return {
      revenueDelta:Number.isFinite(oldRevenue)?newRevenue-oldRevenue:0,
      costDelta:Number.isFinite(oldCost)?newCost-oldCost:0
    };
  }

  function findPanel(detail){
    for(let p=detail.parentElement,depth=0;p&&p!==document.body&&depth<8;p=p.parentElement,depth++){
      if([...p.querySelectorAll('div,span,small,label')].some(x=>x.children.length===0&&/^Ventas$/.test(String(x.textContent||'').trim())))return p;
    }
    return detail.parentElement;
  }
  function repair(){
    document.querySelectorAll('[data-gain-per-product]').forEach(detail=>{
      let revenueDelta=0,costDelta=0,changed=false;
      detail.querySelectorAll('article').forEach(card=>{
        const d=repairCard(card);
        if(d){revenueDelta+=d.revenueDelta;costDelta+=d.costDelta;changed=true}
      });
      if(!changed)return;
      const panel=findPanel(detail);if(!panel)return;
      const rev=topValue(panel,/^Ventas$/i);
      const cost=topValue(panel,/^Costo total de productos vendidos/i);
      const gain=topValue(panel,/^Ganancia (bruta|estimada)$/i);
      const oldRev=readMoney(rev?.textContent),oldCost=readMoney(cost?.textContent);
      const newRev=Number.isFinite(oldRev)?oldRev+revenueDelta:NaN;
      const newCost=Number.isFinite(oldCost)?oldCost+costDelta:NaN;
      if(rev&&Number.isFinite(newRev))rev.textContent=money(newRev);
      if(cost&&Number.isFinite(newCost))cost.textContent=money(newCost);
      if(gain&&Number.isFinite(newRev)&&Number.isFinite(newCost))gain.textContent=money(newRev-newCost);
    });
  }

  let timer=0;
  const schedule=(delay=60)=>{clearTimeout(timer);timer=setTimeout(repair,delay)};
  new MutationObserver(()=>schedule()).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-gain-period-buttons],button')||/Ganancias/i.test(String(e.target?.textContent||'')))schedule(100);
  },true);
  window.addEventListener('varelia:sale-recorded',()=>schedule(150));
  window.addEventListener('varelia:ampicilina-price-repaired',()=>schedule(30));
  setInterval(()=>{if(document.querySelector('[data-gain-per-product]'))repair()},700);
  schedule(150);
})();
