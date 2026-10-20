(()=>{
  if(window.__vareliaMedicineProfitHistoryFixV1)return;
  window.__vareliaMedicineProfitHistoryFixV1=true;

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
  const readMoney=text=>{
    const m=String(text||'').replace(/\s/g,'').match(/S\/?-?([\d.,]+)/i);
    if(!m)return NaN;
    return Number(m[1].replace(',','.'))*(String(text).includes('S/-')||String(text).includes('S/ -')?-1:1);
  };
  const getProducts=()=>{try{return Array.isArray(products)?products:(Array.isArray(window.products)?window.products:[])}catch{return Array.isArray(window.products)?window.products:[]}};
  const getSales=()=>{try{return Array.isArray(sales)?sales:(Array.isArray(window.sales)?window.sales:[])}catch{return Array.isArray(window.sales)?window.sales:[]}};
  const baseName=item=>String(item?.baseName||item?.name||item?.productName||'').split(/\s+[·-]\s+/)[0].trim();
  const itemUnit=(item,p)=>{
    const explicit=item?.medicineSaleUnit??item?.medicine_sale_unit??item?.selectionLabel??item?.sale_unit??item?.saleUnit;
    const c=canonUnit(explicit);if(c)return c;
    const m=String(item?.name||'').match(/(?:·|-)\s*(caja|cajas|bl[ií]ster(?:es)?|pastilla|pastillas)\s*$/i);
    return canonUnit(m?.[1]||p?.unit||'');
  };
  const itemMultiplier=(item,p,u)=>{
    const direct=Number(item?.medicineMultiplier||item?.medicine_multiplier||0);
    if(direct>0)return direct;
    const upb=Math.max(1,Math.floor(Number(p?.unitsPerBlister||p?.units_per_blister)||1));
    const bpb=Math.max(1,Math.floor(Number(p?.blistersPerBox||p?.blisters_per_box)||1));
    if(u==='caja')return upb*bpb;
    if(u==='blíster')return upb;
    return 1;
  };
  const itemPrice=(item,p,u)=>{
    const raw=Number(item?.price??item?.sellPrice??item?.unit_price);
    if(Number.isFinite(raw)&&raw>=0)return raw;
    if(u==='caja')return Number(p?.boxPrice||p?.box_price)||0;
    if(u==='blíster')return Number(p?.blisterPrice||p?.blister_price)||0;
    return Number(p?.unitMedicinePrice||p?.unit_medicine_price||p?.sellPrice||p?.sell_price)||0;
  };
  const saleDate=s=>new Date(s?.date??s?.created_at??s?.createdAt??'');
  function currentPeriod(panel){
    const active=panel.querySelector('[data-gain-period-buttons] button[aria-pressed="true"]');
    const period=String(active?.dataset?.gainPeriod||'today');
    const date=String(panel.querySelector('[data-gain-date-picker] input[type="date"]')?.value||'');
    return {period,date,marker:period+':'+date};
  }
  function periodSales(panel){
    const {period,date}=currentPeriod(panel),now=new Date();
    return getSales().filter(s=>{
      if(s?.cancelled||s?.canceled||s?.voided||['cancelada','anulada','cancelled','voided'].includes(norm(s?.status||s?.state)))return false;
      const d=saleDate(s);if(!Number.isFinite(d.getTime()))return false;
      if(period==='all')return true;
      if(period==='month')return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
      if(period==='day'&&/^\d{4}-\d{2}-\d{2}$/.test(date)){
        const iso=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
        return iso===date;
      }
      return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();
    });
  }
  function medicineGroups(panel){
    const ps=getProducts(),map=new Map();
    for(const sale of periodSales(panel))for(const item of (Array.isArray(sale?.items)?sale.items:[])){
      const id=String(item?.id??item?.productId??item?.product_id??'');
      const n=baseName(item);
      const p=ps.find(x=>String(x?.id||'')===id)||ps.find(x=>norm(x?.name)===norm(n));
      const u=itemUnit(item,p);
      if(!u||!(p?.medicine||item?.medicineSaleUnit||item?.medicine_sale_unit||item?.medicineMultiplier||item?.medicine_multiplier))continue;
      const q=Math.max(0,Number(item?.qty??item?.quantity??1)||0);if(!(q>0))continue;
      const mult=itemMultiplier(item,p,u);
      const price=itemPrice(item,p,u);
      const baseBuyRaw=item?.baseBuyPriceAtSale??item?.base_buy_price_at_sale??p?.buyPrice??p?.buy_price;
      const baseBuy=Math.max(0,Number(baseBuyRaw)||0);
      const buyPerPresentation=baseBuy*mult;
      const key=(String(p?.id||n)||n)+'|'+u;
      if(!map.has(key))map.set(key,{name:String(p?.name||n||'Medicamento'),unit:u,qty:0,revenue:0,cost:0});
      const g=map.get(key);g.qty+=q;g.revenue+=price*q;g.cost+=buyPerPresentation*q;
    }
    return [...map.values()];
  }
  function rowsOf(card){
    const out={};
    card.querySelectorAll('div').forEach(w=>{
      if(w.children.length!==2)return;
      const cap=w.children[0],val=w.children[1];
      if(!cap||!val||val.tagName!=='STRONG')return;
      out[String(cap.textContent||'').trim()]=val;
    });
    return out;
  }
  function cardUnit(card){
    const cap=[...card.querySelectorAll('div')].find(x=>/^Precio compra por /i.test(String(x.textContent||'').trim())&&x.children.length===0);
    if(!cap)return '';
    return canonUnit(String(cap.textContent).replace(/^Precio compra por /i,'').replace(/\s*\(estimado\)\s*$/i,''));
  }
  function createCard(g){
    const card=document.createElement('article');card.style.cssText='border:1px solid #ddd;border-radius:17px;padding:13px;min-width:0;box-sizing:border-box;';
    const h=document.createElement('h4');h.textContent=g.name;h.style.cssText='font-size:15px;margin:0 0 11px;font-weight:900;overflow-wrap:anywhere;';
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0;';
    const add=(label,value,green=false)=>{const w=document.createElement('div');w.style.cssText='min-width:0;';const c=document.createElement('div');c.style.cssText='font-size:11px;color:#64748b;line-height:1.3;';c.textContent=label;const b=document.createElement('strong');b.style.cssText='font-size:15px;line-height:1.4;overflow-wrap:anywhere;color:'+(green?'#16803b':'inherit')+';';b.textContent=value;w.append(c,b);grid.append(w)};
    const buy=g.qty?g.cost/g.qty:0,sell=g.qty?g.revenue/g.qty:0;
    add('Precio compra por '+g.unit,money(buy));add('Precio venta por '+g.unit,money(sell));add('Ganancia por '+g.unit,money(sell-buy),true);add('Cantidad vendida',Number(g.qty.toFixed(3))+' '+plural(g.unit,g.qty));add('Total vendido',money(g.revenue));add('Costo total de compra',money(g.cost));add('Ganancia total',money(g.revenue-g.cost),true);
    card.append(h,grid);return card;
  }
  function setCard(card,g){
    const rows=rowsOf(card),find=(re)=>Object.entries(rows).find(([k])=>re.test(k))?.[1];
    const buy=g.qty?g.cost/g.qty:0,sell=g.qty?g.revenue/g.qty:0;
    const labels=[...card.querySelectorAll('div')].filter(x=>x.children.length===0);
    const setLabel=(re,text)=>{const x=labels.find(y=>re.test(String(y.textContent||'')));if(x)x.textContent=text};
    setLabel(/^Precio compra por /i,'Precio compra por '+g.unit);setLabel(/^Precio venta por /i,'Precio venta por '+g.unit);setLabel(/^Ganancia por /i,'Ganancia por '+g.unit);
    const a=find(/^Precio compra por /i),b=find(/^Precio venta por /i),c=find(/^Ganancia por /i),d=find(/^Cantidad vendida$/i),e=find(/^Total vendido$/i),f=find(/^Costo total de compra$/i),h=find(/^Ganancia total$/i);
    if(a)a.textContent=money(buy);if(b)b.textContent=money(sell);if(c)c.textContent=money(sell-buy);if(d)d.textContent=Number(g.qty.toFixed(3))+' '+plural(g.unit,g.qty);if(e)e.textContent=money(g.revenue);if(f)f.textContent=money(g.cost);if(h)h.textContent=money(g.revenue-g.cost);
  }
  function valueForLabel(panel,re){
    const labels=[...panel.querySelectorAll('div,span,small,label')].filter(x=>x.children.length===0&&re.test(String(x.textContent||'').trim()));
    for(const label of labels){const parent=label.parentElement;if(!parent)continue;const val=[...parent.querySelectorAll('strong,b,span,div')].find(x=>x!==label&&x.children.length===0&&/S\//.test(String(x.textContent||'')));if(val)return val}
    return null;
  }
  function fixPanel(panel){
    const detail=panel.querySelector('[data-gain-per-product]');if(!detail)return;
    const groups=medicineGroups(panel);if(!groups.length)return;
    const {marker}=currentPeriod(panel);
    const articles=[...detail.querySelectorAll('article')];
    let deltaRevenue=0,deltaCost=0;
    const used=new Set();
    for(const g of groups){
      let card=articles.find(a=>!used.has(a)&&norm(a.querySelector('h4')?.textContent)===norm(g.name)&&cardUnit(a)===g.unit);
      if(!card)card=articles.find(a=>!used.has(a)&&norm(a.querySelector('h4')?.textContent)===norm(g.name));
      if(card){
        used.add(card);
        if(card.dataset.medProfitFixed!==marker){
          const r=rowsOf(card);const oldRev=readMoney(Object.entries(r).find(([k])=>/^Total vendido$/i.test(k))?.[1]?.textContent);const oldCost=readMoney(Object.entries(r).find(([k])=>/^Costo total de compra$/i.test(k))?.[1]?.textContent);
          if(Number.isFinite(oldRev)&&Math.abs(oldRev-g.revenue)>.009)deltaRevenue+=g.revenue-oldRev;
          if(Number.isFinite(oldCost)&&Math.abs(oldCost-g.cost)>.009)deltaCost+=g.cost-oldCost;
          setCard(card,g);card.dataset.medProfitFixed=marker;
        }
      }else{
        const box=detail.querySelector('div');if(box){const created=createCard(g);created.dataset.medProfitFixed=marker;box.prepend(created)}
      }
    }
    if(Math.abs(deltaRevenue)>.009||Math.abs(deltaCost)>.009){
      const rev=valueForLabel(panel,/^Ventas$/i),cost=valueForLabel(panel,/^Costo total de productos vendidos/i),gain=valueForLabel(panel,/^Ganancia (bruta|estimada)$/i);
      const rv=readMoney(rev?.textContent),cv=readMoney(cost?.textContent);
      if(rev&&Number.isFinite(rv))rev.textContent=money(rv+deltaRevenue);
      if(cost&&Number.isFinite(cv))cost.textContent=money(cv+deltaCost);
      const newR=Number.isFinite(rv)?rv+deltaRevenue:NaN,newC=Number.isFinite(cv)?cv+deltaCost:NaN;
      if(gain&&Number.isFinite(newR)&&Number.isFinite(newC))gain.textContent=money(newR-newC);
    }
  }
  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{document.querySelectorAll('[data-gain-period-buttons]').forEach(x=>{let panel=x;for(let i=0;i<7&&panel&&!panel.querySelector('[data-gain-per-product]');i++)panel=panel.parentElement;if(panel)fixPanel(panel)})},80)};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-gain-period-buttons],button')||/Ganancias/i.test(String(e.target?.textContent||'')))setTimeout(schedule,40)},true);
  window.addEventListener('varelia:sale-recorded',()=>setTimeout(schedule,120));
  schedule();
})();