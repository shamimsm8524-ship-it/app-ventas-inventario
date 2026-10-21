from pathlib import Path

# Repairs existing normal products that were stored through the internal
# Caja/Blister/Pastilla transport columns but lost their advancedPricing JSON.

# advanced-pricing.js
p = Path('advanced-pricing.js')
s = p.read_text(encoding='utf-8')
old = """  // Un producto normal con precios por cantidad puede usar internamente el motor remoto de presentaciones,\n  // pero nunca debe comportarse visualmente como medicamento.\n  const isMedicine=p=>(!!p?.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p?.category||'').trim()))&&!getConfig(p);\n"""
new = """  // Un producto normal con precios por cantidad puede usar internamente el motor remoto de presentaciones,\n  // pero nunca debe comportarse visualmente como medicamento. Algunas filas antiguas\n  // conservan el marcador remoto aunque advancedPricing todavía no haya sido reconstruido.\n  const isPricingProxyMarker=p=>/^varelia precios por cantidad$/i.test(String(p?.medicinePresentation||p?.medicine_presentation||'').trim());\n  const isMedicine=p=>(!!p?.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p?.category||'').trim()))&&!getConfig(p)&&!isPricingProxyMarker(p);\n"""
if old not in s:
    raise SystemExit('advanced-pricing medicine guard anchor not found')
s = s.replace(old, new, 1)
old = """  function getConfig(p){\n    const c=normalizeConfig(p?.advancedPricing||{});\n    if(!(c.dozenEnabled||c.wholesaleEnabled||c.promoEnabled))return null;\n    return c;\n  }\n"""
new = """  function getConfig(p){\n    let c=normalizeConfig(p?.advancedPricing||{});\n    if(c.dozenEnabled||c.wholesaleEnabled||c.promoEnabled)return c;\n    // Compatibilidad con filas que ya fueron guardadas usando el proxy remoto.\n    // El marcador es exclusivo de Precios por cantidad; no clasifica medicamentos reales.\n    if(!isPricingProxyMarker(p))return null;\n    const regular=Math.max(0,Number(p?.unitMedicinePrice||p?.sellPrice)||0);\n    const wholesale=Math.max(0,Number(p?.blisterPrice)||0);\n    const dozen=Math.max(0,Number(p?.boxPrice)||0);\n    const hasWholesale=wholesale>0&&regular>0&&Math.abs(wholesale-regular)>0.009;\n    c=normalizeConfig({\n      proxy:true,\n      dozenEnabled:dozen>0,\n      dozenPrice:dozen,\n      wholesaleEnabled:hasWholesale,\n      wholesaleMinQty:12,\n      wholesalePrice:hasWholesale?wholesale:0,\n      promoEnabled:false\n    });\n    return (c.dozenEnabled||c.wholesaleEnabled||c.promoEnabled)?c:null;\n  }\n"""
if old not in s:
    raise SystemExit('advanced-pricing getConfig anchor not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# central-stock-sync.js
p = Path('central-stock-sync.js')
s = p.read_text(encoding='utf-8')
old = """      const advanced=readAdvancedPricing(p.specifications);\n      const pricingProxy=!!advanced?.proxy;\n"""
new = """      let advanced=readAdvancedPricing(p.specifications);\n      const legacyPricingMarker=/^varelia precios por cantidad$/i.test(String(p.medicine_presentation||'').trim());\n      if(!advanced&&legacyPricingMarker){\n        const regular=Math.max(0,Number(p.unit_medicine_price||p.sell_price)||0);\n        const wholesale=Math.max(0,Number(p.blister_price)||0);\n        const dozen=Math.max(0,Number(p.box_price)||0);\n        const hasWholesale=wholesale>0&&regular>0&&Math.abs(wholesale-regular)>0.009;\n        advanced=normalizeAdvancedPricing({\n          proxy:true,\n          dozenEnabled:dozen>0,\n          dozenPrice:dozen,\n          wholesaleEnabled:hasWholesale,\n          wholesaleMinQty:12,\n          wholesalePrice:hasWholesale?wholesale:0,\n          promoEnabled:false,\n          baseSellPrice:regular,\n          baseBuyPrice:Math.max(0,Number(p.buy_price)||0)/12,\n          baseUnit:String(p.unit||'Unidad')\n        });\n      }\n      const pricingProxy=!!advanced?.proxy||legacyPricingMarker;\n"""
if old not in s:
    raise SystemExit('central stock pricing proxy anchor not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# index.html
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = """    const med=(!!p.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p.category||'').trim()))&&!(p.advancedPricing&&(p.advancedPricing.dozenEnabled||p.advancedPricing.wholesaleEnabled||p.advancedPricing.promoEnabled));\n"""
new = """    const pricingProxy=!!(p.advancedPricing&&(p.advancedPricing.dozenEnabled||p.advancedPricing.wholesaleEnabled||p.advancedPricing.promoEnabled))||/^varelia precios por cantidad$/i.test(String(p.medicinePresentation||p.medicine_presentation||'').trim());\n    const med=(!!p.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p.category||'').trim()))&&!pricingProxy;\n"""
if old not in s:
    raise SystemExit('index product action medicine guard not found')
s = s.replace(old, new, 1)
old = """  const isMedicine=(!!p.medicine||medicineCategory)&&!(p.advancedPricing&&(p.advancedPricing.dozenEnabled||p.advancedPricing.wholesaleEnabled||p.advancedPricing.promoEnabled));\n"""
new = """  const pricingProxy=!!(p.advancedPricing&&(p.advancedPricing.dozenEnabled||p.advancedPricing.wholesaleEnabled||p.advancedPricing.promoEnabled))||/^varelia precios por cantidad$/i.test(String(p.medicinePresentation||p.medicine_presentation||'').trim());\n  const isMedicine=(!!p.medicine||medicineCategory)&&!pricingProxy;\n"""
if old not in s:
    raise SystemExit('index addToCart medicine guard not found')
s = s.replace(old, new, 1)
if '20261020-ADVANCED-PRICING-V15' not in s:
    raise SystemExit('build V15 marker not found')
s = s.replace('20261020-ADVANCED-PRICING-V15', '20261020-ADVANCED-PRICING-V16', 1)
if 'advanced-pricing.js?v=20261020-v15' not in s:
    raise SystemExit('advanced-pricing v15 marker not found')
s = s.replace('advanced-pricing.js?v=20261020-v15', 'advanced-pricing.js?v=20261020-v16', 1)
if 'central-stock-sync.js?v=20261015-cashier-name-fix-v1' not in s:
    raise SystemExit('central-stock cache marker not found')
s = s.replace('central-stock-sync.js?v=20261015-cashier-name-fix-v1', 'central-stock-sync.js?v=20261020-advanced-pricing-proxy-v16')
p.write_text(s, encoding='utf-8')

# public-catalog.js
p = Path('public-catalog.js')
s = p.read_text(encoding='utf-8')
old = "medicine:!!p.medicine&&!p.advancedPricing,blistersPerBox:"
new = "medicine:!!p.medicine&&!p.advancedPricing&&!/^varelia precios por cantidad$/i.test(String(p.medicinePresentation||p.medicine_presentation||'').trim()),blistersPerBox:"
if old in s:
    s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
