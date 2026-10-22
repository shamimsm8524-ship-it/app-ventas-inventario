from pathlib import Path
import re

p = Path('catalogo/milagros/catalogo-v2.html')
h = p.read_text(encoding='utf-8')

# Remove every previous desktop-brand experiment so only one rule remains.
h = re.sub(r'<style id="varelia-desktop-brand-v\d+">.*?</style>', '', h, flags=re.S)
h = re.sub(r'<script id="varelia-desktop-brand-align-v\d+">.*?</script>', '', h, flags=re.S)
h = re.sub(r'<style id="varelia-laptop-brand-v\d+">.*?</style>', '', h, flags=re.S)
h = re.sub(r'<script id="varelia-laptop-brand-v\d+">.*?</script>', '', h, flags=re.S)

style = '''<style id="varelia-laptop-brand-v96">
html.varelia-laptop-brand-v96 .hero{
  display:block!important;
  position:relative!important;
  padding-top:30px!important;
  padding-bottom:66px!important;
}
html.varelia-laptop-brand-v96 .hero .top{
  display:flex!important;
  justify-content:space-between!important;
  align-items:flex-start!important;
}
html.varelia-laptop-brand-v96 .hero .top>b{
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
html.varelia-laptop-brand-v96 .hero .top>b img{
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
html.varelia-laptop-brand-v96 .hero h1#business{
  margin:14px 0 5px!important;
  font-size:38px!important;
  line-height:1.08!important;
  letter-spacing:-1px!important;
  transform:none!important;
}
html.varelia-laptop-brand-v96 #heroSlogan{
  margin:0!important;
  max-width:720px!important;
  font-size:21px!important;
  line-height:1.3!important;
  font-weight:800!important;
  transform:none!important;
}
html.varelia-laptop-brand-v96 .hero>div:last-child{margin:5px 0 0!important}
</style>'''
h = h.replace('</head>', style + '</head>', 1)

script = '''<script id="varelia-laptop-brand-v96">
(function(){
  function isLaptop(){
    var fine = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
    var hover = window.matchMedia && window.matchMedia('(hover:hover)').matches;
    return (fine || hover) && Math.max(screen.width||0, screen.availWidth||0) >= 800;
  }

  function align(){
    if(!isLaptop()){
      document.documentElement.classList.remove('varelia-laptop-brand-v96');
      return;
    }
    document.documentElement.classList.add('varelia-laptop-brand-v96');

    var hero = document.querySelector('.hero');
    var seller = document.querySelector('.seller');
    if(!hero || !seller) return;

    var rect = seller.getBoundingClientRect();
    var css = getComputedStyle(seller);
    var padL = parseFloat(css.paddingLeft) || 0;
    var padR = parseFloat(css.paddingRight) || 0;

    // Exact same vertical guides as CONTACTO/UBICACIÓN content.
    var left = Math.round(rect.left + padL);
    var right = Math.round((window.innerWidth - rect.right) + padR);

    hero.style.setProperty('padding-left', left + 'px', 'important');
    hero.style.setProperty('padding-right', Math.max(20,right) + 'px', 'important');
  }

  function run(){
    align();
    requestAnimationFrame(align);
    setTimeout(align,100);
    setTimeout(align,350);
    setTimeout(align,900);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, {once:true});
  }else{
    run();
  }
  window.addEventListener('load', run, {once:true});
  window.addEventListener('pageshow', run);
  window.addEventListener('resize', align, {passive:true});
})();
</script>'''

head, sep, tail = h.rpartition('</body>')
if not sep:
    raise SystemExit('closing body not found')
h = head + script + sep + tail

p.write_text(h, encoding='utf-8')
print('catalogo-v2 laptop brand aligned directly to CONTACTO; logo 110x110')
