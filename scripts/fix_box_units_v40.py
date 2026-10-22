from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: target not found')
    return text.replace(old, new, 1)

idx = Path('index.html')
h = idx.read_text(encoding='utf-8')

# 1) Add only the Caja-specific units field immediately after Unidad de medida.
pat = r'(<label><span>Unidad de medida</span><select id="unit">.*?</select></label>)'
field = r'''\1<label id="vUnitsPerBoxWrap" style="display:none"><span>Unidades por caja</span><input id="vUnitsPerBox" type="number" min="1" step="1" inputmode="numeric" placeholder="Ej.: 24"><small class="notice">Indica cuántas unidades contiene cada caja.</small></label>'''
h, n = re.subn(pat, field, h, count=1)
if n != 1:
    raise SystemExit('index: Unidad de medida field not found')

# 2) Caja-only visibility helper. Do not touch stock/pricing logic.
marker = '\n\nfunction switchView(n){'
helper = '''

function updateUnitsPerBoxUI(){
  const wrap=document.getElementById('vUnitsPerBoxWrap');
  const input=document.getElementById('vUnitsPerBox');
  if(!wrap||!input)return;
  const isBox=String(unit?.value||'').trim().toLowerCase()==='caja';
  wrap.style.display=isBox?'block':'none';
  input.required=isBox;
}
'''
if marker not in h:
    raise SystemExit('index: switchView marker not found')
h = h.replace(marker, helper + marker, 1)

# 3) Load saved units when editing a Caja.
h = replace_once(
    h,
    "  unit.value=p?.unit||'Unidad';\n  const qtyInput=document.getElementById('productQty');",
    "  unit.value=p?.unit||'Unidad';\n  const unitsPerBoxInput=document.getElementById('vUnitsPerBox');\n  if(unitsPerBoxInput)unitsPerBoxInput.value=(p?.unitsPerBox&&Number(p.unitsPerBox)>0)?Math.floor(Number(p.unitsPerBox)):'';\n  updateUnitsPerBoxUI();\n  const qtyInput=document.getElementById('productQty');",
    'index edit product load'
)

# 4) React only to unit selection changes.
h = replace_once(
    h,
    "unit?.addEventListener('change',updateProductQtyUI);",
    "unit?.addEventListener('change',()=>{updateProductQtyUI();updateUnitsPerBoxUI()});",
    'index unit change listener'
)

# 5) Save a dedicated unitsPerBox value without changing any other product fields.
h = replace_once(
    h,
    "unit:unit.value,reorderLevel:Math.max(0,Math.floor(+reorderLevel.value||0)),description:description.value,image:imagePreview.hidden?'':imagePreview.src,",
    "unit:unit.value,unitsPerBox:String(unit.value||'').trim().toLowerCase()==='caja'?Math.max(1,Math.floor(Number(document.getElementById('vUnitsPerBox')?.value)||1)):0,reorderLevel:Math.max(0,Math.floor(+reorderLevel.value||0)),description:description.value,image:imagePreview.hidden?'':imagePreview.src,",
    'index product save'
)

# Cache-bust only the touched sync module and build marker.
h = re.sub(r"central-stock-sync\.js\?v=[^\"']+", "central-stock-sync.js?v=20261022-box-units-v40", h, count=1)
h = re.sub(r"const BUILD='[^']+'", "const BUILD='20261022-BOX-UNITS-V40'", h, count=1)
idx.write_text(h, encoding='utf-8')

# 6) Persist the new value in its own Supabase column and restore it on cloud refresh.
p = Path('central-stock-sync.js')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    "      unit:String(p.unit||'Unidad'),\n      reorder_level:Math.max(0,Number(p.reorderLevel)||0),",
    "      unit:String(p.unit||'Unidad'),\n      units_per_box:String(p.unit||'').trim().toLowerCase()==='caja'?Math.max(1,Math.floor(Number(p.unitsPerBox)||1)):null,\n      reorder_level:Math.max(0,Number(p.reorderLevel)||0),",
    'sync payload units_per_box'
)
s = replace_once(
    s,
    "stock,unit,reorder_level,image_data",
    "stock,unit,units_per_box,reorder_level,image_data",
    'sync select units_per_box'
)
s = replace_once(
    s,
    "      unit:String(p.unit||'Unidad'),\n      reorderLevel:Number(p.reorder_level)||0,",
    "      unit:String(p.unit||'Unidad'),\n      unitsPerBox:Number(p.units_per_box)||0,\n      reorderLevel:Number(p.reorder_level)||0,",
    'sync map unitsPerBox'
)
p.write_text(s, encoding='utf-8')

print('BOX-UNITS-V40 patched')
