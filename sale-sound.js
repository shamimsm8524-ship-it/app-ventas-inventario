(()=>{
  if(window.__vareliaSaleSoundV2)return;
  window.__vareliaSaleSoundV2=true;

  let ctx=null;
  let lastSale=0;

  function getCtx(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    try{ctx=new AC()}catch{return null}
    return ctx;
  }

  async function resume(){
    const c=getCtx();
    if(!c)return null;
    if(c.state!=='running'){
      try{await c.resume()}catch{}
    }
    return c.state==='running'?c:null;
  }

  function tone(c,freq,start,duration,volume=0.11,type='sine'){
    if(!c||c.state!=='running')return;
    try{
      const o=c.createOscillator(),g=c.createGain(),at=c.currentTime+start;
      o.type=type;
      o.frequency.setValueAtTime(freq,at);
      g.gain.setValueAtTime(0.0001,at);
      g.gain.exponentialRampToValueAtTime(volume,at+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,at+duration);
      o.connect(g);g.connect(c.destination);
      o.start(at);o.stop(at+duration+0.03);
    }catch(e){console.warn('Varelia audio tone',e)}
  }

  function cashClick(c){
    if(!c||c.state!=='running')return;
    try{
      const len=Math.max(1,Math.floor(c.sampleRate*0.045));
      const buffer=c.createBuffer(1,len,c.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,5);
      const src=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();
      src.buffer=buffer;f.type='highpass';f.frequency.value=1300;g.gain.value=0.16;
      src.connect(f);f.connect(g);g.connect(c.destination);src.start();
    }catch(e){console.warn('Varelia cash audio',e)}
  }

  async function sale(){
    const now=Date.now();
    if(now-lastSale<1200)return;
    lastSale=now;
    const c=await resume();
    if(!c)return;
    cashClick(c);
    tone(c,1046.5,0.02,0.18,0.12,'sine');
    tone(c,1318.5,0.10,0.20,0.11,'sine');
    tone(c,1568.0,0.18,0.34,0.13,'sine');
    tone(c,2093.0,0.21,0.30,0.055,'triangle');
  }

  async function click(){
    const c=await resume();
    if(c)tone(c,660,0,0.07,0.10,'sine');
  }

  async function add(){
    const c=await resume();
    if(c)tone(c,880,0,0.09,0.12,'sine');
  }

  async function error(){
    const c=await resume();
    if(!c)return;
    tone(c,220,0,0.13,0.10,'square');
    tone(c,180,0.13,0.16,0.085,'square');
  }

  window.vareliaSound=(kind)=>{
    if(kind==='sale')return sale();
    if(kind==='click')return click();
    if(kind==='error')return error();
    return add();
  };

  // Desbloquea el AudioContext dentro del gesto fisico del usuario.
  const unlock=()=>{void resume()};
  document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
  document.addEventListener('touchstart',unlock,{capture:true,passive:true});
  document.addEventListener('keydown',unlock,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)unlock()});
})();

