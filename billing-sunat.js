(()=>{
  if(window.__vareliaBillingSunat)return;
  window.__vareliaBillingSunat=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(async()=>{
    if(typeof products==='undefined'||typeof sales==='undefined')return;
    const nav=document.querySelector('.nav'),main=document.querySelector('main.content');if(!nav||!main)return;

    async function tenantId(){
      for(let i=0;i<25&&!window.vareliaSupabase;i++)await new Promise(r=>setTimeout(r,120));
      if(!window.vareliaSupabase)return 'local';
      try{
        const {data}=await window.vareliaSupabase.auth.getSession();
        const user=data?.session?.user;if(!user)return 'local';
        const {data:profile}=await window.vareliaSupabase.from('profiles').select('business_id').eq('id',user.id).maybeSingle();
        return profile?.business_id||user.id;
      }catch{return 'local'}
    }
    const TENANT=await tenantId();
    const DOC_STORE='varelia_billing_docs_v2_'+TENANT;
    const CFG_STORE='varelia_billing_config_v2_'+TENANT;
    const EMPTY_CONFIG={ruc:'',legalName:'',tradeName:'',taxRegime:'',address:'',invoiceSeries:'F001',receiptSeries:'B001'};
    let docs=[];try{docs=JSON.parse(localStorage.getItem(DOC_STORE)||'[]')}catch{docs=[]}
    let config={...EMPTY_CONFIG};try{config={...config,...JSON.parse(localStorage.getItem(CFG_STORE)||'{}')}}catch{}
    let cart=[];
    let configEditing=false;

    const style=document.createElement('style');style.textContent=`
      .billingHero{padding:16px;border-radius:18px;border:1px solid color-mix(in srgb,var(--p) 22%,var(--line));background:linear-gradient(135deg,color-mix(in srgb,var(--p) 8%,var(--card)),var(--card));box-shadow:var(--shadow);margin-bottom:14px}.billingHero strong{display:block;font-size:16px}.billingStatus{display:inline-flex;align-items:center;gap:7px;margin-top:8px;padding:7px 10px;border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;font-size:12px;font-weight:900}.billingStatus.ok{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.billingGrid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}.billingCard{padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:var(--shadow)}.billingCard h3{margin:0 0 10px}.billingForm{display:grid;gap:10px}.billingTwo{display:grid;grid-template-columns:1fr 1fr;gap:9px}.billingThree{display:grid;grid-template-columns:1.3fr .7fr .8fr;gap:9px}.billingCart{display:grid;gap:8px;margin-top:10px}.billingItem{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:8px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--bg)}.billingItem button{border:0;background:#fee2e2;color:#b91c1c;border-radius:10px;padding:7px 9px}.billingTotals{display:grid;gap:5px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}.billingTotals div{display:flex;justify-content:space-between;gap:10px}.billingTotals .grand{font-size:21px;font-weight:950;color:var(--p)}.billingActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.billingSunatBtn[disabled]{opacity:.55;cursor:not-allowed}.billingDocs{display:grid;gap:9px}.billingDoc{padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--card)}.billingDocTop{display:flex;justify-content:space-between;gap:10px}.billingTag{display:inline-block;margin-top:5px;padding:4px 8px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:900}.billingNote{font-size:12px;color:var(--muted);margin-top:8px}.billingIssuer{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.billingIssuer div{padding:10px;border-radius:13px;background:var(--bg);font-size:12px}.billingIssuer b{display:block;margin-top:2px;color:var(--ink);overflow-wrap:anywhere}.billingConfig{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}.billingConfig .btn{width:100%}.billingConfigActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.billingDanger{background:#fff1f2!important;color:#be123c!important;border:1px solid #fecdd3!important}.billingSavedActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.billingSavedActions .btn{width:100%}@media(max-width:850px){.billingGrid{grid-template-columns:1fr}.billingIssuer{grid-template-columns:1fr}.billingTwo,.billingThree,.billingActions,.billingSavedActions,.billingConfigActions{grid-template-columns:1fr}.billingItem{grid-template-columns:1fr auto}.billingItem .billingPrice,.billingItem .billingQty{font-size:12px}}
    `;document.head.appendChild(style);

    const section=document.createElement('section');section.id='billing';section.className='view';section.innerHTML=`
      <div class="head"><div><h2>🧾 Facturación</h2><p class="notice">Cada negocio configura sus propios datos para emitir sus comprobantes.</p></div></div>
      <div class="billingHero">
        <strong>Configuración del emisor</strong>
        <div id="billSavedConfig" hidden>
          <div id="billIssuerSummary" class="billingIssuer"></div>
          <span id="billConfigStatus" class="billingStatus ok">✓ Datos del negocio guardados</span>
          <div class="billingSavedActions"><button type="button" class="btn secondary" id="billEditConfig">✏️ Editar datos</button><button type="button" class="btn billingDanger" id="billDeleteConfig">🗑️ Eliminar configuración</button></div>
        </div>
        <div id="billConfigForm" class="billingConfig billingForm">
          <div class="billingTwo"><label>RUC del negocio<input id="billBizRuc" inputmode="numeric" maxlength="11" placeholder="11 dígitos"></label><label>Razón social<input id="billBizName" placeholder="Razón social SUNAT"></label></div>
          <div class="billingTwo"><label>Nombre comercial<input id="billTradeName" placeholder="Opcional"></label><label>Régimen tributario<select id="billRegime"><option value="">Seleccionar</option><option>Nuevo RUS</option><option>Régimen Especial de Renta</option><option>Régimen MYPE Tributario</option><option>Régimen General</option></select></label></div>
          <label>Dirección fiscal<input id="billAddress" placeholder="Dirección del negocio"></label>
          <div class="billingTwo"><label>Serie factura<input id="billInvoiceSeries" maxlength="4" placeholder="F001"></label><label>Serie boleta<input id="billReceiptSeries" maxlength="4" placeholder="B001"></label></div>
          <div class="billingConfigActions"><button type="button" class="btn secondary" id="billCancelConfig" hidden>Cancelar</button><button type="button" class="btn primary" id="billSaveConfig">Guardar configuración</button></div>
        </div>
        <div class="billingNote">Cada cuenta guarda su propia configuración. No pongas Clave SOL, contraseña ni certificado digital en esta pantalla. La emisión oficial debe hacerse desde un servidor seguro o mediante un PSE.</div>
      </div>
      <div class="billingGrid">
        <div class="billingCard"><h3>Nuevo comprobante</h3><div class="billingForm">
          <div class="billingTwo"><label>Tipo<select id="billType"><option value="factura">Factura electrónica</option><option value="boleta">Boleta electrónica</option></select></label><label>Tipo de operación<select id="billTax"><option value="gravada">Gravada · IGV 18%</option><option value="inafecta">Inafecta</option><option value="exonerada">Exonerada</option></select></label></div>
          <div class="billingTwo"><label>Documento cliente<input id="billCustomerDoc" placeholder="RUC o DNI"></label><label>Nombre / Razón social<input id="billCustomerName" placeholder="Cliente"></label></div>
          <div class="billingTwo"><label>Cargar desde venta<select id="billSale"></select></label><button type="button" class="btn secondary" id="billLoadSale">Cargar venta</button></div>
          <div class="billingThree"><label>Producto<select id="billProduct"></select></label><label>Cantidad<input id="billQty" type="number" min="1" value="1"></label><button type="button" class="btn secondary" id="billAdd">+ Agregar</button></div>
          <div id="billCart" class="billingCart"></div>
          <div class="billingTotals"><div><span>Valor de venta</span><strong id="billBase">S/ 0.00</strong></div><div><span>IGV</span><strong id="billIgv">S/ 0.00</strong></div><div class="grand"><span>Total</span><strong id="billTotal">S/ 0.00</strong></div></div>
          <div class="billingActions"><button type="button" class="btn secondary" id="billSave">Guardar borrador</button><button type="button" class="btn primary billingSunatBtn" id="billEmit" disabled>Emitir en SUNAT</button></div>
          <div class="billingNote">Los precios registrados se toman como precios finales. En operaciones gravadas, Varelia separa el IGV incluido.</div>
        </div></div>
        <div class="billingCard"><h3>Historial de facturación</h3><div id="billDocs" class="billingDocs"></div></div>
      </div>`;
    main.appendChild(section);

    const btn=document.createElement('button');btn.type='button';btn.dataset.view='billing';btn.textContent='🧾 Facturación';
    const cashBtn=nav.querySelector('[data-view="cash"]');cashBtn?nav.insertBefore(btn,cashBtn):nav.appendChild(btn);

    const $=id=>document.getElementById(id),money=n=>'S/ '+Number(n||0).toFixed(2),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function configReady(){return /^\d{11}$/.test(config.ruc)&&!!config.legalName&&!!config.taxRegime}
    function fillConfigForm(){
      $('billBizRuc').value=config.ruc||'';$('billBizName').value=config.legalName||'';$('billTradeName').value=config.tradeName||'';$('billRegime').value=config.taxRegime||'';$('billAddress').value=config.address||'';$('billInvoiceSeries').value=config.invoiceSeries||'F001';$('billReceiptSeries').value=config.receiptSeries||'B001';
    }
    function renderConfigPanel(){
      const saved=$('billSavedConfig'),form=$('billConfigForm'),cancel=$('billCancelConfig'),saveBtn=$('billSaveConfig'),box=$('billIssuerSummary');if(!saved||!form||!box)return;
      const ok=configReady();
      if(ok&&!configEditing){
        saved.hidden=false;form.hidden=true;
        box.innerHTML=`<div>RUC<b>${esc(config.ruc)}</b></div><div>Razón social<b>${esc(config.legalName)}</b></div><div>Nombre comercial<b>${esc(config.tradeName||'No registrado')}</b></div><div>Régimen<b>${esc(config.taxRegime)}</b></div><div>Dirección fiscal<b>${esc(config.address||'No registrada')}</b></div><div>Series<b>${esc(config.invoiceSeries||'F001')} · ${esc(config.receiptSeries||'B001')}</b></div>`;
      }else{
        saved.hidden=true;form.hidden=false;fillConfigForm();cancel.hidden=!ok;saveBtn.textContent=ok?'Guardar cambios':'Guardar configuración';
      }
    }
    function openBilling(){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='billing'));document.querySelectorAll('.nav [data-view]').forEach(b=>b.classList.toggle('active',b===btn));if(innerWidth<=980){document.getElementById('sidebar')?.classList.remove('open');document.getElementById('overlay')?.classList.remove('show')}try{history.replaceState(null,'',location.pathname+location.search+'#facturacion')}catch{}renderAll();scrollTo({top:0,behavior:'smooth'})}
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openBilling()},true);
    if(location.hash==='#facturacion')setTimeout(openBilling,140);

    function fillProducts(){const sel=$('billProduct');if(!sel)return;sel.innerHTML=products.length?products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${money(p.sellPrice)}</option>`).join(''):'<option value="">Sin productos</option>'}
    function fillSales(){const sel=$('billSale');if(!sel)return;const list=[...sales].reverse().slice(0,80);sel.innerHTML='<option value="">Selecciona una venta</option>'+list.map(s=>`<option value="${esc(s.id)}">${new Date(s.date).toLocaleString('es-PE')} · ${money(s.total)}</option>`).join('')}
    function totals(){const total=cart.reduce((a,i)=>a+(Number(i.price)||0)*(Number(i.qty)||0),0),tax=$('billTax')?.value||'gravada';let base=total,igv=0;if(tax==='gravada'){base=total/1.18;igv=total-base}return{total,base,igv}}
    function renderCart(){const box=$('billCart');if(!box)return;box.innerHTML=cart.length?cart.map((i,idx)=>`<div class="billingItem"><strong>${esc(i.name)}</strong><span class="billingQty">x${i.qty}</span><span class="billingPrice">${money((Number(i.price)||0)*(Number(i.qty)||0))}</span><button type="button" data-bill-remove="${idx}">×</button></div>`).join(''):'<div class="empty">Agrega productos o carga una venta.</div>';const t=totals();$('billBase').textContent=money(t.base);$('billIgv').textContent=money(t.igv);$('billTotal').textContent=money(t.total)}
    function renderDocs(){const box=$('billDocs');if(!box)return;box.innerHTML=docs.length?[...docs].reverse().map(d=>`<div class="billingDoc"><div class="billingDocTop"><strong>${d.type==='factura'?'Factura':'Boleta'} · ${esc(d.localRef)}</strong><strong>${money(d.total)}</strong></div><div class="meta">${new Date(d.createdAt).toLocaleString('es-PE')} · ${esc(d.customerName||'Cliente')}</div><span class="billingTag">${esc(d.status)}</span></div>`).join(''):'<div class="empty">Aún no hay comprobantes preparados.</div>'}
    function renderAll(){fillProducts();fillSales();renderCart();renderDocs();renderConfigPanel()}

    $('billSaveConfig').onclick=()=>{
      const next={ruc:$('billBizRuc').value.trim(),legalName:$('billBizName').value.trim(),tradeName:$('billTradeName').value.trim(),taxRegime:$('billRegime').value,address:$('billAddress').value.trim(),invoiceSeries:$('billInvoiceSeries').value.trim().toUpperCase()||'F001',receiptSeries:$('billReceiptSeries').value.trim().toUpperCase()||'B001'};
      if(!/^\d{11}$/.test(next.ruc))return alert('El RUC debe tener 11 dígitos.');
      if(!next.legalName)return alert('Ingresa la razón social del negocio.');
      if(!next.taxRegime)return alert('Selecciona el régimen tributario.');
      config=next;try{localStorage.setItem(CFG_STORE,JSON.stringify(config))}catch{}configEditing=false;renderConfigPanel();window.vareliaToast?.('Datos del negocio guardados.');
    };
    $('billEditConfig').onclick=()=>{configEditing=true;renderConfigPanel();setTimeout(()=>$('billBizRuc')?.focus(),0)};
    $('billCancelConfig').onclick=()=>{configEditing=false;renderConfigPanel()};
    $('billDeleteConfig').onclick=()=>{
      if(!confirm('¿Eliminar la configuración de facturación de este negocio?\n\nEl historial de comprobantes guardados no se eliminará.'))return;
      config={...EMPTY_CONFIG};configEditing=false;try{localStorage.removeItem(CFG_STORE)}catch{}renderConfigPanel();window.vareliaToast?.('Configuración de facturación eliminada.');
    };
    $('billAdd').onclick=()=>{const p=products.find(x=>x.id===$('billProduct').value),qty=Math.max(1,Math.floor(Number($('billQty').value)||1));if(!p)return;const row=cart.find(x=>x.id===p.id);row?row.qty+=qty:cart.push({id:p.id,name:p.name,qty,price:Number(p.sellPrice)||0});renderCart()};
    $('billCart').onclick=e=>{const b=e.target.closest('[data-bill-remove]');if(!b)return;cart.splice(Number(b.dataset.billRemove),1);renderCart()};
    $('billTax').onchange=renderCart;
    $('billType').onchange=()=>{const input=$('billCustomerDoc');if($('billType').value==='factura')input.placeholder='RUC de 11 dígitos';else input.placeholder='DNI o documento'};
    $('billLoadSale').onclick=()=>{const s=sales.find(x=>x.id===$('billSale').value);if(!s)return alert('Selecciona una venta.');cart=(s.items||[]).map(i=>({id:i.id,name:i.name,qty:Number(i.qty)||0,price:Number(i.price)||0})).filter(i=>i.qty>0);renderCart()};
    $('billSave').onclick=()=>{if(!configReady())return alert('Primero configura los datos del negocio emisor.');if(!cart.length)return alert('Agrega al menos un producto.');const type=$('billType').value,doc=$('billCustomerDoc').value.trim(),name=$('billCustomerName').value.trim();if(type==='factura'&&!/^\d{11}$/.test(doc))return alert('Para factura ingresa el RUC del cliente con 11 dígitos.');const t=totals(),prefix=type==='factura'?(config.invoiceSeries||'F001'):(config.receiptSeries||'B001'),d={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),localRef:prefix+'-BOR-'+String(Date.now()).slice(-6),createdAt:new Date().toISOString(),issuer:{...config},type,tax:$('billTax').value,customerDoc:doc,customerName:name,items:JSON.parse(JSON.stringify(cart)),base:t.base,igv:t.igv,total:t.total,status:'Borrador · pendiente SUNAT'};docs.push(d);try{localStorage.setItem(DOC_STORE,JSON.stringify(docs))}catch{}renderDocs();window.vareliaToast?.('Borrador de comprobante guardado.')};
    $('billEmit').onclick=()=>alert('La emisión oficial se habilitará con una conexión segura SUNAT/PSE por cada negocio.');
    renderAll();
  });
})();