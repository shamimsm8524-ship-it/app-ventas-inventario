(()=>{
  if(window.__vareliaCatalogPaymentsSummary)return;
  window.__vareliaCatalogPaymentsSummary=true;
  const fields=['Yape','Plin','Efectivo','Transferencia','Tarjeta','Otros','Sin especificar'];
  let period='day',orders=null,role='',business='',error='',pending=null,lastFetch=0;
  let selectedDay='',selectedMonth='',fromDate='',toDate='',dateError='',dateBasis='order';
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
        if(b){period=b.dataset.payPeriod;dateError='';draw()}
        const basis=e.target.closest('[data-pay-date-basis]');
        if(basis){dateBasis=basis.dataset.payDateBasis;dateError='';draw()}
        if(e.target.closest('[data-pay-apply]')){
          fromDate=el.querySelector('[data-pay-from]')?.value||'';
          toDate=el.querySelector('[data-pay-to]')?.value||'';
          dateError='';
          if(!fromDate||!toDate)dateError='Elige ambas fechas: Desde y Hasta.';
          else if(fromDate>toDate)dateError='La fecha Desde no puede ser posterior a Hasta.';
          draw();
        }
        if(e.target.closest('[data-pay-refresh]'))refresh(true);
      });
      el.addEventListener('change',e=>{
        const t=e.target;
        if(t.matches('[data-pay-day]')&&t.value){
          selectedDay=t.value;period='day';dateError='';draw();
        }else if(t.matches('[data-pay-month]')&&t.value){
          selectedMonth=t.value;period='month';dateError='';draw();
        }else if(t.matches('[data-pay-from]'))fromDate=t.value;
        else if(t.matches('[data-pay-to]'))toDate=t.value;
      });
    }
  }
  function draw(){
    mount();
    const now=day(new Date()),month=now.slice(0,7);
    const picked=(orders||[]).filter(o=>{
      if(period==='all')return true;
      const selectedDate=day(dateBasis==='order'?o.created_at:o.paid_at);
      if(!selectedDate)return false;
      if(period==='day')return selectedDate===(selectedDay||now);
      if(period==='month')return selectedDate.slice(0,7)===(selectedMonth||month);
      if(period==='range')return !!fromDate&&!!toDate&&fromDate<=toDate&&selectedDate>=fromDate&&selectedDate<=toDate;
      return false;
    });
    const amounts=Object.fromEntries(fields.map(k=>[k,0]));
    let total=0;
    for(const o of picked){
      const n=cents(o.total);
      amounts[method(o.payment_method)]+=n;
      total+=n;
    }
    const tabs=[['day','Elegir día'],['range','Desde - Hasta'],['month','Mes completo'],['all','Todo']].map(([k,title])=>
      '<button type="button" data-pay-period="'+k+'" aria-pressed="'+(period===k)+'" style="min-width:0;border:1px solid #d1d5db;border-radius:10px;padding:10px 5px;font-weight:800;background:'+(period===k?'#2563eb':'transparent')+';color:'+(period===k?'#fff':'inherit')+'">'+title+'</button>'
    ).join('');
    const lines=fields.map(k=>'<div style="display:flex;justify-content:space-between;gap:6px;padding:6px 0;border-bottom:1px solid #e5e7eb"><span>'+k+'</span><b>'+money(amounts[k])+'</b></div>').join('');
    const pickerStyle='min-width:0;width:100%;box-sizing:border-box;padding:10px 7px;border:1px solid #d1d5db;border-radius:10px;background:var(--card,#fff);color:inherit;font-size:14px;';
    const dateFilter=period==='day'
      ?'<label style="display:grid;gap:6px;margin-bottom:13px;font-size:13px;font-weight:750">Selecciona el día<input type="date" data-pay-day value="'+(selectedDay||now)+'" style="'+pickerStyle+'"></label>'
      :period==='month'
      ?'<label style="display:grid;gap:6px;margin-bottom:13px;font-size:13px;font-weight:750">Selecciona mes y año<input type="month" data-pay-month value="'+(selectedMonth||month)+'" style="'+pickerStyle+'"></label>'+
       '<p style="font-size:12px;color:var(--muted,#64748b);margin:0 0 12px">Se incluye automáticamente del día 1 al último día del mes.</p>'
      :period==='range'
      ?'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:11px">'+
        '<label style="min-width:0;display:grid;gap:5px;font-size:12px;font-weight:750">Desde<input data-pay-from type="date" value="'+fromDate+'" style="'+pickerStyle+'"></label>'+
        '<label style="min-width:0;display:grid;gap:5px;font-size:12px;font-weight:750">Hasta<input data-pay-to type="date" value="'+toDate+'" style="'+pickerStyle+'"></label></div>'+
        '<button type="button" data-pay-apply style="width:100%;padding:11px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:800;margin-bottom:11px">Aplicar rango</button>'+
        (dateError?'<p role="alert" style="color:#b91c1c;font-size:12px;margin:0 0 12px">'+dateError+'</p>':'')
      :'<p style="font-size:12px;color:var(--muted,#64748b);margin:0 0 12px">Todos los pagos confirmados, sin limitar fechas.</p>';
    const unknownDates=period==='all'?picked.filter(o=>!day(dateBasis==='order'?o.created_at:o.paid_at)).length:0;
    const dateBasisTabs='<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 12px">'+
      [['order','Fecha del pedido'],['payment','Fecha del cobro']].map(([value,label])=>
        '<button type="button" data-pay-date-basis="'+value+'" aria-pressed="'+(dateBasis===value)+'" style="border:1px solid '+(dateBasis===value?'#2563eb':'#d1d5db')+';border-radius:10px;padding:10px 6px;font-size:12px;font-weight:800;background:'+(dateBasis===value?'#2563eb':'transparent')+';color:'+(dateBasis===value?'#fff':'inherit')+'">'+label+'</button>'
      ).join('')+'</div>';
    const basisNote=dateBasis==='order'
      ?'Pedidos cuyo pago ya está confirmado, agrupados por la fecha en que el cliente hizo el pedido. El cobro pudo ocurrir otro día.'
      :'Dinero cobrado en la fecha en que confirmaste el pago del pedido.';
    for(const p of panels()){
      const el=p.querySelector('[data-public-payments]');
      if(!el)continue;
      el.style.display=role==='owner'?'block':'none';
      if(role!=='owner')continue;
      el.innerHTML='<h3 style="margin:0 0 5px;font-size:18px">Pagos del catálogo público</h3>'+
        '<p style="font-size:12px;color:var(--muted,#64748b);margin:0 0 12px">Solo pagos confirmados; ninguna venta de caja se suma aquí.</p>'+
        dateBasisTabs+
        '<p style="font-size:12px;color:var(--muted,#64748b);margin:0 0 12px">'+basisNote+'</p>'+
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:14px">'+tabs+'</div>'+dateFilter+
        (error?'<p style="color:#b91c1c">No se pudo consultar el resumen. Pulsa Actualizar.</p>':
        orders===null?'<p>Consultando pagos confirmados…</p>':
        '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:12px"><div><small>'+(dateBasis==='order'?'Total de pedidos pagados':'Total cobrado')+'</small><strong style="display:block;font-size:24px">'+money(total)+'</strong></div>'+
        '<div><small>Pedidos pagados</small><strong style="display:block;font-size:24px">'+picked.length+'</strong></div></div>'+
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;font-size:13px">'+lines+'</div>'+
        (unknownDates?'<p style="font-size:12px">Hay '+unknownDates+' pedido(s) sin fecha de '+(dateBasis==='order'?'creación':'cobro')+'. Solo aparecen en «Todo».</p>':'')+
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
            .select('id,total,payment_method,created_at,paid_at')
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