(()=>{
  if(window.__vareliaPosSales)return;
  window.__vareliaPosSales=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    const wait=setInterval(()=>{
      const salesSec=document.getElementById('sales'),salesList=document.getElementById('salesList'),legacyCart=document.getElementById('cart'),legacyTotal=document.getElementById('saleTotal'),legacyCheckout=document.getElementById('checkout'),saleDialog=document.getElementById('saleDialog'),scanForSale=document.getElementById('scanForSale');
      if(!salesSec||!salesList||!legacyCart||!legacyTotal||!legacyCheckout||!saleDialog||!scanForSale||typeof addToCart!=='function')return;
      clearInterval(wait);
      const existingPos=document.getElementById('vareliaPosSales');
      if(existingPos){
        const bottom=existingPos.querySelector('.vposBottom'),checkout=existingPos.querySelector('#vposCheckout');
        if(bottom&&checkout&&!existingPos.querySelector('#vposPay')){
          const pay=document.createElement('div');pay.className='vposPay';pay.id='vposPay';pay.style.cssText='grid-column:1/-1;border:1px solid var(--line);border-radius:16px;padding:13px;background:var(--bg);display:grid;gap:10px';
          pay.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>💳 Forma de pago</b><select id="vposPayMethod" style="max-width:190px"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Transferencia</option><option>Tarjeta</option></select></div><label style="display:flex;gap:8px;align-items:center;font-weight:850"><input type="checkbox" id="vposMixed" style="width:18px;height:18px"> Pago mixto (combinar métodos)</label><div id="vposPayFields"></div>';
          bottom.insertBefore(pay,checkout);
          const total=()=>Number(String(existingPos.querySelector('#vposTotal')?.textContent||'').replace(/[^0-9.]/g,''))||0,method=pay.querySelector('#vposPayMethod'),mixed=pay.querySelector('#vposMixed'),fields=pay.querySelector('#vposPayFields'),methods=['Efectivo','Yape','Plin','Transferencia','Tarjeta'];
          const snapshot=()=>{let received=0,breakdown={};if(mixed.checked){fields.querySelectorAll('[data-vpart]').forEach(x=>{let n=Math.max(0,+x.value||0);if(n){received+=n;breakdown[x.dataset.vpart]=n}})}else if(method.value==='Efectivo'){received=Math.max(0,+fields.querySelector('#vCash')?.value||0);if(received)breakdown.Efectivo=received}else{received=total();breakdown[method.value]=total()}let t=total(),missing=Math.max(0,t-received),change=Math.max(0,received-t);if(change&&breakdown.Efectivo)breakdown.Efectivo=Math.max(0,breakdown.Efectivo-change);return{total:t,received,missing,change,breakdown,method:Object.keys(breakdown).length>1?'Pago mixto':(Object.keys(breakdown)[0]||method.value)}};
          const update=()=>{let p=snapshot(),a=fields.querySelector('#vStat'),b=fields.querySelector('#vDiff');if(a&&b){a.textContent=p.missing>0?'Falta':'Vuelto';b.textContent='S/ '+(p.missing>0?p.missing:p.change).toFixed(2);b.style.color=p.missing>0?'#b91c1c':'var(--p)'}};
          const render=()=>{let t=total();if(mixed.checked){fields.innerHTML=methods.map(m=>'<label style="display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;margin-top:7px"><span>'+m+'</span><input data-vpart="'+m+'" type="number" min="0" step="0.10" inputmode="decimal" placeholder="0.00"></label>').join('')+'<div style="display:flex;justify-content:space-between;font-weight:900;margin-top:10px"><span id="vStat">Falta</span><b id="vDiff">S/ '+t.toFixed(2)+'</b></div>';fields.querySelectorAll('[data-vpart]').forEach(x=>x.oninput=update)}else if(method.value==='Efectivo'){fields.innerHTML='<label style="display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;margin-top:7px"><b>Me paga con</b><input id="vCash" type="number" min="0" step="0.10" inputmode="decimal" placeholder="0.00"></label><div style="display:flex;justify-content:space-between;font-weight:900;margin-top:10px"><span id="vStat">Vuelto</span><b id="vDiff">S/ 0.00</b></div>';fields.querySelector('#vCash').oninput=update}else fields.innerHTML='<small>Se cobrará S/ '+t.toFixed(2)+' por '+method.value+'.</small>';update()};
          method.onchange=render;mixed.onchange=render;render();
          checkout.addEventListener('click',e=>{const p=snapshot();if(p.missing>.005){e.preventDefault();e.stopImmediatePropagation();window.vareliaToast?.('Faltan S/ '+p.missing.toFixed(2),'warn');return}window.VareliaPaymentSnapshot={...p,at:Date.now()}},true);
          new MutationObserver(render).observe(existingPos.querySelector('#vposTotal'),{childList:true,characterData:true,subtree:true});
        }
        return;
      }

      const style=document.createElement('style');
      style.textContent=`
        #sales>.flowRole{display:none!important}
        #sales .head{margin-bottom:14px}
        #vareliaPosSales{display:grid;gap:14px}
        .vposHero,.vposBox,.vposHistory{background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:0 10px 28px rgba(15,23,42,.07)}
        .vposHero{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--p) 8%,var(--card)),var(--card))}
        .vposHero h3{font-size:22px;margin:5px 0 3px}.vposHero p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
        .vposStatus{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#047857;background:#d1fae5;border-radius:999px;padding:6px 9px}
        .vposNew{white-space:nowrap}
        .vposBox{padding:16px}
        .vposSearch{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}.vposSearch input{font-size:16px;padding:14px 15px}.vposScan{min-width:132px}
        .vposHelp{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px;margin:9px 2px 0}.vposHelp b{color:var(--ink)}
        .vposSuggestions{display:none;margin-top:9px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card)}.vposSuggestions.show{display:block}
        .vposSuggestion{width:100%;border:0;border-bottom:1px solid var(--line);background:var(--card);color:var(--ink);padding:11px 12px;display:flex;justify-content:space-between;gap:12px;text-align:left}.vposSuggestion:last-child{border-bottom:0}.vposSuggestion small{color:var(--muted)}
        .vposTable{margin-top:14px;border:1px solid var(--line);border-radius:16px;overflow:hidden}.vposHead,.vposRow{display:grid;grid-template-columns:minmax(0,1fr) 86px 126px 100px 42px;gap:8px;align-items:center}.vposHead{padding:10px 13px;background:var(--bg);color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.vposRow{padding:13px;border-top:1px solid var(--line)}.vposName b{display:block;font-size:14px}.vposName small{display:block;color:var(--muted);font-size:11px;margin-top:3px}.vposPrice,.vposSubtotal{font-weight:850;font-variant-numeric:tabular-nums}.vposPrice{text-align:right}.vposSubtotal{text-align:right;color:var(--p);min-width:110px}.vposQty{display:grid;grid-template-columns:34px 48px 34px;gap:5px;align-items:center;justify-content:center}.vposQtyBtn{width:34px;height:34px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font-size:20px;font-weight:950;display:grid;place-items:center;padding:0}.vposQtyInput{width:48px!important;height:34px!important;padding:4px!important;border:1px solid var(--line)!important;border-radius:10px!important;background:var(--bg)!important;color:var(--ink)!important;text-align:center;font-size:15px!important;font-weight:950!important;box-shadow:none!important;-moz-appearance:textfield}.vposQtyInput::-webkit-outer-spin-button,.vposQtyInput::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}.vposDelete{width:38px;height:38px;border:1px solid #fecaca;border-radius:10px;background:#fff1f2;color:#b91c1c;font-size:18px;font-weight:950}.vposDelete:active{transform:scale(.96)}@media(max-width:650px){.vposHead{display:none}.vposRow{grid-template-columns:minmax(0,1fr) 42px;gap:10px;padding:14px}.vposName{grid-column:1/2}.vposPrice,.vposQty,.vposSubtotal{grid-column:1/2;text-align:left!important;justify-content:start!important}.vposDelete{grid-column:2;grid-row:1/5;align-self:center}.vposSubtotal:before{content:'Subtotal: ';color:var(--muted);font-weight:700}}
        .vposEmpty{padding:30px 16px;text-align:center;color:var(--muted);font-size:13px}.vposEmpty strong{display:block;color:var(--ink);font-size:16px;margin-bottom:5px}
        .vposBottom{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end;margin-top:16px}.vposCount{font-size:12px;color:var(--muted)}.vposCount b{color:var(--ink)}.vposTotal{text-align:right}.vposTotal small{display:block;color:var(--muted);font-weight:800}.vposTotal strong{display:block;color:var(--p);font-size:34px;line-height:1.05;margin-top:3px}.vposCheckout{grid-column:1/-1;width:100%;font-size:17px;padding:15px}
        .vposPay{grid-column:1/-1;border:1px solid var(--line);border-radius:16px;padding:13px;background:var(--bg);display:grid;gap:10px}.vposPayHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.vposPayHead b{font-size:14px}.vposPay select,.vposPay input{width:100%;padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--card);color:var(--ink);font-size:15px}.vposMixedLabel{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:850}.vposMixedLabel input{width:18px;height:18px}.vposCashRow,.vposPart{display:grid;grid-template-columns:1fr 130px;gap:9px;align-items:center}.vposPayResult{display:flex;justify-content:space-between;font-weight:900;padding-top:7px;border-top:1px dashed var(--line)}.vposParts{display:grid;gap:7px}
        .vposHistory{overflow:hidden}.vposHistory summary{cursor:pointer;list-style:none;padding:15px 17px;font-weight:900;display:flex;justify-content:space-between;align-items:center}.vposHistory summary::-webkit-details-marker{display:none}.vposHistory summary:after{content:'⌄';color:var(--muted)}.vposHistory[open] summary:after{transform:rotate(180deg)}.vposHistoryBody{border-top:1px solid var(--line);padding:14px}
        #saleDialog.vposBridge{display:none!important}body.vposReset #saleDialog{display:none!important}
        @media(max-width:650px){.vposHero{align-items:flex-start}.vposHero{display:grid}.vposNew{width:100%}.vposSearch{grid-template-columns:1fr}.vposScan{width:100%}.vposHead{display:none}.vposRow{grid-template-columns:minmax(0,1fr) auto}.vposPrice{font-size:12px;color:var(--muted)}.vposQty{grid-column:2;grid-row:1;grid-template-columns:36px 50px 36px}.vposQtyBtn{width:36px;height:36px}.vposQtyInput{width:50px!important;height:36px!important}.vposSubtotal{grid-column:1/-1;border-top:1px dashed var(--line);padding-top:8px;display:flex;justify-content:space-between}.vposSubtotal:before{content:'Subtotal';color:var(--muted);font-weight:700}.vposBottom{grid-template-columns:1fr}.vposTotal{text-align:left}.vposTotal strong{font-size:38px}}
      `;
      document.head.appendChild(style);

      const head=salesSec.querySelector('.head');
      const title=head?.querySelector('h2'),notice=head?.querySelector('.notice');
      if(title)title.textContent='Punto de venta';
      if(notice)notice.textContent='Escanea productos, revisa precios y cobra en segundos.';
      salesSec.querySelectorAll(':scope > .flowRole').forEach(el=>el.remove());

      const root=document.createElement('div');root.id='vareliaPosSales';
      root.innerHTML=`
        <div class="vposHero">
          <div><span class="vposStatus">● Caja lista</span><h3>Caja rápida</h3><p>Funciona como una caja de supermercado: cada lectura agrega el producto y actualiza el total.</p></div>
          
        </div>
        <div class="vposBox">
          <div class="vposSearch"><input id="vposInput" autocomplete="off" inputmode="search" placeholder="Escanea código o busca un producto"><button type="button" class="btn secondary vposScan" id="vposScan">📷 Escanear</button></div>
          <div class="vposHelp"><b>Modo continuo:</b> si escaneas el mismo producto otra vez, aumenta la cantidad.</div>
          <div class="vposSuggestions" id="vposSuggestions"></div>
          <div class="vposTable"><div class="vposHead"><span>Producto</span><span>Precio</span><span>Cant.</span><span style="text-align:right">Subtotal</span></div><div id="vposItems"></div></div>
          <div class="vposBottom"><div class="vposCount" id="vposCount">0 productos</div><div class="vposTotal"><small>TOTAL A PAGAR</small><strong id="vposTotal">S/ 0.00</strong></div>
          <div class="vposPay" id="vposPay">
            <div class="vposPayHead"><b>💳 Forma de pago</b><select id="vposPayMethod"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Transferencia</option><option>Tarjeta</option></select></div>
            <label class="vposMixedLabel"><input type="checkbox" id="vposMixed"> Pago mixto (combinar métodos)</label>
            <div id="vposPayFields"></div>
          </div>
          <button type="button" class="btn primary vposCheckout" id="vposCheckout">💳 Cobrar venta</button></div>
        </div>
        <details class="vposHistory"><summary>Historial de ventas</summary><div class="vposHistoryBody" id="vposHistoryBody"></div></details>`;
      salesList.before(root);
      root.querySelector('#vposHistoryBody').appendChild(salesList);

      const input=root.querySelector('#vposInput'),suggestions=root.querySelector('#vposSuggestions'),itemsEl=root.querySelector('#vposItems'),totalEl=root.querySelector('#vposTotal'),countEl=root.querySelector('#vposCount'),checkoutBtn=root.querySelector('#vposCheckout'),payMethod=root.querySelector('#vposPayMethod'),mixedPay=root.querySelector('#vposMixed'),payFields=root.querySelector('#vposPayFields');
      const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const norm=v=>String(v??'').trim().toLowerCase();
      const allProducts=()=>{try{return Array.isArray(products)?products:[]}catch{return []}};
      const byName=name=>allProducts().find(p=>norm(p.name)===norm(name))||null;
      const exactProduct=q=>{q=norm(q);if(!q)return null;return allProducts().find(p=>norm(p.barcode)===q)||allProducts().find(p=>norm(p.name)===q)||null};
      const matches=q=>{q=norm(q);const list=allProducts();if(!q)return list.slice(0,12);return list.filter(p=>norm(p.barcode).includes(q)||norm(p.name).includes(q)||norm(p.category).includes(q)).slice(0,12)};

      const PAY_METHODS=['Efectivo','Yape','Plin','Transferencia','Tarjeta'];
      const currentTotal=()=>legacyRows().reduce((a,x)=>a+x.subtotal,0);
      function renderPay(){
        const total=currentTotal();
        if(mixedPay.checked){
          payFields.innerHTML='<div class="vposParts">'+PAY_METHODS.map(m=>'<label class="vposPart"><span>'+m+'</span><input type="number" min="0" step="0.10" inputmode="decimal" data-vpos-part="'+m+'" placeholder="S/ 0.00"></label>').join('')+'</div><div class="vposPayResult"><span id="vposPayStatus">Falta</span><strong id="vposPayDiff">S/ '+total.toFixed(2)+'</strong></div>';
          payFields.querySelectorAll('[data-vpos-part]').forEach(x=>x.oninput=updatePay);
        }else if(payMethod.value==='Efectivo'){
          payFields.innerHTML='<label class="vposCashRow"><span>Me paga con</span><input id="vposCashReceived" type="number" min="0" step="0.10" inputmode="decimal" placeholder="S/ 0.00"></label><div class="vposPayResult"><span id="vposPayStatus">Vuelto</span><strong id="vposPayDiff">S/ 0.00</strong></div>';
          root.querySelector('#vposCashReceived').oninput=updatePay;
        }else payFields.innerHTML='<small style="color:var(--muted);font-weight:750">Se cobrará S/ '+total.toFixed(2)+' por '+payMethod.value+'.</small>';
        updatePay();
      }
      function paySnapshot(){
        const total=currentTotal();let breakdown={},received=0;
        if(mixedPay.checked){
          payFields.querySelectorAll('[data-vpos-part]').forEach(x=>{const n=Math.max(0,Number(x.value)||0);if(n){breakdown[x.dataset.vposPart]=n;received+=n}});
        }else if(payMethod.value==='Efectivo'){
          received=Math.max(0,Number(root.querySelector('#vposCashReceived')?.value)||0);if(received)breakdown.Efectivo=received;
        }else{received=total;breakdown[payMethod.value]=total}
        const missing=Math.max(0,total-received),change=Math.max(0,received-total);
        if(change&&breakdown.Efectivo)breakdown.Efectivo=Math.max(0,breakdown.Efectivo-change);
        const entries=Object.entries(breakdown).filter(([,v])=>v>0);
        return {total,received,missing,change,breakdown:Object.fromEntries(entries),method:entries.length>1?'Pago mixto':(entries[0]?.[0]||payMethod.value)};
      }
      function updatePay(){
        const p=paySnapshot(),st=root.querySelector('#vposPayStatus'),df=root.querySelector('#vposPayDiff');if(!st||!df)return;
        if(mixedPay.checked){st.textContent=p.missing>0?'Falta':'Vuelto';df.textContent='S/ '+(p.missing>0?p.missing:p.change).toFixed(2);df.style.color=p.missing>0?'#b91c1c':'var(--p)'}
        else if(payMethod.value==='Efectivo'){st.textContent=p.missing>0?'Falta':'Vuelto';df.textContent='S/ '+(p.missing>0?p.missing:p.change).toFixed(2);df.style.color=p.missing>0?'#b91c1c':'var(--p)'}
      }
      payMethod.onchange=renderPay;mixedPay.onchange=renderPay;

      function legacyRows(){
        try{
          if(Array.isArray(cart)){
            return cart.map(i=>{
              const p=allProducts().find(x=>String(x.id)===String(i.id))||allProducts().find(x=>String(x.barcode||'').trim()===String(i.barcode||'').trim()&&String(i.barcode||'').trim())||byName(i.name)||{id:i.id,name:i.name,barcode:'',stock:0,sellPrice:i.price};
              const name=String(i.name||p.name||'Producto'),isWeight=String(i.unit||p.unit||'').trim().toLowerCase()==='kg',qty=isWeight?Math.max(.001,Number(i.qty)||.001):Math.max(1,Number(i.qty)||1),price=Number(i.price??p.sellPrice??0),displayQty=isWeight?(qty<1?Math.round(qty*1000)+' g':qty.toFixed(3)+' kg'):String(qty);
              return {p,name,qty,displayQty,price,subtotal:price*qty,item:i,key:String(i.cartKey||i.id),medicineSaleUnit:i.medicineSaleUnit||'',medicineMultiplier:Number(i.medicineMultiplier||1)};
            });
          }
        }catch(e){console.warn('POS cart',e)}
        return [...legacyCart.querySelectorAll('.cartitem')].map(row=>{
          const name=(row.querySelector('.posCartName b')?.textContent||row.querySelector('span')?.textContent||'').trim();
          let qty=parseInt((row.querySelector('.posCartQty')?.textContent||row.querySelector('strong')?.textContent||'1').replace(/\D/g,''))||1;
          const p=byName(name),price=Number(p?.sellPrice||0);return p?{p,name,qty,price,subtotal:price*qty}:null;
        }).filter(Boolean);
      }
      let kgPrompted={};
      function normalizeKgCart(){
        try{
          if(!Array.isArray(cart))return;
          cart.forEach(i=>{
            const p=allProducts().find(x=>String(x.id)===String(i.id))||allProducts().find(x=>String(x.barcode||'').trim()===String(i.barcode||'').trim()&&String(i.barcode||'').trim())||byName(i.name);
            if(!p||String(p.unit||'').trim().toLowerCase()!=='kg')return;
            i.unit='Kg';
            // Una cantidad entera recién agregada por el flujo antiguo representa una entrada sin peso elegido.
            if(Number(i.qty)===1&&!window.__vareliaAddingWeight&&!kgPrompted[String(p.id)]&&window.VareliaWeightSale){
              kgPrompted[String(p.id)]=true;
              cart=cart.filter(x=>x!==i);
              try{if(typeof renderCart==='function')renderCart()}catch{}
              setTimeout(()=>window.VareliaWeightSale.open(p),0);
            }
          });
        }catch(e){console.warn('normalize kg cart',e)}
      }
      function sync(){
        normalizeKgCart();
        const rows=legacyRows();
        if(!rows.length)itemsEl.innerHTML='<div class="vposEmpty"><strong>Escanea el primer producto</strong>Los productos aparecerán aquí con su precio, cantidad y subtotal.</div>';
        else itemsEl.innerHTML=rows.map(x=>{
          const kg=String(x.item?.unit||x.p.unit||'').trim().toLowerCase()==='kg';
          const med=!!x.medicineSaleUnit;
          const variantDetail=String(x.name||'').includes(' · ')?String(x.name).split(' · ').slice(1).join(' · '):'';
          const baseName=String(x.name||'Producto').split(' · ')[0];
          const detail=kg
            ? 'Precio por kg: S/ '+x.price.toFixed(2)+' · Cantidad: '+x.displayQty
            : med
              ? 'Presentación: '+x.medicineSaleUnit+' · Precio por '+String(x.medicineSaleUnit).toLowerCase()+': S/ '+x.price.toFixed(2)+' · Cantidad: '+x.qty
              : (variantDetail?variantDetail+' · ':'')+'Precio unitario: S/ '+x.price.toFixed(2)+' · Cantidad: '+x.qty;
          const qty=kg
            ? `<div class="vposQty" style="display:flex!important;justify-content:center"><button type="button" class="btn secondary" data-pos-weight="${esc(x.p.id)}" style="width:auto;min-width:116px;padding:9px 10px">⚖️ ${x.displayQty}</button></div>`
            : `<div class="vposQty"><button type="button" class="vposQtyBtn" data-pos-minus="${esc(x.key)}" aria-label="Restar cantidad">−</button><input class="vposQtyInput" data-pos-qty="${esc(x.key)}" type="number" inputmode="numeric" min="1" step="1" value="${x.qty}" aria-label="Cantidad de ${esc(x.name)}"><button type="button" class="vposQtyBtn" data-pos-plus="${esc(x.key)}" aria-label="Aumentar cantidad">+</button></div>`;
          return `<div class="vposRow" data-pos-row-id="${esc(x.key)}"><div class="vposName"><b>${esc(baseName)}</b><small>${esc(detail)}</small></div><div class="vposPrice">S/ ${x.price.toFixed(2)}${kg?' / kg':''}</div>${qty}<div class="vposSubtotal">S/ ${x.subtotal.toFixed(2)}</div><button type="button" class="vposDelete" data-pos-delete="${esc(x.key)}" aria-label="Eliminar ${esc(baseName)}">✕</button></div>`
        }).join('');
        const units=rows.reduce((a,x)=>a+x.qty,0),total=rows.reduce((a,x)=>a+x.subtotal,0);
        countEl.innerHTML=`<b>${rows.length}</b> ${rows.length===1?'producto':'productos'} en el carrito`;
        totalEl.textContent='S/ '+total.toFixed(2);checkoutBtn.textContent=total>0?'💳 Cobrar S/ '+total.toFixed(2):'💳 Cobrar venta';checkoutBtn.disabled=!rows.length;updatePay();
        return {rows,units,total};
      }
      new MutationObserver(()=>requestAnimationFrame(sync)).observe(legacyCart,{childList:true,subtree:true,characterData:true});

      function setProductQty(key,value){
        try{
          if(!Array.isArray(cart))return false;
          const item=cart.find(x=>String(x.cartKey||x.id)===String(key));
          if(!item)return false;
          const p=allProducts().find(x=>String(x.id)===String(item.id));
          if(!p)return false;
          const mult=Math.max(1,Number(item.medicineMultiplier||1));
          const kg=String(p.unit||'').trim().toLowerCase()==='kg';
          const max=kg?Math.max(.001,Number(p.stock)||.001):Math.max(1,Math.floor((Number(p.stock)||1)/mult));
          let q=kg?Math.round((Number(value)||.001)*1000)/1000:Math.floor(Number(value)||1);
          q=Math.max(kg?.001:1,Math.min(q,max));
          if(Number(value)>max)window.vareliaToast?.('Stock disponible: '+max,'warn');
          item.qty=q;
          try{if(typeof renderCart==='function')renderCart()}catch{}
          sync();
          return true;
        }catch(e){console.error(e);return false}
      }
      itemsEl.addEventListener('click',e=>{
        const del=e.target.closest('[data-pos-delete]');
        if(del){
          const key=del.dataset.posDelete;
          if(Array.isArray(cart)){cart=cart.filter(x=>String(x.cartKey||x.id)!==String(key));try{if(typeof renderCart==='function')renderCart()}catch{}sync()}
          return;
        }
        const minus=e.target.closest('[data-pos-minus]'),plus=e.target.closest('[data-pos-plus]');
        if(!minus&&!plus)return;
        const key=(minus||plus).dataset[minus?'posMinus':'posPlus'];
        const selectedItem=Array.isArray(cart)?cart.find(x=>String(x.cartKey||x.id)===String(key)):null;
        const id=selectedItem?.id||key;
        const clickedProduct=allProducts().find(x=>String(x.id)===String(id));
        if(plus&&String(clickedProduct?.unit||'').trim().toLowerCase()==='kg'&&window.VareliaWeightSale){e.preventDefault();window.VareliaWeightSale.open(clickedProduct);return}
        let item=null;try{item=Array.isArray(cart)?cart.find(x=>String(x.cartKey||x.id)===String(key)):null}catch{}
        if(!item)return;
        const p=allProducts().find(x=>String(x.id)===String(id));const step=String(p?.unit||'').trim().toLowerCase()==='kg'?.25:1;setProductQty(key,(Number(item.qty)||step)+(plus?step:-step));
      });
      itemsEl.addEventListener('input',e=>{
        const input=e.target.closest('[data-pos-qty]');if(!input)return;
        const raw=String(input.value||'').trim();
        if(raw===''||!/^\\d*([.,]\\d*)?$/.test(raw))return;
        setProductQty(input.dataset.posQty,raw.replace(',','.'));
      });
      itemsEl.addEventListener('change',e=>{
        const input=e.target.closest('[data-pos-qty]');if(!input)return;
        setProductQty(input.dataset.posQty,input.value);
      });
      itemsEl.addEventListener('keydown',e=>{
        const input=e.target.closest('[data-pos-qty]');if(!input||e.key!=='Enter')return;
        e.preventDefault();setProductQty(input.dataset.posQty,input.value);input.blur();
      });

      function addProduct(p,qty=1){
        if(!p)return false;
        const live=allProducts().find(x=>String(x.id)===String(p.id))||allProducts().find(x=>String(x.barcode||'').trim()===String(p.barcode||'').trim()&&String(p.barcode||'').trim())||byName(p.name)||p;
        p={...live,...p};
        if(Array.isArray(p.characteristics)&&p.characteristics.length&&!p.__characteristicsSelected&&window.VareliaCharacteristics){
          window.VareliaCharacteristics.select(p,chosen=>addProduct(chosen,qty));return true
        }
        const medicineCategory=/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p.category||'').trim());
        const isMedicine=!!p.medicine||medicineCategory;
        if(isMedicine&&!p.__medicineSelected){
          try{addToCart(p,qty);return true}catch(e){console.error(e);window.vareliaSound?.('error');return false}
        }
        if(String(p.unit||'').trim().toLowerCase()==='kg'&&!window.__vareliaAddingWeight){
          if(window.VareliaWeightSale){window.VareliaWeightSale.open(p);return true}
          window.vareliaToast?.('Selecciona el peso antes de agregar '+p.name,'warn');return false
        }qty=String(p.unit||'').trim().toLowerCase()==='kg'?Math.max(.001,Number(qty)||.001):Math.max(1,Math.floor(Number(qty)||1));
        if(Number(p.stock||0)<=0){window.vareliaSound?.('error');window.vareliaToast?.('Sin stock: '+p.name,'warn');return false}
        try{addToCart(p,qty);window.vareliaSound?.('add');window.vareliaToast?.(`${p.name} · S/ ${Number(p.sellPrice||0).toFixed(2)} agregado`,'ok');setTimeout(sync,0);return true}catch(e){console.error(e);window.vareliaSound?.('error');return false}
      }
      function hideSuggestions(){suggestions.classList.remove('show');suggestions.innerHTML=''}
      function showSuggestions(q){const list=matches(q);if(!list.length){hideSuggestions();return}suggestions.innerHTML=list.map(p=>{const inCart=Array.isArray(cart)&&cart.some(x=>String(x.id)===String(p.id));return `<button type="button" class="vposSuggestion" data-pos-id="${esc(p.id)}"><span><b>${esc(p.name)}</b><small>${esc(p.category||p.barcode||'Producto')}${inCart?' · Ya está en el carrito':''}</small></span><strong>${inCart?'Agregar más':'S/ '+Number(p.sellPrice||0).toFixed(2)}</strong></button>`}).join('');suggestions.classList.add('show')}
      suggestions.addEventListener('click',e=>{const b=e.target.closest('[data-pos-id]');if(!b)return;e.preventDefault();e.stopPropagation();const p=allProducts().find(x=>String(x.id)===String(b.dataset.posId));if(!p)return;if(addProduct(p)){input.value='';hideSuggestions();input.focus()}});
      input.addEventListener('focus',()=>showSuggestions(input.value));input.addEventListener('click',()=>showSuggestions(input.value));input.addEventListener('input',()=>showSuggestions(input.value));
      input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=input.value.trim(),p=exactProduct(q)||matches(q)[0];if(!p)return; e.preventDefault();if(addProduct(p)){input.value='';hideSuggestions();input.focus()}});

      function bridgeScanner(){saleDialog.classList.add('vposBridge');try{if(!saleDialog.open)saleDialog.show()}catch{}scanForSale.click()}
      root.querySelector('#vposScan').onclick=bridgeScanner;

      function startNew(forceReset=false){
        try{if(saleDialog.open)saleDialog.close()}catch{}saleDialog.classList.remove('vposBridge');document.body.classList.add('vposReset');
        try{if(typeof openSale==='function')openSale(forceReset||!Array.isArray(cart)||cart.length===0)}catch(e){console.warn(e)}
        try{if(saleDialog.open)saleDialog.close()}catch{}document.body.classList.remove('vposReset');input.value='';hideSuggestions();sync();input.focus();window.vareliaToast?.(forceReset?'Nueva venta lista':'Carrito conservado','ok')
      }
      const posNew=root.querySelector('#vposNew');if(posNew)posNew.onclick=()=>startNew(true);
      checkoutBtn.onclick=()=>{const state=sync();if(!state.rows.length)return;const p=paySnapshot();if(p.missing>.005){window.vareliaToast?.('Faltan S/ '+p.missing.toFixed(2)+' para completar el pago','warn');return}window.VareliaPaymentSnapshot={...p,at:Date.now()};try{legacyCheckout.click();setTimeout(()=>{sync();renderPay();try{if(typeof renderSales==='function')renderSales()}catch{}window.vareliaToast?.('Venta registrada','ok')},160)}catch(e){console.error(e);window.vareliaSound?.('error')}};

      function goSales(){const nav=document.querySelector('.nav [data-view="sales"]');if(nav)nav.click();else try{switchView('sales')}catch{}setTimeout(()=>{startNew();root.scrollIntoView({behavior:'smooth',block:'start'})},80)}
      document.addEventListener('click',e=>{const b=e.target.closest('#newSaleTop,#newSaleFab');if(!b)return;e.preventDefault();e.stopImmediatePropagation();goSales()},true);
      document.addEventListener('click',e=>{const b=e.target.closest('.nav [data-view="sales"]');if(!b)return;setTimeout(()=>input.focus(),120)},true);

      window.VareliaPOS={addProduct,startNew,sync,isActive:()=>salesSec.classList.contains('active'),focus:()=>input.focus()};
      renderPay();sync();setTimeout(sync,350);setTimeout(()=>salesSec.querySelectorAll(':scope > .flowRole').forEach(el=>el.remove()),1200);
    },120);
  });
})();