(()=>{
  if(window.__vareliaPosSales)return;
  window.__vareliaPosSales=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    const wait=setInterval(()=>{
      const salesSec=document.getElementById('sales'),salesList=document.getElementById('salesList'),legacyCart=document.getElementById('cart'),legacyTotal=document.getElementById('saleTotal'),legacyCheckout=document.getElementById('checkout'),saleDialog=document.getElementById('saleDialog'),scanForSale=document.getElementById('scanForSale');
      if(!salesSec||!salesList||!legacyCart||!legacyTotal||!legacyCheckout||!saleDialog||!scanForSale||typeof addToCart!=='function')return;
      clearInterval(wait);

      const moneyPay=n=>'S/ '+Number(n||0).toFixed(2);
      function paymentDetailLines(p){
        const lines=['DETALLE DE COBRO','Total: '+moneyPay(p.total)];
        Object.entries(p.breakdown||{}).filter(([,v])=>Number(v)>0).forEach(([k,v])=>lines.push(k+': '+moneyPay(v)));
        lines.push('Recibido: '+moneyPay(p.received));
        if(Number(p.missing)>0.005)lines.push('Falta: '+moneyPay(p.missing));
        else lines.push('Vuelto: '+moneyPay(p.change));
        return lines;
      }
      function paymentPdfBlob(p){
        const safe=s=>String(s||'').replace(/[^\x20-\x7E]/g,' ').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
        const lines=paymentDetailLines(p);
        let stream='BT\n/F1 18 Tf\n50 790 Td\n('+safe(lines[0])+') Tj\n/F1 12 Tf\n';
        lines.slice(1).forEach(line=>{stream+='0 -24 Td\n('+safe(line)+') Tj\n'});
        stream+='ET\n';
        const objs=[
          '<< /Type /Catalog /Pages 2 0 R >>',
          '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
          '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
          '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
          '<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream'
        ];
        let pdf='%PDF-1.4\n',offs=[0];
        objs.forEach((o,i)=>{offs[i+1]=pdf.length;pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});
        const xref=pdf.length;
        pdf+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
        for(let i=1;i<=objs.length;i++)pdf+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
        pdf+='trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
        return new Blob([pdf],{type:'application/pdf'});
      }
      function ensurePaymentDetail(){
        let d=document.getElementById('vposPaymentDetailModal');
        if(d)return d;
        d=document.createElement('div');d.id='vposPaymentDetailModal';
        d.style.cssText='display:none;position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.58);padding:18px;align-items:center;justify-content:center';
        d.innerHTML='<div style="width:min(92vw,460px);max-height:88vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#111);border-radius:22px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h3 style="margin:0;font-size:22px">Detalle del cobro</h3><button type="button" id="vpayDetailClose" style="border:0;background:transparent;font-size:28px;line-height:1">×</button></div><div id="vpayDetailBody" style="margin-top:14px"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px"><button type="button" id="vpayDetailPrint" class="btn secondary">🖨 Imprimir</button><button type="button" id="vpayDetailDownload" class="btn primary">⬇ Descargar PDF</button></div></div>';
        document.body.appendChild(d);
        d.querySelector('#vpayDetailClose').onclick=()=>{d.style.display='none'};
        d.addEventListener('click',e=>{if(e.target===d)d.style.display='none'});
        return d;
      }
      function showPaymentDetail(p){
        const d=ensurePaymentDetail(),body=d.querySelector('#vpayDetailBody');
        const escPay=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        const rows=Object.entries(p.breakdown||{}).filter(([,v])=>Number(v)>0).map(([k,v])=>'<div style="display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--line,#e5e7eb)"><span>'+escPay(k)+'</span><b>'+moneyPay(v)+'</b></div>').join('');
        body.innerHTML='<div style="display:flex;justify-content:space-between;gap:16px;padding:10px 0;font-size:18px"><b>Total</b><b>'+moneyPay(p.total)+'</b></div>'+rows+'<div style="display:flex;justify-content:space-between;gap:16px;padding:10px 0"><span>Recibido</span><b>'+moneyPay(p.received)+'</b></div><div style="display:flex;justify-content:space-between;gap:16px;padding:12px;border-radius:12px;background:'+(p.missing>0.005?'#fff1f2':'#ecfdf5')+';font-size:18px"><b>'+(p.missing>0.005?'Falta':'Vuelto')+'</b><b style="color:'+(p.missing>0.005?'#b91c1c':'#047857')+'">'+moneyPay(p.missing>0.005?p.missing:p.change)+'</b></div>';
        d._snapshot=p;d.style.display='flex';
        d.querySelector('#vpayDetailDownload').onclick=()=>{
          const blob=paymentPdfBlob(d._snapshot),url=URL.createObjectURL(blob),a=document.createElement('a');
          a.href=url;a.download='detalle-cobro-'+new Date().toISOString().slice(0,10)+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
        };
        d.querySelector('#vpayDetailPrint').onclick=()=>{
          const lines=paymentDetailLines(d._snapshot),f=document.createElement('iframe');f.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(f);
          const w=f.contentWindow;w.document.open();w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Detalle de cobro</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{font-size:22px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:10px 0}.big{font-size:19px;font-weight:700}</style></head><body><h1>'+lines[0]+'</h1>'+lines.slice(1).map((x,i)=>'<div class="row '+(i>=lines.length-3?'big':'')+'"><span>'+x.replace(': ','</span><span>')+'</span></div>').join('')+'</body></html>');w.document.close();setTimeout(()=>{try{w.focus();w.print()}finally{setTimeout(()=>f.remove(),1000)}},250);
        };
      }

      const existingPos=document.getElementById('vareliaPosSales');
      if(existingPos){
        const bottom=existingPos.querySelector('.vposBottom'),checkout=existingPos.querySelector('#vposCheckout');
        if(bottom&&checkout&&!existingPos.querySelector('#vposPay')){
          const pay=document.createElement('div');pay.className='vposPay';pay.id='vposPay';pay.style.cssText='grid-column:1/-1;border:1px solid var(--line);border-radius:16px;padding:13px;background:var(--bg);display:grid;gap:10px';
          pay.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>💳 Forma de pago</b><select id="vposPayMethod" style="max-width:190px"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Transferencia</option><option>Tarjeta</option></select></div><label style="display:flex;gap:8px;align-items:center;font-weight:850"><input type="checkbox" id="vposMixed" style="width:18px;height:18px"> Pago mixto (combinar métodos)</label><div id="vposPayFields"></div>';
          bottom.insertBefore(pay,checkout);
          const total=()=>Number(String(existingPos.querySelector('#vposTotal')?.textContent||'').replace(/[^0-9.]/g,''))||0,method=pay.querySelector('#vposPayMethod'),mixed=pay.querySelector('#vposMixed'),fields=pay.querySelector('#vposPayFields'),methods=['Efectivo','Yape','Plin','Transferencia','Tarjeta'];
          const qrInfo=m=>{let legacy={};try{legacy=JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')}catch{}const live=window.vareliaVideoSettings||{};return m==='Yape'?{qr:String(localStorage.getItem('varelia_qr_yape_v2')||live.yapeQr||legacy.yapeQr||''),holder:String(localStorage.getItem('varelia_qr_yape_holder_v2')||live.yapeHolder||legacy.yapeHolder||'')}:m==='Plin'?{qr:String(localStorage.getItem('varelia_qr_plin_v2')||live.plinQr||legacy.plinQr||''),holder:String(localStorage.getItem('varelia_qr_plin_holder_v2')||live.plinHolder||legacy.plinHolder||'')}:{qr:'',holder:''}};
          const snapshot=()=>{let received=0,breakdown={};if(mixed.checked){fields.querySelectorAll('[data-vpart]').forEach(x=>{let n=Math.max(0,+x.value||0);if(n){received+=n;breakdown[x.dataset.vpart]=n}})}else{received=Math.max(0,+fields.querySelector('#vReceived')?.value||0);if(received)breakdown[method.value]=received}let t=total(),missing=Math.max(0,t-received),change=Math.max(0,received-t);if(!mixed.checked&&breakdown[method.value])breakdown[method.value]=Math.min(t,received);else if(change&&breakdown.Efectivo)breakdown.Efectivo=Math.max(0,breakdown.Efectivo-change);return{total:t,received,missing,change,breakdown,method:Object.keys(breakdown).length>1?'Pago mixto':(Object.keys(breakdown)[0]||method.value)}};
          const update=()=>{let p=snapshot(),a=fields.querySelector('#vStat'),b=fields.querySelector('#vDiff');if(a&&b){a.textContent=p.missing>0?'Falta':'Vuelto';b.textContent='S/ '+(p.missing>0?p.missing:p.change).toFixed(2);b.style.color=p.missing>0?'#b91c1c':'var(--p)'}};
          const render=()=>{let t=total();if(mixed.checked){fields.innerHTML=methods.map(m=>'<label style="display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;margin-top:7px"><span>'+m+'</span><input data-vpart="'+m+'" type="number" min="0" step="0.10" inputmode="decimal" placeholder="0.00"></label>').join('')+'<div style="display:flex;justify-content:space-between;font-weight:900;margin-top:10px"><span id="vStat">Falta</span><b id="vDiff">S/ '+t.toFixed(2)+'</b></div>';fields.querySelectorAll('[data-vpart]').forEach(x=>x.oninput=update)}else{let top='';if(method.value==='Yape'||method.value==='Plin'){const info=qrInfo(method.value);top=info.qr?'<div style="display:grid;gap:9px;text-align:center;padding:12px;border:1px dashed var(--line);border-radius:14px;background:var(--card)"><img src="'+info.qr+'" alt="QR '+method.value+'" style="width:min(300px,82vw);max-height:300px;object-fit:contain;margin:auto;border-radius:12px;background:#fff;padding:8px"><b>Escanea para pagar con '+method.value+'</b>'+(info.holder?'<small style="color:var(--muted)">Titular: '+info.holder.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))+'</small>':'')+'<small style="color:var(--muted)">Total: S/ '+t.toFixed(2)+'</small></div>':'<small>QR de '+method.value+' no configurado. Cárgalo en Ajustes.</small>'}else if(method.value!=='Efectivo')top='<small style="display:block;margin-bottom:9px">Se cobrará S/ '+t.toFixed(2)+' por '+method.value+'.</small>';fields.innerHTML=top+'<label style="display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;margin-top:12px"><b>Me paga con</b><input id="vReceived" type="number" min="0" step="0.10" inputmode="decimal" placeholder="Ej. 50.00"></label><div style="display:flex;justify-content:space-between;font-weight:900;margin-top:10px"><span id="vStat">Vuelto</span><b id="vDiff">S/ 0.00</b></div>';fields.querySelector('#vReceived').oninput=update}update()};
          method.onchange=render;mixed.onchange=render;render();
          window.addEventListener('varelia:payment-settings-changed',()=>setTimeout(render,0));
          checkout.addEventListener('click',e=>{const p=snapshot();if(p.missing>.005){e.preventDefault();e.stopImmediatePropagation();showPaymentDetail(p);window.vareliaToast?.('Faltan S/ '+p.missing.toFixed(2),'warn');return}window.VareliaPaymentSnapshot={...p,at:Date.now()}},true);
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
        .vposSuggestion{width:100%;border:0;border-bottom:1px solid var(--line);background:var(--card);color:var(--ink);padding:11px 12px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;text-align:left}.vposSuggestion:last-child{border-bottom:0}.vposSuggestionInfo{display:flex;flex-direction:column;align-items:flex-start;min-width:0;line-height:1.2}.vposSuggestionInfo b{display:block;font-size:15px;font-weight:900;line-height:1.2}.vposSuggestionInfo small{display:block;color:var(--muted);font-size:12px;margin-top:4px;line-height:1.25}.vposSuggestion>strong{flex:0 0 auto;text-align:right;line-height:1.2}
        .vposTable{margin-top:14px;border:1px solid var(--line);border-radius:16px;overflow:hidden}.vposHead,.vposRow{display:grid;grid-template-columns:minmax(0,1fr) 86px 126px 100px 42px;gap:8px;align-items:center}.vposHead{padding:10px 13px;background:var(--bg);color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.vposRow{padding:13px;border-top:1px solid var(--line)}.vposName b{display:block;font-size:14px}.vposName small{display:block;color:var(--muted);font-size:11px;margin-top:3px}.vposPrice,.vposSubtotal{font-weight:850;font-variant-numeric:tabular-nums}.vposPrice{text-align:right}.vposSubtotal{text-align:right;color:var(--p);min-width:110px}.vposQty{display:grid;grid-template-columns:34px 48px 34px;gap:5px;align-items:center;justify-content:center}.vposQtyBtn{width:34px;height:34px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font-size:20px;font-weight:950;display:grid;place-items:center;padding:0}.vposQtyInput{width:48px!important;height:34px!important;padding:4px!important;border:1px solid var(--line)!important;border-radius:10px!important;background:var(--bg)!important;color:var(--ink)!important;text-align:center;font-size:15px!important;font-weight:950!important;box-shadow:none!important;-moz-appearance:textfield}.vposQtyInput::-webkit-outer-spin-button,.vposQtyInput::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}.vposDelete{width:38px;height:38px;border:1px solid #fecaca;border-radius:10px;background:#fff1f2;color:#b91c1c;font-size:18px;font-weight:950}.vposDelete:active{transform:scale(.96)}@media(max-width:650px){.vposHead{display:none}.vposRow{grid-template-columns:minmax(0,1fr) 42px;gap:10px;padding:14px}.vposName{grid-column:1/2}.vposPrice,.vposQty,.vposSubtotal{grid-column:1/2;text-align:left!important;justify-content:start!important}.vposDelete{grid-column:2;grid-row:1/5;align-self:center}.vposSubtotal:before{content:'Subtotal: ';color:var(--muted);font-weight:700}}
        .vposEmpty{padding:30px 16px;text-align:center;color:var(--muted);font-size:13px}.vposEmpty strong{display:block;color:var(--ink);font-size:16px;margin-bottom:5px}
        .vposBottom{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end;margin-top:16px}.vposCount{font-size:12px;color:var(--muted)}.vposCount b{color:var(--ink)}.vposTotal{text-align:right}.vposTotal small{display:block;color:var(--muted);font-weight:800}.vposTotal strong{display:block;color:var(--p);font-size:34px;line-height:1.05;margin-top:3px}.vposCheckout{grid-column:1/-1;width:100%;font-size:17px;padding:15px}
        .vposPay{grid-column:1/-1;border:1px solid var(--line);border-radius:16px;padding:13px;background:var(--bg);display:grid;gap:10px}.vposPayHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.vposPayHead b{font-size:14px}.vposPay select,.vposPay input{width:100%;padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--card);color:var(--ink);font-size:15px}.vposMixedLabel{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:850}.vposMixedLabel input{width:18px;height:18px}.vposCashRow,.vposPart{display:grid;grid-template-columns:1fr 130px;gap:9px;align-items:center}.vposPayResult{display:flex;justify-content:space-between;font-weight:900;padding-top:7px;border-top:1px dashed var(--line)}.vposParts{display:grid;gap:7px}
        .vposHistory{overflow:hidden}.vposHistory summary{cursor:pointer;list-style:none;padding:15px 17px;font-weight:900;display:flex;justify-content:space-between;align-items:center}.vposHistory summary::-webkit-details-marker{display:none}.vposHistory summary:after{content:'⌄';color:var(--muted)}.vposHistory[open] summary:after{transform:rotate(180deg)}.vposHistoryBody{border-top:1px solid var(--line);padding:14px}
        #saleDialog.vposBridge{display:none!important}body.vposReset #saleDialog{display:none!important}
        @media(max-width:650px){
          .vposHero{align-items:flex-start;display:grid}.vposNew{width:100%}.vposSearch{grid-template-columns:1fr}.vposScan{width:100%}.vposHead{display:none}
          .vposHelp{display:block;line-height:1.35;margin:12px 2px 0}.vposHelp b{display:inline;margin-right:4px}
          .vposRow{grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;gap:12px 14px!important;padding:14px!important}
          .vposName{grid-column:1!important;grid-row:1!important;min-width:0}.vposName b{font-size:17px}.vposName small{font-size:12px;line-height:1.35}
          .vposDelete{grid-column:2!important;grid-row:1!important;align-self:start!important;width:40px;height:40px}
          .vposPrice{display:none!important}
          .vposQty{grid-column:1!important;grid-row:2!important;justify-self:start!important;justify-content:start!important;align-self:center!important}
          .vposSubtotal{grid-column:2!important;grid-row:2!important;align-self:center!important;min-width:88px!important;border-top:0!important;padding-top:0!important;display:block!important;text-align:right!important}
          .vposSubtotal:before{content:'Subtotal'!important;display:block!important;margin-bottom:2px;color:var(--muted)!important;font-size:11px!important;font-weight:700!important}
          .vposBottom{grid-template-columns:1fr!important;gap:10px}.vposTotal{text-align:left}.vposTotal strong{font-size:38px}
        }
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
      const matches=q=>{q=norm(q);const list=allProducts();if(!q)return [];return list.filter(p=>norm(p.barcode).includes(q)||norm(p.name).includes(q)||norm(p.category).includes(q)).slice(0,12)};

      const PAY_METHODS=['Efectivo','Yape','Plin','Transferencia','Tarjeta'];
      const paymentQrInfo=method=>{
        let legacy={};try{legacy=JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')}catch{}
        const live=window.vareliaVideoSettings||{};
        if(method==='Yape')return {
          qr:String(localStorage.getItem('varelia_qr_yape_v2')||live.yapeQr||legacy.yapeQr||''),
          holder:String(localStorage.getItem('varelia_qr_yape_holder_v2')||live.yapeHolder||legacy.yapeHolder||'')
        };
        if(method==='Plin')return {
          qr:String(localStorage.getItem('varelia_qr_plin_v2')||live.plinQr||legacy.plinQr||''),
          holder:String(localStorage.getItem('varelia_qr_plin_holder_v2')||live.plinHolder||legacy.plinHolder||'')
        };
        return {qr:'',holder:''};
      };
      const currentTotal=()=>legacyRows().reduce((a,x)=>a+x.subtotal,0);
      function renderPay(){
        const total=currentTotal();
        if(mixedPay.checked){
          payFields.innerHTML='<div class="vposParts">'+PAY_METHODS.map(m=>'<label class="vposPart"><span>'+m+'</span><input type="number" min="0" step="0.10" inputmode="decimal" data-vpos-part="'+m+'" placeholder="S/ 0.00"></label>').join('')+'</div><div class="vposPayResult"><span id="vposPayStatus">Falta</span><strong id="vposPayDiff">S/ '+total.toFixed(2)+'</strong></div>';
          payFields.querySelectorAll('[data-vpos-part]').forEach(x=>x.oninput=updatePay);
        }else if(payMethod.value==='Efectivo'){
          payFields.innerHTML='<label class="vposCashRow"><span>Me paga con</span><input id="vposAmountReceived" type="number" min="0" step="0.10" inputmode="decimal" placeholder="Ej. 50.00"></label><div class="vposPayResult"><span id="vposPayStatus">Vuelto</span><strong id="vposPayDiff">S/ 0.00</strong></div>';
          root.querySelector('#vposAmountReceived').oninput=updatePay;
        }else if(payMethod.value==='Yape'||payMethod.value==='Plin'){
          const info=paymentQrInfo(payMethod.value);
          const qrBox=info.qr
            ? '<div style="display:grid;gap:10px;text-align:center;padding:12px;border:1px dashed var(--line);border-radius:14px;background:var(--card)"><img src="'+info.qr+'" alt="QR '+payMethod.value+'" style="width:min(300px,82vw);max-height:300px;object-fit:contain;margin:auto;border-radius:12px;background:#fff;padding:8px"><b>Escanea para pagar con '+payMethod.value+'</b>'+(info.holder?'<small style="color:var(--muted)">Titular: '+esc(info.holder)+'</small>':'')+'<small style="color:var(--muted)">Total: S/ '+total.toFixed(2)+'</small></div>'
            : '<div style="padding:12px;border:1px dashed var(--line);border-radius:14px;background:var(--card);text-align:center"><b>QR de '+payMethod.value+' no configurado</b><small style="display:block;margin-top:5px;color:var(--muted)">Cárgalo en Ajustes → Métodos de pago.</small></div>';
          payFields.innerHTML=qrBox+'<label class="vposCashRow" style="margin-top:12px"><span>Me paga con</span><input id="vposAmountReceived" type="number" min="0" step="0.10" inputmode="decimal" placeholder="Ej. 50.00"></label><div class="vposPayResult"><span id="vposPayStatus">Vuelto</span><strong id="vposPayDiff">S/ 0.00</strong></div>';
          root.querySelector('#vposAmountReceived').oninput=updatePay;
        }else{
          payFields.innerHTML='<small style="display:block;color:var(--muted);font-weight:750;margin-bottom:10px">Se cobrará S/ '+total.toFixed(2)+' por '+payMethod.value+'.</small><label class="vposCashRow"><span>Me paga con</span><input id="vposAmountReceived" type="number" min="0" step="0.10" inputmode="decimal" placeholder="Ej. 50.00"></label><div class="vposPayResult"><span id="vposPayStatus">Vuelto</span><strong id="vposPayDiff">S/ 0.00</strong></div>';
          root.querySelector('#vposAmountReceived').oninput=updatePay;
        }
        updatePay();
      }
      function paySnapshot(){
        const total=currentTotal();let breakdown={},received=0;
        if(mixedPay.checked){
          payFields.querySelectorAll('[data-vpos-part]').forEach(x=>{const n=Math.max(0,Number(x.value)||0);if(n){breakdown[x.dataset.vposPart]=n;received+=n}});
        }else{
          received=Math.max(0,Number(root.querySelector('#vposAmountReceived')?.value)||0);
          if(received)breakdown[payMethod.value]=received;
        }
        const missing=Math.max(0,total-received),change=Math.max(0,received-total);
        if(!mixedPay.checked&&breakdown[payMethod.value])breakdown[payMethod.value]=Math.min(total,received);
        else if(change&&breakdown.Efectivo)breakdown.Efectivo=Math.max(0,breakdown.Efectivo-change);
        const entries=Object.entries(breakdown).filter(([,v])=>v>0);
        return {total,received,missing,change,breakdown:Object.fromEntries(entries),method:entries.length>1?'Pago mixto':(entries[0]?.[0]||payMethod.value)};
      }
      function updatePay(){
        const p=paySnapshot(),st=root.querySelector('#vposPayStatus'),df=root.querySelector('#vposPayDiff');if(!st||!df)return;
        if(mixedPay.checked){st.textContent=p.missing>0?'Falta':'Vuelto';df.textContent='S/ '+(p.missing>0?p.missing:p.change).toFixed(2);df.style.color=p.missing>0?'#b91c1c':'var(--p)'}
        else{st.textContent=p.missing>0?'Falta':'Vuelto';df.textContent='S/ '+(p.missing>0?p.missing:p.change).toFixed(2);df.style.color=p.missing>0?'#b91c1c':'var(--p)'}
      }
      payMethod.onchange=renderPay;mixedPay.onchange=renderPay;
      window.addEventListener('varelia:payment-settings-changed',()=>setTimeout(renderPay,0));

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
      function showSuggestions(q){const list=matches(q);if(!list.length){hideSuggestions();return}suggestions.innerHTML=list.map(p=>{const inCart=Array.isArray(cart)&&cart.some(x=>String(x.id)===String(p.id));return `<button type="button" class="vposSuggestion" data-pos-id="${esc(p.id)}"><span class="vposSuggestionInfo"><b>${esc(p.name)}</b><small>${esc(p.category||p.barcode||'Producto')}${inCart?' · Ya está en el carrito':''}</small></span><strong>${inCart?'Agregar más':'S/ '+Number(p.sellPrice||0).toFixed(2)}</strong></button>`}).join('');suggestions.classList.add('show')}
      suggestions.addEventListener('click',e=>{const b=e.target.closest('[data-pos-id]');if(!b)return;e.preventDefault();e.stopPropagation();const p=allProducts().find(x=>String(x.id)===String(b.dataset.posId));if(!p)return;if(addProduct(p)){input.value='';hideSuggestions();input.focus()}});
      input.addEventListener('focus',()=>showSuggestions(input.value));input.addEventListener('click',()=>showSuggestions(input.value));input.addEventListener('input',()=>showSuggestions(input.value));
      input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=input.value.trim(),p=exactProduct(q)||matches(q)[0];if(!p)return; e.preventDefault();if(addProduct(p)){input.value='';hideSuggestions();input.focus()}});

      function bridgeScanner(){saleDialog.classList.add('vposBridge');try{if(!saleDialog.open)saleDialog.show()}catch{}scanForSale.click()}
      root.querySelector('#vposScan').onclick=bridgeScanner;

      function startNew(forceReset=false){
        if(forceReset){try{localStorage.removeItem('varelia_scanner_cart_backup_v1')}catch{}}
        try{if(saleDialog.open)saleDialog.close()}catch{}saleDialog.classList.remove('vposBridge');document.body.classList.add('vposReset');
        try{if(typeof openSale==='function')openSale(forceReset||!Array.isArray(cart)||cart.length===0)}catch(e){console.warn(e)}
        try{if(saleDialog.open)saleDialog.close()}catch{}document.body.classList.remove('vposReset');input.value='';hideSuggestions();sync();input.focus();window.vareliaToast?.(forceReset?'Nueva venta lista':'Carrito conservado','ok')
      }
      const posNew=root.querySelector('#vposNew');if(posNew)posNew.onclick=()=>startNew(true);
      checkoutBtn.onclick=()=>{const state=sync();if(!state.rows.length)return;const p=paySnapshot();if(p.missing>.005){showPaymentDetail(p);window.vareliaToast?.('Faltan S/ '+p.missing.toFixed(2)+' para completar el pago','warn');return}window.VareliaPaymentSnapshot={...p,at:Date.now()};try{legacyCheckout.click();setTimeout(()=>{try{localStorage.removeItem('varelia_scanner_cart_backup_v1')}catch{}sync();renderPay();try{if(typeof renderSales==='function')renderSales()}catch{}window.vareliaToast?.('Venta registrada','ok')},160)}catch(e){console.error(e);window.vareliaSound?.('error')}};

      function goSales(){const nav=document.querySelector('.nav [data-view="sales"]');if(nav)nav.click();else try{switchView('sales')}catch{}setTimeout(()=>{startNew();root.scrollIntoView({behavior:'smooth',block:'start'})},80)}
      document.addEventListener('click',e=>{const b=e.target.closest('#newSaleTop,#newSaleFab');if(!b)return;e.preventDefault();e.stopImmediatePropagation();goSales()},true);
      document.addEventListener('click',e=>{const b=e.target.closest('.nav [data-view="sales"]');if(!b)return;setTimeout(()=>input.focus(),120)},true);

      window.VareliaPOS={addProduct,startNew,sync,isActive:()=>salesSec.classList.contains('active'),focus:()=>input.focus()};
      renderPay();sync();setTimeout(sync,350);setTimeout(()=>salesSec.querySelectorAll(':scope > .flowRole').forEach(el=>el.remove()),1200);
    },120);
  });
})();