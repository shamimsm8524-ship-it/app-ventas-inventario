self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url=new URL(e.request.url);

  // Pedidos del catálogo: cargar siempre el módulo fresco y añadir el impresor
  // que clona exactamente el comprobante visible antes de cualquier formato nativo.
  if(url.origin===self.location.origin && url.pathname.endsWith('/catalog-orders.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        const fix=await fetch('/catalog-order-exact-print.js?v=20261016-exact-v3',{cache:'no-store'});
        const body=(await base.text())+(fix.ok?'\n;\n'+(await fix.text()):'');
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

  // Mantener la corrección existente de variantes talla/color/marca.
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
