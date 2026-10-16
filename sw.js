self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url=new URL(e.request.url);

  // Varelia 1.0.50 solo acepta un campo "customer" para la impresion nativa.
  // Ajustar el modulo al vuelo para que Cliente, Celular y Ciudad se envuelvan
  // visualmente en tres renglones sin cambiar la APK ni el resto del comprobante.
  if(url.origin===self.location.origin && url.pathname.endsWith('/catalog-orders.js')){
    e.respondWith((async()=>{
      try{
        const base=await fetch(e.request,{cache:'no-store'});
        if(!base.ok)return base;
        let body=await base.text();
        const customerLine=/const customer=\[String\(o\.customer_name\|\|''\),o\.customer_phone\?'Celular: '\+o\.customer_phone:'',o\.customer_city\?'Ciudad: '\+o\.customer_city:''\]\.filter\(Boolean\)\.join\([^;]+;/;
        const replacement="const nativeLinePad=text=>{const px=[...String(text||'')].length*6;const count=Math.max(1,Math.min(24,Math.ceil((205-px)/10)));return '\\u3000'.repeat(count)};const customerName=String(o.customer_name||'');const customerPhone=o.customer_phone?'Celular: '+String(o.customer_phone):'';const customerCity=o.customer_city?'Ciudad: '+String(o.customer_city):'';let customer=customerName;if(customerPhone)customer+=nativeLinePad(customerName)+customerPhone;if(customerCity)customer+=nativeLinePad(customerPhone||customerName)+customerCity;";
        body=body.replace(customerLine,replacement);
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

  // Añadir únicamente la corrección de variantes al módulo que ya gestiona
  // talla/color/marca. El resto de archivos conserva exactamente el mismo flujo.
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
