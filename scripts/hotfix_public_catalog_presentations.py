from pathlib import Path


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

# Desktop/laptop only: keep the dynamic logo, business name and slogan together
# as one compact brand block. Mobile styles remain untouched.
desktop_brand_style = '''<style id="varelia-desktop-brand-v86">
@media (min-width:760px){
  .hero{
    display:grid;
    grid-template-columns:96px minmax(0,1fr) auto;
    grid-template-rows:auto auto;
    column-gap:22px;
    row-gap:3px;
    align-items:center;
    padding:30px max(34px,calc((100vw - 1100px)/2)) 78px;
  }
  .hero .top{display:contents}
  .hero .top>b{
    grid-column:1;
    grid-row:1/3;
    width:96px;
    height:96px;
    display:flex;
    align-items:center;
    justify-content:center;
    align-self:center;
    overflow:hidden;
    border-radius:18px;
    background:#ffffff12;
    font-size:30px;
    line-height:1;
  }
  .hero .top>b img{
    width:96px!important;
    height:96px!important;
    max-width:none!important;
    max-height:none!important;
    object-fit:contain!important;
    border-radius:16px!important;
  }
  .hero .top>div{
    grid-column:3;
    grid-row:1;
    display:flex;
    gap:8px;
    justify-self:end;
    align-self:start;
  }
  .hero h1#business{
    grid-column:2;
    grid-row:1;
    margin:0!important;
    align-self:end;
    font-size:42px;
    line-height:1.06;
    letter-spacing:-1px;
  }
  #heroSlogan{
    grid-column:2;
    grid-row:2;
    margin:3px 0 0!important;
    max-width:720px;
    font-size:20px!important;
    line-height:1.3!important;
    font-weight:700!important;
  }
  .hero>div:last-child{
    grid-column:2;
    grid-row:2;
    margin:3px 0 0;
    color:#e5e7eb;
  }
}
</style>'''
if 'id="varelia-desktop-brand-v86"' not in h:
    h = h.replace('</head>', desktop_brand_style + '</head>', 1)

p.write_text(h, encoding='utf-8')

p = Path('catalogo/milagros/index.html')
r = p.read_text(encoding='utf-8')
r = r.replace('catalogo-v2.html?v=20261021-presentations-v84', 'catalogo-v2.html?v=20261022-desktop-brand-v86')
r = r.replace('catalogo-v2.html?v=20261021-presentations-v85', 'catalogo-v2.html?v=20261022-desktop-brand-v86')
p.write_text(r, encoding='utf-8')

# The app sometimes publishes the direct ?c= link (exactly the URL visible in
# the laptop screenshot). Give that direct URL its own version parameter too,
# so opening "Ver catálogo" cannot reuse an older cached catalog document.
p = Path('public-catalog.js')
j = p.read_text(encoding='utf-8')
old_direct = "location.origin+'/catalogo/milagros/catalogo-v2.html?c='+encodeURIComponent(publicId)"
new_direct = "location.origin+'/catalogo/milagros/catalogo-v2.html?c='+encodeURIComponent(publicId)+'&_v=20261022-desktop-brand-v86'"
if old_direct in j and new_direct not in j:
    j = j.replace(old_direct, new_direct, 1)
p.write_text(j, encoding='utf-8')

print('public catalog presentation + desktop brand layout + direct-link cache patch applied')
