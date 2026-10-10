/* Varelia 2.0: reusable receipt renderer. Data belongs to each business. */
(function(global){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const money=n=>'S/ '+Number(n||0).toFixed(2);
const row=(a,b)=>'<div class="vr-row"><span>'+esc(a)+'</span><span>'+esc(b)+'</span></div>';
function renderReceipt(data){
 const b=data.business||{},sale=data.sale||{},order=data.order||{},kind=data.kind==='order'?'order':'sale';
 const isOrder=kind==='order',detail=isOrder?order:sale;
 const theme=/^#[0-9a-fA-F]{6}$/.test(b.themeColor||'')?b.themeColor:'#2563eb';
 const logo=b.logoUrl&&/^https:\/\//.test(b.logoUrl)?'<img class="vr-logo" src="'+esc(b.logoUrl)+'" alt="Logo del negocio">':'';
 const lines=(detail.items||[]).map(i=>{
  const qty=i.quantity??1,price=i.unitPrice??0,subtotal=i.total??qty*price;
  const extra=i.weightGrams!=null?'Peso: '+i.weightGrams+' g · Precio por kilo: '+money(i.pricePerKg):[i.presentation,i.variant].filter(Boolean).join(' · ')||qty+' × '+money(price);
  return '<div class="vr-product"><div class="vr-row"><strong>'+esc(i.name)+'</strong><strong>'+money(subtotal)+'</strong></div><div class="vr-muted">'+esc(extra)+'</div></div>';
 }).join('');
 const total=Number(detail.total||0);
 const received=detail.received==null?null:Number(detail.received);
 const foot=b.receiptFooter||'Gracias por su compra.';
 const heading=isOrder?'COMPROBANTE DE PEDIDO':'COMPROBANTE INTERNO DE VENTA';
 const info=isOrder?row('Cliente',detail.customerName||'—')+row('Teléfono',detail.customerPhone||'—')+row('Entrega',detail.delivery||'Por confirmar')+row('Estado',detail.status||'PENDIENTE'):row('Pago',detail.paymentMethod||'—')+row('Vendedor',detail.seller||'—');
 return '<div class="vr-receipt" style="--vr-primary:'+theme+'"><div class="vr-paper"><div class="vr-center">'+logo+'<div class="vr-business">'+esc(b.name||'Mi negocio')+'</div><div class="vr-muted">'+heading+'</div>'+(b.taxId?'<div class="vr-muted">RUC/Doc.: '+esc(b.taxId)+'</div>':'')+(b.phone?'<div class="vr-muted">Tel.: '+esc(b.phone)+'</div>':'')+(b.address?'<div class="vr-muted">'+esc(b.address)+'</div>':'')+'</div><div class="vr-rule"></div>'+row('N.º',detail.number||'—')+row('Fecha',detail.date||new Date().toLocaleString('es-PE'))+info+'<div class="vr-rule"></div>'+lines+'<div class="vr-rule"></div><div class="vr-total">'+row('TOTAL',money(total))+'</div>'+(isOrder?row('Estado del pago','Sin confirmar')+(detail.shippingCost==null?row('Envío','Por confirmar'):row('Envío',money(detail.shippingCost))):row(detail.paymentMethod||'Pago',money(total))+(received!=null?row('Recibido',money(received))+row('Vuelto',money(Math.max(0,received-total))):''))+'<div class="vr-center vr-footer">'+esc(foot)+'<div class="vr-muted">'+(isOrder?'Pedido sujeto a confirmación. No acredita pago ni reserva de stock.':'Este ticket es un comprobante interno y no reemplaza una boleta o factura electrónica SUNAT.')+'</div></div></div><div class="vr-actions"><button class="vr-primary" type="button" data-receipt-print>🖨️ Imprimir</button><button type="button" data-receipt-pdf>📄 Descargar comprobante</button><button type="button" data-receipt-share>🟢 WhatsApp</button><button type="button" data-receipt-close>Cerrar</button></div></div>';
}
function mountReceipt(container,data){
 container.innerHTML=renderReceipt(data);
 container.querySelector('[data-receipt-print]').onclick=()=>window.print();
 container.querySelector('[data-receipt-pdf]').onclick=()=>window.print(); // Save as PDF from print dialog, not native PDF download.
 container.querySelector('[data-receipt-share]').onclick=()=>{
  const d=data.order||data.sale||{},b=data.business||{};
  const msg=[b.name||'Mi negocio',data.kind==='order'?'Pedido':'Venta',d.number||'', 'Total: '+money(d.total),data.kind==='order'?'Pendiente de confirmación':''].filter(Boolean).join('\n');
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
 };
 container.querySelector('[data-receipt-close]').onclick=()=>{const dialog=container.closest('dialog');if(dialog)dialog.close();else container.hidden=true;};
}
global.VareliaReceipt={renderReceipt,mountReceipt};
})(window);
