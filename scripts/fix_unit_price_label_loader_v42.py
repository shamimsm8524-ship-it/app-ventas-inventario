from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

replacements = [
    ("const BUILD='20261022-SHORT-HERO-V110'", "const BUILD='20261022-UNIT-PRICE-LABEL-V111'"),
    ('<label><span>Precio de venta (S/)</span><input id="sellPrice" type="number" step="0.01" min="0" required></label>', '<label><span>Precio por 1 Unidad (S/)</span><input id="sellPrice" type="number" step="0.01" min="0" required></label>'),
    ('product-form-safety.js?v=20261022-short-hero-v110', 'product-form-safety.js?v=20261022-unit-price-label-v111'),
    ("navigator.serviceWorker.register('/sw.js?v=20261022-short-hero-v110'", "navigator.serviceWorker.register('/sw.js?v=20261022-unit-price-label-v111'")
]

changed = False
for old, new in replacements:
    if old in s:
        s = s.replace(old, new, 1)
        changed = True

if not changed:
    raise SystemExit('No expected index.html anchors found')

p.write_text(s, encoding='utf-8')
print('Updated index.html unit-price label loader to v111')
