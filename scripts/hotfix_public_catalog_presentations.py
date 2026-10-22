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

# Laptop/desktop: preserve the stacked layout from the APK-style storefront.
# The actual horizontal alignment is measured at runtime from the white seller
# card below, so browser zoom and laptop viewport size cannot desynchronize it.
desktop_brand_style = '''<style id="varelia-desktop-brand-v90">
@media (min-width:560px){
  .hero{
    display:block!important;
    padding-top:24px!important;
    padding-bottom:64px!important;
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
brand_pattern = re.compile(r'<style id="varelia-desktop-brand-v(?:86|89|90)">.*?</style>', re.S)
if brand_pattern.search(h):
    h = brand_pattern.sub(desktop_brand_style, h, count=1)
else:
    h = h.replace('</head>', desktop_brand_style + '</head>', 1)

# Measure the real Contact card position instead of estimating it with vw math.
# This is the important v90 fix: logo, name and slogan inherit the exact same
# left content edge as CONTACTO at any desktop zoom level.
desktop_brand_align = '''<script id="varelia-desktop-brand-align-v90">
(function(){
  function alignBrand(){
    if(window.innerWidth<560)return;
    var hero=document.querySelector('.hero');
    var seller=document.querySelector('.seller');
    if(!hero||!seller)return;
    var rect=seller.getBoundingClientRect();
    var css=getComputedStyle(seller);
    var padL=parseFloat(css.paddingLeft)||0;
    var padR=parseFloat(css.paddingRight)||0;
    var left=Math.max(20,Math.round(rect.left+padL));
    var right=Math.max(20,Math.round((window.innerWidth-rect.right)+padR));
    hero.style.setProperty('padding-left',left+'px','important');
    hero.style.setProperty('padding-right',right+'px','important');
  }
  function run(){alignBrand();requestAnimationFrame(alignBrand);setTimeout(alignBrand,80);setTimeout(alignBrand,500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('resize',alignBrand,{passive:true});
  window.addEventListener('pageshow',run);
})();
</script>'''
align_pattern = re.compile(r'<script id="varelia-desktop-brand-align-v\d+">.*?</script>', re.S)
if align_pattern.search(h):
    h = align_pattern.sub(desktop_brand_align, h, count=1)
else:
    h = h.replace('</body>', desktop_brand_align + '</body>', 1)

p.write_text(h, encoding='utf-8')

p = Path('catalogo/milagros/index.html')
r = p.read_text(encoding='utf-8')
for old in [
    'catalogo-v2.html?v=20261021-presentations-v84',
    'catalogo-v2.html?v=20261021-presentations-v85',
    'catalogo-v2.html?v=20261022-desktop-brand-v86',
    'catalogo-v2.html?v=20261022-desktop-brand-v89',
]:
    r = r.replace(old, 'catalogo-v2.html?v=20261022-desktop-brand-v90')
p.write_text(r, encoding='utf-8')

# Force direct catalog links to request the runtime-measured alignment build.
p = Path('public-catalog.js')
j = p.read_text(encoding='utf-8')
j = j.replace('&_v=20261022-desktop-brand-v86', '&_v=20261022-desktop-brand-v90')
j = j.replace('&_v=20261022-desktop-brand-v89', '&_v=20261022-desktop-brand-v90')
p.write_text(j, encoding='utf-8')

# Existing /c/<slug> shared links must also land on the same fresh build.
p = Path('catalogo-enlace.html')
e = p.read_text(encoding='utf-8')
e = e.replace("target.searchParams.set('_v','20261022-desktop-brand-v86')", "target.searchParams.set('_v','20261022-desktop-brand-v90')")
e = e.replace("target.searchParams.set('_v','20261022-desktop-brand-v89')", "target.searchParams.set('_v','20261022-desktop-brand-v90')")
p.write_text(e, encoding='utf-8')

# Force the main Varelia app to load the corrected link generator.
p = Path('index.html')
i = p.read_text(encoding='utf-8')
i = re.sub(r'public-catalog\.js\?v=[^\"\']+', 'public-catalog.js?v=20261022-desktop-brand-v90-measured', i, count=1)
p.write_text(i, encoding='utf-8')

print('public catalog v90 runtime alignment + fresh link patch applied')