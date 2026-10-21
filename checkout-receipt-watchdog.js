(()=>{
  if(window.__vareliaCheckoutReceiptWatchdogV1)return;
  window.__vareliaCheckoutReceiptWatchdogV1=true;
  const money=n=>'S/ '+(Number(n)||0).toFixed(2);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const receiptOpen=()=>!!document.getElementById('vreceiptOverlay')?.classList.contains('show')||!!document.getElementById('vareliaEmergencyReceipt')||!!document.getElementById('vareliaReceiptWatchdog');
  const saleList=()=>{try{return Array.isArray(sales)?sales:(Array.isArray(window.sales)?window.sales:[])}catch{return Array.isArray(window.sales)?window.sales:[]}};
  const cartItems=()=>{try{const a=window.VareliaPOS?.getCartItems?.();if(Array.isArray(a)&&a.length)return a.map(x=>({...x}))}catch{};try{if(Array.isArray(cart)&&cart.length)return cart.map(x=>({...x}))}catch{};return[]};
  const numberText=t=>{const n=Number(String(t||'').replace(/[^0-9.,-]/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  function visibleSnapshot(){
    const api=cartItems();
    let items=api.map(i=>({
      id:i.id||i.productId||'',name:String(i.name||i.productName||'Producto'),qty:Number(i.qty??i.quantity??1)||1,
      price:Number(i.price??i.sellPrice??0)||0,subtotal:Number(i.subtotal)||((Number(i.qty??i.quantity??1)||1)*(Number(i.price??i.sellPrice??0)||0)),
      unit:String(i.medicineSaleUnit||i.saleUnit||i.unit||''),saleType:String(i.saleType||'')
    }));
    if(!items.length){
      items=[...document.querySelectorAll('#vposItems .vposRow')].map(row=>{
        const qty=Number(row.querySelector('.vposQtyInput')?.value)||1;
        const price=numberText(row.querySelector('.vposPrice')?.textContent);
        const subtotal=numberText(row.querySelector('.vposSubtotal')?.textContent)||(qty*price);
        return {name:String(row.querySelector('.vposName b')?.textContent||'Producto').trim(),qty,price,subtotal,unit:''};
      }).filter(x=>x.name);
    }
    const total=numberText(document.getElementById('vposTotal')?.textContent)||items.reduce((s,i)=>s+(Number(i.subtotal)||((Number(i.qty)||1)*(Number(i.price)||0))),0);
    const snap=window.VareliaPaymentSnapshot||{};
    const received=Number(snap.received)||numberText(document.getElementById('vposAmountReceived')?.value)||numberText(document.getElementById('vpayReceived')?.value)||numberText(document.getElementById('vReceived')?.value)||0;
    const method=String(snap.method||document.getElementById('vposPaymentMethod')?.value||document.getElementById('vposPayMethod')?.value||'Efectivo');
    const change=Number(snap.change)||Math.max(0,received-total);
    return {items,total,paymentMethod:method,amountReceived:received,changeGiven:change,paymentBreakdown:snap.breakdown||{}};
  }
  function normalizeSale(sale,fallback){
    const f=fallback||{};sale=sale&&typeof sale==='object'?{...sale}:{};
    const items=Array.isArray(sale.items)&&sale.items.length?sale.items:(Array.isArray(f.items)?f.items:[]);
    const total=Number(sale.total)>0?Number(sale.total):Number(f.total)||items.reduce((s,i)=>s+(Number(i.subtotal)||((Number(i.qty)||1)*(Number(i.price)||0))),0);
    return {...sale,items,total,paymentMethod:sale.paymentMethod||f.paymentMethod||'Efectivo',amountReceived:Number(sale.amountReceived??sale.received??f.amountReceived)||0,changeGiven:Number(sale.changeGiven??sale.change??f.changeGiven)||0,date:sale.date||new Date().toISOString(),receiptNumber:sale.receiptNumber||sale.receipt_number||('V-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+String(Date.now()).slice(-6))};
  }
  function showReceipt(raw,fallback){
    if(receiptOpen())return true;
    const sale=normalizeSale(raw,fallback);if(!sale.items.length||!(sale.total>0))return false;
    window.__vareliaLastReceipt=sale;
    let box=document.createElement('div');box.id='vareliaReceiptWatchdog';
    box.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(15,23,42,.72);overflow:auto';
    const business=String(document.getElementById('vareliaBusinessName')?.textContent||window.vareliaBusinessDisplayName||'Varelia').trim();
    const items=sale.items.map(i=>{const q=Number(i.qty??i.quantity??1)||1,p=Number(i.price??i.sellPrice??0)||0,sub=Number(i.subtotal)||(q*p);return '<div style="display:flex;justify-content:space-between;gap:10px;margin:10px 0"><div style="min-width:0"><b>'+esc(i.name||i.productName||'Producto')+'</b><div style="font-size:12px;color:#64748b;margin-top:3px">'+esc(q)+' × '+money(p)+'</div></div><b style="white-space:nowrap">'+money(sub)+'</b></div>'}).join('');
    const received=Number(sale.amountReceived)||0,change=Number(sale.changeGiven)||Math.max(0,received-sale.total);
    box.innerHTML='<div style="width:min(96vw,520px);max-height:92vh;overflow:auto;background:#fff;color:#111827;border-radius:24px;padding:20px;box-shadow:0 24px 80px #0006"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0;font-size:23px">Comprobante de venta</h2><button type="button" data-rw-close style="border:0;background:#f1f5f9;border-radius:12px;padding:8px 13px;font-size:24px">×</button></div><div style="font-family:monospace;border:1px dashed #94a3b8;border-radius:15px;margin-top:15px;padding:17px 15px"><h3 style="text-align:center;margin:0 0 5px;font-size:21px">'+esc(business)+'</h3><div style="text-align:center;color:#64748b;font-size:12px">COMPROBANTE INTERNO DE VENTA</div><hr style="border:0;border-top:1px dashed #94a3b8;margin:13px 0"><div style="display:flex;justify-content:space-between;gap:8px"><span>N.º</span><b>'+esc(sale.receiptNumber)+'</b></div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px"><span>Fecha</span><span>'+esc(new Date(sale.date).toLocaleString('es-PE'))+'</span></div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px"><span>Pago</span><span>'+esc(sale.paymentMethod)+'</span></div><hr style="border:0;border-top:1px dashed #94a3b8;margin:13px 0">'+items+'<hr style="border:0;border-top:1px dashed #94a3b8;margin:13px 0"><div style="display:flex;justify-content:space-between;font-size:22px;font-weight:900"><span>TOTAL</span><span>'+money(sale.total)+'</span></div><hr style="border:0;border-top:1px dashed #94a3b8;margin:13px 0"><div style="display:flex;justify-content:space-between"><span>Recibido</span><b>'+money(received)+'</b></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Vuelto</span><b>'+money(change)+'</b></div><div style="text-align:center;color:#64748b;font-size:11px;margin-top:15px">Este ticket es un comprobante interno; no reemplaza boleta o factura electrónica SUNAT.</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px"><button type="button" data-rw-print style="min-height:48px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:900">🖨️ Imprimir</button><button type="button" data-rw-pdf style="min-height:48px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;font-weight:900">📄 Descargar PDF</button><button type="button" data-rw-close style="grid-column:1/-1;min-height:48px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;font-weight:900">Cerrar</button></div></div>';
    document.body.appendChild(box);
    box.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-rw-close')){box.remove();return}if(b.hasAttribute('data-rw-print')){if(window.VareliaReceipt?.print)window.VareliaReceipt.print(sale);else window.print();return}if(b.hasAttribute('data-rw-pdf')){if(window.VareliaReceipt?.pdf)window.VareliaReceipt.pdf(sale);else alert('Pulsa Imprimir y elige Guardar como PDF.')}};
    return true;
  }
  let pending=null;
  function arm(){
    const snap=visibleSnapshot();if(!snap.items.length||!(snap.total>0))return;
    pending={snap,before:saleList().length,at:Date.now()};
    [250,500,900,1500,2500,4000,6500].forEach(ms=>setTimeout(()=>{
      if(!pending||receiptOpen())return;
      const list=saleList();
      if(list.length>pending.before){showReceipt(list[list.length-1],pending.snap);pending=null;return}
      if(window.__vareliaLastReceipt&&Date.now()-pending.at<9000){if(showReceipt(window.__vareliaLastReceipt,pending.snap)){pending=null;return}}
      const stillRows=document.querySelectorAll('#vposItems .vposRow').length;
      let liveCart=0;try{liveCart=cartItems().length}catch{}
      if(stillRows===0&&liveCart===0&&Date.now()-pending.at>450){if(showReceipt(null,pending.snap))pending=null}
    },ms));
  }
  document.addEventListener('click',e=>{if(e.target?.closest?.('#vposCheckout'))arm()},true);
  window.addEventListener('varelia:checkout-confirmed',e=>{if(receiptOpen())return;const snap=pending?.snap||visibleSnapshot();if(showReceipt(e.detail?.sale,snap))pending=null});
  window.addEventListener('varelia:sale-recorded',e=>{if(receiptOpen())return;const list=saleList(),snap=pending?.snap||visibleSnapshot();const sale=e.detail?.sale||(list.length?list[list.length-1]:null);if(showReceipt(sale,snap))pending=null});
})();
