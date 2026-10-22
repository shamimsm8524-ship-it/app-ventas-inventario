from pathlib import Path
import re

CATALOG = Path('catalogo/milagros/catalogo-v2.html')
h = CATALOG.read_text(encoding='utf-8')

# Remove every previous desktop/laptop brand patch so no old rule can compete.
h = re.sub(r'<style id="varelia-(?:desktop|laptop)-brand-[^"]+">.*?</style>', '', h, flags=re.S)
h = re.sub(r'<script id="varelia-(?:desktop|laptop)-brand-[^"]+">.*?</script>', '', h, flags=re.S)

# Give the dark hero its own real inner container. Dynamic selectors (.top, #business,
#heroSlogan) keep working because their elements stay unchanged inside the wrapper.
if 'class="hero-inner"' not in h:
    h = h.replace('<header class="hero">', '<header class="hero"><div class="hero-inner">', 1)
    h = h.replace('</header><section class="seller">', '</div></header><section class="seller">', 1)

style = r'''<style id="varelia-laptop-brand-v97">
/* Laptop/desktop: one shared geometry for brand, CONTACTO card and shop.
   Seller outer width = viewport - 36px, with 20px inner padding.
   Therefore seller content width = viewport - 76px.
   The hero-inner uses exactly that same content width, so its left/right
   guides are mathematically identical to CONTACTO/UBICACION content. */
@media (min-width:760px), (hover:hover) and (pointer:fine){
  .hero{
    display:block!important;
    position:relative!important;
    padding:0!important;
  }
  .hero-inner{
    box-sizing:border-box!important;
    width:calc(100% - 76px)!important;
    max-width:1060px!important;
    margin:0 auto!important;
    padding:30px 0 66px!important;
    position:relative!important;
  }
  .hero-inner .top{
    display:flex!important;
    justify-content:space-between!important;
    align-items:flex-start!important;
    width:100%!important;
    margin:0!important;
  }
  .hero-inner .top>b{
    width:110px!important;
    min-width:110px!important;
    height:110px!important;
    min-height:110px!important;
    max-width:110px!important;
    max-height:110px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-start!important;
    overflow:hidden!important;
    border-radius:16px!important;
    background:transparent!important;
    line-height:1!important;
    transform:none!important;
  }
  .hero-inner .top>b img{
    display:block!important;
    width:110px!important;
    height:110px!important;
    min-width:110px!important;
    min-height:110px!important;
    max-width:110px!important;
    max-height:110px!important;
    object-fit:contain!important;
    object-position:left center!important;
    border-radius:16px!important;
  }
  .hero-inner .top>div{
    display:flex!important;
    align-items:center!important;
    gap:8px!important;
    margin:0!important;
  }
  .hero-inner h1#business{
    margin:14px 0 5px!important;
    font-size:38px!important;
    line-height:1.08!important;
    letter-spacing:-1px!important;
    transform:none!important;
  }
  .hero-inner #heroSlogan{
    margin:0!important;
    max-width:720px!important;
    font-size:21px!important;
    line-height:1.3!important;
    font-weight:800!important;
    transform:none!important;
  }
  .hero-inner>div:last-child{margin:5px 0 0!important}

  .seller{
    box-sizing:border-box!important;
    width:calc(100% - 36px)!important;
    max-width:1100px!important;
    margin:-42px auto 0!important;
    padding:20px!important;
  }
  .shop{
    box-sizing:border-box!important;
    width:calc(100% - 36px)!important;
    max-width:1100px!important;
    margin-left:auto!important;
    margin-right:auto!important;
    padding-left:20px!important;
    padding-right:20px!important;
  }
}
</style>'''

h = h.replace('</head>', style + '</head>', 1)
CATALOG.write_text(h, encoding='utf-8')

# Standardize every public entry point on the same real file the user's laptop opens.
idx = Path('catalogo/milagros/index.html')
idx.write_text('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Cache-Control" content="no-cache,no-store,must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><title>Catálogo Milagros</title><script>location.replace('/catalogo/milagros/catalogo-v2.html?v=20261022-laptop-layout-v97');</script></head><body><a href="/catalogo/milagros/catalogo-v2.html?v=20261022-laptop-layout-v97">Abrir catálogo</a></body></html>''', encoding='utf-8')

link_file = Path('catalogo-enlace.html')
if link_file.exists():
    s = link_file.read_text(encoding='utf-8')
    s = re.sub(r"/catalogo/milagros/catalogo-v(?:2|9[0-9])\.html", "/catalogo/milagros/catalogo-v2.html", s)
    s = re.sub(r"20261022-[A-Za-z0-9_-]+", "20261022-laptop-layout-v97", s)
    link_file.write_text(s, encoding='utf-8')

pc = Path('public-catalog.js')
if pc.exists():
    s = pc.read_text(encoding='utf-8')
    s = re.sub(r"/catalogo/milagros/catalogo-v(?:2|9[0-9])\.html\?c=", "/catalogo/milagros/catalogo-v2.html?c=", s)
    s = re.sub(r"20261022-[A-Za-z0-9_-]+", "20261022-laptop-layout-v97", s)
    pc.write_text(s, encoding='utf-8')

root = Path('index.html')
if root.exists():
    s = root.read_text(encoding='utf-8')
    s = re.sub(r"public-catalog\.js\?v=[^\"']+", "public-catalog.js?v=20261022-laptop-layout-v97", s)
    root.write_text(s, encoding='utf-8')

print('public catalog laptop layout v97 applied cleanly')
