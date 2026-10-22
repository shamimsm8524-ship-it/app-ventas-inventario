from pathlib import Path
import re

idx=Path('index.html')
s=idx.read_text(encoding='utf-8')

# 1) Add a dedicated Edit button in Inventario without changing gear/delete behavior.
old_btn='<button class="btn secondary" data-alertcfg="${p.id}" style="padding:6px 9px">⚙️</button><button class="btn danger" data-deleteinv="${p.id}" style="padding:6px 9px">🗑️</button>'
new_btn='<button class="btn secondary" data-editinv="${p.id}" style="padding:6px 9px" title="Editar producto">✏️</button><button class="btn secondary" data-alertcfg="${p.id}" style="padding:6px 9px">⚙️</button><button class="btn danger" data-deleteinv="${p.id}" style="padding:6px 9px">🗑️</button>'
if old_btn not in s:
    raise SystemExit('inventory action buttons anchor not found')
s=s.replace(old_btn,new_btn,1)

old_handler="""  let a=e.target.closest('[data-alertcfg]');
  if(a){"""
new_handler="""  let edit=e.target.closest('[data-editinv]');
  if(edit){
    e.stopPropagation();
    e.preventDefault();
    openProduct(edit.dataset.editinv);
    return;
  }
  let a=e.target.closest('[data-alertcfg]');
  if(a){"""
if old_handler not in s:
    raise SystemExit('inventory click handler anchor not found')
s=s.replace(old_handler,new_handler,1)

# 2) Replace only the manual inventory movement handler.
start=s.find('applyInventory.onclick=async()=>{')
end=s.find('\nfunction openSupplier',start)
if start<0 or end<0:
    raise SystemExit('applyInventory handler not found')
new_apply=r'''applyInventory.onclick=async()=>{
  let p=products.find(x=>String(x.id).trim()===String(inventoryProductId).trim()),entered=Number(inventoryQty.value);
  if(!p){alert('Primero selecciona un producto del inventario.');return}
  if(!Number.isFinite(entered)||entered<=0){alert('Ingresa una cantidad válida mayor que 0.');return}
  let chosen=document.getElementById('inventoryMovementUnit')?.value||'auto';
  const baseRaw=String(p.unit||'Unidad').trim().toLowerCase();
  const base=baseRaw.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const unitsPerBox=Math.max(1,Math.floor(Number(p.unitsPerBox)||1));
  let q=entered,chosenLabel=chosen;
  const isKg=/^(kg|kilo|kilos|kilogramo|kilogramos)$/.test(base);
  const isGram=/^(g|gr|gramo|gramos)$/.test(base);
  const isBox=/^(caja|cajas|box)$/.test(base);
  const isBlister=/^(blister|blisters)$/.test(base);
  const isUnit=/^(unidad|unidades|unit)$/.test(base);
  if(chosen==='auto'){
    chosenLabel=p.unit||'Unidad';
  }else if(chosen==='g'){
    chosenLabel='g';
    if(isKg)q=entered/1000;
    else if(!isGram){alert('Este producto está configurado en '+(p.unit||'Unidad')+'. Cambia la unidad base del producto a kg para convertir gramos automáticamente.');return}
  }else if(chosen==='kg'){
    chosenLabel='kg';
    if(isGram)q=entered*1000;
    else if(!isKg){alert('Este producto está configurado en '+(p.unit||'Unidad')+'. Cambia la unidad base del producto a kg para registrar kilogramos.');return}
  }else if(chosen==='caja'){
    chosenLabel='caja';
    if(!isBox){alert('La unidad base del producto es '+(p.unit||'Unidad')+'. Para registrar cajas, edita el producto y selecciona Caja.');return}
  }else if(chosen==='unidad'){
    chosenLabel='unidad';
    if(isBox){
      if(unitsPerBox<=1){alert('Primero edita el producto y configura cuántas unidades trae cada caja.');return}
      q=entered/unitsPerBox;
    }else if(!isUnit){alert('La unidad base del producto es '+(p.unit||'Unidad')+'. Esta salida no se puede convertir automáticamente a unidades.');return}
  }else if(chosen==='blister'){
    chosenLabel='blíster';
    if(!isBlister){alert('La unidad base del producto es '+(p.unit||'Unidad')+'. Para registrar blísteres, configura el producto con esa unidad.');return}
  }
  let before=Number(p.stock)||0,type=inventoryMode.value==='add'?'add':'subtract';
  if(type==='subtract'&&q>before+1e-9){alert('No hay suficiente stock. Disponible: '+before+' '+(p.unit||'Unidad'));return}
  const after=Number((before+(type==='add'?q:-q)).toFixed(6));
  p.stock=after;
  addMovement(p,type,q,before,after,'Ajuste manual ('+entered+' '+chosenLabel+')');
  save();renderInvSelected();inventoryQty.value=1;
  window.vareliaSound?.(type==='add'?'add':'remove');
  window.vareliaToast?.((type==='add'?'Entrada':'Salida')+' registrada. Stock: '+p.stock+' '+(p.unit||'Unidad'),'ok');
  try{
    await Promise.resolve(syncProductToCloud(p));
    const sb=window.vareliaSupabase,cloudId=String(p._cloudId||'');
    if(sb&&cloudId){
      const res=await sb.from('varelia_products').update({stock:after}).eq('id',cloudId).select('stock').maybeSingle();
      if(res.error)throw res.error;
      if(res.data&&Number.isFinite(Number(res.data.stock))){p.stock=Number(res.data.stock);save();renderInvSelected()}
    }
    window.vareliaToast?.('Stock sincronizado.','ok');
  }catch(err){
    console.error(err);
    window.vareliaToast?.('El stock ya se actualizó aquí, pero falta sincronizarlo con la nube. Revisa tu conexión.','warn');
  }
};'''
s=s[:start]+new_apply+s[end:]

