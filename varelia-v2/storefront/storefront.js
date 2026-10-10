'use strict';
const $=id=>document.getElementById(id),money=n=>'S/ '+Number(n||0).toFixed(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const params=new URLSearchParams(location.search),businessId=params.get('business');
const config=window.VARELIA_CONFIG||{};
let db=null,store=null,products=[],cart=new Map(),busy=false;
function error(message){$('error').textContent=message;}
function cartItems(){return [...cart.entries()].map(([id,quantity])=>({product:products.find(p=>p.id===id),quantity})).filter(x=>x.product);}
function renderProducts(){
 const q=$('search').value.toLowerCase();
 $('products').innerHTML=products.filter(p=>(p.name+' '+(p.sku||'')).toLowerCase().includes(q)).map(p=>'<article class="product"><h3>'+esc(p.name)+'</h3><p class="muted">'+esc(p.sku||'')+'</p><strong>'+money(p.price)+'</strong><br><button class="primary" data-add="'+esc(p.id)+'">+ Agregar</button></article>').join('')||'<p>No hay productos publicados.</p>';
}
function renderCart(){
 const items=cartItems();$('cart-count').textContent='🛒 '+items.reduce((n,i)=>n+i.quantity,0);
 $('cart').innerHTML=items.map(({product:p,quantity:q})=>'<div class="line"><div><strong>'+esc(p.name)+'</strong><br><small>'+money(p.price)+' × '+q+'</small></div><div><button data-minus="'+esc(p.id)+'">−</button> <button data-add="'+esc(p.id)+'">+</button></div></div>').join('')||'<p class="muted">Agrega productos para continuar.</p>';
 $('total').textContent=money(items.reduce((n,{product:p,quantity:q})=>n+Number(p.price)*q,0));
 $('order-button').disabled=!items.length||busy;
}
async function init(){
 if(!businessId||!/^[a-f0-9-]{36}$/i.test(businessId)){error('Enlace de catálogo inválido.');return;}
 if(!config.supabaseUrl||!config.supabaseAnonKey||!window.supabase){error('El catálogo todavía no está configurado.');return;}
 db=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error:e}=await db.rpc('get_public_storefront',{p_business_id:businessId});
 if(e||!data){error('Este catálogo no está publicado o no está disponible.');return;}
 store=data;products=Array.isArray(data.products)?data.products:[];$('name').textContent=data.name;$('contact').textContent=data.phone||'';
 if(/^#[0-9a-fA-F]{6}$/.test(data.theme_color))document.documentElement.style.setProperty('--blue',data.theme_color);
 renderProducts();renderCart();
}
$('products').onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;const id=b.dataset.add;if(!products.some(p=>p.id===id))return;cart.set(id,Math.min(999,(cart.get(id)||0)+1));renderCart();};
$('cart').onclick=e=>{const b=e.target.closest('[data-add],[data-minus]');if(!b)return;const id=b.dataset.add||b.dataset.minus;if(!products.some(p=>p.id===id))return;const q=(cart.get(id)||0)+(b.dataset.add?1:-1);if(q<=0)cart.delete(id);else cart.set(id,Math.min(999,q));renderCart();};
$('search').oninput=renderProducts;
$('order-button').onclick=()=>$('order-dialog').showModal();
$('cancel').onclick=()=>$('order-dialog').close();
$('order-form').onsubmit=async e=>{
 e.preventDefault();if(busy||!store||!cartItems().length)return;
 busy=true;$('submit').disabled=true;$('order-error').textContent='Enviando pedido…';renderCart();
 const payload={p_business_id:businessId,p_customer_name:$('customer').value.trim(),p_customer_phone:$('phone').value.trim(),p_delivery_method:$('delivery').value,p_payment_preference:$('payment').value,p_notes:$('notes').value,p_items:cartItems().map(({product,quantity})=>({product_id:product.id,quantity}))};
 try{
 const {data,error:e}=await db.rpc('place_public_order',payload);
 if(e||!data)throw new Error(e?.message||'No se pudo guardar el pedido');
 const snapshot=cartItems(),date=new Date().toLocaleString('es-PE');
 const receipt={kind:'order',business:{name:store.name,phone:store.phone,themeColor:store.theme_color},order:{number:data.order_number,date,customerName:payload.p_customer_name,customerPhone:payload.p_customer_phone,delivery:payload.p_delivery_method==='pickup'?'Recojo en tienda':'Delivery',status:'PENDIENTE',total:Number(data.total),items:snapshot.map(({product:p,quantity:q})=>({name:p.name,quantity:q,unitPrice:Number(p.price),total:q*Number(p.price)}))}};
 $('order-dialog').close();window.VareliaReceipt.mountReceipt($('receipt'),receipt);$('receipt-dialog').showModal();cart.clear();renderCart();$('order-form').reset();
 }catch(err){$('order-error').textContent='No se pudo enviar el pedido. '+err.message+'; verifica con la tienda antes de reintentar para evitar duplicados.';}
 finally{busy=false;$('submit').disabled=false;renderCart();}
};
init().catch(e=>error('No se pudo cargar el catálogo: '+e.message));
