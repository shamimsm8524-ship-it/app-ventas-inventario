from pathlib import Path
import re

files = [Path('index.html'), Path('index-1.html')]
pattern = re.compile(
    r"    if\(!hasChars&&!continuousUnit&&!commercial\)\{.*?\n      return;\n    \}\n    openSale\(false\);\n    addToCart\(p\);\n    return;",
    re.S,
)
replacement = """    if(!hasChars&&!continuousUnit&&!commercial){
      // Producto simple: debe quedar visible en Nueva venta inmediatamente.
      // Se asegura antes y después de abrir el modal porque otros módulos pueden
      // refrescar el carrito durante los primeros milisegundos de la apertura.
      const saleProductId=String(p.id).trim();
      const ensureSaleProduct=()=>{
        try{
          const liveProduct=products.find(x=>String(x.id).trim()===saleProductId)||p;
          const alreadyInCart=Array.isArray(cart)&&cart.some(x=>String(x.id).trim()===saleProductId);
          if(!alreadyInCart)addToCart(liveProduct);
          try{persistSaleCart()}catch{}
          try{renderCart()}catch{}
        }catch(err){
          console.error('Varelia sale product ensure failed',err);
        }
      };
      ensureSaleProduct();
      openSale(false);
      [0,80,220,500,900].forEach(ms=>setTimeout(ensureSaleProduct,ms));
      return;
    }
    openSale(false);
    addToCart(p);
    return;"""

changed = 0
for path in files:
    if not path.exists():
        continue
    s = path.read_text(encoding='utf-8')
    if 'Varelia sale product ensure failed' in s:
        print(path, 'already patched')
        continue
    s2, n = pattern.subn(replacement, s, count=1)
    if n:
        s2 = s2.replace("const BUILD='20261022-SALE-BUTTON-V31'", "const BUILD='20261022-SALE-CART-V32'", 1)
        path.write_text(s2, encoding='utf-8')
        changed += 1
        print(path, 'patched')
    else:
        print(path, 'target block not found')

if changed == 0:
    raise SystemExit('No sale product block was patched')

check = Path('index.html').read_text(encoding='utf-8')
required = [
    'Varelia sale product ensure failed',
    '[0,80,220,500,900].forEach',
    "const BUILD='20261022-SALE-CART-V32'",
]
for item in required:
    if item not in check:
        raise SystemExit('Validation failed: ' + item)
print('sale cart V32 validation OK; files changed:', changed)
