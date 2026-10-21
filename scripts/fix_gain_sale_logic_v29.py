from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        if new in text:
            return
        raise SystemExit(f"{label}: anchor not found")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# Preserve the historical type-aware cost calculated by Supabase/RPC.
replace_once(
    "central-stock-sync.js",
    """          price:Number(remote.unit_price??item.price)||0,
          saleUnit:String(remote.sale_unit||item.saleUnit||item.unit||''),
""",
    """          price:Number(remote.unit_price??item.price)||0,
          buyPriceAtSale:(remote.buy_price_at_sale!=null&&remote.buy_price_at_sale!==''&&Number.isFinite(Number(remote.buy_price_at_sale)))
            ?Number(remote.buy_price_at_sale)
            :(item.buyPriceAtSale??item.buy_price_at_sale??item.costAtSale),
          saleUnit:String(remote.sale_unit||item.saleUnit||item.unit||''),
""",
    "central stock historical cost",
)

# Each sale type gets its own quantity and cost semantics in Ganancias.
replace_once(
    "reports-profit.js",
    """    const title=name||String(match?.name||'Producto');
    const rawUnit=String(item.sale_unit??item.saleUnit??item.unit??match?.unit??'Unidad').trim().toLowerCase();
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
    const rawBuy=item.buyPriceAtSale??item.buy_price_at_sale??item.buyPrice??item.buy_price??item.costAtSale??item.cost;
    const saved=rawBuy!=null&&rawBuy!==''&&Number.isFinite(Number(rawBuy));
    const current=match?.buyPrice??match?.buy_price;
    const buy=saved?Number(rawBuy):(current!=null&&current!==''&&Number.isFinite(Number(current))?Number(current):NaN);
    const rawPrice=item.unit_price??item.unitPrice??item.sellPrice??item.price??match?.sellPrice??match?.sell_price;
    const sell=rawPrice!=null&&rawPrice!==''&&Number.isFinite(Number(rawPrice))?Number(rawPrice):NaN;
    const rawSubtotal=item.subtotal??item.lineTotal??item.line_total;
    const subtotal=rawSubtotal!=null&&rawSubtotal!==''&&Number.isFinite(Number(rawSubtotal))?Number(rawSubtotal):saleQty*sell;
    return {id:id||title.toLowerCase(),name:title,unit,qty,costQty,saleQty,buy,sell,subtotal,estimated:!saved,presentationId,presentationUnits,presentationSale};
""",
    """    const title=name||String(match?.name||'Producto');
    const normalizeUnit=value=>String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
    const rawUnit=normalizeUnit(item.sale_unit??item.saleUnit??item.unit??match?.unit??'Unidad');
    const productUnit=normalizeUnit((match?.unit??item.product_unit??item.productUnit??rawUnit)||'unidad');
    const kgUnits=['kg','kilo','kilos','kilogramo','kilogramos'];
    const gramUnits=['g','gr','gramo','gramos'];
    const rawIsKg=kgUnits.includes(rawUnit),rawIsGram=gramUnits.includes(rawUnit);
    const productIsKg=kgUnits.includes(productUnit),productIsGram=gramUnits.includes(productUnit);
    const unit=productIsKg?'kg':productIsGram?'g':(rawIsKg?'kg':rawIsGram?'g':(rawUnit||'unidad'));
    const saleQty=Number(item.qty??item.quantity??1);
    const stockQty=item.stock_qty??item.stockQty;
    const stockNumber=stockQty==null||stockQty===''?NaN:Number(stockQty);
    const presentationId=String(item.sale_presentation_id??item.salePresentationId??item.presentation_id??item.presentationId??'').trim();
    const presentationUnits=Number(item.sale_presentation_units??item.salePresentationUnits??item.presentation_units??item.presentationUnits??0)||0;
    const medicinePresentation=['caja','cajas','box','boxes','blister','blisters','blisteres','pastilla','pastillas','pill','pills','tableta','tabletas'].includes(rawUnit);
    const presentationSale=!!presentationId||presentationUnits>1||medicinePresentation;

    // Cantidad visible en Ganancias: presentaciones para packs/cajas/blísteres,
    // peso real para kg/g y unidades reales para ventas unitarias.
    let qty;
    if(presentationSale)qty=saleQty;
    else if(Number.isFinite(stockNumber))qty=stockNumber;
    else if(rawIsGram&&productIsKg)qty=saleQty/1000;
    else qty=saleQty;

    const rawBuy=item.buyPriceAtSale??item.buy_price_at_sale??item.medicineBuyPriceAtSale??item.medicine_buy_price_at_sale??item.buyPrice??item.buy_price??item.costAtSale??item.cost;
    const saved=rawBuy!=null&&rawBuy!==''&&Number.isFinite(Number(rawBuy));
    const currentRaw=match?.buyPrice??match?.buy_price;
    const current=currentRaw!=null&&currentRaw!==''&&Number.isFinite(Number(currentRaw))?Number(currentRaw):NaN;
    let buy=saved?Number(rawBuy):NaN;
    let costQty=presentationSale?saleQty:qty;

    if(!saved){
      if(medicinePresentation){
        // Medicamentos: costo propio de caja, blíster o unidad.
        const medCost=(rawUnit==='caja'||rawUnit==='cajas'||rawUnit==='box'||rawUnit==='boxes')
          ?Number(match?.medicineBuyBoxPrice??match?.medicine_buy_box_price)
          :((rawUnit==='blister'||rawUnit==='blisters'||rawUnit==='blisteres')
            ?Number(match?.medicineBuyBlisterPrice??match?.medicine_buy_blister_price)
            :Number(match?.medicineBuyUnitPrice??match?.medicine_buy_unit_price));
        if(Number.isFinite(medCost)&&medCost>=0)buy=medCost;
        else if(Number.isFinite(current))buy=current;
        costQty=saleQty;
      }else if(presentationSale){
        // Six Pack, docena y otras presentaciones: costo base por unidad x unidades del pack.
        let units=presentationUnits;
        if(!(units>0)&&Number.isFinite(stockNumber)&&Number.isFinite(saleQty)&&saleQty>0)units=stockNumber/saleQty;
        if(Number.isFinite(current)&&units>0)buy=current*units;
        else if(Number.isFinite(current))buy=current;
        costQty=saleQty;
      }else{
        // Unidad, kg y g: costo por la unidad real de inventario x cantidad real vendida.
        buy=current;
        costQty=qty;
      }
    }

    const rawPrice=item.unit_price??item.unitPrice??item.sellPrice??item.price??match?.sellPrice??match?.sell_price;
    const sell=rawPrice!=null&&rawPrice!==''&&Number.isFinite(Number(rawPrice))?Number(rawPrice):NaN;
    const rawSubtotal=item.subtotal??item.lineTotal??item.line_total;
    const subtotal=rawSubtotal!=null&&rawSubtotal!==''&&Number.isFinite(Number(rawSubtotal))?Number(rawSubtotal):saleQty*sell;
    return {id:id||title.toLowerCase(),name:title,unit,qty,costQty,saleQty,buy,sell,subtotal,estimated:!saved,presentationId,presentationUnits,presentationSale};
""",
    "gain item type-aware logic",
)

