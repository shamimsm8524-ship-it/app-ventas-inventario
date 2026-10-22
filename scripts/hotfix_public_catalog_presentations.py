from pathlib import Path
import re


# Use the latest physical catalog as source so this correction is isolated
# from older cached catalog-v2/v92 files.
source = Path('catalogo/milagros/catalogo-v92.html')
if not source.exists():
    source = Path('catalogo/milagros/catalogo-v2.html')
h = source.read_text(encoding='utf-8')

# Preserve the sale-presentation fixes when the source is older.
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

# Remove every previous desktop-brand attempt.
brand_pattern = re.compile(r'<style id="varelia-desktop-brand-v\d+">.*?</style>', re.S)
h = brand_pattern.sub('', h)
align_pattern = re.compile(r'<script id="varelia-desktop-brand-align-v\d+">.*?</script>', re.S)
h = align_pattern.sub('', h)

# Desktop only: keep the logo at 110 px and the three brand elements stacked.
# Horizontal alignment is NOT estimated in CSS anymore; JS below aligns them
# to the real CONTACTO content column from the seller card.
desktop_brand_style = '''<style id="varelia-desktop-brand-v93">
@media (min-width:760px){
  .hero{
    display:block!important;
    padding:28px 20px 64px!important;
  }
  .hero .top{
    display:flex!important;
    justify-content:space-between!important;
    align-items:flex-start!important;
  }
  .hero .top>b{
    width:110px!important;
    min-width:110px!important;
    height:70px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-start!important;
    overflow:hidden!important;
    border-radius:14px!important;
    background:transparent!important;
    line-height:1!important;
    transform:none;
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
    transform:none;
  }
  #heroSlogan{
    margin:0!important;
    max-width:720px!important;
    font-size:21px!important;
    line-height:1.25!important;
    font-weight:800!important;
    transform:none;
  }
  .hero>div:last-child{margin:0!important}
}
</style>'''
h = h.replace('</head>', desktop_brand_style + '</head>', 1)

# Exact laptop alignment: use the real seller-card position after layout.
# The target is seller left edge + seller left padding, i.e. the same x-axis
# where the word CONTACTO begins. The same delta is applied to logo/name/slogan.
desktop_brand_align = '''<script id="varelia-desktop-brand-align-v93">
(function(){
  function alignBrandToContact(){
    if(window.innerWidth < 760) return;
    var seller = document.querySelector('.seller');
    var logo = document.querySelector('.hero .top>b');
    var name = document.getElementById('business');
    var slogan = document.getElementById('heroSlogan');
    if(!seller || !logo || !name) return;

    logo.style.setProperty('transform','none','important');
    name.style.setProperty('transform','none','important');
    if(slogan) slogan.style.setProperty('transform','none','important');

    var sellerRect = seller.getBoundingClientRect();
    var sellerCss = getComputedStyle(seller);
    var sellerPad = parseFloat(sellerCss.paddingLeft) || 0;
    var targetX = Math.round(sellerRect.left + sellerPad);

    var nameX = Math.round(name.getBoundingClientRect().left);
    var shift = targetX - nameX;
    var move = 'translateX(' + shift + 'px)';

    logo.style.setProperty('transform',move,'important');
    name.style.setProperty('transform',move,'important');
    if(slogan) slogan.style.setProperty('transform',move,'important');
  }

  function runAlignment(){
    alignBrandToContact();
    requestAnimationFrame(alignBrandToContact);
    setTimeout(alignBrandToContact,80);
    setTimeout(alignBrandToContact,300);
    setTimeout(alignBrandToContact,800);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',runAlignment,{once:true});
  }else{
    runAlignment();
  }
  window.addEventListener('load',runAlignment,{once:true});
  window.addEventListener('pageshow',runAlignment);
  window.addEventListener('resize',alignBrandToContact,{passive:true});
})();
</script>'''

head, sep, tail = h.rpartition('</body>')
if not sep:
    raise SystemExit('real closing </body> not found')
h = head + desktop_brand_align + sep + tail

# Publish another physical file so the user cannot land on the old layout.
Path('catalogo/milagros/catalogo-v93.html').write_text(h, encoding='utf-8')

# Keep the old route usable too, but all current entry points go to v93.
p = Path('catalogo/milagros/index.html')
r = p.read_text(encoding='utf-8')
r = re.sub(r'catalogo-v(?:2|92|93)\.html\?v=[^\"\']+', 'catalogo-v93.html?v=20261022-desktop-brand-v93', r)
p.write_text(r, encoding='utf-8')

p = Path('public-catalog.js')
j = p.read_text(encoding='utf-8')
j = j.replace('/catalogo/milagros/catalogo-v2.html?c=', '/catalogo/milagros/catalogo-v93.html?c=')
j = j.replace('/catalogo/milagros/catalogo-v92.html?c=', '/catalogo/milagros/catalogo-v93.html?c=')
j = re.sub(r'&_v=20261022-desktop-brand-v\d+', '&_v=20261022-desktop-brand-v93', j)
p.write_text(j, encoding='utf-8')

p = Path('catalogo-enlace.html')
e = p.read_text(encoding='utf-8')
e = e.replace("new URL('/catalogo/milagros/catalogo-v2.html',location.origin)", "new URL('/catalogo/milagros/catalogo-v93.html',location.origin)")
e = e.replace("new URL('/catalogo/milagros/catalogo-v92.html',location.origin)", "new URL('/catalogo/milagros/catalogo-v93.html',location.origin)")
e = re.sub(r"target\.searchParams\.set\('_v','20261022-desktop-brand-v\d+'\)", "target.searchParams.set('_v','20261022-desktop-brand-v93')", e)
p.write_text(e, encoding='utf-8')

p = Path('index.html')
i = p.read_text(encoding='utf-8')
i = re.sub(r'public-catalog\.js\?v=[^\"\']+', 'public-catalog.js?v=20261022-desktop-brand-v93-exact-contact', i, count=1)
p.write_text(i, encoding='utf-8')

print('public catalog v93 exact CONTACTO-column alignment applied')