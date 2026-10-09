(()=>{'use strict';
let BID='';
const URL='https://onvdcaohnftrjunwdvjp.supabase.co';
const KEY='sb_publishable_bz2z5uglf_EALJezqv4rCw_S73GMNrh';
const list=()=>document.getElementById('catalogOrdersList');
const esc=v=>{const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML};
const money=n=>'S/ '+Number(n||0).toFixed(2);
async function req(path,opt={}){
 const headers={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',...(opt.headers||{})};
 const r=await fetch(URL+'/rest/v1/'+path,{...opt,headers,cache:'no-store'});
 if(!r.ok)throw Error(await r.text()||r.status);
 return r.status===204?null:r.json();
}
function items(v){if(!Array.isArray(v))return'';return v.map(x=>'<div style="padding:7px 0;border-top:1px dashed var(--line)"><b>'+esc(x.name||'Producto')+'</b>'+(Array.isArray(x.characteristics)&&x.characteristics.length?'<div class="notice">'+x.characteristics.map(esc).join(' · ')+'</div>':'')+'<div>'+Number(x.qty||0)+' × '+money(x.unit_price)+' = <b>'+money(x.subtotal)+'</b></div></div>').join('')}
async function load(){
 const el=list();if(!el)return;el.innerHTML='<div class="empty">Cargando pedidos...</div>';
 try{
  const sb=window.vareliaSupabase;if(!sb)throw Error('Sesión no disponible');const {data:u}=await sb.auth.getUser();if(!u?.user?.id)throw Error('Inicia sesión');const {data:p,error:pe}=await sb.from('profiles').select('business_id').eq('id',u.user.id).maybeSingle();if(pe)throw pe;BID=String(p?.business_id||'');if(!BID)throw Error('No se encontró el negocio');
  const rows=await req('public_catalog_orders?select=*&business_id=eq.'+encodeURIComponent(BID)+'&order=created_at.desc&limit=100');
  if(!rows.length){el.innerHTML='<div class="empty">Todavía no hay pedidos del catálogo.</div>';return}
  el.innerHTML=rows.map(o=>{const paid=String(o.payment_status||'').toLowerCase()==='paid';return '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><b style="font-size:17px">'+esc(o.order_code||'Pedido')+'</b><div class="notice">'+esc(o.customer_name||'—')+' · '+esc(o.customer_phone||'—')+'</div></div><span class="badge" style="'+(paid?'background:#d1fae5;color:#047857':'background:#fef3c7;color:#92400e')+'">'+(paid?'PAGADO':'PAGO PENDIENTE')+'</span></div><div style="margin-top:10px"><b>Total: '+money(o.total)+'</b> · '+esc(o.payment_method||'—')+' · '+esc(o.delivery_label||o.delivery_type||'—')+'</div>'+items(o.items)+'<div style="display:flex;gap:8px;margin-top:12px">'+(paid?'<button class="btn ok" disabled>✓ Pago confirmado</button>':'<button class="btn primary" data-pay="'+esc(o.id)+'">✓ Confirmar pago</button>')+'</div></div>'}).join('');
 }catch(e){console.error(e);el.innerHTML='<div class="empty">No se pudieron cargar los pedidos. Pulsa Actualizar.</div>'}
}
async function pay(id){
 if(!confirm('¿Confirmas que ya recibiste el pago? Al confirmar se descontará el stock de este pedido.'))return;
 try{
  const rows=await req('public_catalog_orders?select=*&id=eq.'+encodeURIComponent(id)+'&business_id=eq.'+encodeURIComponent(BID)+'&limit=1');
  const o=rows&&rows[0];if(!o)throw Error('Pedido no encontrado');
  if(String(o.payment_status||'').toLowerCase()==='paid'){await load();return}
  const its=Array.isArray(o.items)?o.items:[];
  for(const it of its){
   const name=String(it.name||'').trim();if(!name)continue;
   const ps=await req('varelia_products?select=id,stock,characteristics,variant_combinations&business_id=eq.'+encodeURIComponent(BID)+'&name=eq.'+encodeURIComponent(name)+'&limit=1');
   const p=ps&&ps[0];if(!p)continue;
   const qty=Math.max(0,Number(it.qty)||0);
   let combos=Array.isArray(p.variant_combinations)?p.variant_combinations:[];
   const picked=Array.isArray(it.characteristics)?it.characteristics.map(v=>String(v).replace(/^[^:]+:\\s*/,'').trim()):[];
   if(combos.length&&picked.length){
    const idx=combos.findIndex(c=>JSON.stringify(c.values||[])===JSON.stringify(picked));
    if(idx>=0)combos[idx]={...combos[idx],stock:Math.max(0,Number(combos[idx].stock||0)-qty)};
   }
   const totalStock=combos.length?combos.reduce((a,c)=>a+Math.max(0,Number(c.stock)||0),0):Math.max(0,Number(p.stock||0)-qty);
   await req('varelia_products?id=eq.'+encodeURIComponent(p.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({stock:totalStock,variant_combinations:combos})});
  }
  await req('public_catalog_orders?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({payment_status:'paid'})});
  window.dispatchEvent(new CustomEvent('varelia:catalog-product-changed'));
  await load();
 }catch(e){console.error(e);alert('No se pudo confirmar el pago ni modificar el stock. Inténtalo nuevamente.')}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pay]');if(b)pay(b.dataset.pay);if(e.target.closest('#refreshOrders'))load();if(e.target.closest('[data-view="orders"]'))setTimeout(load,50)});
addEventListener('varelia:business-scope-ready',()=>setTimeout(load,300));
window.vareliaLoadOrders=load;
})();