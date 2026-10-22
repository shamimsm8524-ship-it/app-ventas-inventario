from pathlib import Path
import re

CATALOG = Path('catalogo/milagros/catalogo-v2.html')
h = CATALOG.read_text(encoding='utf-8')

# Remove previous desktop/laptop visual patches only.
h = re.sub(r'<style id="varelia-(?:desktop|laptop)-brand-[^"]+">.*?</style>', '', h, flags=re.S)
h = re.sub(r'<script id="varelia-(?:desktop|laptop)-brand-[^"]+">.*?</script>', '', h, flags=re.S)

# Keep the original DOM expected by the catalog JavaScript.
h = h.replace('<header class="hero"><div class="hero-inner">', '<header class="hero">', 1)
h = h.replace('</div></header><section class="seller">', '</header><section class="seller">', 1)

style = r'''<style id="varelia-laptop-brand-v101">
/* Laptop/desktop visual refinement only. No catalog functions or data are changed. */
@media (min-width:760px), (hover:hover) and (pointer:fine){
  .hero{
    display:block!important;
    position:relative!important;
    padding-top:30px!important;
    padding-bottom:18px!important;
    padding-left:max(38px,calc((100vw - 1100px)/2 + 20px))!important;
    padding-right:max(38px,calc((100vw - 1100px)/2 + 20px))!important;
  }
  .hero .top{
    display:flex!important;
    justify-content:space-between!important;
    align-items:flex-start!important;
    width:100%!important;
    margin:0!important;
  }
  .hero .top>b{
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
  .hero .top>b img{
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
  .hero .top>div{
    display:flex!important;
    align-items:center!important;
    gap:8px!important;
    margin:0!important;
  }
  .hero h1#business{
    margin:14px 0 5px!important;
    font-size:38px!important;
    line-height:1.08!important;
    letter-spacing:-1px!important;
    transform:none!important;
  }
  .hero #heroSlogan{
    margin:0!important;
    max-width:720px!important;
    font-size:21px!important;
    line-height:1.3!important;
    font-weight:800!important;
    transform:none!important;
  }
  .hero>div:last-child{margin:5px 0 0!important}

  #businessSlogan{display:none!important}

  /* CONTACTO / UBICACION stays completely OUTSIDE the dark hero. */
  .seller{
    box-sizing:border-box!important;
    position:relative!important;
    width:calc(100% - 36px)!important;
    max-width:1100px!important;
    margin:18px auto 0!important;
    padding:18px 20px!important;
    border-radius:20px!important;
    background:var(--card)!important;
  }
  .seller .facts{
    display:grid!important;
    grid-template-columns:1fr 1fr!important;
    gap:18px!important;
    align-items:center!important;
  }
  .seller .fact{
    min-height:54px!important;
    padding-top:8px!important;
    display:flex!important;
    flex-direction:column!important;
    justify-content:center!important;
  }
  .seller .fact small{
    display:block!important;
    margin-bottom:5px!important;
    font-size:10px!important;
    line-height:1.1!important;
    font-weight:800!important;
  }
  .seller .fact b{
    display:block!important;
    font-size:15px!important;
    line-height:1.25!important;
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

# Keep public entry points on the same file; only bump cache version.
idx = Path('catalogo/milagros/index.html')
idx.write_text('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Cache-Control" content="no-cache,no-store,must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><title>Catálogo Milagros</title><script>location.replace('/catalogo/milagros/catalogo-v2.html?v=20261022-hero-up-v101');</script></head><body><a href="/catalogo/milagros/catalogo-v2.html?v=20261022-hero-up-v101">Abrir catálogo</a></body></html>''', encoding='utf-8')

link_file = Path('catalogo-enlace.html')
if link_file.exists():
    s = link_file.read_text(encoding='utf-8')
    s = re.sub(r"/catalogo/milagros/catalogo-v(?:2|9[0-9]|10[0-9])\.html", "/catalogo/milagros/catalogo-v2.html", s)
    s = re.sub(r"20261022-[A-Za-z0-9_-]+", "20261022-hero-up-v101", s)
    link_file.write_text(s, encoding='utf-8')

pc = Path('public-catalog.js')
if pc.exists():
    s = pc.read_text(encoding='utf-8')
    s = re.sub(r"/catalogo/milagros/catalogo-v(?:2|9[0-9]|10[0-9])\.html\?c=", "/catalogo/milagros/catalogo-v2.html?c=", s)
    s = re.sub(r"20261022-[A-Za-z0-9_-]+", "20261022-hero-up-v101", s)
    pc.write_text(s, encoding='utf-8')

root = Path('index.html')
if root.exists():
    s = root.read_text(encoding='utf-8')
    s = re.sub(r"public-catalog\.js\?v=[^\"']+", "public-catalog.js?v=20261022-hero-up-v101", s)
    root.write_text(s, encoding='utf-8')

print('v101: dark hero bottom edge raised on laptop; contact card remains below; functions untouched')
