from pathlib import Path
import re

p=Path('product-form-safety.js')
s=p.read_text(encoding='utf-8')
old=s
pattern=re.compile(r"  // Si una presentación de varias unidades quedó con un precio por unidad.*?\n  function pickerProduct\(\)\{", re.S)
replacement="""  // Los precios de las presentaciones son valores LITERALES escritos por el usuario.
  // Nunca multiplicarlos ni recalcularlos automáticamente según unidades, precio base
  // o precio mayorista. Si el usuario escribe 36, al volver a abrir debe seguir en 36.
  function repairPresentationTotals(p){
    return false;
  }
  function pickerProduct(){"""
s,n=pattern.subn(replacement,s,count=1)
if n!=1:
    raise SystemExit('repairPresentationTotals block not found')
s=s.replace("window.__VARELIA_PRODUCT_FORM_SAFETY_BUILD__='20261021-v23';","window.__VARELIA_PRODUCT_FORM_SAFETY_BUILD__='20261022-v24-price-literal';",1)
if s==old:
    raise SystemExit('no product-form-safety changes')
p.write_text(s,encoding='utf-8')

idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
h2=h.replace('product-form-safety.js?v=20261021-v23','product-form-safety.js?v=20261022-v24-price-literal',1)
h2=h2.replace("const BUILD='20261022-BOX-UNITS-V40'","const BUILD='20261022-PRESENTATION-PRICE-LITERAL-V41'",1)
if h2==h:
    raise SystemExit('index version anchors not found')
idx.write_text(h2,encoding='utf-8')
