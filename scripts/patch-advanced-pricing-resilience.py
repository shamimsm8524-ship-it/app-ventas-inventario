from pathlib import Path

p=Path('advanced-pricing.js')
s=p.read_text(encoding='utf-8')

old="""        if(!p){if(tries<20)setTimeout(apply,100);return}\n        p.advancedPricing=pending.config?normalizeConfig(pending.config):null;\n        try{if(typeof save==='function')save();else if(typeof K!=='undefined')localStorage.setItem(K.products,JSON.stringify(ps))}catch{}\n        try{if(typeof window.vareliaSyncProduct==='function')await window.vareliaSyncProduct(p)}catch(err){console.error('Sincronización de precios por cantidad',err);toast('El producto se guardó, pero falta sincronizar los precios por cantidad. Toca la nube para reintentar.','warn')}\n        try{window.dispatchEvent(new CustomEvent('varelia:advanced-pricing-saved',{detail:{id:p.id}}))}catch{}\n"""
new="""        if(!p){\n          if(tries<120){setTimeout(apply,100);return}\n          toast('No se pudieron asociar los precios por cantidad al producto. Vuelve a abrirlo y revisa antes de vender.','warn');\n          return;\n        }\n        p.advancedPricing=pending.config?normalizeConfig(pending.config):null;\n        try{if(typeof save==='function')save();else if(typeof K!=='undefined')localStorage.setItem(K.products,JSON.stringify(ps))}catch{}\n        try{\n          if(typeof window.vareliaSyncProduct==='function'){\n            // El guardado normal del formulario puede tener un sync en curso. La primera\n            // espera deja terminar ese guardado y la segunda llamada persiste SIEMPRE\n            // advancedPricing ya incorporado, evitando que Supabase lo pierda por carrera.\n            await window.vareliaSyncProduct(p);\n            await new Promise(resolve=>setTimeout(resolve,180));\n            await window.vareliaSyncProduct(p);\n          }\n        }catch(err){console.error('Sincronización de precios por cantidad',err);toast('El producto se guardó, pero falta sincronizar los precios por cantidad. Toca la nube para reintentar.','warn')}\n        try{window.dispatchEvent(new CustomEvent('varelia:advanced-pricing-saved',{detail:{id:p.id}}))}catch{}\n"""
if old not in s:
    if new in s:
        print('Resilience patch already applied.')
    else:
        raise SystemExit('advanced-pricing save block not found')
else:
    s=s.replace(old,new,1)
    p.write_text(s,encoding='utf-8')
    print('Advanced pricing save resilience applied.')
