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
      '</b><div style="font-size:12px;color:var(--muted,#64748b);line-height:1.4;margin-top:3px">Cantidad: '+escape(qtyLabel(i))+'</div>'+
      '<div style="font-size:12px;color:var(--muted,#64748b);line-height:1.4">Precio unitario: S/ '+Number(i.unit_price||0).toFixed(2)+'</div></div>'+
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
              '<div style="font-size:13px;line-height:1.35;font-weight:850">Estado: '+(orderBalance(o)>0?'PENDIENTE':'PAGADO')+'</div>'+
            '</div>'+
            '<div style="font-size:13px;font-weight:850;margin-top:12px;margin-bottom:3px">Productos fiados ('+(Array.isArray(o.items)?o.items.length:0)+')</div>'+
            orderLines(o)+
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;padding:11px 0 6px;border-bottom:1px solid #e5e7eb;font-weight:850;font-size:14px">'+
              '<span>Total de la compra</span><strong style="white-space:nowrap">'+money(o.totalCents)+'</strong></div>'+
            (o.payments.length?'<div style="font-size:12px;margin-top:9px"><b>Abonos de esta compra</b>'+
            paymentsOf(o).map(p=>'<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0"><span>Fecha: '+escape(creditDate(p.date))+' · Hora: '+escape(creditTime(p.date))+'<br>Medio: '+escape(p.method||'No indicado')+'</span><b>−'+money(p.amount)+'</b></div>').join('')+'</div>':'<p style="font-size:12px;margin-bottom:0">Sin abonos</p>')+
            '<p style="font-size:12px;font-weight:850;margin:8px 0 0">Saldo de la compra: '+money(Math.max(0,o.totalCents-o.paidCents))+'</p></section>').join('')+
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:10px;margin-top:14px">'+
          (balance?'<button type="button" data-credit-pay="'+i+'" style="width:100%;min-width:0;padding:13px 11px;border:0;border-radius:10px;color:#fff;background:#2563eb;font-weight:850;box-sizing:border-box;font-size:14px">+ Registrar abono</button>':'')+
          '<button type="button" data-credit-print="'+i+'" style="width:100%;min-width:0;padding:13px 11px;border:1px solid #d1d5db;border-radius:10px;color:inherit;background:transparent;font-weight:850;box-sizing:border-box;font-size:14px">⬇️ Descargar PDF</button></div></div></div>';
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
  let creditPdfLoader=null;
  function creditPdfClass(){
    if(window.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
    if(creditPdfLoader)return creditPdfLoader;
    creditPdfLoader=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
      script.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error('Biblioteca PDF no disponible'));
      script.onerror=()=>reject(new Error('No se pudo cargar el generador PDF'));
      document.head.appendChild(script);
    }).catch(err=>{creditPdfLoader=null;throw err});
    return creditPdfLoader;
  }
  const orderBalance=o=>Math.max(0,o.totalCents-o.paidCents);
  function paymentsOf(order){
    const map=new Map();
    for(const p of order.payments||[]){
      const key=String(p.payment_group||p.id||p.created_at);
      if(!map.has(key))map.set(key,{date:p.created_at,method:p.method,amount:0});
      map.get(key).amount+=cents(p.amount);
    }
    return [...map.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }
  function orderSections(g){
    const pending=[],paid=[];
    for(const o of g.orders)(orderBalance(o)>0?pending:paid).push(o);
    const sort=(a,b)=>String(a.created_at).localeCompare(String(b.created_at));
    return [{title:'COMPRAS PENDIENTES',orders:pending.sort(sort)},{title:'COMPRAS PAGADAS',orders:paid.sort(sort)}];
  }
  async function saveCreditPdf(g){
    const JsPDF=await creditPdfClass();
    const doc=new JsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const margin=16,usableWidth=178;
    let y=18;
    function needSpace(mm){
      if(y+mm<=281)return;
      doc.addPage();
      y=18;
    }
    function line(value,{bold=false,size=10,indent=0,after=2}={}){
      const text=String(value??'');
      doc.setFont('helvetica',bold?'bold':'normal');
      doc.setFontSize(size);
      const lines=doc.splitTextToSize(text,usableWidth-indent);
      const height=lines.length*(size*0.42+1);
      needSpace(height+after);
      doc.text(lines,margin+indent,y);
      y+=height+after;
    }
    function separator(){needSpace(5);doc.setDrawColor(180);doc.line(margin,y,194,y);y+=5}
    const company=String(document.getElementById('vareliaBusinessName')?.textContent||'Varelia').trim();
    line(company,{bold:true,size:15});
    line('ESTADO DE CUENTA - FIADOS',{bold:true,size:13,after:5});
    line('Cliente: '+g.name,{bold:true});
    line('Caja: '+(staff[g.cashier]||g.cashier.slice(0,8)));
    line('Emitido: '+fmt(new Date()));
    separator();
    line('DEUDA ACTUAL: '+money(due(g)),{bold:true,size:14,after:4});
    separator();
    for(const section of orderSections(g)){
      if(!section.orders.length)continue;
      line(section.title,{bold:true,size:12,after:4});
      for(const order of section.orders){
        needSpace(36);
        line('Compra: '+creditDate(order.created_at)+' | Hora: '+creditTime(order.created_at),{bold:true,after:1});
        line('ESTADO: '+(orderBalance(order)>0?'PENDIENTE':'PAGADO'),{bold:true,size:10,after:3});
        const its=Array.isArray(order.items)?order.items:[];
        for(const item of its){
          line(String(item.name||'Producto'),{bold:true,size:10,indent:3,after:0});
          line('Cantidad: '+qtyLabel(item)+' | Precio: S/ '+Number(item.unit_price||0).toFixed(2),{size:9,indent:3,after:0});
          line('Subtotal: '+money(cents(item.subtotal??((Number(item.qty)||0)*(Number(item.unit_price)||0)))),{size:9,indent:3,after:2});
        }
        if(!its.length)line('Sin productos detallados en el registro',{size:9,indent:3});
        line('Total de la compra: '+money(order.totalCents),{bold:true,indent:3});
        line('ABONOS DE ESTA COMPRA',{bold:true,size:10,indent:3,after:2});
        const allocated=paymentsOf(order);
        if(!allocated.length)line('Sin abonos registrados',{size:9,indent:3});
        for(const p of allocated){
          line('Fecha del abono: '+creditDate(p.date)+' | Hora: '+creditTime(p.date),{size:9,indent:3,after:0});
          line('Medio: '+String(p.method||'No indicado')+' | Monto: '+money(p.amount),{size:9,indent:3,after:3});
        }
        line('Saldo de esta compra: '+money(orderBalance(order)),{bold:true,indent:3});
        separator();
      }
    }
    line('RESUMEN DE LA CUENTA',{bold:true,size:12,after:4});
    line('TOTAL HISTORICO FIADO: '+money(g.total),{bold:true,size:11});
    line('TOTAL ABONADO: '+money(g.paid),{bold:true,size:11});
    line('DEUDA ACTUAL: '+money(due(g)),{bold:true,size:14});
    line('ESTADO GENERAL: '+state(g),{bold:true,size:11});
    const safe=String(g.name||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').slice(0,55);
    const filename='Fiado-'+(safe||'cliente')+'.pdf';
    if(window.VareliaAndroid&&typeof window.VareliaAndroid.saveDataUrl==='function'){
      window.VareliaAndroid.saveDataUrl(doc.output('datauristring'),filename);
      window.vareliaToast?.('Se enviara el PDF a Descargas/Varelia. Abrelo para imprimir.','ok');
      return;
    }
    doc.save(filename);
    window.vareliaToast?.('PDF generado. Abrelo para imprimir o guardar.','ok');
  }
  function printStatement(g){
    const rows=orderSections(g).map(section=>!section.orders.length?'':'<h2>'+escape(section.title)+'</h2>'+
      section.orders.map(o=>{
        const pays=paymentsOf(o);
        return '<section><h3>Compra: '+escape(creditDate(o.created_at))+' · Hora: '+escape(creditTime(o.created_at))+
          ' · '+(orderBalance(o)>0?'PENDIENTE':'PAGADO')+'</h3>'+
          '<table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>'+
          (Array.isArray(o.items)?o.items:[]).map(i=>'<tr><td>'+escape(i.name||'Producto')+'</td><td>'+escape(qtyLabel(i))+'</td><td>S/ '+Number(i.unit_price||0).toFixed(2)+'</td><td>'+money(cents(i.subtotal??((Number(i.qty)||0)*(Number(i.unit_price)||0))))+'</td></tr>').join('')+
          '</tbody></table><p><b>Total de la compra:</b> '+money(o.totalCents)+'</p>'+
          '<h4>Abonos de esta compra</h4><table><thead><tr><th>Fecha del abono</th><th>Hora</th><th>Medio</th><th>Monto</th></tr></thead><tbody>'+
          (pays.length?pays.map(p=>'<tr><td>'+escape(creditDate(p.date))+'</td><td>'+escape(creditTime(p.date))+'</td><td>'+escape(p.method||'No indicado')+'</td><td>'+money(p.amount)+'</td></tr>').join(''):'<tr><td colspan="4">Sin abonos</td></tr>')+
          '</tbody></table><p><b>Saldo de esta compra:</b> '+money(orderBalance(o))+'</p></section>';
      }).join('')).join('');
    const html='<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Fiados de '+escape(g.name)+'</title>'+
      '<style>@page{size:A4;margin:14mm}body{font:13px Arial,sans-serif;color:#111}h1{font-size:21px}h2{margin-top:20px;font-size:17px}h3{font-size:13px;background:#eee;padding:8px}h4{font-size:12px;margin-bottom:4px}section{break-inside:avoid;border-bottom:1px solid #bbb;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin-bottom:12px}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f4f6}.total{font-size:15px;font-weight:750;padding:6px 0;border-bottom:1px solid #ddd}.due{font-size:19px;font-weight:800}</style></head><body>'+
      '<h1>Estado de cuenta · Fiados</h1><p><b>Cliente:</b> '+escape(g.name)+'</p><p><b>Caja:</b> '+escape(staff[g.cashier]||g.cashier.slice(0,8))+'</p><p><b>Emitido:</b> '+escape(fmt(new Date()))+'</p>'+
      '<p class="due">DEUDA ACTUAL: '+money(due(g))+'</p>'+rows+
      '<h2>Resumen de la cuenta</h2><p class="total">Total histórico fiado: '+money(g.total)+'</p><p class="total">Total abonado: '+money(g.paid)+'</p>'+
      '<p class="due">DEUDA ACTUAL: '+money(due(g))+' · '+state(g)+'</p></body></html>';
    const native=window.VareliaAndroid;
    // La impresion de un iframe invisible no abre el gestor Android WebView.
    // Las APK nuevas usan el gestor de impresion nativo con este HTML completo.
    if(native&&typeof native.printHtmlDocument==='function'){
      try{
        native.printHtmlDocument('Fiados - '+String(g.name||'Cliente').slice(0,80),html);
        return;
      }catch(err){console.warn('Impresion nativa de estado de cuenta',err)}
    }
    // APK instalada sin el nuevo puente: guardar un PDF real que Android
    // pueda abrir/imprimir desde Descargas/Varelia. No generar recibos de venta
    // falsos porque el estado de cuenta incluye varias compras y abonos.
    saveCreditPdf(g).catch(err=>{
      console.error('Guardar PDF de fiados',err);
      window.vareliaToast?.('No se pudo crear el PDF del fiado. Comprueba tu conexion e intenta otra vez.','warn');
    });
  }
  window.VareliaCreditBook={mount,render,refresh,customerNames,totals:()=>({pending:groups().reduce((a,g)=>a+due(g),0),loaded})};
  window.addEventListener('varelia:sale-recorded',()=>setTimeout(()=>refresh(true),700));
  window.addEventListener('focus',()=>{if(root?.isConnected)refresh(true)});
  setInterval(()=>{if(root?.isConnected&&document.visibilityState==='visible')refresh(false)},15000);
  setTimeout(()=>refresh(true),600);
})();