// Reportes en vivo: mantener window.sales unido al arreglo real de ventas y
// refrescar el modal inmediatamente después de cada cobro confirmado.
(()=>{
  if(window.__vareliaLiveReportBridgeV1)return;
  window.__vareliaLiveReportBridgeV1=true;

  const saleKeys=s=>[
    s?.cloudSaleId,s?.cloud_sale_id,s?.saleId,s?.sale_id,s?.id,
    s?.receiptNumber,s?.receipt_number,s?.receiptNo,s?.ticketNumber,s?.ticket_number
  ].map(v=>String(v??'').trim()).filter(Boolean);

  function sameSale(a,b){
    if(a===b)return true;
    const keys=new Set(saleKeys(a));
    if(keys.size&&saleKeys(b).some(k=>keys.has(k)))return true;
    const da=String(a?.date??a?.created_at??a?.createdAt??'');
    const db=String(b?.date??b?.created_at??b?.createdAt??'');
    const ta=Number(a?.total),tb=Number(b?.total);
    return !!da&&da===db&&Number.isFinite(ta)&&Number.isFinite(tb)&&Math.abs(ta-tb)<0.001;
  }

  function liveSales(){
    try{if(typeof sales!=='undefined'&&Array.isArray(sales))return sales}catch{}
    return Array.isArray(window.sales)?window.sales:[];
  }

  function persist(list){
    try{
      if(typeof K!=='undefined'&&K?.sales)localStorage.setItem(K.sales,JSON.stringify(list));
    }catch(e){console.warn('Varelia reporte: no se pudo guardar historial vivo',e)}
  }

  function reportModal(){
    const direct=document.getElementById('vareliaHistoryExtraModal');
    if(direct?.isConnected&&/Reportes/i.test(String(direct.textContent||'')))return direct;
    const title=[...document.querySelectorAll('h1,h2,h3,h4')].find(el=>/^(\s*📊\s*)?Reportes\s*$/i.test(String(el.textContent||'').trim()));
    if(!title)return null;
    for(let p=title.parentElement,n=0;p&&p!==document.body&&n<9;p=p.parentElement,n++){
      if(String(p.textContent||'').includes('Productos más vendidos'))return p;
    }
    return null;
  }

  function poke(){
    const modal=reportModal();
    if(!modal)return;
    const mark=document.createElement('span');
    mark.hidden=true;
    mark.setAttribute('aria-hidden','true');
    mark.dataset.vareliaLiveReportBridge='1';
    modal.appendChild(mark);
    queueMicrotask(()=>mark.remove());
  }

  function syncWindow(){
    const list=liveSales();
    if(window.sales!==list)window.sales=list;
    return list;
  }

  function mergeConfirmed(sale){
    const list=syncWindow();
    if(sale&&typeof sale==='object'){
      const idx=list.findIndex(x=>sameSale(x,sale));
      if(idx>=0)list[idx]={...list[idx],...sale};
      else list.push({...sale});
      window.sales=list;
      persist(list);
    }
    poke();
    setTimeout(poke,80);
    setTimeout(poke,260);
    setTimeout(poke,700);
  }

  window.addEventListener('varelia:checkout-confirmed',e=>mergeConfirmed(e.detail?.sale));
  window.addEventListener('varelia:sale-recorded',e=>mergeConfirmed(e.detail?.sale));

  let last='';
  setInterval(()=>{
    if(document.visibilityState!=='visible')return;
    const list=syncWindow();
    const tail=list[list.length-1]||{};
    const sig=[list.length,tail?.id||tail?.sale_id||'',tail?.date||tail?.created_at||'',Number(tail?.total)||0].join('|');
    if(sig!==last){last=sig;persist(list);poke()}
  },700);

  syncWindow();
})();

