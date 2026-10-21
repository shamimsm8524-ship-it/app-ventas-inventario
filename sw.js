// Varelia SW 20261021 ganancias-stable-v27
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
        const helper=await fetch('/button-color-vivid.js?v=20261020-stability-v8',{cache:'no-store'});
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
  // del producto. En ventas antiguas, el nombre del ítem ("· Pastilla", etc.)
  // tiene prioridad sobre sale_unit/unit porque esos campos podían quedar como Caja.
  if(url.origin===self.location.origin && url.pathname.endsWith('/reports-profit.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        let body=await base.text();

        // Pantalla principal de Reportes.
        const oldTop="const rawUnit=String(it.unit||it.saleUnit||it.unitType||it.measureUnit||it.measure||it.presentation||p?.unit||p?.saleUnit||p?.unitType||p?.measureUnit||p?.measure||p?.presentation||p?.unidad||p?.unidades||'').trim();";
        const newTop="const medicineNameUnit=(String(it.name||'').match(/(?:·|-)\\s*(caja|cajas|bl[ií]ster(?:es)?|pastilla|pastillas)\\s*$/i)||[])[1]||'';const medicineExplicit=it.medicineSaleUnit??it.medicine_sale_unit;const rawUnit=String((medicineExplicit!=null&&String(medicineExplicit).trim())?medicineExplicit:(medicineNameUnit||it.sale_unit||it.saleUnit||it.unit||it.unitType||it.measureUnit||it.measure||it.presentation||p?.unit||p?.saleUnit||p?.unitType||p?.measureUnit||p?.measure||p?.presentation||p?.unidad||p?.unidades||'')).trim();";
        if(body.includes(oldTop))body=body.replace(oldTop,newTop);

        // Modal móvil exacto mostrado por el usuario.
        const oldModal="const unitRaw=String(it.sale_unit??it.saleUnit??it.unit??matched?.unit??'Unidad').trim().toLowerCase();";
        const newModal="const medicineNameUnit=(String(it.name??it.productName??it.product_name??'').match(/(?:·|-)\\s*(caja|cajas|bl[ií]ster(?:es)?|pastilla|pastillas)\\s*$/i)||[])[1]||'';const medicineExplicit=it.medicineSaleUnit??it.medicine_sale_unit;const unitRaw=String((medicineExplicit!=null&&String(medicineExplicit).trim())?medicineExplicit:(medicineNameUnit||it.sale_unit||it.saleUnit||it.unit||matched?.unit||'Unidad')).trim().toLowerCase();";
        if(body.includes(oldModal))body=body.replace(oldModal,newModal);

        // En medicamentos, stock_qty es el descuento del inventario base (pastillas),
        // no la cantidad de presentaciones vendidas. El reporte debe usar qty.
        const oldQty="const quantity=(stock!==undefined&&stock!==null&&stock!==''&&Number.isFinite(Number(stock)))\n          ?Number(stock):(unitRaw==='g'||unitRaw==='gr'||unitRaw==='gramo'||unitRaw==='gramos'?qtyRaw/1000:qtyRaw);";
        const newQty="const medicinePresentation=['caja','cajas','box','boxes','blister','blisters','blíster','blísteres','blisteres','pastilla','pastillas','pill','pills','tableta','tabletas'].includes(unitRaw);const quantity=medicinePresentation?qtyRaw:((stock!==undefined&&stock!==null&&stock!==''&&Number.isFinite(Number(stock)))\n          ?Number(stock):(unitRaw==='g'||unitRaw==='gr'||unitRaw==='gramo'||unitRaw==='gramos'?qtyRaw/1000:qtyRaw));";
        if(body.includes(oldQty))body=body.replace(oldQty,newQty);

        // Ganancia por producto: usar la presentación real de medicina.
        const oldGainUnit="const rawUnit=String(item.sale_unit??item.saleUnit??item.unit??match?.unit??'Unidad').trim().toLowerCase();";
        const newGainUnit="const medicineNameUnit=(String(item.name??item.product_name??item.productName??'').match(/(?:·|-)\\s*(caja|cajas|bl[ií]ster(?:es)?|pastilla|pastillas)\\s*$/i)||[])[1]||'';const medicineExplicit=item.medicineSaleUnit??item.medicine_sale_unit;const rawUnit=String((medicineExplicit!=null&&String(medicineExplicit).trim())?medicineExplicit:(medicineNameUnit||item.sale_unit||item.saleUnit||item.unit||match?.unit||'Unidad')).trim().toLowerCase();";
        if(body.includes(oldGainUnit))body=body.replace(oldGainUnit,newGainUnit);

        // En Ganancias, stock_qty puede ser 10 pastillas por 1 blíster.
        // La cantidad vendida debe ser qty (presentaciones), no stock_qty.
        const oldGainQty="const qty=Number.isFinite(stockNumber)?stockNumber:((rawUnit==='g'||rawUnit==='gr'||rawUnit==='gramo'||rawUnit==='gramos')?saleQty/1000:saleQty);";
        const newGainQty="const medicineGainPresentation=['caja','cajas','box','boxes','blister','blisters','blíster','blísteres','blisteres','pastilla','pastillas','pill','pills','tableta','tabletas'].includes(rawUnit);const qty=medicineGainPresentation?saleQty:(Number.isFinite(stockNumber)?stockNumber:((rawUnit==='g'||rawUnit==='gr'||rawUnit==='gramo'||rawUnit==='gramos')?saleQty/1000:saleQty));";
        if(body.includes(oldGainQty))body=body.replace(oldGainQty,newGainQty);

        // El precio mostrado por presentación debe salir del importe realmente cobrado.
        // Ej.: 3 blísteres por S/30 => S/10 por blíster, no S/30.
        const oldGainSell="if(Number.isFinite(it.sell)&&Number.isFinite(it.saleQty)&&it.saleQty>0){\n          p.sellWeighted+=it.sell*it.saleQty;p.sellQty+=it.saleQty;\n          p.minSell=Math.min(p.minSell,it.sell);p.maxSell=Math.max(p.maxSell,it.sell);\n        }else {p.missing++;missing++}";
        const newGainSell="const effectiveSell=(Number.isFinite(lineRevenue)&&Number.isFinite(it.saleQty)&&it.saleQty>0)?lineRevenue/it.saleQty:it.sell;\n        if(Number.isFinite(effectiveSell)&&Number.isFinite(it.saleQty)&&it.saleQty>0){\n          p.sellWeighted+=effectiveSell*it.saleQty;p.sellQty+=it.saleQty;\n          p.minSell=Math.min(p.minSell,effectiveSell);p.maxSell=Math.max(p.maxSell,effectiveSell);\n        }else {p.missing++;missing++}";
        if(body.includes(oldGainSell))body=body.replace(oldGainSell,newGainSell);

        // Un mismo medicamento vendido como caja/blíster/pastilla debe mantenerse
        // separado por presentación dentro de "Productos más vendidos".
        const oldKey="const key=id||name.toLowerCase()+'|'+unit;";
        const newKey="const key=(id||name.toLowerCase())+'|'+unit;";
        if(body.includes(oldKey))body=body.replace(oldKey,newKey);

        // Ganancias v27: no borrar la venta local mientras perfil/Supabase terminan de cargar.
        // El arreglo local ya corresponde a la sesión activa de la aplicación y Reportes usa
        // la misma fuente. Antes se vaciaba si el perfil todavía no decía literalmente "owner".
        const oldLocalSales="const localSales=window.vareliaCurrentUserProfile?.role==='owner'?gainValidSales():[];";
        const newLocalSales="const localSales=gainValidSales();";
        if(body.includes(oldLocalSales))body=body.replace(oldLocalSales,newLocalSales);

        // Si Historial todavía está montando sus botones, reportHistoryFilter devuelve
        // known:false. No convertir ese instante transitorio en un cambio real de período.
        const oldMarker="if(marker!==panel.dataset.gainHistoryMarker){";
        const newMarker="if(selected.known&&marker!==panel.dataset.gainHistoryMarker){";
        if(body.includes(oldMarker))body=body.replace(oldMarker,newMarker);

        // Al abrir Ganancias, el período transitorio/desconocido debe empezar en Hoy,
        // no en Todo, para que luego no parezca que una venta desaparece.
        const oldActive="let activePeriod=selectedHistory.mode==='day'?'day':\n        selectedHistory.mode==='today'?'today':\n        selectedHistory.mode==='month'?'month':\n        selectedHistory.mode==='all'?'all':'today';";
        const newActive="let activePeriod=selectedHistory.known&&selectedHistory.mode==='day'?'day':\n        selectedHistory.mode==='today'?'today':\n        selectedHistory.mode==='month'?'month':\n        selectedHistory.known&&selectedHistory.mode==='all'?'all':'today';";
        if(body.includes(oldActive))body=body.replace(oldActive,newActive);

        // Y tampoco aceptar después un estado desconocido como si el usuario hubiera
        // elegido otro período. Solo sincronizar con Historial cuando su filtro sea real.
        const oldUseHistory="panel.__gainUseHistoryDate=(selected,date)=>{\n        if(selected.mode==='day'){";
        const newUseHistory="panel.__gainUseHistoryDate=(selected,date)=>{\n        if(!selected?.known)return;\n        if(selected.mode==='day'){";
        if(body.includes(oldUseHistory))body=body.replace(oldUseHistory,newUseHistory);

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
        const to="const medicineExplicit=String(it?.medicineSaleUnit??it?.medicine_sale_unit??'').trim(); const medicineNameUnit=(String(it?.name??'').match(/(?:·|-)\\s*(caja|cajas|bl[ií]ster(?:es)?|pastilla|pastillas)\\s*$/i)||[])[1]||''; const medicineUnitRaw=String(medicineExplicit||medicineNameUnit).trim().toLowerCase();";
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