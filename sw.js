self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url=new URL(e.request.url);

  // Añadir únicamente la corrección de variantes al módulo que ya gestiona
  // talla/color/marca. El resto de archivos conserva exactamente el mismo flujo.
  if(url.origin===self.location.origin && url.pathname.endsWith('/characteristics.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        const guard=await fetch('/variant-stock-guard.js?v=20261015-v3',{cache:'no-store'});
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