// Reportes: no mezclar variantes (talla/color) del mismo producto y respetar
// la unidad real elegida al vender medicamentos (caja, blíster o pastilla).
(()=>{
  if(window.__vareliaReportVariantRowsV2)return;
  window.__vareliaReportVariantRowsV2=true;

  const validSales=()=>{
    const list=Array.isArray(window.sales)?window.sales:(()=>{try{return typeof sales!=='undefined'&&Array.isArray(sales)?sales:[]}catch{return[]}})();
    return list.filter(s=>s&&!s.cancelled&&!s.canceled&&!s.voided&&
      !['cancelada','anulada','cancelled','voided'].includes(String(s.status||s.state||'').toLowerCase()));
  };
  const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const saleDate=s=>new Date(s?.date??s?.created_at??s?.createdAt??'');
  const totalOf=list=>list.reduce((n,s)=>n+(Number(s?.total)||0),0);

  function reportBox(){
    const box=document.querySelector('#vareliaHistoryExtraModal [data-report-synced]');
    if(!box)return null;
    const heading=[...box.querySelectorAll('h3')].find(h=>String(h.textContent||'').trim()==='Productos más vendidos');
    return heading?{box,heading}:null;
  }

  function targetSales(box){
    const list=validSales(),now=new Date(),today=dayKey(now);
    const text=String(box.textContent||'');
    const period=(text.match(/Período:\s*([^\n]+)/i)?.[1]||'').trim();
    const count=Number((text.match(/Ventas realizadas\s*(\d+)/i)||[])[1]);
    const sold=Number(String((text.match(/Total vendido\s*S\/\s*([\d.,]+)/i)||[])[1]||'').replace(/,/g,''));
    const sameSummary=xs=>(!Number.isFinite(count)||xs.length===count)&&(!Number.isFinite(sold)||Math.abs(totalOf(xs)-sold)<0.011);
    const byDay=value=>list.filter(s=>{const d=saleDate(s);return Number.isFinite(d.getTime())&&dayKey(d)===value});
    const candidates=[];
    const explicit=period.match(/(\d{4}-\d{2}-\d{2})/);
    if(explicit)candidates.push(byDay(explicit[1]));
    candidates.push(byDay(today));
    candidates.push(list.filter(s=>{const d=saleDate(s);return Number.isFinite(d.getTime())&&d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}));
    const mon=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const monday=new Date(mon);monday.setDate(mon.getDate()-((mon.getDay()+6)%7));
    const rolling=new Date(mon);rolling.setDate(mon.getDate()-6);
    candidates.push(list.filter(s=>{const d=saleDate(s);if(!Number.isFinite(d.getTime()))return false;const dd=new Date(d.getFullYear(),d.getMonth(),d.getDate());return dd>=monday&&dd<=mon}));
    candidates.push(list.filter(s=>{const d=saleDate(s);if(!Number.isFinite(d.getTime()))return false;const dd=new Date(d.getFullYear(),d.getMonth(),d.getDate());return dd>=rolling&&dd<=mon}));
    candidates.push(list);
    return candidates.find(sameSummary)||list;
  }

  function characteristicLabel(it){
    const direct=String(it?.selectionLabel??it?.variantLabel??'').trim();
    if(direct)return direct;
    const selected=Array.isArray(it?.selectedCharacteristics)?it.selectedCharacteristics:[];
    return selected.map(x=>{
      if(x==null)return '';
      if(typeof x==='string')return x.trim();
      const label=String(x.label??x.name??x.characteristic??x.type??'').trim();
      const value=String(x.value??x.option??x.selected??'').trim();
      return label&&value?label+': '+value:(value||label);
    }).filter(Boolean).join(' · ');
  }

  function productRows(salesList){
    const catalog=(()=>{try{return Array.isArray(window.products)?window.products:(typeof products!=='undefined'&&Array.isArray(products)?products:[])}catch{return[]}})();
    const out=new Map();
    for(const sale of salesList){
      for(const it of Array.isArray(sale?.items)?sale.items:[]){
        const id=String(it?.productId??it?.product_id??it?.id??'');
        const matched=catalog.find(p=>String(p?.id)===id||String(p?.legacy_id||'')===id)||
          catalog.find(p=>String(p?.name||'').trim().toLowerCase()===String(it?.baseName??it?.productName??it?.product_name??it?.name??'').trim().toLowerCase());
        const base=String(it?.baseName??it?.productName??it?.product_name??matched?.name??it?.name??'Producto').trim()||'Producto';
        const extra=characteristicLabel(it);
        let name=String(it?.name??'').trim();
        if(!name)name=extra?base+' · '+extra:base;
        else if(extra&&!name.toLowerCase().includes(extra.toLowerCase()))name=base+' · '+extra;

        // Para medicamentos, medicineSaleUnit describe lo que realmente compró el cliente.
        // No usar la unidad base del producto (por ejemplo Caja) para una venta de Pastilla.
        const medicineUnitRaw=String(it?.medicineSaleUnit??it?.medicine_sale_unit??'').trim().toLowerCase();
        const unitRaw=String(medicineUnitRaw||it?.sale_unit??it?.saleUnit??it?.unit??matched?.unit??'Unidad').trim().toLowerCase();
        const aliases={
          'pill':'pastilla','pills':'pastilla','pastillas':'pastilla','tableta':'pastilla','tabletas':'pastilla',
          'blister':'blíster','blisters':'blíster','blísteres':'blíster','blisteres':'blíster',
          'box':'caja','boxes':'caja','cajas':'caja',
          'kg':'kg','kilo':'kg','kilos':'kg','kilogramo':'kg','kilogramos':'kg',
          'g':'kg','gr':'kg','gramo':'kg','gramos':'kg',
          'unit':'unidad','units':'unidad','unidades':'unidad'
        };
        const unit=aliases[unitRaw]||(unitRaw||'unidad');
        const stock=it?.stock_qty??it?.stockQty;
        const qtyRaw=Number(it?.qty??it?.quantity??1);

        // stock_qty representa el descuento del inventario base. Para un medicamento
        // puede ser 100 pastillas aunque el cliente haya comprado 1 caja. El reporte
        // debe mostrar la cantidad vendida en la presentación elegida, es decir qty.
        const quantity=medicineUnitRaw
          ?qtyRaw
          :((stock!==undefined&&stock!==null&&stock!==''&&Number.isFinite(Number(stock)))
            ?Number(stock):(unitRaw==='g'||unitRaw==='gr'||unitRaw==='gramo'||unitRaw==='gramos'?qtyRaw/1000:qtyRaw));
        if(!Number.isFinite(quantity))continue;
        const key=[id||base.toLowerCase(),name.toLowerCase(),unit].join('|');
        const row=out.get(key)||{name,unit,quantity:0};
        row.quantity+=quantity;
        out.set(key,row);
      }
    }
    return [...out.values()].sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name,'es'));
  }

  function draw(){
    const found=reportBox();
    if(!found)return;
    const {box,heading}=found;
    const rows=productRows(targetSales(box));
    const sig=JSON.stringify([box.dataset.reportSignature||'',rows.map(x=>[x.name,x.unit,Number(x.quantity.toFixed(6))])]);
    if(box.dataset.vareliaVariantReportSignature===sig)return;
    box.dataset.vareliaVariantReportSignature=sig;
    let node=heading.nextSibling;
    while(node){const next=node.nextSibling;node.remove();node=next}
    if(!rows.length){
      const empty=document.createElement('p');
      empty.textContent='No hay productos vendidos en este período.';
      empty.style.cssText='font-size:13px;color:#64748b;';
      box.appendChild(empty);
      return;
    }
    for(const p of rows){
      const formatted=Number(p.quantity.toFixed(3)).toLocaleString('es-PE',{maximumFractionDigits:3});
      const row=document.createElement('div');
      row.style.cssText='display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #e5e5e5;align-items:center;';
      const name=document.createElement('span');name.textContent=p.name;name.style.cssText='font-size:15px;overflow-wrap:anywhere;';
      const qty=document.createElement('strong');qty.textContent=formatted+' '+p.unit;qty.style.cssText='font-size:16px;white-space:nowrap;';
      row.append(name,qty);box.appendChild(row);
    }
  }

  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;draw()})};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('varelia:sale-recorded',()=>{schedule();setTimeout(schedule,120);setTimeout(schedule,600)});
  window.addEventListener('varelia:checkout-confirmed',()=>{schedule();setTimeout(schedule,120);setTimeout(schedule,600)});
  document.addEventListener('click',e=>{if(/Reportes|^(Hoy|Día|Semana|Mes|Todo)$/i.test(String(e.target?.closest?.('button')?.textContent||'').trim().replace(/^[📅🗓️]\s*/u,'')))setTimeout(schedule,0)},true);
  setInterval(()=>{if(document.visibilityState==='visible'&&document.getElementById('vareliaHistoryExtraModal'))schedule()},900);
  schedule();
})();
