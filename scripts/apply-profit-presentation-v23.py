from pathlib import Path
import re

p = Path('reports-profit.js')
s = p.read_text(encoding='utf-8')

old = """    const rawUnit=String(item.sale_unit??item.saleUnit??item.unit??match?.unit??'Unidad').trim().toLowerCase();
    const weighted=['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos'].includes(rawUnit);
    const unit=weighted?'kg':(rawUnit||'unidad');
    const saleQty=Number(item.qty??item.quantity??1);
    const stockQty=item.stock_qty??item.stockQty;
    const stockNumber=stockQty==null||stockQty===''?NaN:Number(stockQty);
    const qty=Number.isFinite(stockNumber)?stockNumber:((rawUnit==='g'||rawUnit==='gr'||rawUnit==='gramo'||rawUnit==='gramos')?saleQty/1000:saleQty);
"""
new = """    const rawUnit=String(item.sale_unit??item.saleUnit??item.unit??match?.unit??'Unidad').trim().toLowerCase();
    const weighted=['kg','kilo','kilos','kilogramo','kilogramos','g','gr','gramo','gramos'].includes(rawUnit);
    const unit=weighted?'kg':(rawUnit||'unidad');
    const saleQty=Number(item.qty??item.quantity??1);
    const stockQty=item.stock_qty??item.stockQty;
    const stockNumber=stockQty==null||stockQty===''?NaN:Number(stockQty);
    const presentationId=String(item.sale_presentation_id??item.salePresentationId??item.presentation_id??item.presentationId??'').trim();
    const presentationUnits=Number(item.sale_presentation_units??item.salePresentationUnits??item.presentation_units??item.presentationUnits??0)||0;
    const medicinePresentation=['caja','cajas','box','boxes','blister','blisters','blíster','blísteres','blisteres','pastilla','pastillas','pill','pills','tableta','tabletas'].includes(rawUnit);
    const presentationSale=!!presentationId||presentationUnits>1||medicinePresentation;
    // qty is the commercial quantity sold; stock_qty is inventory depletion.
    // Example: 1 Six Pack sold => qty 1, stock_qty 6.
    const qty=presentationSale?saleQty:(Number.isFinite(stockNumber)?stockNumber:((rawUnit==='g'||rawUnit==='gr'||rawUnit==='gramo'||rawUnit==='gramos')?saleQty/1000:saleQty));
    // buy_price_at_sale is the cost of the selected commercial presentation.
    const costQty=presentationSale?saleQty:qty;
"""
if old not in s:
    raise SystemExit('reports-profit: quantity block not found')
s = s.replace(old, new, 1)

old_return = "return {id:id||title.toLowerCase(),name:title,unit,qty,saleQty,buy,sell,subtotal,estimated:!saved};"
new_return = "return {id:id||title.toLowerCase(),name:title,unit,qty,costQty,saleQty,buy,sell,subtotal,estimated:!saved,presentationId,presentationUnits,presentationSale};"
if old_return not in s:
    raise SystemExit('reports-profit: gain item return not found')
s = s.replace(old_return, new_return, 1)

old_cost = """        if(!Number.isFinite(it.qty)||!Number.isFinite(it.buy)){missing++;p.missing++}
        else{
          const lineCost=it.qty*it.buy;
          cost+=lineCost;p.cost+=lineCost;
          p.buyWeighted+=lineCost;p.buyQty+=it.qty;
"""
new_cost = """        if(!Number.isFinite(it.costQty)||!Number.isFinite(it.buy)){missing++;p.missing++}
        else{
          const lineCost=it.costQty*it.buy;
          cost+=lineCost;p.cost+=lineCost;
          p.buyWeighted+=lineCost;p.buyQty+=it.costQty;
"""
if old_cost not in s:
    raise SystemExit('reports-profit: cost block not found')
s = s.replace(old_cost, new_cost, 1)

old_fields = "const details=await paginated('varelia_sale_items','sale_id,product_id,product_name,qty,stock_qty,sale_unit,unit_price,buy_price_at_sale');"
new_fields = "const details=await paginated('varelia_sale_items','sale_id,product_id,product_name,qty,stock_qty,sale_unit,unit_price,buy_price_at_sale,sale_presentation_id,sale_presentation_units');"
if old_fields not in s:
    raise SystemExit('reports-profit: cloud fields selector not found')
s = s.replace(old_fields, new_fields, 1)
p.write_text(s, encoding='utf-8')

idx = Path('index.html')
h = idx.read_text(encoding='utf-8')
h, n = re.subn(r"const BUILD='[^']+'", "const BUILD='20261021-PROFIT-PRESENTATIONS-V23'", h, count=1)
if n != 1:
    raise SystemExit('index: build marker not found')
h, n = re.subn(r'reports-profit\.js\?v=[^\"\']+', 'reports-profit.js?v=20261021-presentation-profit-v23', h, count=1)
if n != 1:
    raise SystemExit('index: reports-profit script marker not found')
idx.write_text(h, encoding='utf-8')

audit = Path('scripts/stability-audit.mjs')
a = audit.read_text(encoding='utf-8')
marker = "const profit=read('reports-profit.js');"
if marker in a and 'presentation profit accounting' not in a:
    a = a.replace(marker, marker + "\nif(!profit.includes('presentationSale')||!profit.includes('costQty')||!profit.includes('sale_presentation_id')) errors.push('reports-profit.js no distingue presentación vendida de unidades de stock para calcular ganancias.'); // presentation profit accounting", 1)
audit.write_text(a, encoding='utf-8')

# Regression case captured in production: one S/12 Six Pack containing six units.
sale_qty = 1
stock_qty = 6
buy = 12
sell = 12
presentation = True
shown_qty = sale_qty if presentation else stock_qty
cost_qty = sale_qty if presentation else stock_qty
assert shown_qty == 1
assert cost_qty * buy == 12
assert sale_qty * sell == 12
print('Six Pack regression OK: 1 pack, 6 stock units, revenue 12, cost 12, profit 0')