# 3) Local checkout must allow fractional Caja stock consumption created by presentations.
old_local="const stockQty=(Number(i.qty)||0)*Math.max(1,Number(i.medicineMultiplier||1));"
new_local="const stockQty=(Number(i.qty)||0)*Math.max(0.000001,Number(i.stockQtyPerSale??i.medicineMultiplier??1)||1);"
if old_local not in s:
    raise SystemExit('local stock deduction anchor not found')
s=s.replace(old_local,new_local,1)

# 4) Force new build and new advanced-pricing cache key only.
s=re.sub(r"const BUILD='[^']+'", "const BUILD='20261022-BOX-INVENTORY-SALE-V42'", s, count=1)
s=re.sub(r'advanced-pricing\.js\?v=[^"\']+', 'advanced-pricing.js?v=20261022-box-stock-v42', s, count=1)
idx.write_text(s,encoding='utf-8')

# 5) Patch only commercial stock math for Caja products.
ap=Path('advanced-pricing.js')
a=ap.read_text(encoding='utf-8')
old_reserved="  function reservedStock(id){return listCart().filter(i=>String(i.id)===String(id)).reduce((a,i)=>a+(Number(i.qty)||0)*Math.max(1,Number(i.salePresentationUnits||i.medicineMultiplier||1)),0)}"
new_reserved="""  function unitsPerBoxFor(p){const u=String(p?.unit||'').trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');return /^(caja|cajas|box)$/.test(u)?Math.max(1,Math.floor(Number(p?.unitsPerBox)||1)):1}
  function stockPerSale(p,mode,saleUnits){const upb=unitsPerBoxFor(p);if(upb>1){if(mode==='unit')return 1;return Math.max(0.000001,(Number(saleUnits)||1)/upb)}return Math.max(1,Number(saleUnits)||1)}
  function reservedStock(p){return listCart().filter(i=>String(i.id)===String(p?.id)).reduce((sum,i)=>sum+(Number(i.qty)||0)*Math.max(0.000001,Number(i.stockQtyPerSale)||stockPerSale(p,String(i.pricingMode||i.advancedPricingMode||'unit'),Number(i.salePresentationUnits||i.medicineMultiplier||1))),0)}"""
if old_reserved not in a:
    raise SystemExit('reservedStock anchor not found')
a=a.replace(old_reserved,new_reserved,1)
a=a.replace('reservedStock(p.id)','reservedStock(p)')

old_needed="const needed=n*r.units,reserved=reservedStock(p),stockOk=needed+reserved<=Number(p.stock||0)"
new_needed="const perSaleStock=stockPerSale(p,r.mode,r.units),needed=n*perSaleStock,reserved=reservedStock(p),stockOk=needed+reserved<=Number(p.stock||0)"
if old_needed not in a:
    raise SystemExit('picker needed stock anchor not found')
a=a.replace(old_needed,new_needed,1)

old_extra="const extraStock=n*r.units;if(beforeReserved+extraStock>Number(p.stock||0))return draw();"
new_extra="const perSaleStock=stockPerSale(p,r.mode,r.units),extraStock=n*perSaleStock;if(beforeReserved+extraStock>Number(p.stock||0))return draw();"
if old_extra not in a:
    raise SystemExit('picker extra stock anchor not found')
a=a.replace(old_extra,new_extra,1)

# Put the exact stock multiplier on cart lines, leaving presentation metadata intact.
a=a.replace("item.salePresentationUnits=r.units;item.medicineMultiplier=r.units;", "item.salePresentationUnits=r.units;item.stockQtyPerSale=perSaleStock;item.medicineMultiplier=r.units;",1)
a=a.replace("salePresentationUnits:r.units,advancedServerSaleUnit:'',baseUnit:p.unit||'Unidad'", "salePresentationUnits:r.units,stockQtyPerSale:perSaleStock,advancedServerSaleUnit:'',baseUnit:p.unit||'Unidad'",1)

# Clarify labels for box-based products; this is display-only.
a=a.replace("`<div class=\"meta\" style=\"margin-top:6px\">📦 1 ${esc(r.label)} = ${r.units} ${esc(p.unit||'unidades')}</div>`", "`<div class=\"meta\" style=\"margin-top:6px\">📦 1 ${esc(r.label)} = ${r.units} ${esc(unitsPerBoxFor(p)>1?'unidades':(p.unit||'unidades'))}</div>`",1)

ap.write_text(a,encoding='utf-8')
print('BOX-INVENTORY-SALE-V42 applied')
