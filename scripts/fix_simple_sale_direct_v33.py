from pathlib import Path
import re

files=[Path('index.html'),Path('index-1.html')]
pattern=re.compile(
    r"    if\(!hasChars&&!continuousUnit&&!commercial\)\{.*?\n      return;\n    \}\n    openSale\(false\);\n    addToCart\(p\);\n    return;",
    re.S,
)
replacement="""    if(!hasChars&&!continuousUnit&&!commercial){
      // Producto simple por unidad: NO pasar por addToCart porque otros módulos
      // pueden envolver esa función y desviar/cancelar el agregado. Aquí el botón
      // Vender escribe directamente en el carrito real de Nueva venta.
      const liveProduct=products.find(x=>String(x.id).trim()===String(p.id).trim())||p;
      const stock=Number(liveProduct.stock)||0;
      if(stock<=0){alert('Este producto no tiene stock disponible.');return;}
      const saleKey=String(liveProduct.id).trim();
      let line=cart.find(x=>String(x.cartKey||x.id).trim()===saleKey);
      if(line){
        if(Number(line.qty||0)+1>stock){alert('No hay más stock disponible para '+liveProduct.name);return;}
        line.qty=Number(line.qty||0)+1;
      }else{
        cart.push({
          id:liveProduct.id,
          cartKey:saleKey,
          name:liveProduct.name,
          baseName:liveProduct.name,
          selectionLabel:'',
          selectedCharacteristics:[],
          barcode:liveProduct.barcode||'',
          price:Number(liveProduct.sellPrice)||0,
          qty:1,
          unit:liveProduct.unit||'Unidad',
          medicineMultiplier:1,
          medicineSaleUnit:''
        });
      }
      try{persistSaleCart()}catch{}
      try{renderCart()}catch(err){console.error('Varelia direct sale render failed',err)}
      openSale(false);
      // Verificación final: si otra capa repinta el modal, reconstruir la fila desde
      // el mismo carrito sin volver a sumar cantidad.
      [80,250,600].forEach(ms=>setTimeout(()=>{try{renderCart()}catch{}},ms));
      return;
    }
    openSale(false);
    addToCart(p);
    return;"""

changed=0
for path in files:
    if not path.exists():
        continue
    s=path.read_text(encoding='utf-8')
    if 'Varelia direct sale render failed' in s:
        print(path,'already patched')
        continue
    s2,n=pattern.subn(replacement,s,count=1)
    if n:
        s2=s2.replace("const BUILD='20261022-SALE-CART-V32'","const BUILD='20261022-SIMPLE-SALE-DIRECT-V33'",1)
        path.write_text(s2,encoding='utf-8')
        changed+=1
        print(path,'patched')
    else:
        print(path,'target block not found')

if changed==0:
    raise SystemExit('No simple sale block was patched')

check=Path('index.html').read_text(encoding='utf-8')
for required in [
    'Varelia direct sale render failed',
    'cart.push({',
    "const BUILD='20261022-SIMPLE-SALE-DIRECT-V33'",
]:
    if required not in check:
        raise SystemExit('Validation failed: '+required)
print('simple sale direct V33 validation OK; files changed:',changed)
