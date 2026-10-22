from pathlib import Path
import re


# Public storefront: keep the existing presentation fixes, then build a
# completely fresh desktop catalog URL so browsers cannot reuse catalog-v2.
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

old_add = "function add(id){var p=product(id),cs=chars(p),kg=String(p.unit||'').toLowerCase()==='kg';if(isMedicine(p)){openMedicinePicker(p);return}if(cs.length||kg){openViewer(p);return}if(salePresentations(p).length){openPresentationPicker(p);return}var defaults=[];cart.push({lineId:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),id:String(id),qty:1,chars:defaults});draw()}"
new_add = "function add(id){var p=product(id),cs=chars(p),kg=String(p.unit||'').toLowerCase()==='kg';if(isMedicine(p)){openMedicinePicker(p);return}if(salePresentations(p).length){openPresentationPicker(p);return}if(cs.length||kg){openViewer(p);return}var defaults=[];cart.push({lineId:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),id:String(id),qty:1,chars:defaults});draw()}"
if old_add in h:
    h = h.replace(old_add, new_add, 1)

# Remove all previous desktop-brand attempts. v92 uses only deterministic CSS:
# the hero content line equals the seller card CONTENT line (card edge + 20px).
brand_pattern = re.compile(r'<style id="varelia-desktop-brand-v\d+">.*?</style>', re.S)
h = brand_pattern.sub('', h)
align_pattern = re.compile(r'<script id="varelia-desktop-brand-align-v\d+">.*?</script>', re.S)
h = align_pattern.sub('', h)

desktop_brand_style = '''<style id="varelia-desktop-brand-v92">
@media (min-width:760px){
  .hero{
    display:block!important;
    padding-top:28px!important;
    padding-bottom:64px!important;
    padding-left:max(20px,calc((100vw - 1100px)/2 + 20px))!important;
    padding-right:max(20px,calc((100vw - 1100px)/2 + 20px))!important;
  }
  .hero .top{
    display:flex!important;
    justify-content:space-between!important;
    align-items:flex-start!important;
  }
  .hero .top>b{
    width:110px!important;
    height:70px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-start!important;
    overflow:hidden!important;
    border-radius:14px!important;
    background:transparent!important;
    line-height:1!important;
  }
  .hero .top>b img{
    display:block!important;
    width:110px!important;
    height:70px!important;
    max-width:110px!important;
    max-height:70px!important;
    object-fit:contain!important;
    object-position:left center!important;
    border-radius:14px!important;
  }
  .hero .top>div{
    display:flex!important;
    gap:8px!important;
  }
  .hero h1#business{
    margin:14px 0 5px!important;
    font-size:38px!important;
    line-height:1.08!important;
    letter-spacing:-1px!important;
  }
  #heroSlogan{
    margin:0!important;
    max-width:720px!important;
    font-size:21px!important;
    line-height:1.25!important;
    font-weight:800!important;
  }
  .hero>div:last-child{
    margin:0!important;
  }
}
</style>'''
h = h.replace('</head>', desktop_brand_style + '</head>', 1)

# Keep the old route corrected too, but publish an entirely new file path.
p.write_text(h, encoding='utf-8')
Path('catalogo/milagros/catalogo-v92.html').write_text(h, encoding='utf-8')

# Milagros entry page now opens the NEW physical file, not catalog-v2.
p = Path('catalogo/milagros/index.html')
r = p.read_text(encoding='utf-8')
r = re.sub(r'catalogo-v(?:2|92)\.html\?v=[^\"\']+', 'catalogo-v92.html?v=20261022-desktop-brand-v92', r)
p.write_text(r, encoding='utf-8')

# Varelia direct/fallback links also use the new physical file.
p = Path('public-catalog.js')
j = p.read_text(encoding='utf-8')
j = j.replace('/catalogo/milagros/catalogo-v2.html?c=', '/catalogo/milagros/catalogo-v92.html?c=')
j = j.replace('/catalogo/milagros/catalogo-v92.html?c='+"'", '/catalogo/milagros/catalogo-v92.html?c='+"'")
j = re.sub(r'&_v=20261022-desktop-brand-v\d+', '&_v=20261022-desktop-brand-v92', j)
p.write_text(j, encoding='utf-8')

# Existing /c/<slug> links redirect to the new physical file too.
p = Path('catalogo-enlace.html')
e = p.read_text(encoding='utf-8')
e = e.replace("new URL('/catalogo/milagros/catalogo-v2.html',location.origin)", "new URL('/catalogo/milagros/catalogo-v92.html',location.origin)")
e = e.replace("new URL('/catalogo/milagros/catalogo-v91.html',location.origin)", "new URL('/catalogo/milagros/catalogo-v92.html',location.origin)")
e = re.sub(r"target\.searchParams\.set\('_v','20261022-desktop-brand-v\d+'\)", "target.searchParams.set('_v','20261022-desktop-brand-v92')", e)
p.write_text(e, encoding='utf-8')

# Main app loads the refreshed public catalog link generator.
p = Path('index.html')
i = p.read_text(encoding='utf-8')
i = re.sub(r'public-catalog\.js\?v=[^\"\']+', 'public-catalog.js?v=20261022-desktop-brand-v92-fresh-file', i, count=1)
p.write_text(i, encoding='utf-8')

print('public catalog v92 fresh physical file + desktop brand alignment applied')