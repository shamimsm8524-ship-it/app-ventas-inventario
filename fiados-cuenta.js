(()=>{
  if(window.VareliaCreditBook)return;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cents=n=>Math.max(0,Math.round((Number(n)||0)*100));
  const money=n=>'S/ '+(n/100).toFixed(2);
  const fmt=d=>{const date=new Date(d);return Number.isFinite(date.getTime())?date.toLocaleString('es-PE',{timeZone:'America/Lima'}):String(d||'')};
  const keyOf=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('es-PE');
  const creditDate=d=>{const x=new Date(d);return Number.isFinite(x.getTime())?x.toLocaleDateString('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'2-digit',year:'numeric'}):'Sin fecha'};
  const creditTime=d=>{const x=new Date(d);return Number.isFinite(x.getTime())?x.toLocaleTimeString('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false}):'Sin hora'};

  let scope='',userId='',role='',credits=[],payments=[],staff={},loaded=false,lastLoaded=0,working=null,error='',root=null,submitting=false;
  // Mantener la ficha de cada cliente abierta entre actualizaciones del historial.
  const expandedAccounts=new Set();
  const accountCode=g=>String(g.cashier)+'|'+String(g.key);
  const id=s=>String(s.sale_id||'');
  function groups(){
    const bySale=new Map();
    for(const p of payments){const k=String(p.credit_sale_id||'');if(!bySale.has(k))bySale.set(k,[]);bySale.get(k).push(p)}
    const grouped=new Map();
    for(const sale of credits){
      const cashier=String(sale.cashier_id||''),customerKey=String(sale.customer_key||keyOf(sale.customer_name));
      const code=cashier+'|'+customerKey;
      if(!grouped.has(code))grouped.set(code,{name:sale.customer_name,key:customerKey,cashier,total:0,paid:0,orders:[],last:''});
      const g=grouped.get(code),items=bySale.get(id(sale))||[],total=cents(sale.total);
      const paid=items.reduce((n,p)=>n+cents(p.amount),0);
      g.total+=total;g.paid+=paid;g.orders.push({...sale,paidCents:paid,totalCents:total,payments:items});
      g.last=String(sale.created_at)>g.last?String(sale.created_at):g.last;
    }
    return [...grouped.values()].sort((a,b)=>b.last.localeCompare(a.last));
  }
  const due=g=>Math.max(0,g.total-g.paid);
  const state=g=>due(g)<=0?'CANCELADO':'PENDIENTE';
  const qtyLabel=item=>{
    let n=Number(item.qty)||0,u=String(item.unit||item.sale_unit||'unidad').trim().toLowerCase();
    if(['kg','kilo','kilos','kilogramo','kilogramos'].includes(u)){
      return n<1?Number((n*1000).toFixed(2))+' gramos':Number(n.toFixed(3))+' kg';
    }
    if(['g','gr','gramo','gramos'].includes(u))return Number(n.toFixed(3))+' gramos';
    return Number(n.toFixed(3))+' '+({'blister':'blíster(es)','blíster':'blíster(es)','caja':'caja(s)','unidad':'unidad(es)','pastilla':'pastilla(s)'}[u]||u);
  };
  const orderLines=o=>{
    const items=Array.isArray(o.items)?o.items:[];
    return items.length?items.map(i=>'<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;padding:10px 0;border-bottom:1px solid #e5e7eb;align-items:start"><div style="min-width:0;overflow-wrap:anywhere"><b style="display:block;line-height:1.3">'+escape(i.name||'Producto')+
      '</b><div style="font-size:12px">'+escape(qtyLabel(i))+' × S/ '+Number(i.unit_price||0).toFixed(2)+'</div></div>'+
      '<strong style="white-space:nowrap;line-height:1.3">'+money(cents(i.subtotal??((Number(i.qty)||0)*(Number(i.unit_price)||0))))+'</strong></div>').join(''):
      '<p style="font-size:12px">No hay detalle del producto en este registro.</p>';
  };
  function render(){
    if(!root||!root.isConnected)return;
    if(!loaded){root.innerHTML='<h3>Cuaderno de fiados</h3><p>Consultando deudas y productos en la nube…</p>';return}
    const list=groups(),pending=list.reduce((n,g)=>n+due(g),0),active=list.filter(g=>due(g)>0).length;
    const stat=document.getElementById('vareliaCreditPendingStat');
    if(stat)stat.textContent=money(pending);
    root.innerHTML='<h3>Cuaderno de fiados por cliente</h3>'+
      '<p style="color:var(--muted,#64748b);font-size:12px">Las compras del mismo cliente se agrupan por caja. Incluye kilos, gramos, cajas, blísteres, unidades y todos los abonos.</p>'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;font-weight:850;margin-bottom:12px"><span>Deuda pendiente: '+money(pending)+'</span><span>Clientes pendientes: '+active+'</span></div>'+
      (error?'<p role="alert" style="color:#b91c1c">Error de sincronización: '+escape(error)+'</p>':'')+
      '<button type="button" data-credit-refresh style="border:1px solid var(--line,#ddd);padding:9px 12px;border-radius:10px;background:transparent;color:inherit;margin-bottom:14px">↻ Actualizar</button>'+
      (list.length?list.map((g,i)=>{
        const balance=due(g),paid=state(g)==='CANCELADO';
        const open=expandedAccounts.has(accountCode(g));
        return '<div data-credit-account="'+i+'" style="border:1px solid var(--line,#ddd);padding:13px;margin:10px 0;border-radius:15px;background:var(--card,#fff)">'+
          '<button type="button" data-credit-toggle="'+i+'" aria-expanded="'+String(open)+'" style="width:100%;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;padding:0;font:inherit;display:block"><b><span data-credit-chevron>'+(open?'▼':'▶')+'</span> '+escape(g.name)+'</b>'+
          (role==='owner'?'<div style="font-size:12px;color:var(--muted,#64748b)">Caja: '+escape(staff[g.cashier]||g.cashier.slice(0,8))+'</div>':'')+
          '<div style="display:flex;justify-content:space-between;gap:10px;margin-top:8px"><strong style="font-size:22px">'+money(balance)+'</strong>'+
          '<b style="color:'+(paid?'#047857':'#b45309')+'">'+state(g)+'</b></div></button>'+
          '<div data-credit-detail style="display:'+(open?'block':'none')+';margin:12px 0 0;padding-top:12px;border-top:1px solid #e5e7eb">'+
          '<p style="font-size:13px;margin:0 0 12px">Total fiado: <b>'+money(g.total)+'</b> · Abonado: <b>'+money(g.paid)+'</b></p>'+
          g.orders.map(o=>'<section style="border:1px solid #d1d5db;border-radius:12px;padding:10px;margin-bottom:9px">'+
            '<div style="display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;min-width:0">'+
              '<b style="font-size:15px;line-height:1.35">Compra fiada</b>'+
              '<div style="font-size:13px;line-height:1.35">Fecha: <strong>'+escape(creditDate(o.created_at))+'</strong></div>'+
              '<div style="font-size:13px;line-height:1.35">Hora: <strong>'+escape(creditTime(o.created_at))+'</strong></div>'+
              '<div style="font-size:14px;line-height:1.35;margin-top:4px">Total de compra: <strong style="white-space:nowrap">'+money(o.totalCents)+'</strong></div>'+
            '</div>'+
            orderLines(o)+
            (o.payments.length?'<div style="font-size:12px;margin-top:9px"><b>Abonos de esta compra</b>'+
            o.payments.map(p=>'<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0"><span>'+escape(fmt(p.created_at))+' · '+escape(p.method)+'</span><b>−'+money(cents(p.amount))+'</b></div>').join('')+'</div>':'<p style="font-size:12px;margin-bottom:0">Sin abonos</p>')+
            '<p style="font-size:12px;font-weight:850;margin:8px 0 0">Saldo de la compra: '+money(Math.max(0,o.totalCents-o.paidCents))+'</p></section>').join('')+
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:10px;margin-top:14px">'+
          (balance?'<button type="button" data-credit-pay="'+i+'" style="width:100%;min-width:0;padding:13px 11px;border:0;border-radius:10px;color:#fff;background:#2563eb;font-weight:850;box-sizing:border-box;font-size:14px">+ Registrar abono</button>':'')+
          '<button type="button" data-credit-print="'+i+'" style="width:100%;min-width:0;padding:13px 11px;border:1px solid #d1d5db;border-radius:10px;color:inherit;background:transparent;font-weight:850;box-sizing:border-box;font-size:14px">🖨️ Imprimir detalle</button></div></div></div>';
      }).join(''):'<p class="empty">No hay fiados registrados todavía.</p>');
  }
  async function queryAll(sb,table,select){
    const all=[],size=500;
    for(let start=0;start<20000;start+=size){
      const r=await sb.from(table).select(select).eq('business_id',scope).order('created_at',{ascending:true}).range(start,start+size-1);
      if(r.error)throw r.error;
      all.push(...(r.data||[]));
      if((r.data||[]).length<size)return all;
    }
    throw new Error('Hay demasiados registros para este reporte');
  }
  async function refresh(force=false){
    if(working)return working;
    if(!force&&loaded&&Date.now()-lastLoaded<15000){render();return}
    working=(async()=>{
      try{
        const sb=window.vareliaSupabase;
        if(!sb)throw Error('No hay conexión con Supabase');
        const auth=await sb.auth.getUser();
        if(auth.error||!auth.data?.user?.id)throw Error('No se encontró la sesión');
        const user=auth.data.user,profile=await sb.from('profiles').select('business_id,role').eq('id',user.id).maybeSingle();
        if(profile.error||!profile.data?.business_id)throw Error('Negocio no vinculado');
        const business=String(profile.data.business_id);
        if(business!==scope||user.id!==userId){loaded=false;credits=[];payments=[];staff={}}
        scope=business;userId=String(user.id);role=String(profile.data.role||'');
        const [sales,pays]=await Promise.all([
          queryAll(sb,'varelia_credit_sales','sale_id,business_id,cashier_id,customer_name,customer_key,total,items,created_at'),
          queryAll(sb,'varelia_credit_payments','id,credit_sale_id,business_id,cashier_id,amount,method,payment_group,created_at')
        ]);
        credits=sales;payments=pays;loaded=true;lastLoaded=Date.now();error='';
        if(role==='owner'){
          const names=await sb.from('profiles').select('id,full_name').eq('business_id',scope);
          if(!names.error)staff=Object.fromEntries((names.data||[]).map(p=>[String(p.id),String(p.full_name||'Caja')]));
        }
        const hints=document.getElementById('vareliaCreditNames');
        if(hints)hints.innerHTML=customerNames().map(n=>'<option value="'+escape(n)+'"></option>').join('');
      }catch(e){error=String(e?.message||e);console.warn('Cuaderno de fiados',e);if(!loaded&&root?.isConnected)root.innerHTML='<h3>Cuaderno de fiados</h3><p>No se pudo cargar: '+escape(error)+'</p><button type="button" data-credit-refresh>Reintentar</button>';}
      finally{if(loaded)render()}
    })().finally(()=>{working=null});
    return working;
  }
  const customerNames=()=>[...new Set(credits.filter(s=>String(s.cashier_id)===userId).map(s=>String(s.customer_name||'')))].sort((a,b)=>a.localeCompare(b,'es'));
  function mount(node){
    if(!node)return;
    root=node;
    if(root.dataset.creditBookBound!=='1'){
      root.dataset.creditBookBound='1';
      root.addEventListener('click',e=>{
        const toggle=e.target.closest('[data-credit-toggle]');
        if(toggle){
          e.preventDefault();
          const index=Number(toggle.dataset.creditToggle);
          const g=groups()[index];
          if(!g)return;
          const code=accountCode(g);
          const opening=!expandedAccounts.has(code);
          if(opening)expandedAccounts.add(code);else expandedAccounts.delete(code);
          const detail=toggle.closest('[data-credit-account]')?.querySelector('[data-credit-detail]');
          if(detail)detail.style.display=opening?'block':'none';
          toggle.setAttribute('aria-expanded',String(opening));
          const arrow=toggle.querySelector('[data-credit-chevron]');
          if(arrow)arrow.textContent=opening?'▼':'▶';
          return;
        }
        if(e.target.closest('[data-credit-refresh]')){refresh(true);return}
        const btn=e.target.closest('[data-credit-pay]'),pr=e.target.closest('[data-credit-print]');
        const index=btn?Number(btn.dataset.creditPay):pr?Number(pr.dataset.creditPrint):-1;
        const g=groups()[index];if(!g)return;
        if(btn)openPayment(g);else if(pr)printStatement(g);
      });
    }
    render();
    refresh();
  }
  function openPayment(g){
    document.getElementById('vareliaCreditAbonoModal')?.remove();
    const balance=due(g);if(!balance)return;
    const modal=document.createElement('div');modal.id='vareliaCreditAbonoModal';
    modal.style.cssText='position:fixed;inset:0;z-index:2147483550;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML='<form style="background:var(--card,#fff);color:var(--ink,#111);border-radius:18px;padding:22px;display:grid;gap:12px;width:min(95vw,440px);max-height:85vh;overflow:auto">'+
      '<h3 style="margin:0">Registrar abono</h3><b>'+escape(g.name)+'</b><p>Saldo pendiente: <b>'+money(balance)+'</b></p>'+
      '<label>Monto abonado (S/)<input name="amount" required min="0.01" max="'+(balance/100).toFixed(2)+'" step="0.01" type="number" inputmode="decimal" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:9px;color:inherit;background:transparent"></label>'+
      '<label>Medio de pago<select name="method" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:9px;color:inherit;background:var(--card,#fff)">'+
      ['Efectivo','Yape','Plin','Transferencia','Tarjeta'].map(m=>'<option>'+m+'</option>').join('')+'</select></label>'+
      '<small>Este abono descuenta primero la deuda más antigua del cliente.</small><div style="display:flex;gap:8px">'+
      '<button type="button" data-credit-close style="flex:1;padding:11px;border:1px solid #ccc;border-radius:9px;color:inherit;background:transparent">Volver</button>'+
      '<button type="submit" style="flex:1;padding:11px;border:0;border-radius:9px;color:#fff;background:#2563eb;font-weight:850">Guardar abono</button></div></form>';
    document.body.appendChild(modal);
    modal.querySelector('[data-credit-close]').onclick=()=>modal.remove();
    modal.querySelector('form').onsubmit=async e=>{
      e.preventDefault();if(submitting)return;
      const form=e.currentTarget,amount=Number(form.elements.amount.value),method=form.elements.method.value;
      if(!Number.isFinite(amount)||cents(amount)<=0||cents(amount)>balance){window.vareliaToast?.('Revisa el monto: no puede superar la deuda.','warn');return}
      submitting=true;form.querySelector('[type="submit"]').disabled=true;
      try{
        const sb=window.vareliaSupabase;
        const p=await sb.rpc('varelia_pay_customer_credit',{p_customer_key:g.key,p_cashier_id:g.cashier,p_amount:amount,p_method:method});
        if(p.error)throw p.error;
        modal.remove();
        window.vareliaToast?.(p.data?.status==='CANCELADO'?'Deuda CANCELADA':'Abono registrado','ok');
        await refresh(true);
        window.dispatchEvent(new CustomEvent('varelia:credit-payment-registered'));
      }catch(err){window.vareliaToast?.('No se guardó el abono: '+String(err?.message||err),'warn');form.querySelector('[type="submit"]').disabled=false}
      finally{submitting=false}
    };
  }
  function printStatement(g){
    const rows=g.orders.map(o=>'<h3>Compra '+escape(fmt(o.created_at))+' · '+money(o.totalCents)+'</h3><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>'+
      (Array.isArray(o.items)?o.items:[]).map(i=>'<tr><td>'+escape(i.name||'Producto')+'</td><td>'+escape(qtyLabel(i))+'</td><td>S/ '+Number(i.unit_price||0).toFixed(2)+'</td><td>'+money(cents(i.subtotal??((Number(i.qty)||0)*(Number(i.unit_price)||0))))+'</td></tr>').join('')+'</tbody></table>').join('');
    const merged=new Map();
    for(const p of g.orders.flatMap(o=>o.payments)){
      const k=String(p.payment_group||p.id);
      if(!merged.has(k))merged.set(k,{at:p.created_at,method:p.method,amount:0});
      merged.get(k).amount+=cents(p.amount);
    }
    const payRows=[...merged.values()].sort((a,b)=>String(a.at).localeCompare(String(b.at))).map(p=>'<tr><td>'+escape(fmt(p.at))+'</td><td>'+escape(p.method)+'</td><td>'+money(p.amount)+'</td></tr>').join('');
    const html='<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Fiados de '+escape(g.name)+'</title>'+
      '<style>@page{size:A4;margin:14mm}body{font:13px Arial,sans-serif;color:#111}h1{font-size:21px}h3{font-size:13px;background:#eee;padding:8px}table{width:100%;border-collapse:collapse;margin-bottom:15px}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f4f6}.total{font-size:15px;font-weight:750;padding:6px 0;border-bottom:1px solid #ddd}</style></head><body>'+
      '<h1>Estado de cuenta · Fiados</h1><p><b>Cliente:</b> '+escape(g.name)+'</p><p><b>Caja:</b> '+escape(staff[g.cashier]||g.cashier.slice(0,8))+'</p><p><b>Emitido:</b> '+escape(fmt(new Date()))+'</p>'+
      '<h2>Detalle de compras</h2>'+rows+'<h2>Historial de abonos</h2><table><tr><th>Fecha</th><th>Medio</th><th>Abonado</th></tr>'+payRows+'</table>'+
      '<p class="total">Total fiado: '+money(g.total)+'</p><p class="total">Total abonado: '+money(g.paid)+'</p>'+
      '<p class="total">SALDO PENDIENTE: '+money(due(g))+' · '+state(g)+'</p></body></html>';
    const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(frame);
    try{
      const doc=frame.contentDocument;doc.open();doc.write(html);doc.close();
      setTimeout(()=>{try{frame.contentWindow?.focus();frame.contentWindow?.print()}catch(e){console.warn(e)}setTimeout(()=>frame.remove(),3000)},300);
    }catch(e){frame.remove();window.vareliaToast?.('No se pudo preparar el estado de cuenta.','warn')}
  }
  window.VareliaCreditBook={mount,render,refresh,customerNames,totals:()=>({pending:groups().reduce((a,g)=>a+due(g),0),loaded})};
  window.addEventListener('varelia:sale-recorded',()=>setTimeout(()=>refresh(true),700));
  window.addEventListener('focus',()=>{if(root?.isConnected)refresh(true)});
  setInterval(()=>{if(root?.isConnected&&document.visibilityState==='visible')refresh(false)},15000);
  setTimeout(()=>refresh(true),600);
})();