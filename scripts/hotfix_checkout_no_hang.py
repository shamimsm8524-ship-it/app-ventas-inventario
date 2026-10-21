from pathlib import Path

# trigger checkout no-hang patch
p = Path('central-stock-sync.js')
s = p.read_text(encoding='utf-8')

replacements = [
("        const cloudId=await ensureCloudProductId(p);",
 "        const cloudId=await withTimeout(ensureCloudProductId(p),12000,'La sincronización del producto');"),
("""    saleBusy=true;
    const legacy=document.getElementById('checkout');
    const pos=document.getElementById('vposCheckout');
    if(legacy)legacy.disabled=true;if(pos)pos.disabled=true;

    try{""",
"""    saleBusy=true;
    const legacy=document.getElementById('checkout');
    const pos=document.getElementById('vposCheckout');
    const legacyLabel=legacy?.textContent||'';
    const posLabel=pos?.textContent||'💳 Cobrar venta';
    if(legacy)legacy.disabled=true;
    if(pos){pos.disabled=true;pos.textContent='⏳ Procesando cobro…';}
    toast('Procesando cobro…','ok');

    try{"""),
("""      const {data,error}=fiado
        ?await sb.rpc('varelia_commit_credit_sale',{p_items:payload,p_customer_name:client})
        :await sb.rpc('varelia_commit_sale',{p_items:payload,p_source:'Venta'});
      if(error)throw error;""",
"""      let data=null,error=null,commitTimer=null;
      const commitController=typeof AbortController!=='undefined'?new AbortController():null;
      try{
        const request=fiado
          ?sb.rpc('varelia_commit_credit_sale',{p_items:payload,p_customer_name:client})
          :sb.rpc('varelia_commit_sale',{p_items:payload,p_source:'Venta'});
        let result;
        if(commitController&&request&&typeof request.abortSignal==='function'){
          commitTimer=setTimeout(()=>commitController.abort(),15000);
          result=await request.abortSignal(commitController.signal);
        }else{
          result=await withTimeout(request,15000,'El cobro');
        }
        data=result?.data??null;
        error=result?.error??null;
      }catch(commitError){
        const msg=String(commitError?.message||commitError||'');
        if(commitError?.name==='AbortError'||/abort|no respondió/i.test(msg)){
          throw new Error('El cobro tardó demasiado y se detuvo para que Varelia no quede congelada. Revisa Historial antes de volver a cobrar para evitar duplicar la venta.');
        }
        throw commitError;
      }finally{
        if(commitTimer)clearTimeout(commitTimer);
      }
      if(error)throw error;"""),
("""    }finally{
      saleBusy=false;
      if(legacy)legacy.disabled=false;if(pos)pos.disabled=false;
    }""",
"""    }finally{
      saleBusy=false;
      if(legacy){legacy.disabled=false;if(legacyLabel)legacy.textContent=legacyLabel;}
      if(pos){pos.disabled=false;pos.textContent=posLabel||'💳 Cobrar venta';}
    }""")
]

for old,new in replacements:
    if old not in s:
        raise SystemExit('Pattern not found:\n'+old[:120])
    s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')

p=Path('index.html')
h=p.read_text(encoding='utf-8')
old='<script src="central-stock-sync.js?v=20261021-commercial-v19"></script>'
new='<script src="central-stock-sync.js?v=20261021-checkout-timeout-v20"></script>'
if old not in h:
    raise SystemExit('central-stock-sync cache tag not found')
p.write_text(h.replace(old,new,1),encoding='utf-8')