replace_once(
    "reports-profit.js",
    """        if(Number.isFinite(it.sell)&&Number.isFinite(it.saleQty)&&it.saleQty>0){
          p.sellWeighted+=it.sell*it.saleQty;p.sellQty+=it.saleQty;
          p.minSell=Math.min(p.minSell,it.sell);p.maxSell=Math.max(p.maxSell,it.sell);
        }else {p.missing++;missing++}
""",
    """        // Mostrar precio de venta en la misma unidad que la cantidad reportada.
        const reportSell=Number.isFinite(lineRevenue)&&quantity>0
          ?lineRevenue/quantity
          :(Number.isFinite(it.subtotal)&&quantity>0?it.subtotal/quantity:it.sell);
        if(Number.isFinite(reportSell)&&quantity>0){
          p.sellWeighted+=reportSell*quantity;p.sellQty+=quantity;
          p.minSell=Math.min(p.minSell,reportSell);p.maxSell=Math.max(p.maxSell,reportSell);
        }else {p.missing++;missing++}
""",
    "sale price normalization",
)

# Fresh script/build version for APK/PWA.
idx = Path("index.html")
h = idx.read_text(encoding="utf-8")
h = h.replace("central-stock-sync.js?v=20261021-direct-cloud-checkout-v26", "central-stock-sync.js?v=20261021-sale-cost-v29")
h = h.replace("reports-profit.js?v=20261021-profit-sticky-v28", "reports-profit.js?v=20261021-sale-logic-v29")
h = h.replace("const BUILD='20261021-GAIN-STICKY-V28'", "const BUILD='20261021-SALE-LOGIC-V29'")
idx.write_text(h, encoding="utf-8")
