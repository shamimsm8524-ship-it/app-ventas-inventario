from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'pattern not found: {label}')
    return text.replace(old, new, 1)

# 1) Publish sale presentations with the public catalog payload.
p = Path('public-catalog.js')
s = p.read_text(encoding='utf-8')

s = replace_once(
    s,
    "p.characteristics||[],p.variantCombinations||[],!!p.medicine,p.blistersPerBox||0",
    "p.characteristics||[],p.variantCombinations||[],p.salePresentations||[],!!p.medicine,p.blistersPerBox||0",
    'public catalog signature presentations'
)

s = replace_once(
    s,
    "variantCombinations:Array.isArray(p.variantCombinations)?p.variantCombinations:[],medicine:!!p.medicine",
    "variantCombinations:Array.isArray(p.variantCombinations)?p.variantCombinations:[],salePresentations:(Array.isArray(p.salePresentations)?p.salePresentations:[]).map((x,i)=>({id:String(x?.id||('presentacion_'+(i+1))).trim(),name:String(x?.name||'').trim(),units:Math.max(0,Math.floor(Number(x?.units)||0)),price:Math.max(0,Number(x?.price)||0),active:x?.active!==false})).filter(x=>x.id&&x.name&&x.units>0&&x.price>0),medicine:!!p.medicine",
    'public catalog payload presentations'
)
p.write_text(s, encoding='utf-8')

# 2) Public storefront: fetch presentations, let customer choose Unit / Six Pack / etc,
# calculate presentation totals, preserve presentation metadata in the order and validate stock.
p = Path('catalogo/milagros/catalogo-v2.html')
h = p.read_text(encoding='utf-8')

h = replace_once(
    h,
    "unit_medicine_price&business_id=eq.'+encodeURIComponent(BID)",
    "unit_medicine_price,sale_presentations&business_id=eq.'+encodeURIComponent(BID)",
    'storefront select sale_presentations'
)

medicine_fn = "function isMedicine(p){return !!(p&&p.medicine)||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p&&p.category||'').trim())}"
presentation_helpers = r'''function isMedicine(p){return !!(p&&p.medicine)||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p&&p.category||'').trim())}
function salePresentations(p){var base=Math.max(0,Number(p&&p.sell_price)||0);return (Array.isArray(p&&p.sale_presentations)?p.sale_presentations:[]).map(function(x,i){var units=Math.max(1,Math.floor(Number(x&&x.units)||1)),raw=Math.max(0,Number(x&&x.price)||0),isUnitPrice=units>1&&raw>0&&base>0&&raw<=base,total=isUnitPrice?raw*units:raw,unitPrice=isUnitPrice?raw:(units?total/units:total);return{id:String(x&&x.id||('presentacion_'+(i+1))),name:String(x&&x.name||'Presentación'),units:units,price:Math.round(total*100)/100,unitPrice:Math.round(unitPrice*100)/100,active:!x||x.active!==false}}).filter(function(x){return x.active&&x.units>1&&x.price>0})}
function cartPrice(c,p){if(c&&c.presentationPrice!=null)return Math.max(0,Number(c.presentationPrice)||0);if(c&&c.medicinePrice!=null)return Math.max(0,Number(c.medicinePrice)||0);return Math.max(0,Number(p&&p.sell_price)||0)}
function cartStockUnits(c,p){if(!c)return 0;if(String(p&&p.unit||'').toLowerCase()==='kg')return Math.max(0,Number(c.qty)||0);return Math.max(0,Number(c.qty)||0)*Math.max(1,Number(c.presentationUnits||c.medicineMultiplier||1))}
function reservedStock(id,skip){var total=0;cart.forEach(function(c,i){if(i===skip||String(c.id)!==String(id))return;var p=product(c.id);total+=cartStockUnits(c,p)});return total}
function openPresentationPicker(p){var pres=salePresentations(p),basePrice=Math.max(0,Number(p.sell_price)||0),baseLabel=String(p.unit||'Unidad');var opts=[{id:'',name:baseLabel,units:1,price:basePrice,unitPrice:basePrice,isPresentation:false}].concat(pres.map(function(x){return{id:x.id,name:x.name,units:x.units,price:x.price,unitPrice:x.unitPrice,isPresentation:true}}));$('viewerContent').innerHTML='<div style="clear:both;padding-top:8px"><h2 style="margin:8px 0 5px">'+esc(p.name)+'</h2><div class="note" style="margin-bottom:12px">Elige cómo deseas comprarlo</div><div style="padding:11px 12px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:12px">Stock disponible: <b>'+Number(p.stock||0)+' '+esc(baseLabel)+'</b></div><label style="display:block;margin:12px 0"><b>Cantidad</b><input id="presentationQty" type="number" min="1" step="1" value="1" style="width:100%;margin-top:6px;padding:12px;border:1px solid var(--line);border-radius:10px"></label>'+opts.map(function(o){return '<button type="button" class="presentationDirectAdd" data-pid="'+esc(o.id)+'" data-label="'+esc(o.name)+'" data-price="'+o.price+'" data-units="'+o.units+'" data-unit-price="'+o.unitPrice+'" style="display:flex;width:100%;justify-content:space-between;align-items:center;gap:12px;margin:9px 0;padding:15px;border:1px solid var(--b);border-radius:12px;background:#fff;color:var(--ink);font-weight:900;text-align:left"><span><b style="display:block">'+esc(o.name)+'</b><small style="display:block;margin-top:4px;color:#64748b;font-weight:700">'+(o.isPresentation?o.units+' '+esc(baseLabel)+' · '+money(o.unitPrice)+' por unidad':'1 '+esc(baseLabel))+'</small></span><span style="white-space:nowrap">'+money(o.price)+'</span></button>'}).join('')+'</div>';$('productViewer').classList.add('on');$('viewerContent').querySelectorAll('.presentationDirectAdd').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();var q=Math.max(1,Math.floor(Number($('presentationQty')&&$('presentationQty').value)||1)),units=Math.max(1,Number(btn.dataset.units)||1),price=Math.max(0,Number(btn.dataset.price)||0),needed=q*units,already=reservedStock(p.product_id);if(already+needed>Number(p.stock||0)){alert('No hay stock suficiente. Necesitas '+needed+' '+baseLabel+' para esta presentación.');return}var pid=String(btn.dataset.pid||''),label=String(btn.dataset.label||baseLabel),isPres=!!pid;cart.push({lineId:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),id:String(p.product_id),qty:q,chars:[],presentationId:pid,presentationLabel:isPres?label:'',presentationUnits:isPres?units:1,presentationPrice:price,presentationUnitPrice:Number(btn.dataset.unitPrice)||price,salePresentationId:pid,salePresentationUnits:isPres?units:1});draw();$('productViewer').classList.remove('on')}})}'''
h = replace_once(h, medicine_fn, presentation_helpers, 'storefront presentation helper block')

