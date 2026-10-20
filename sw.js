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

  // Reportes: las ventas antiguas de medicamentos pueden haber guardado
  // la presentación dentro del nombre ("Ampicilina · Pastilla") aunque el
  // campo unit siga siendo "Caja". Completar medicineSaleUnit desde ese nombre
  // antes de que el reporte calcule la cantidad y la unidad mostradas.
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