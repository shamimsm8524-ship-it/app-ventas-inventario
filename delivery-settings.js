(()=>{
 if(window.__vareliaDeliverySettings)return;window.__vareliaDeliverySettings=true;
 const KEY='varelia_video_settings_v1';
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return{}}};
 const save=s=>{localStorage.setItem(KEY,JSON.stringify(s));window.dispatchEvent(new CustomEvent('varelia:catalog-settings-changed'));window.vareliaToast?.('Métodos de entrega guardados.','ok')};
 const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
 ready(()=>{
  const css=document.createElement('style');css.textContent=`.vdelivery{margin-top:14px}.vdelivery h3{margin:0 0 5px}.vdelivery p{margin:0 0 14px;color:var(--muted);font-size:12px}.vdeliveryRow{display:grid;grid-template-columns:minmax(0,1fr) 115px;gap:10px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}.vdeliveryRow:first-of-type{border-top:0}.vdeliveryMethod{display:flex;align-items:center;gap:10px;font-weight:850}.vdeliveryMethod input{width:20px;height:20px;accent-color:var(--p)}.vdeliveryPrice{position:relative}.vdeliveryPrice:before{content:'S/';position:absolute;left:12px;top:50%;transform:translateY(-50%);font-weight:800;color:var(--muted);font-size:12px}.vdeliveryPrice input{padding-left:34px;text-align:right}.vdeliveryHint{font-size:11px;color:var(--muted);margin-top:4px}.vdeliverySave{width:100%;margin-top:10px}@media(max-width:380px){.vdeliveryRow{grid-template-columns:minmax(0,1fr) 105px}}`;document.head.appendChild(css);
  function mount(){
   const hub=document.getElementById('mobileSettingsHub');if(!hub)return false;
   const panel=hub.querySelector('.vrefPanel')||hub;if(document.getElementById('deliverySettingsCard'))return true;
   const s=read(),d=s.delivery||{};
   const card=document.createElement('div');card.id='deliverySettingsCard';card.className='card vdelivery';card.innerHTML=`<h3>Métodos de entrega</h3><p>Elige qué opciones verá el cliente y define el precio. El importe se sumará automáticamente al pedido.</p>
   <div class="vdeliveryRow"><div><label class="vdeliveryMethod"><input id="vdPickup" type="checkbox" ${s.publicAllowPickup!==false?'checked':''}>Recojo en tienda</label><div class="vdeliveryHint">Siempre S/ 0.00</div></div><div class="vdeliveryPrice"><input value="0.00" disabled></div></div>
   <div class="vdeliveryRow"><label class="vdeliveryMethod"><input id="vdIndrive" type="checkbox" ${d.indrive?.enabled!==false?'checked':''}>InDrive</label><div class="vdeliveryPrice"><input id="vdIndriveCost" type="number" min="0" step="0.10" inputmode="decimal" value="${Math.max(0,Number(d.indrive?.cost||0)).toFixed(2)}"></div></div>
   <div class="vdeliveryRow"><label class="vdeliveryMethod"><input id="vdOlva" type="checkbox" ${d.olva?.enabled!==false?'checked':''}>Olva</label><div class="vdeliveryPrice"><input id="vdOlvaCost" type="number" min="0" step="0.10" inputmode="decimal" value="${Math.max(0,Number(d.olva?.cost||0)).toFixed(2)}"></div></div>
   <div class="vdeliveryRow"><label class="vdeliveryMethod"><input id="vdShalom" type="checkbox" ${d.shalom?.enabled!==false?'checked':''}>Shalom</label><div class="vdeliveryPrice"><input id="vdShalomCost" type="number" min="0" step="0.10" inputmode="decimal" value="${Math.max(0,Number(d.shalom?.cost||0)).toFixed(2)}"></div></div>
   <div class="vdeliveryHint">Para Shalom, el cliente también indicará dirección/destino y sucursal o agencia.</div><button id="vdSave" type="button" class="btn primary vdeliverySave">Guardar métodos de entrega</button>`;
   if(panel.querySelector('.empty'))panel.querySelector('.empty').remove();panel.prepend(card);
   card.querySelector('#vdSave').onclick=()=>{const x=read(),num=id=>Math.max(0,Number(card.querySelector(id).value||0));x.publicAllowPickup=card.querySelector('#vdPickup').checked;x.publicAllowDelivery=true;x.delivery={...(x.delivery||{}),indrive:{enabled:card.querySelector('#vdIndrive').checked,cost:num('#vdIndriveCost')},olva:{enabled:card.querySelector('#vdOlva').checked,cost:num('#vdOlvaCost')},shalom:{enabled:card.querySelector('#vdShalom').checked,cost:num('#vdShalomCost')}};save(x)};
   return true;
  }
  if(!mount()){const mo=new MutationObserver(()=>{if(mount())mo.disconnect()});mo.observe(document.body,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),15000)}
 });
})();