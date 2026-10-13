(()=>{
  if(window.__vareliaCatalogPaymentsSummary)return;
  window.__vareliaCatalogPaymentsSummary=true;
  const fields=['Yape','Plin','Efectivo','Transferencia','Tarjeta','Otros','Sin especificar'];
  let period='today',orders=null,role='',business='',error='',pending=null,lastFetch=0;
  let fromDate='',toDate='',dateError='';
  const money=n=>'S/ '+(n/100).toFixed(2);
  const cents=n=>Math.max(0,Math.round((Number(n)||0)*100));
  const panels=()=>[...document.querySelectorAll('#orders,#catalogOrders')];
  const day=d=>{
    if(!d)return '';
    const date=new Date(d);
    if(!Number.isFinite(date.getTime()))return '';
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const get=t=>parts.find(p=>p.type===t)?.value||'';
    return get('year')+'-'+get('month')+'-'+get('day');
  };
  const method=s=>{
    const x=String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(!x)return 'Sin especificar';
    if(x.includes('yape'))return 'Yape';
    if(x.includes('plin'))return 'Plin';
    if(x.includes('efectivo')||x==='cash'||x==='contado')return 'Efectivo';
    if(x.includes('transfer'))return 'Transferencia';
    if(x.includes('tarjeta')||x==='card'||x.includes('visa')||x.includes('mastercard'))return 'Tarjeta';
    return 'Otros';
  };
  function mount(){
    for(const p of panels()){
      if(p.querySelector('[data-public-payments]'))continue;
      const el=document.createElement('section');
      el.dataset.publicPayments='true';
      el.className='card';
      el.style.cssText='display:none;margin:12px 0 18px;padding:16px;';
      const head=p.querySelector('.head');
      if(head)head.insertAdjacentElement('afterend',el);
      else p.prepend(el);
      el.addEventListener('click',e=>{
        const b=e.target.closest('[data-pay-period]');
        if(b){period=b.dataset.payPeriod;fromDate='';toDate='';dateError='';draw()}
        if(e.target.closest('[data-pay-apply]')){
          const start=el.querySelector('[data-pay-from]')?.value||'';
          const end=el.querySelector('[data-pay-to]')?.value||'';
          fromDate=start;toDate=end;dateError='';
          if(!start&&!end){dateError='Selecciona al menos una fecha.'}
          else if(start&&end&&start>end){dateError='La fecha Desde no puede ser posterior a Hasta.'}
          else{period='custom'}
          draw();
        }
        if(e.target.closest('[data-pay-refresh]'))refresh(true);
      });
    }
  }
  function draw(){
    mount();
    const now=day(new Date()),month=now.slice(0,7);
    const picked=(orders||[]).filter(o=>{
      if(period==='all')return true;
      const paidDay=day(o.paid_at);
      if(!paidDay)return false;
      if(period==='custom'){
        const first=fromDate||toDate,last=toDate||fromDate;
        return !!first&&paidDay>=first&&paidDay<=last;
      }
      return period==='month'?paidDay.slice(0,7)===month:paidDay===now;
    });
    const amounts=Object.fromEntries(fields.map(k=>[k,0]));
    let total=0;
    for(const o of picked){
      const n=cents(o.total);
      amounts[method(o.payment_method)]+=n;
      total+=n;
    }
    const tabs=[['today','Hoy'],['month','Este mes'],['all','Todo']].map(([k,title])=>
      '<button type="button" data-pay-period="'+k+'" aria-pressed="'+(period===k)+'" style="flex:1;border:1px solid #d1d5db;border-radius:10px;padding:9px 4px;font-weight:800;background:'+(period===k?'#2563eb':'transparent')+';color:'+(period===k?'#fff':'inherit')+'">'+title+'</button>'
    ).join('');
    const lines=fields.map(k=>'<div style="display:flex;justify-content:space-between;gap:6px;padding:6px 0;border-bottom:1px solid #e5e7eb"><span>'+k+'</span><b>'+money(amounts[k])+'</b></div>').join('');
    const dateFilter='<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 11px">'+
      '<label style="min-width:0;display:grid;gap:5px;font-size:12px;font-weight:700">Desde<input data-pay-from type="date" value="'+fromDate+'" style="min-width:0;width:100%;box-sizing:border-box;padding:9px 5px;border:1px solid #d1d5db;border-radius:9px;background:var(--card,#fff);color:inherit"></label>'+
      '<label style="min-width:0;display:grid;gap:5px;font-size:12px;font-weight:700">Hasta<input data-pay-to type="date" value="'+toDate+'" style="min-width:0;width:100%;box-sizing:border-box;padding:9px 5px;border:1px solid #d1d5db;border-radius:9px;background:var(--card,#fff);color:inherit"></label>'+
      '</div><button type="button" data-pay-apply style="width:100%;padding:10px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:800;margin-bottom:13px">Aplicar fechas</button>'+
      (dateError?'<p role="alert" style="color:#b91c1c;font-size:12px;margin:0 0 12px">'+dateError+'</p>':'')+
      (period==='custom'?'<p style="font-size:12px;font-weight:700;margin:0 0 12px">Periodo seleccionado: '+(fromDate||toDate)+' a '+(toDate||fromDate)+'</p>':'');
    const unknownDates=period==='all'?picked.filter(o=>!day(o.paid_at)).length:0;
    for(const p of panels()){
      const el=p.querySelector('[data-public-payments]');
      if(!el)continue;
      el.style.display=role==='owner'?'block':'none';
      if(role!=='owner')continue;
      el.innerHTML='<h3 style="margin:0 0 5px;font-size:18px">Pagos del catálogo público</h3>'+
        '<p style="font-size:12px;color:var(--muted,#64748b);margin:0 0 12px">Solo pagos confirmados; ninguna venta de caja se suma aquí.</p>'+
        '<div style="display:flex;gap:8px;margin-bottom:14px">'+tabs+'</div>'+dateFilter+
        (error?'<p style="color:#b91c1c">No se pudo consultar el resumen. Pulsa Actualizar.</p>':
        orders===null?'<p>Consultando pagos confirmados…</p>':
        '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:12px"><div><small>Total cobrado</small><strong style="display:block;font-size:24px">'+money(total)+'</strong></div>'+
        '<div><small>Pedidos pagados</small><strong style="display:block;font-size:24px">'+picked.length+'</strong></div></div>'+
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;font-size:13px">'+lines+'</div>'+
        (unknownDates?'<p style="font-size:12px">Hay '+unknownDates+' pago(s) sin fecha de confirmación. Solo aparecen en «Todo».</p>':'')+
        '<p style="font-size:11px;color:var(--muted,#64748b);margin:12px 0 0">Incluye envío si corresponde. Pedidos pendientes excluidos.</p>')+
        '<button type="button" data-pay-refresh style="margin-top:12px;padding:9px;border-radius:10px;border:1px solid #d1d5db;background:transparent;color:inherit">↻ Actualizar</button>';
    }
  }
  async function refresh(force=false){
    mount();
    if(pending)return pending;
    if(!force&&orders!==null&&Date.now()-lastFetch<15000){draw();return}
    pending=(async()=>{
      try{
        const sb=window.vareliaSupabase;
        if(!sb)throw Error('Sin conexión');
        const auth=await sb.auth.getUser();
        if(auth.error||!auth.data?.user?.id)throw Error('Sin sesión');
        const pr=await sb.from('profiles').select('business_id,role').eq('id',auth.data.user.id).maybeSingle();
        if(pr.error||!pr.data?.business_id)throw Error('Negocio no vinculado');
        const id=String(pr.data.business_id);
        role=String(pr.data.role||'');
        if(id!==business){business=id;orders=null}
        if(role!=='owner'){error='';orders=null;return}
        const all=[],size=500;
        for(let from=0;from<20000;from+=size){
          const r=await sb.from('public_catalog_orders')
            .select('id,total,payment_method,paid_at')
            .eq('business_id',id).eq('payment_status','paid')
            .order('id',{ascending:true}).range(from,from+size-1);
          if(r.error)throw r.error;
          if(id!==business)return;
          all.push(...(r.data||[]));
          if((r.data||[]).length<size)break;
          if(from+size>=20000)throw Error('Límite de pedidos superado');
        }
        orders=all;error='';lastFetch=Date.now();
      }catch(e){orders=null;error=String(e?.message||e);console.warn('Pagos del catálogo',e)}
      finally{draw()}
    })().finally(()=>{pending=null});
    return pending;
  }
  function init(){
    mount();draw();
    document.addEventListener('click',e=>{
      if(e.target.closest('[data-view="orders"],[data-view="catalogOrders"],[data-admin-open="orders"],[data-mobile-action="orders"]'))setTimeout(()=>refresh(),80);
    },true);
    addEventListener('varelia:catalog-payment-confirmed',()=>refresh(true));
    addEventListener('focus',()=>{if(panels().some(p=>p.classList.contains('active')))refresh()});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&panels().some(p=>p.classList.contains('active')))refresh()});
    setInterval(()=>{
      mount();
      if(document.visibilityState==='visible'&&panels().some(p=>p.classList.contains('active')))refresh();
    },30000);
    const timer=setInterval(()=>{mount();if(panels().length===2)clearInterval(timer)},500);
    setTimeout(()=>refresh(true),700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();