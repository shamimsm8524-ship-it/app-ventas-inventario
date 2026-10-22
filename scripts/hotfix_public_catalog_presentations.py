from pathlib import Path
import re


# Build from the latest published catalog so existing catalog/order behavior stays intact.
for candidate in [
    'catalogo/milagros/catalogo-v94.html',
    'catalogo/milagros/catalogo-v93.html',
    'catalogo/milagros/catalogo-v92.html',
    'catalogo/milagros/catalogo-v2.html',
]:
    source = Path(candidate)
    if source.exists():
        break
else:
    raise SystemExit('No public catalog source found')

h = source.read_text(encoding='utf-8')

# Remove every previous desktop-brand experiment. v95 uses one deterministic CSS layout.
brand_pattern = re.compile(r'<style id="varelia-desktop-brand-v\d+">.*?</style>', re.S)
h = brand_pattern.sub('', h)
align_pattern = re.compile(r'<script id="varelia-desktop-brand-align-v\d+">.*?</script>', re.S)
h = align_pattern.sub('', h)

# Laptop/desktop only. The seller card is max-width:1100 with 20px inner padding.
# Therefore its CONTACTO text begins at:
#   max(38px, ((viewport - 1100px) / 2) + 20px)
# Use that exact same inset for the hero, so logo/name/slogan are genuinely aligned.
desktop_brand_style = '''<style id="varelia-desktop-brand-v95">
@media (min-width:760px){
  .hero{
    display:block!important;
    position:relative!important;
    padding-top:30px!important;
    padding-bottom:66px!important;
    padding-left:max(38px,calc((100vw - 1100px)/2 + 20px))!important;
    padding-right:max(38px,calc((100vw - 1100px)/2 + 20px))!important;
  }

  .hero .top{
    display:block!important;
    min-height:110px!important;
  }

  .hero .top>b{
    width:110px!important;
    min-width:110px!important;
    height:110px!important;
    min-height:110px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-start!important;
    overflow:hidden!important;
    border-radius:16px!important;
    background:transparent!important;
    font-size:30px!important;
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
    position:absolute!important;
    top:30px!important;
    right:max(38px,calc((100vw - 1100px)/2 + 20px))!important;
    display:flex!important;
    align-items:center!important;
    gap:8px!important;
    margin:0!important;
  }

  .hero h1#business{
    margin:16px 0 5px!important;
    font-size:38px!important;
    line-height:1.08!important;
    letter-spacing:-1px!important;
    transform:none!important;
  }

  #heroSlogan{
    margin:0!important;
    max-width:720px!important;
    font-size:21px!important;
    line-height:1.3!important;
    font-weight:800!important;
    transform:none!important;
  }

  .hero>div:last-child{
    margin:5px 0 0!important;
  }

  .seller{
    max-width:1100px!important;
    margin-left:auto!important;
    margin-right:auto!important;
    padding-left:20px!important;
    padding-right:20px!important;
  }

  .shop{
    max-width:1100px!important;
    margin-left:auto!important;
    margin-right:auto!important;
    padding-left:20px!important;
    padding-right:20px!important;
  }
}
</style>'''

h = h.replace('</head>', desktop_brand_style + '</head>', 1)

# Publish a fresh physical file so desktop browsers do not reuse an older HTML body.
Path('catalogo/milagros/catalogo-v95.html').write_text(h, encoding='utf-8')

# Point every current entry route to v95.
p = Path('catalogo/milagros/index.html')
r = p.read_text(encoding='utf-8')
r = re.sub(
    r'catalogo-v(?:2|92|93|94|95)\.html\?v=[^\"\']+',
    'catalogo-v95.html?v=20261022-desktop-professional-v95',
    r,
)
p.write_text(r, encoding='utf-8')

p = Path('public-catalog.js')
j = p.read_text(encoding='utf-8')
for old in [
    '/catalogo/milagros/catalogo-v2.html?c=',
    '/catalogo/milagros/catalogo-v92.html?c=',
    '/catalogo/milagros/catalogo-v93.html?c=',
    '/catalogo/milagros/catalogo-v94.html?c=',
]:
    j = j.replace(old, '/catalogo/milagros/catalogo-v95.html?c=')
j = re.sub(r'&_v=20261022-[^\"\'&]+', '&_v=20261022-desktop-professional-v95', j)
p.write_text(j, encoding='utf-8')

p = Path('catalogo-enlace.html')
e = p.read_text(encoding='utf-8')
for old in ['catalogo-v2.html', 'catalogo-v92.html', 'catalogo-v93.html', 'catalogo-v94.html']:
    e = e.replace(
        "new URL('/catalogo/milagros/" + old + "',location.origin)",
        "new URL('/catalogo/milagros/catalogo-v95.html',location.origin)",
    )
e = re.sub(
    r"target\.searchParams\.set\('_v','20261022-[^']+'\)",
    "target.searchParams.set('_v','20261022-desktop-professional-v95')",
    e,
)
p.write_text(e, encoding='utf-8')

p = Path('index.html')
i = p.read_text(encoding='utf-8')
i = re.sub(
    r'public-catalog\.js\?v=[^\"\']+',
    'public-catalog.js?v=20261022-desktop-professional-v95',
    i,
    count=1,
)
p.write_text(i, encoding='utf-8')

print('public catalog v95 professional laptop layout applied')
