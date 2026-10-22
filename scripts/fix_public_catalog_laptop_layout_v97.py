from pathlib import Path
import re

SRC = Path('catalogo/milagros/catalogo-v104.html')
V105 = Path('catalogo/milagros/catalogo-v105.html')
V104 = Path('catalogo/milagros/catalogo-v104.html')
V2 = Path('catalogo/milagros/catalogo-v2.html')

h = SRC.read_text(encoding='utf-8')

# Remove only our previous desktop/laptop presentation hotfixes.
h = re.sub(r'<style id="varelia-(?:desktop|laptop)-brand-[^"]+">.*?</style>', '', h, flags=re.S)
h = re.sub(r'<script id="varelia-(?:desktop|laptop)-brand-[^"]+">.*?</script>', '', h, flags=re.S)

# Canonical markup: the dark hero is CLOSED before the white seller card starts.
# IDs/classes are the original ones expected by the existing catalog JavaScript.
canonical = '''<header class="hero"><div class="top"><b>V</b><div><a id="waTop" href="#">WhatsApp</a> <button id="share">Compartir</button></div></div><h1 id="business">Mi negocio</h1><div id="heroSlogan" style="display:none;color:#fff;font-size:21px;font-weight:800;line-height:1.25;margin:5px 0 8px"></div><div>Catálogo oficial · Stock actualizado</div></header><section class="seller"><div id="businessSlogan" class="fact" style="display:none;margin:0 0 12px"><b id="businessSloganText"></b></div><div class="facts" id="facts"></div><div class="pills" id="socials"></div></section><section class="shop">'''
h, n = re.subn(r'<header class="hero">.*?<section class="shop">', canonical, h, count=1, flags=re.S)
if n != 1:
    raise SystemExit('Could not normalize hero/seller markup')

style = r'''<style id="varelia-laptop-brand-v105">
/* Laptop/desktop presentation only. Catalog functions/data are untouched. */
@media (min-width:640px), (hover:hover) and (pointer:fine){
  .hero{
    display:block!important;
    position:relative!important;
    box-sizing:border-box!important;
    margin:0!important;
    padding-top:30px!important;
    padding-bottom:76px!important;
    padding-left:max(38px,calc((100vw - 1100px)/2 + 20px))!important;
    padding-right:max(38px,calc((100vw - 1100px)/2 + 20px))!important;
    overflow:visible!important;
  }
  .hero .top{display:flex!important;justify-content:space-between!important;align-items:flex-start!important;width:100%!important;margin:0!important}
  .hero .top>b{width:110px!important;min-width:110px!important;height:110px!important;min-height:110px!important;max-width:110px!important;max-height:110px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;overflow:hidden!important;border-radius:16px!important;background:transparent!important;line-height:1!important;transform:none!important}
  .hero .top>b img{display:block!important;width:110px!important;height:110px!important;min-width:110px!important;min-height:110px!important;max-width:110px!important;max-height:110px!important;object-fit:contain!important;object-position:left center!important;border-radius:16px!important}
  .hero .top>div{display:flex!important;align-items:center!important;gap:8px!important;margin:0!important}
  .hero h1#business{margin:14px 0 5px!important;font-size:38px!important;line-height:1.08!important;letter-spacing:-1px!important;transform:none!important}
  .hero #heroSlogan{margin:0!important;max-width:720px!important;font-size:21px!important;line-height:1.3!important;font-weight:800!important;transform:none!important}
  /* When a business slogan exists, this generic line is unnecessary and must not add height. */
  .hero>div:last-child{display:none!important}
  #businessSlogan{display:none!important}

  /* The white card starts AFTER the dark hero; no overlap is allowed. */
  .seller{
    box-sizing:border-box!important;
    position:relative!important;
    display:block!important;
    clear:both!important;
    top:auto!important;
    bottom:auto!important;
    left:auto!important;
    right:auto!important;
    transform:none!important;
    translate:none!important;
    width:calc(100% - 36px)!important;
    max-width:1100px!important;
    margin:18px auto 0!important;
    padding:18px 20px!important;
    border-radius:20px!important;
    background:var(--card)!important;
    z-index:2!important;
  }
  .seller .facts{display:grid!important;grid-template-columns:1fr 1fr!important;gap:18px!important;align-items:center!important}
  .seller .fact{min-height:54px!important;padding-top:8px!important;display:flex!important;flex-direction:column!important;justify-content:center!important}
  .seller .fact small{display:block!important;margin-bottom:5px!important;font-size:10px!important;line-height:1.1!important;font-weight:800!important}
  .seller .fact b{display:block!important;font-size:15px!important;line-height:1.25!important}
  .shop{box-sizing:border-box!important;width:calc(100% - 36px)!important;max-width:1100px!important;margin-left:auto!important;margin-right:auto!important;padding-left:20px!important;padding-right:20px!important}
}
</style>'''

h = h.replace('</head>', style + '</head>', 1)

# IMPORTANT: all known physical catalog URLs receive the SAME corrected full page.
# No redirect is required for old copied v2 links.
for p in (V2, V104, V105):
    p.write_text(h, encoding='utf-8')

idx = Path('catalogo/milagros/index.html')
idx.write_text('''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Cache-Control" content="no-cache,no-store,must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><title>Catálogo Milagros</title><script>location.replace('/catalogo/milagros/catalogo-v105.html?_v=20261022-canonical-v105');</script></head><body></body></html>''', encoding='utf-8')

for path in ('catalogo-enlace.html','public-catalog.js'):
    p=Path(path)
    if p.exists():
        s=p.read_text(encoding='utf-8')
        s=re.sub(r'/catalogo/milagros/catalogo-v(?:2|10[0-9]|9[0-9])\.html', '/catalogo/milagros/catalogo-v105.html', s)
        s=re.sub(r'20261022-[A-Za-z0-9_-]+', '20261022-canonical-v105', s)
        p.write_text(s, encoding='utf-8')

for root_name in ('index.html','index-1.html'):
    p=Path(root_name)
    if p.exists():
        s=p.read_text(encoding='utf-8')
        s=re.sub(r'public-catalog\.js\?v=[^\"\']+', 'public-catalog.js?v=20261022-canonical-v105', s)
        s=re.sub(r'/sw\.js\?v=[^\"\']+', '/sw.js?v=20261022-canonical-v105', s)
        p.write_text(s, encoding='utf-8')

print('v105: canonical closed hero + seller sibling; v2/v104/v105 identical; no overlap')