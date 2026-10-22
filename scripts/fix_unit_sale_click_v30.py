from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

old = """    if(med){addToCart(p);return}
    openSale(false);
    addToCart(p);
    return;
"""
new = """    if(med){addToCart(p);return}
    // Productos normales sin selector especial: agregarlos primero al carrito
    // y después abrir Nueva venta para evitar que el modal aparezca vacío.
    const hasChars=Array.isArray(p.characteristics)&&p.characteristics.length>0;
    const rawUnit=String(p.unit||'').trim().toLowerCase();
    const continuousUnit=['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos','l','litro','litros','ml','mililitro','mililitros','m','metro','metros','m2','m²'].includes(rawUnit);
    const commercial=!!(window.VareliaCommercialPresentations&&typeof window.VareliaCommercialPresentations.enabledFor==='function'&&window.VareliaCommercialPresentations.enabledFor(p));
    if(!hasChars&&!continuousUnit&&!commercial){
      addToCart(p);
      openSale(false);
      return;
    }
    openSale(false);
    addToCart(p);
    return;
"""

if old in text:
    text = text.replace(old, new, 1)
elif 'Productos normales sin selector especial: agregarlos primero al carrito' not in text:
    raise SystemExit('Expected sale click block not found; refusing unsafe patch')

old_build = "const BUILD='20261021-SALE-LOGIC-V29'"
if old_build in text:
    text = text.replace(old_build, "const BUILD='20261022-UNIT-SALE-CLICK-V30'", 1)

path.write_text(text, encoding='utf-8')

check = path.read_text(encoding='utf-8')
for required in (
    'if(!hasChars&&!continuousUnit&&!commercial)',
    'addToCart(p);\n      openSale(false);',
    'Productos normales sin selector especial: agregarlos primero al carrito',
):
    if required not in check:
        raise SystemExit('Validation failed: ' + required)

print('unit sale click validation OK')
