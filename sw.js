self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url=new URL(e.request.url);

  // Pedidos del catálogo: conservar el módulo original y añadir únicamente
  // el adaptador de impresión. Si la APK tiene printHtmlDocument se usa;
  // si no, abre el mismo comprobante en Android/Chrome y lanza impresión.
  if(url.origin===self.location.origin && url.pathname.endsWith('/catalog-orders.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        const helper=await fetch('/catalog-order-direct-print.js?v=20261016-android-external-v2',{cache:'no-store'});
        const body=(await base.text())+(helper.ok?'\n;\n'+(await helper.text()):'');
        return new Response(body,{
          status:base.status,
          statusText:base.statusText,
          headers:{
            'Content-Type':'application/javascript; charset=utf-8',
            'Cache-Control':'no-store, no-cache, must-revalidate'
          }
        });
      }catch(err){
        return fetch(e.request,{cache:'no-store'});
      }
    })());
    return;
  }

  // Apariencia: conservar toda la lógica existente y reforzar únicamente
  // el color seleccionado para que los botones no queden pálidos.
  if(url.origin===self.location.origin && url.pathname.endsWith('/premium-admin-open-fix.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        const helper=await fetch('/button-color-vivid.js?v=20261020-stability-v7',{cache:'no-store'});
        const body=(await base.text())+(helper.ok?'\n;\n'+(await helper.text()):'');
        return new Response(body,{
          status:base.status,
          statusText:base.statusText,
          headers:{
            'Content-Type':'application/javascript; charset=utf-8',
            'Cache-Control':'no-store, no-cache, must-revalidate'
          }
        });
      }catch(err){
        return fetch(e.request,{cache:'no-store'});
      }
    })());
    return;
  }

  // Reportes reales (modal "Total por medio de pago / Productos más vendidos").
  // Respetar la presentación elegida al vender medicamentos y no la unidad base
  // del producto. También reparar ventas antiguas cuyo nombre quedó como
  // "Ampicilina · Pastilla" pero cuyo campo unit todavía decía "Caja".
  if(url.origin===self.location.origin && url.pathname.endsWith('/reports-profit.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        let body=await base.text();

        // Pantalla principal de Reportes.
        const oldTop="const rawUnit=String(it.unit||it.saleUnit||it.unitType||it.measureUnit||it.measure||it.presentation||p?.unit||p?.saleUnit||p?.unitType||p?.measureUnit||p?.measure||p?.presentation||p?.unidad||p?.unidades||'').trim();";
        const newTop="const medicineNameUnit=(String(it.name||'').match(/(?:·|-)\\s*(caja|cajas|bl[ií]ster(?:es)?|pastilla|pastillas)\\s*$/i)||[])[1]||'';const medicineExplicit=it.medicineSaleUnit??it.medicine_sale_unit??it.sale_unit??it.saleUnit;const rawUnit=String((medicineExplicit!=null&&String(medicineExplicit).trim())?medicineExplicit:(medicineNameUnit||it.unit||it.unitType||it.measureUnit||it.measure||it.presentation||p?.unit||p?.saleUnit||p?.unitType||p?.measureUnit||p?.measure||p?.presentation||p?.unidad||p?.unidades||'')).trim();";
        if(body.includes(oldTop))body=body.replace(oldTop,newTop);

        // Modal móvil exacto mostrado por el usuario.
        const oldModal="const unitRaw=String(it.sale_unit??it.saleUnit??it.unit??matched?.unit??'Unidad').trim().toLowerCase();";
        const newModal="const medicineNameUnit=(String(it.name??it.productName??it.product_name??'').match(/(?:·|-)\\s*(caja|cajas|bl[ií]ster(?:es)?|pastilla|pastillas)\\s*$/i)||[])[1]||'';const medicineExplicit=it.medicineSaleUnit??it.medicine_sale_unit??it.sale_unit??it.saleUnit;const unitRaw=String((medicineExplicit!=null&&String(medicineExplicit).trim())?medicineExplicit:(medicineNameUnit||it.unit||matched?.unit||'Unidad')).trim().toLowerCase();";
        if(body.includes(oldModal))body=body.replace(oldModal,newModal);

        // En medicamentos, stock_qty es el descuento del inventario base (pastillas),
        // no la cantidad de presentaciones vendidas. El reporte debe usar qty.
        const oldQty="const quantity=(stock!==undefined&&stock!==null&&stock!==''&&Number.isFinite(Number(stock)))\n          ?Number(stock):(unitRaw==='g'||unitRaw==='gr'||unitRaw==='gramo'||unitRaw==='gramos'?qtyRaw/1000:qtyRaw);";
        const newQty="const medicinePresentation=['caja','cajas','box','boxes','blister','blisters','blíster','blísteres','blisteres','pastilla','pastillas','pill','pills','tableta','tabletas'].includes(unitRaw);const quantity=medicinePresentation?qtyRaw:((stock!==undefined&&stock!==null&&stock!==''&&Number.isFinite(Number(stock)))\n          ?Number(stock):(unitRaw==='g'||unitRaw==='gr'||unitRaw==='gramo'||unitRaw==='gramos'?qtyRaw/1000:qtyRaw));";
        if(body.includes(oldQty))body=body.replace(oldQty,newQty);

        return new Response(body,{
          status:base.status,
          statusText:base.statusText,
          headers:{
            'Content-Type':'application/javascript; charset=utf-8',
            'Cache-Control':'no-store, no-cache, must-revalidate'
          }
        });
      }catch(err){
        return fetch(e.request,{cache:'no-store'});
      }
    })());
    return;
  }

  // Respaldo de reportes antiguos construidos por sale-sound.js.
  if(url.origin===self.location.origin && url.pathname.endsWith('/sale-sound.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        let body=await base.text();
        const from="const medicineUnitRaw=String(it?.medicineSaleUnit??it?.medicine_sale_unit??'').trim().toLowerCase();";
        const to="const medicineNameUnit=(String(it?.name??'').match(/(?:·|-)\\s*(caja|cajas|bl[ií]ster(?:es)?|pastilla|pastillas)\\s*$/i)||[])[1]||''; const medicineUnitRaw=String(it?.medicineSaleUnit??it?.medicine_sale_unit??medicineNameUnit??'').trim().toLowerCase();";
        if(body.includes(from))body=body.replace(from,to);
        return new Response(body,{
          status:base.status,
          statusText:base.statusText,
          headers:{
            'Content-Type':'application/javascript; charset=utf-8',
            'Cache-Control':'no-store, no-cache, must-revalidate'
          }
        });
      }catch(err){
        return fetch(e.request,{cache:'no-store'});
      }
    })());
    return;
  }

  // Mantener únicamente la corrección existente de variantes talla/color/marca.
  if(url.origin===self.location.origin && url.pathname.endsWith('/characteristics.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        const guard=await fetch('/variant-stock-guard.js?v=20261015-v4',{cache:'no-store'});
        if(!guard.ok)return base;
        const body=(await base.text())+'\n;\n'+(await guard.text());
        return new Response(body,{
          status:base.status,
          statusText:base.statusText,
          headers:{
            'Content-Type':'application/javascript; charset=utf-8',
            'Cache-Control':'no-store, no-cache, must-revalidate'
          }
        });
      }catch(err){
        return fetch(e.request,{cache:'no-store'});
      }
    })());
    return;
  }

  e.respondWith(fetch(e.request,{cache:'no-store'}));
});