(()=>{
  if(window.__vareliaStaffGuardV2)return;
  window.__vareliaStaffGuardV2=true;

  const $=id=>document.getElementById(id);
  const toast=(msg,type='warn')=>window.vareliaToast?window.vareliaToast(msg,type):alert(msg);
  const getProfile=()=>window.vareliaCurrentUserProfile||null;
  const isStaff=()=>{const p=getProfile();return !!p&&String(p.role||'owner')!=='owner'};
  const canSales=()=>{const p=getProfile();return !p||p.role==='owner'||p.permissions?.sales!==false};
  const getProducts=()=>{try{return Array.isArray(products)?products:[]}catch{return[]}};
  const getSales=()=>{try{return Array.isArray(sales)?sales:[]}catch{return[]}};

  const style=document.createElement('style');
  style.id='vareliaStaffGuardV2Css';
  style.textContent=`
    body.varelia-staff-mode #newProduct,
    body.varelia-staff-mode #inventoryNewProduct,
    body.varelia-staff-mode #addCategory,
    body.varelia-staff-mode #newSupplier,
    body.varelia-staff-mode #newPurchase,
    body.varelia-staff-mode #addPurchaseItem,
    body.varelia-staff-mode #savePurchase,
    body.varelia-staff-mode [data-edit],
    body.varelia-staff-mode [data-delete],
    body.varelia-staff-mode [data-deleteinv],
    body.varelia-staff-mode [data-alertcfg],
    body.varelia-staff-mode [data-delcat],
    body.varelia-staff-mode [data-editsupplier],
    body.varelia-staff-mode [data-delsupplier],
    body.varelia-staff-mode .nav [data-view="categories"],
    body.varelia-staff-mode .nav [data-view="suppliers"],
    body.varelia-staff-mode .nav [data-view="purchases"],
    body.varelia-staff-mode #supplierGroup,
    body.varelia-staff-mode [data-admin-open="categories"],
    body.varelia-staff-mode [data-admin-open="suppliers"],
    body.varelia-staff-mode [data-admin-open="purchases"],
    body.varelia-staff-mode #vareliaEditBusinessName{display:none!important}
    body.varelia-staff-mode #reorderList input[data-reorder]{pointer-events:none!important;opacity:.55!important}
    .vstaffReadOnlyNote{display:none;margin:0 0 14px;padding:12px 14px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;color:#1e3a8a;font-size:12px;font-weight:800}
    body.varelia-staff-mode .vstaffReadOnlyNote{display:block}
    .vreturnBtn{border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);padding:8px 10px;font-size:11px;font-weight:900;white-space:nowrap}
    .vreturnBadge{display:inline-block;margin-top:5px;padding:4px 7px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:10px;font-weight:900}
    #vareliaReturnDialog{width:min(92vw,470px);border:0;border-radius:22px;padding:0;background:var(--card);color:var(--ink);box-shadow:0 28px 90px #0005}
    #vareliaReturnDialog::backdrop{background:#0f172a99;backdrop-filter:blur(4px)}
    .vreturnCard{padding:20px}.vreturnHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.vreturnHead h3{margin:0}.vreturnClose{border:0;border-radius:11px;width:38px;height:38px;background:var(--bg);color:inherit;font-size:22px}
    .vreturnForm{display:grid;gap:12px;margin-top:16px}.vreturnForm label{display:grid;gap:6px;font-size:12px;font-weight:850}.vreturnForm select,.vreturnForm input{width:100%;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:11px 12px}
    .vreturnSave{border:0;border-radius:13px;padding:12px 14px;background:var(--p);color:#fff;font-weight:900}.vreturnInfo{font-size:11px;color:var(--muted);line-height:1.45}
  `;
  document.head.appendChild(style);

  function ensureNotes(){
    for(const id of ['products','inventory','mobileSettingsHub']){
      const sec=$(id);
      if(!sec||sec.querySelector('.vstaffReadOnlyNote'))continue;
      const note=document.createElement('div');
      note.className='vstaffReadOnlyNote';
      note.textContent=id==='mobileSettingsHub'
        ? 'Solo el administrador puede editar los datos del negocio.'
        : 'El personal puede vender, elegir cantidades, reponer mercadería y registrar devoluciones. Los datos del producto no se pueden editar.';
      const head=sec.querySelector('.head,.vmobileHubHead');
      if(head)head.insertAdjacentElement('afterend',note);else sec.prepend(note);
    }
  }

  function lockSettings(staff){
    document.querySelectorAll('#mobileSettingsHub input,#mobileSettingsHub textarea,#mobileSettingsHub select').forEach(el=>{
      if(staff){
        if(!el.dataset.staffLock){
          el.dataset.staffLock='1';
          el.dataset.wasDisabled=el.disabled?'1':'0';
          el.dataset.wasReadonly=el.readOnly?'1':'0';
        }
        const t=String(el.type||'').toLowerCase();
        if(el.tagName==='INPUT'&&['text','tel','email','number','url'].includes(t||'text'))el.readOnly=true;
        else el.disabled=true;
      }else if(el.dataset.staffLock){
        el.disabled=el.dataset.wasDisabled==='1';
        el.readOnly=el.dataset.wasReadonly==='1';
        delete el.dataset.staffLock;
        delete el.dataset.wasDisabled;
        delete el.dataset.wasReadonly;
      }
    });
  }

  function configureInventory(staff){
    const mode=$('inventoryMode'),qty=$('inventoryQty'),btn=$('applyInventory');
    if(!mode||!qty||!btn)return;

    if(!mode.dataset.ownerHtml)mode.dataset.ownerHtml=mode.innerHTML;
    if(staff){
      if(mode.dataset.staffMode!=='1'){
        mode.innerHTML='<option value="restock">📦 Reponer mercadería</option><option value="return">↩️ Devolución de cliente</option>';
        mode.dataset.staffMode='1';
      }
      mode.disabled=false;qty.disabled=false;btn.disabled=false;
      btn.textContent='Registrar y actualizar stock';
      btn.onclick=async()=>{
        const p=getProducts().find(x=>String(x.id)===String(typeof inventoryProductId!=='undefined'?inventoryProductId:''));
        const q=Math.floor(Number(qty.value)||0);
        const event=mode.value==='return'?'return':'restock';
        if(!p)return toast('Selecciona primero un producto.');
        if(q<1)return toast('Indica una cantidad mayor a 0.');
        if(typeof window.vareliaCentralStockIn!=='function')return toast('Actualiza la página e inténtalo nuevamente.');
        btn.disabled=true;
        try{
          await window.vareliaCentralStockIn({product:p,event,qty:q});
          qty.value='1';
          try{if(typeof renderInvSelected==='function')renderInvSelected()}catch{}
          toast(event==='return'
            ? 'Devolución registrada. Se repusieron '+q+' unidad(es).'
            : 'Mercadería repuesta. Se agregaron '+q+' unidad(es).','ok');
        }catch(err){
          console.error(err);
          toast(err?.message||'No se pudo actualizar el stock.');
        }finally{btn.disabled=false}
      };
    }else if(mode.dataset.staffMode==='1'){
      mode.innerHTML=mode.dataset.ownerHtml||'<option value="add">➕ Entrada</option><option value="subtract">➖ Salida</option>';
      delete mode.dataset.staffMode;
      mode.disabled=false;qty.disabled=false;btn.disabled=false;
      btn.textContent='Registrar movimiento';
    }
  }

  function apply(){
    const staff=isStaff();
    document.body.classList.toggle('varelia-staff-mode',staff);
    ensureNotes();
    lockSettings(staff);
    configureInventory(staff);
  }

  function getRemainingItems(sale){
    return (sale?.items||[]).map((item,index)=>{
      const sold=Math.max(0,Number(item.qty)||0);
      const returned=Math.max(0,Number(item.returnedQty)||0);
      return {item,index,sold,returned,remaining:Math.max(0,sold-returned)};
    }).filter(x=>x.remaining>0);
  }

  function ensureReturnDialog(){
    let d=$('vareliaReturnDialog');
    if(d)return d;
    d=document.createElement('dialog');
    d.id='vareliaReturnDialog';
    d.innerHTML=`<div class="vreturnCard"><div class="vreturnHead"><div><h3>Registrar devolución</h3><div class="vreturnInfo" id="vreturnSaleInfo"></div></div><button type="button" class="vreturnClose">×</button></div><form class="vreturnForm" id="vreturnForm"><label>Producto<select id="vreturnItem"></select></label><label>Cantidad que regresa al stock<input id="vreturnQty" type="number" min="1" step="1" value="1" required></label><div class="vreturnInfo" id="vreturnHelp"></div><button class="vreturnSave" type="submit">Confirmar devolución y reponer stock</button></form></div>`;
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
    qty.max=String(row.remaining);
    qty.value=String(Math.min(Math.max(1,Number(qty.value)||1),row.remaining));
    help.textContent='Disponible para devolver: '+row.remaining+' de '+row.sold+' unidad(es).';
  }

  function openReturn(id){
    if(!canSales())return toast('No tienes permiso para registrar devoluciones.');
    const sale=findSale(id);if(!sale)return;
    const remaining=getRemainingItems(sale);
    if(!remaining.length)return toast('Esta venta ya fue devuelta completamente.','ok');
    const d=ensureReturnDialog();
    activeReturnSaleId=String(sale.id||sale.date);
    d.querySelector('#vreturnSaleInfo').textContent='Venta del '+new Date(sale.date).toLocaleString('es-PE');
    const sel=d.querySelector('#vreturnItem');
    sel.innerHTML=remaining.map(x=>`<option value="${x.index}">${String(x.item.name||'Producto').replace(/[<>&]/g,'')} · quedan ${x.remaining}</option>`).join('');
    d.querySelector('#vreturnQty').value='1';
    syncReturnLimit(d);
    d.showModal();
  }

  async function submitReturn(e){
    e.preventDefault();
    const d=ensureReturnDialog(),sale=findSale(activeReturnSaleId);if(!sale)return;
    const index=Number(d.querySelector('#vreturnItem').value);
    const item=sale.items?.[index];if(!item)return;
    const sold=Math.max(0,Number(item.qty)||0),already=Math.max(0,Number(item.returnedQty)||0),remaining=Math.max(0,sold-already);
    const qty=Math.floor(Number(d.querySelector('#vreturnQty').value)||0);
    if(qty<1||qty>remaining)return toast('La cantidad a devolver debe estar entre 1 y '+remaining+'.');

    const p=getProducts().find(x=>String(x.id)===String(item.id))
      ||getProducts().find(x=>String(x.name||'').trim().toLowerCase()===String(item.name||'').trim().toLowerCase());
    if(!p)return toast('El producto ya no existe en el inventario.');

    let centralData=null;
    if(typeof window.vareliaCentralReturn==='function'&&sale.cloudSaleId&&item.cloudSaleItemId){
      try{
        centralData=await window.vareliaCentralReturn({saleId:sale.cloudSaleId,saleItemId:item.cloudSaleItemId,qty});
      }catch(err){console.error(err);return toast(err?.message||'No se pudo registrar la devolución.')}
    }else if(isStaff()){
      return toast('Esta venta es anterior a la sincronización central. El administrador debe registrar esta devolución.');
    }else{
      const before=Number(p.stock)||0;
      p.stock=before+qty;
      try{if(typeof syncProductToCloud==='function')await Promise.resolve(syncProductToCloud(p))}catch{}
    }

    if(centralData?.stock_after!=null)p.stock=Number(centralData.stock_after);
    item.returnedQty=already+qty;
    sale.returns=Array.isArray(sale.returns)?sale.returns:[];
    sale.returns.push({date:new Date().toISOString(),productId:p.id,name:p.name,qty});
    try{if(typeof save==='function')save()}catch{}
    d.close();
    toast('Devolución registrada y stock repuesto.','ok');
    setTimeout(refreshSalesButtons,80);
  }

  function refreshSalesButtons(){
    const list=$('salesList');if(!list||!canSales())return;
    const rows=[...list.querySelectorAll(':scope > .row')];
    const reversed=[...getSales()].reverse();
    rows.forEach((row,i)=>{
      const sale=reversed[i];if(!sale)return;
      const sid=String(sale.id||sale.date);
      const remaining=getRemainingItems(sale);
      let btn=row.querySelector('.vreturnBtn');
      if(remaining.length){
        if(!btn){
          btn=document.createElement('button');
          btn.type='button';btn.className='vreturnBtn';btn.textContent='↩ Devolver';
          row.appendChild(btn);
        }
        btn.onclick=()=>openReturn(sid);
      }else if(btn)btn.remove();

      const totalReturned=(sale.items||[]).reduce((n,x)=>n+(Number(x.returnedQty)||0),0);
      const meta=row.querySelector('.meta');
      if(meta&&totalReturned>0){
        let badge=meta.querySelector('.vreturnBadge');
        if(!badge){badge=document.createElement('span');badge.className='vreturnBadge';meta.appendChild(document.createElement('br'));meta.appendChild(badge)}
        badge.textContent='Devuelto: '+totalReturned+' unidad(es)';
      }
    });
  }

  const salesList=$('salesList');
  if(salesList)new MutationObserver(()=>queueMicrotask(refreshSalesButtons)).observe(salesList,{childList:true,subtree:true});

  let tries=0;
  const timer=setInterval(()=>{
    tries++;apply();refreshSalesButtons();
    if(tries>120)clearInterval(timer);
  },250);

  window.addEventListener('varelia:business-scope-ready',()=>setTimeout(()=>{apply();refreshSalesButtons()},150));
  window.addEventListener('pageshow',()=>setTimeout(()=>{apply();refreshSalesButtons()},150));
})();