from pathlib import Path
import re

p=Path('advanced-pricing.js')
s=p.read_text(encoding='utf-8')
old="if(!r||n*r.units+reservedStock(p)>Number(p.stock||0)||(o.kind==='wholesale'&&n<r.min))return draw();"
new="if(!r||n*stockPerSale(p,r.mode,r.units)+reservedStock(p)>Number(p.stock||0)||(o.kind==='wholesale'&&n<r.min))return draw();"
if old not in s:
    raise SystemExit('box pre-add stock guard not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
h=re.sub(r"const BUILD='[^']+'", "const BUILD='20261022-BOX-INVENTORY-SALE-V42B'", h, count=1)
h=re.sub(r'advanced-pricing\.js\?v=[^"\']+', 'advanced-pricing.js?v=20261022-box-stock-v42b', h, count=1)
idx.write_text(h,encoding='utf-8')
print('BOX-INVENTORY-SALE-V42B applied')