h = replace_once(
    h,
    "(isMedicine(p)?'Elegir':'Añadir')",
    "((isMedicine(p)||salePresentations(p).length)?'Elegir':'Añadir')",
    'storefront choose button label'
)

old_add = "function add(id){var p=product(id),cs=chars(p),kg=String(p.unit||'').toLowerCase()==='kg';if(isMedicine(p)){openMedicinePicker(p);return}if(cs.length||kg){openViewer(p);return}var defaults=[];cart.push({lineId:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),id:String(id),qty:1,chars:defaults});draw()}"
new_add = "function add(id){var p=product(id),cs=chars(p),kg=String(p.unit||'').toLowerCase()==='kg';if(isMedicine(p)){openMedicinePicker(p);return}if(cs.length||kg){openViewer(p);return}if(salePresentations(p).length){openPresentationPicker(p);return}var defaults=[];cart.push({lineId:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),id:String(id),qty:1,chars:defaults});draw()}"
h = replace_once(h, old_add, new_add, 'storefront add presentation picker')

# All cart totals and line amounts use presentation price when present.
h = h.replace("Number(c.medicinePrice||p.sell_price||0)", "cartPrice(c,p)")
h = h.replace("money(c.medicinePrice||p.sell_price)", "money(cartPrice(c,p))")
h = replace_once(
    h,
    "(c.medicineLabel?' / '+c.medicineLabel:(kg?' / kg':' c/u'))",
    "(c.presentationLabel?' / '+c.presentationLabel+' · '+Number(c.presentationUnits||1)+' '+String(p.unit||'unidades'):(c.medicineLabel?' / '+c.medicineLabel:(kg?' / kg':' c/u')))",
    'storefront presentation cart label'
)

old_plus = "if(plus){var pi=+plus.dataset.i,pp=product(cart[pi].id);cart[pi].qty+=String(pp.unit||'').toLowerCase()==='kg'?.1:1;cart[pi].qty=Math.round(cart[pi].qty*1000)/1000;draw();return}"
new_plus = "if(plus){var pi=+plus.dataset.i,pp=product(cart[pi].id),kgp=String(pp.unit||'').toLowerCase()==='kg',step=kgp?.1:1,next=Math.round((Number(cart[pi].qty||0)+step)*1000)/1000,mult=Math.max(1,Number(cart[pi].presentationUnits||cart[pi].medicineMultiplier||1));if(!kgp&&reservedStock(pp.product_id,pi)+next*mult>Number(pp.stock||0)){alert('No hay stock suficiente.');return}cart[pi].qty=next;draw();return}"
h = replace_once(h, old_plus, new_plus, 'storefront plus stock validation')

