from pathlib import Path
import re


def replace_required(text, old, new, label):
    if old not in text:
        raise SystemExit(f'pattern not found: {label}')
    return text.replace(old, new, 1)

# Public storefront: make sale presentations visible from both the product card
# and the product image/detail entry point. Also force a fresh public URL.
p = Path('catalogo/milagros/catalogo-v2.html')
h = p.read_text(encoding='utf-8')

old_photo = "var ph=e.target.closest&&e.target.closest('.productPhoto');if(ph){openViewer(product(ph.dataset.id));return}"
new_photo = "var ph=e.target.closest&&e.target.closest('.productPhoto');if(ph){var photoProduct=product(ph.dataset.id);if(isMedicine(photoProduct)){openMedicinePicker(photoProduct);return}if(salePresentations(photoProduct).length){openPresentationPicker(photoProduct);return}openViewer(photoProduct);return}"
if old_photo in h:
    h = h.replace(old_photo, new_photo, 1)

old_card = "<small>'+esc(p.category||'Producto')+'</small>'+'<div class=\"buy\">"
new_card = "<small>'+esc(p.category||'Producto')+'</small>'+(salePresentations(p).length?'<div style=\"margin-top:6px;font-size:11px;font-weight:800;color:#475569\">📦 '+salePresentations(p).map(function(x){return esc(x.name)+' · '+x.units+' '+esc(String(p.unit||'unidades'))+' · '+money(x.price)}).join(' &nbsp; ')+'</div>':'')+'<div class=\"buy\">"
if old_card in h:
    h = h.replace(old_card, new_card, 1)

# Ensure the Add/Elegir action prioritizes a configured presentation for
# products without medicine flow. This keeps Six Pack/Docena/Cajón accessible.
old_add = "function add(id){var p=product(id),cs=chars(p),kg=String(p.unit||'').toLowerCase()==='kg';if(isMedicine(p)){openMedicinePicker(p);return}if(cs.length||kg){openViewer(p);return}if(salePresentations(p).length){openPresentationPicker(p);return}var defaults=[];cart.push({lineId:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),id:String(id),qty:1,chars:defaults});draw()}"
new_add = "function add(id){var p=product(id),cs=chars(p),kg=String(p.unit||'').toLowerCase()==='kg';if(isMedicine(p)){openMedicinePicker(p);return}if(salePresentations(p).length){openPresentationPicker(p);return}if(cs.length||kg){openViewer(p);return}var defaults=[];cart.push({lineId:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),id:String(id),qty:1,chars:defaults});draw()}"
if old_add in h:
    h = h.replace(old_add, new_add, 1)

# Laptop/desktop only: keep the existing stacked brand layout (logo, name,
# slogan), but align its left edge EXACTLY with the Contact content inside the
# white seller card. The seller card is max-width:1100px with 20px padding, so
# the matching left inset is ((viewport - 1100px)/2 + 20px) on wide screens and
# 20px on narrower laptop widths. Use 600px instead of 760px so browser zoom on
# a laptop cannot accidentally fall back to the mobile alignment.
desktop_brand_style = '''<style id="varelia-desktop-brand-v89">
@media (min-width:600px){
  .hero{
    display:block!important;
    padding-top:24px!important;
    padding-right:max(20px,calc((100vw - 1100px)/2 + 20px))!important;
    padding-bottom:64px!important;
    padding-left:max(20px,calc((100vw - 1100px)/2 + 20px))!important;
  }
  .hero .top{
    display:flex!important;
    justify-content:space-between!important;
    align-items:flex-start!important;
  }
  .hero .top>b{
    grid-column:auto!important;
    grid-row:auto!important;
    width:auto!important;
    height:auto!important;
    display:block!important;
    align-self:auto!important;
    overflow:visible!important;
    border-radius:0!important;
    background:transparent!important;
    font-size:inherit!important;
    line-height:normal!important;
  }
  .hero .top>b img{
    width:auto!important;
    height:auto!important;
    max-width:92px!important;
    max-height:56px!important;
    object-fit:contain!important;
    border-radius:12px!important;
  }
  .hero .top>div{
    grid-column:auto!important;
    grid-row:auto!important;
    display:flex!important;
    gap:8px!important;
    justify-self:auto!important;
    align-self:auto!important;
  }
  .hero h1#business{
    grid-column:auto!important;
    grid-row:auto!important;
    margin:38px 0 7px!important;
    align-self:auto!important;
    font-size:38px!important;
    line-height:1.08!important;
    letter-spacing:-1px!important;
  }
  #heroSlogan{
    grid-column:auto!important;
    grid-row:auto!important;
    margin:5px 0 8px!important;
    max-width:720px!important;
    font-size:21px!important;
    line-height:1.25!important;
    font-weight:800!important;
  }
  .hero>div:last-child{
    grid-column:auto!important;
    grid-row:auto!important;
    margin:0!important;
  }
}
</style>'''
brand_pattern = re.compile(r'<style id="varelia-desktop-brand-v(?:86|89)">.*?</style>', re.S)
if brand_pattern.search(h):
    h = brand_pattern.sub(desktop_brand_style, h, count=1)
else:
    h = h.replace('</head>', desktop_brand_style + '</head>', 1)

p.write_text(h, encoding='utf-8')

p = Path('catalogo/milagros/index.html')
r = p.read_text(encoding='utf-8')
r = r.replace('catalogo-v2.html?v=20261021-presentations-v84', 'catalogo-v2.html?v=20261022-desktop-brand-v89')
r = r.replace('catalogo-v2.html?v=20261021-presentations-v85', 'catalogo-v2.html?v=20261022-desktop-brand-v89')
r = r.replace('catalogo-v2.html?v=20261022-desktop-brand-v86', 'catalogo-v2.html?v=20261022-desktop-brand-v89')
p.write_text(r, encoding='utf-8')

# The app sometimes publishes the direct ?c= link. Force this alignment build
# so the laptop never reuses the earlier v86 document.
p = Path('public-catalog.js')
j = p.read_text(encoding='utf-8')
j = j.replace("&_v=20261022-desktop-brand-v86", "&_v=20261022-desktop-brand-v89")
old_direct = "location.origin+'/catalogo/milagros/catalogo-v2.html?c='+encodeURIComponent(publicId)"
new_direct = "location.origin+'/catalogo/milagros/catalogo-v2.html?c='+encodeURIComponent(publicId)+'&_v=20261022-desktop-brand-v89'"
if old_direct in j and new_direct not in j:
    j = j.replace(old_direct, new_direct, 1)
p.write_text(j, encoding='utf-8')

# Force the main Varelia app to load the corrected generator too.
p = Path('index.html')
i = p.read_text(encoding='utf-8')
i = i.replace('public-catalog.js?v=202610220105-presentations-v2', 'public-catalog.js?v=20261022-desktop-brand-v89-align-contact')
i = i.replace('public-catalog.js?v=20261022-desktop-brand-v86-linkfix', 'public-catalog.js?v=20261022-desktop-brand-v89-align-contact')
p.write_text(i, encoding='utf-8')

print('public catalog desktop brand aligned with contact card + cache patch applied')
