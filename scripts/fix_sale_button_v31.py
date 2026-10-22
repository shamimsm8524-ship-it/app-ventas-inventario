from pathlib import Path

files = [Path('index.html'), Path('index-1.html')]
old = """    if(!hasChars&&!continuousUnit&&!commercial){
      addToCart(p);
      openSale(false);
      return;
    }
    openSale(false);
    addToCart(p);
    return;
"""
new = """    if(!hasChars&&!continuousUnit&&!commercial){
      // Abrir primero la venta y agregar el producto cuando el modal ya esté listo.
      // Esto evita que addToCart falle antes de que Nueva venta esté activa
      // y evita que una apertura tardía limpie el producto agregado.
      openSale(false);
      const saleProductId=String(p.id).trim();
      setTimeout(()=>{
        try{
          const liveProduct=products.find(x=>String(x.id).trim()===saleProductId)||p;
          addToCart(liveProduct);
          try{renderCart()}catch{}
        }catch(err){
          console.error('Varelia sale button add failed',err);
        }
      },120);
      return;
    }
    openSale(false);
    addToCart(p);
    return;
"""

changed = 0
for path in files:
    if not path.exists():
        continue
    s = path.read_text(encoding='utf-8')
    if old in s:
        s = s.replace(old, new, 1)
        if path.name == 'index.html':
            s = s.replace("const BUILD='20261022-UNIT-SALE-CLICK-V30'", "const BUILD='20261022-SALE-BUTTON-V31'", 1)
        path.write_text(s, encoding='utf-8')
        changed += 1
    elif 'Varelia sale button add failed' in s:
        print(path, 'already patched')
    else:
        print(path, 'expected block not found')

if changed == 0:
    raise SystemExit('No target sale block was patched')

check = Path('index.html').read_text(encoding='utf-8')
for required in ['Varelia sale button add failed', 'setTimeout(()=>{', '20261022-SALE-BUTTON-V31']:
    if required not in check:
        raise SystemExit('Validation failed: ' + required)

print('sale button V31 validation OK; files changed:', changed)