old_receipt = "var unit=c.medicineSaleUnit||String(p.unit||'unidad').toLowerCase(),price=Number(c.medicinePrice!=null?c.medicinePrice:p.sell_price||0);return{n:p.name,v:v,q:c.qty,u:price,t:Math.round(c.qty*price*100)/100,product_id:p.product_id,unit:unit,medicine_multiplier:c.medicineMultiplier||null}"
new_receipt = "var unit=c.presentationLabel||c.medicineSaleUnit||String(p.unit||'unidad').toLowerCase(),price=cartPrice(c,p);return{n:p.name,v:v,q:c.qty,u:price,t:Math.round(c.qty*price*100)/100,product_id:p.product_id,unit:unit,medicine_multiplier:c.medicineMultiplier||null,presentation_id:c.presentationId||null,presentation_name:c.presentationLabel||null,presentation_units:c.presentationUnits||null,presentation_unit_price:c.presentationUnitPrice||null,stock_multiplier:c.presentationUnits||c.medicineMultiplier||1}"
h = replace_once(h, old_receipt, new_receipt, 'storefront receipt presentation metadata')

old_order_items = "var orderItems=d.lines.map(function(x){return{name:x.n,product_id:x.product_id,characteristics:x.v,qty:x.q,unit:x.unit,sale_unit:x.unit,medicine_multiplier:x.medicine_multiplier,unit_price:Number(x.u),subtotal:Number(x.t)}});"
new_order_items = "var orderItems=d.lines.map(function(x){return{name:x.n,product_id:x.product_id,characteristics:x.v,qty:x.q,unit:x.unit,sale_unit:x.unit,medicine_multiplier:x.medicine_multiplier,presentation_id:x.presentation_id,presentation_name:x.presentation_name,presentation_units:x.presentation_units,presentation_unit_price:x.presentation_unit_price,stock_multiplier:x.stock_multiplier,unit_price:Number(x.u),subtotal:Number(x.t)}});"
h = replace_once(h, old_order_items, new_order_items, 'storefront order presentation metadata')

p.write_text(h, encoding='utf-8')

# 3) Admin confirmation must subtract the base-unit stock represented by the presentation.
p = Path('catalog-orders-admin.js')
a = p.read_text(encoding='utf-8')
a = replace_once(
    a,
    "function items(v){if(!Array.isArray(v))return'';return v.map(x=>'<div style=\"padding:7px 0;border-top:1px dashed var(--line)\"><b>'+esc(x.name||'Producto')+'</b>'+(Array.isArray(x.characteristics)&&x.characteristics.length?'<div class=\"notice\">'+x.characteristics.map(esc).join(' · ')+'</div>':'')+'<div>'+Number(x.qty||0)+' × '+money(x.unit_price)+' = <b>'+money(x.subtotal)+'</b></div></div>').join('')}",
    "function items(v){if(!Array.isArray(v))return'';return v.map(x=>'<div style=\"padding:7px 0;border-top:1px dashed var(--line)\"><b>'+esc(x.name||'Producto')+'</b>'+(x.presentation_name?'<div class=\"notice\">📦 '+esc(x.presentation_name)+' · '+Number(x.presentation_units||1)+' unidades</div>':'')+(Array.isArray(x.characteristics)&&x.characteristics.length?'<div class=\"notice\">'+x.characteristics.map(esc).join(' · ')+'</div>':'')+'<div>'+Number(x.qty||0)+' × '+money(x.unit_price)+' = <b>'+money(x.subtotal)+'</b></div></div>').join('')}",
    'admin presentation order display'
)
a = replace_once(
    a,
    "const qty=Math.max(0,Number(it.qty)||0);",
    "const multiplier=Math.max(1,Number(it.presentation_units||it.stock_multiplier||it.medicine_multiplier)||1);\n   const qty=Math.max(0,Number(it.qty)||0)*multiplier;",
    'admin presentation stock multiplier'
)
p.write_text(a, encoding='utf-8')

# 4) Cache-bust both the app-side catalog publisher and the public catalog redirect.
p = Path('index.html')
i = p.read_text(encoding='utf-8')
i = replace_once(i, 'public-catalog.js?v=20261006-short-links-v1', 'public-catalog.js?v=20261021-presentations-v2', 'publisher cache tag')
p.write_text(i, encoding='utf-8')

p = Path('catalogo/milagros/index.html')
r = p.read_text(encoding='utf-8')
r = r.replace('catalogo-v2.html?v=20261013-public-receipt-png-v83', 'catalogo-v2.html?v=20261021-presentations-v84')
p.write_text(r, encoding='utf-8')

print('public catalog presentations patch applied')
