(()=>{
  if(window.__vareliaStaffStockGuard)return;
  window.__vareliaStaffStockGuard=true;

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast=(msg,type='warn')=>{if(typeof window.vareliaToast==='function')window.vareliaToast(msg,type);else alert(msg)};
  const profile=()=>window.vareliaCurrentUserProfile||null;
  const isStaff=()=>{const p=profile();return !!p&&String(p.role||'owner')!=='owner'};
  const canSales=()=>{const p=profile();return !p||p.role==='owner'||p.permissions?.sales!==false};

  const style=document.createElement('style');
  style.id='vareliaStaffStockGuardCss';
  style.textContent=`
    body.varelia-staff-readonly #newProduct,
    body.varelia-staff-readonly #inventoryNewProduct,
    body.varelia-staff-readonly #applyInventory,
    body.varelia-staff-readonly #addCategory,
    body.varelia-staff-readonly #newSupplier,
    body.varelia-staff-readonly #newPurchase,
    body.varelia-staff-readonly #addPurchaseItem,
    body.varelia-staff-readonly #savePurchase,
    body.varelia-staff-readonly [data-edit],
    body.varelia-staff-readonly [data-delete],
    body.varelia-staff-readonly [data-deleteinv],
    body.varelia-staff-readonly [data-alertcfg],
    body.varelia-staff-readonly [data-delcat],
    body.varelia-staff-readonly [data-editsupplier],
    body.varelia-staff-readonly [data-delsupplier],
    body.varelia-staff-readonly .nav [data-view="categories"],
    body.varelia-staff-readonly #supplierGroup,
    body.varelia-staff-readonly [data-admin-open="categories"],
    body.varelia-staff-readonly [data-admin-open="suppliers"],
    body.varelia-staff-readonly [data-admin-open="purchases"]{display:none!important}
    body.varelia-staff-readonly #reorderList input[data-reorder]{pointer-events:none!important;opacity:.65!important}
    body.varelia-staff-readonly #inventoryMode,
    body.varelia-staff-readonly #inventoryQty{pointer-events:none!important;opacity:.65!important}
    body.varelia-staff-readonly #mobileSettingsHub input,
    body.varelia-staff-readonly #mobileSettingsHub textarea,
    body.varelia-staff-readonly #mobileSettingsHub select,
    body.varelia-staff-readonly #mobileSettingsHub button{pointer-events:none!important;opacity:.68!important}
    body.varelia-staff-readonly #vareliaEditBusinessName{display:none!important}
    .vstaffReadOnlyNote{display:none;margin:0 0 14px;padding:12px 14px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;color:#1e3a8a;font-size:12px;font-weight:800}
    body.varelia-staff-readonly .vstaffReadOnlyNote{display:block}
    .vreturnBtn{border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);padding:8px 10px;font-size:11px;font-weight:900;white-space:nowrap}
    .vreturnBadge{display:inline-block;margin-top:5px;padding:4px 7px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:10px;font-weight:900}
    #vareliaReturnDialog{width:min(92vw,470px);border:0;border-radius:22px;padding:0;background:var(--card);color:var(--ink);box-shadow:0 28px 90px #0005}
    #vareliaReturnDialog::backdrop{background:#0f172a99;backdrop-filter:blur(4px)}
    .vreturnCard{padding:20px}.vreturnHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.vreturnHead h3{margin:0}.vreturnClose{border:0;border-radius:11px;width:38px;height:38px;background:var(--bg);color:inherit;font-size:22px}.vreturnForm{display:grid;gap:12px;margin-top:16px}.vreturnForm label{display:grid;gap:6px;font-size:12px;font-weight:850}.vreturnForm select,.vreturnForm input{width:100%;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:11px 12px}.vreturnSave{border:0;border-radius:13px;padding:12px 14px;background:var(--p);color:#fff;font-weight:900}.vreturnInfo{font-size:11px;color:var(--muted);line-height:1.45}
  `;
  document.head.appendChild(style);

  function ensureReadOnlyNote(){
    for(const id of ['products','inventory','mobileSettingsHub']){
      const sec=$(id);if(!sec||sec.querySelector('.vstaffReadOnlyNote'))continue;
      const note=document.createElement('div');note.className='vstaffReadOnlyNote';
      note.textContent=id==='mobileSettingsHub'
        ? 'Solo el administrador puede editar los datos del negocio, logo, RUC, teléfono, dirección, horario, redes, pagos y métodos de entrega.'
        : 'Modo personal: puedes consultar los productos y el stock, pero no modificar datos ni cantidades manualmente. El stock solo cambia por ventas o devoluciones.';
      const head=sec.querySelector('.head,.vmobileHubHead');
      if(head)head.insertAdjacentElement('afterend',note);else sec.prepend(note);
    }
  }

  function applyMode(){
    const staff=isStaff();
    document.body.classList.toggle('varelia-staff-readonly',staff);
    ensureReadOnlyNote();
    if(!staff)return;

    ['inventoryMode','inventoryQty'].forEach(id=>{const el=$(id);if(el)el.disabled=true});
    document.querySelectorAll('#reorderList input[data-reorder]').forEach(el=>el.disabled=true);
    document.querySelectorAll('#mobileSettingsHub input,#mobileSettingsHub textarea,#mobileSettingsHub select,#mobileSettingsHub button').forEach(el=>el.disabled=true);

    const active=document.querySelector('.view.active')?.id;
    if(['categories','suppliers','purchases','appearance','mobileAdminHub'].includes(active)){
      const dest=canSales()?'sales':'products';
      const nav=document.querySelector('.nav [data-view="'+dest+'"]');
      if(nav)nav.click();
    }
  }

  const forbiddenClickSelector=[
    '#newProduct','#inventoryNewProduct','#applyInventory','#addCategory','#newSupplier','#newPurchase','#addPurchaseItem','#savePurchase',
    '[data-edit]','[data-delete]','[data-deleteinv]','[data-alertcfg]','[data-delcat]','[data-editsupplier]','[data-delsupplier]',
    '.nav [data-view="categories"]','.nav [data-view="suppliers"]','.nav [data-view="purchases"]',
    '[data-admin-open="categories"]','[data-admin-open="suppliers"]','[data-admin-open="purchases"]',
    '#mobileSettingsHub button','#mobileSettingsHub input[type="file"]'
  ].join(',');

  document.addEventListener('click',e=>{
    if(!isStaff())return;
    const t=e.target.closest?.(forbiddenClickSelector);
    if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();
    toast('El personal no puede modificar productos, datos ni stock manualmente.','warn');
  },true);

  document.addEventListener('submit',e=>{
    if(!isStaff())return;
    if(e.target?.matches?.('#productForm,#supplierForm')||e.target?.closest?.('#mobileSettingsHub')){
      e.preventDefault();e.stopImmediatePropagation();
      toast('Esta acción está disponible solo para el propietario.','warn');
    }
  },true);

  document.addEventListener('change',e=>{
    if(!isStaff())return;
    if(e.target?.matches?.('#reorderList input[data-reorder],#inventoryMode,#inventoryQty')||e.target?.closest?.('#mobileSettingsHub')){
      e.preventDefault();e.stopImmediatePropagation();
      toast('El stock no se puede cambiar manualmente desde una cuenta de personal.','warn');
    }
  },true);

  function getSales(){try{return Array.isArray(sales)?sales:[]}catch{return[]}}
  function getProducts(){try{return Array.isArray(products)?products:[]}catch{return[]}}
  function getRemainingItems(sale){
    return (sale?.items||[]).map((item,index)=>{
      const sold=Math.max(0,Number(item.qty)||0);
      const returned=Math.max(0,Number(item.returnedQty)||0);
      return {item,index,sold,returned,remaining:Math.max(0,sold-returned)};
    }).filter(x=>x.remaining>0);
  }

  function ensureReturnDialog(){
    let d=$('vareliaReturnDialog');if(d)return d;
    d=document.createElement('dialog');d.id='vareliaReturnDialog';
    d.innerHTML=`<div class="vreturnCard"><div class="vreturnHead"><div><h3>Registrar devolución</h3><div class="vreturnInfo" id="vreturnSaleInfo"></div></div><button type="button" class="vreturnClose" aria-label="Cerrar">×</button></div><form class="vreturnForm" id="vreturnForm"><label>Producto<select id="vreturnItem"></select></label><label>Cantidad que regresa al stock<input id="vreturnQty" type="number" min="1" step="1" value="1" required></label><div class="vreturnInfo" id="vreturnHelp"></div><button class="vreturnSave" type="submit">Confirmar devolución y reponer stock</button></form></div>`;
    document.body.appendChild(d);
    d.querySelector('.vreturnClose').onclick=()=>d.close();
    d.querySelector('#vreturnItem').onchange=()=>syncReturnLimit(d);
    d.querySelector('#vreturnForm').onsubmit=submitReturn;
    return d;
  }

  let activeReturnSaleId='';
  function findSale(id){return getSales().find(s=>String(s.id||s.date)===String(id))||null}
  function syncReturnLimit(d=ensureReturnDialog()){
    const sale=findSale(activeReturnSaleId);if(!sale)return;
    const sel=d.querySelector('#vreturnItem'),qty=d.querySelector('#vreturnQty'),help=d.querySelector('#vreturnHelp');
    const row=getRemainingItems(sale).find(x=>String(x.index)===String(sel.value));
    if(!row)return;
    qty.max=String(row.remaining);qty.value=String(Math.min(Math.max(1,Number(qty.value)||1),row.remaining));
    help.textContent='Disponible para devolver: '+row.remaining+' de '+row.sold+' unidad(es) vendidas.';
  }

  function openReturn(id){
    if(!canSales())return toast('No tienes permiso para registrar devoluciones.','warn');
    const sale=findSale(id);if(!sale)return;
    const remaining=getRemainingItems(sale);
    if(!remaining.length)return toast('Esta venta ya fue devuelta completamente.','ok');
    const d=ensureReturnDialog();activeReturnSaleId=String(sale.id||sale.date);
    d.querySelector('#vreturnSaleInfo').textContent='Venta del '+new Date(sale.date).toLocaleString('es-PE');
    const sel=d.querySelector('#vreturnItem');
    sel.innerHTML=remaining.map(x=>`<option value="${x.index}">${esc(x.item.name||'Producto')} · quedan ${x.remaining}</option>`).join('');
    d.querySelector('#vreturnQty').value='1';
    syncReturnLimit(d);d.showModal();
  }

  function submitReturn(e){
    e.preventDefault();
    if(!canSales())return;
    const d=ensureReturnDialog(),sale=findSale(activeReturnSaleId);if(!sale)return;
    const index=Number(d.querySelector('#vreturnItem').value);
    const item=sale.items?.[index];if(!item)return;
    const sold=Math.max(0,Number(item.qty)||0),already=Math.max(0,Number(item.returnedQty)||0),remaining=Math.max(0,sold-already);
    const qty=Math.floor(Number(d.querySelector('#vreturnQty').value)||0);
    if(qty<1||qty>remaining)return toast('La cantidad a devolver debe estar entre 1 y '+remaining+'.','warn');
    const p=getProducts().find(x=>String(x.id)===String(item.id))||getProducts().find(x=>String(x.name||'').trim().toLowerCase()===String(item.name||'').trim().toLowerCase());
    if(!p)return toast('El producto ya no existe en el inventario.','warn');

    const before=Number(p.stock)||0;
    p.stock=before+qty;
    item.returnedQty=already+qty;
    sale.returns=Array.isArray(sale.returns)?sale.returns:[];
    sale.returns.push({
      id:(typeof uid==='function'?uid():String(Date.now())),
      date:new Date().toISOString(),productId:p.id,name:p.name,qty,
      by:window.vareliaSellerId||'',byName:window.vareliaSellerName||''
    });
    try{if(typeof addMovement==='function')addMovement(p,'return',qty,before,p.stock,'Devolución de venta')}catch{}
    try{if(typeof save==='function')save();else throw new Error('save no disponible')}catch(err){p.stock=before;item.returnedQty=already;console.error(err);return toast('No se pudo guardar la devolución.','warn')}
    d.close();
    toast('Devolución registrada. Se repusieron '+qty+' unidad(es) al stock.','ok');
    setTimeout(refreshSalesButtons,50);
  }

  function refreshSalesButtons(){
    const list=$('salesList');if(!list||!canSales())return;
    const rows=[...list.querySelectorAll(':scope > .row')];
    const reversed=[...getSales()].reverse();
    rows.forEach((row,i)=>{
      const sale=reversed[i];if(!sale)return;
      const sid=String(sale.id||sale.date);
      row.dataset.vareliaSaleId=sid;
      const totalReturned=(sale.items||[]).reduce((n,x)=>n+(Number(x.returnedQty)||0),0);
      const meta=row.querySelector('.meta');
      if(meta){
        let badge=meta.querySelector('.vreturnBadge');
        if(totalReturned>0){if(!badge){badge=document.createElement('span');badge.className='vreturnBadge';meta.appendChild(document.createElement('br'));meta.appendChild(badge)}badge.textContent='Devuelto: '+totalReturned+' unidad(es)'}
      }
      const remaining=getRemainingItems(sale);
      let btn=row.querySelector('.vreturnBtn');
      if(remaining.length){
        if(!btn){btn=document.createElement('button');btn.type='button';btn.className='vreturnBtn';btn.textContent='↩ Devolver';row.appendChild(btn)}
        btn.dataset.returnSale=sid;
      }else if(btn)btn.remove();
    });
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.vreturnBtn');if(!b)return;
    e.preventDefault();e.stopPropagation();openReturn(b.dataset.returnSale);
  },true);

  const salesList=$('salesList');
  if(salesList)new MutationObserver(()=>queueMicrotask(refreshSalesButtons)).observe(salesList,{childList:true,subtree:true});

  let tries=0;
  const timer=setInterval(()=>{
    tries++;applyMode();refreshSalesButtons();
    if(tries>120)clearInterval(timer);
  },250);
  window.addEventListener('varelia:business-scope-ready',()=>setTimeout(()=>{applyMode();refreshSalesButtons()},100));
  window.addEventListener('pageshow',()=>setTimeout(()=>{applyMode();refreshSalesButtons()},100));
  new MutationObserver(()=>{applyMode();refreshSalesButtons()}).observe(document.body,{childList:true,subtree:true});
})();
