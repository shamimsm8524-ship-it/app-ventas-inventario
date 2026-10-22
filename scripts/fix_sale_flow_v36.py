from pathlib import Path
import re

# V36: three isolated fixes only:
# 1) Never let generic product sync erase commercial presentations/pricing.
# 2) Remove duplicate logo-less receipt watchdog from the live page.
# 3) Fully clear cart/payment UI after a confirmed sale.

# --- central-stock-sync.js: preserve commercial fields on existing normal products ---
p = Path('central-stock-sync.js')
s = p.read_text(encoding='utf-8')
old = """      const payload=productPayload(p,categoryId);
      const legacy=String(p.id||'');
      const existingBefore=await sb.from('varelia_products').select('id,stock').eq('business_id',businessId).eq('legacy_id',legacy).maybeSingle();
      if(existingBefore.error)throw existingBefore.error;
      const existedBefore=!!existingBefore.data?.id;
"""
new = """      const payload=productPayload(p,categoryId);
      const legacy=String(p.id||'');
      const existingBefore=await sb.from('varelia_products').select('id,stock,sale_presentations,advanced_pricing,medicine').eq('business_id',businessId).eq('legacy_id',legacy).maybeSingle();
      if(existingBefore.error)throw existingBefore.error;
      const existedBefore=!!existingBefore.data?.id;
      // Presentaciones comerciales y precio mayorista tienen su propio módulo de guardado.
      // En productos normales ya existentes, la sincronización general NO debe escribir
      // estos dos campos porque un objeto local todavía no hidratado puede venir vacío
      // y borrar Six Pack/Docena/Mayorista que sí están correctamente guardados en nube.
      // Si el producto se convierte en medicamento, sí permitimos limpiarlos porque
      // los medicamentos usan su modelo Caja / Blíster / Pastilla.
      if(existedBefore&&!p.medicine){
        delete payload.sale_presentations;
        delete payload.advanced_pricing;
      }
"""
if old not in s:
    raise SystemExit('central-stock-sync target not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# --- pos-sales.js: after cloud-confirmed checkout, clear all visible sale/payment state
p = Path('pos-sales.js')
s = p.read_text(encoding='utf-8')
pattern = re.compile(r"""          if\(typeof window\.vareliaCentralCheckout==='function'\)\{\n            const cloudOk=await window\.vareliaCentralCheckout\(\);\n            if\(!cloudOk\)\{finish\(100\);return;\}\n            try\{sync\(\);renderPay\(\)\}catch\{\}\n            try\{if\(typeof renderSales==='function'\)renderSales\(\)\}catch\{\}\n            // La venta ya fue confirmada por el flujo central\. Abrir el comprobante\n            // también desde el botón visible para no depender de un único listener\.\n            showPaidReceipt\(before,p,state\);\n            setTimeout\(\(\)=>\{\n              const mainOpen=!!document\.getElementById\('vreceiptOverlay'\)\?\.classList\.contains\('show'\);\n              const backupOpen=!!document\.getElementById\('vareliaEmergencyReceipt'\)\|\|!!document\.getElementById\('vareliaReceiptWatchdog'\);\n              if\(mainOpen\|\|backupOpen\)return;\n              let confirmed=window\.__vareliaLastReceipt\|\|null;\n              try\{if\(!confirmed&&Array\.isArray\(sales\)&&sales\.length>before\)confirmed=sales\[sales\.length-1\]\}catch\{\}\n              if\(confirmed\)showEmergencyReceipt\(confirmed\);\n            \},450\);\n            finish\(1200\);\n            return;\n          \}""", re.S)
replacement = """          if(typeof window.vareliaCentralCheckout==='function'){
            const cloudOk=await window.vareliaCentralCheckout();
            if(!cloudOk){finish(100);return;}

            // Venta confirmada: dejar preparada una venta NUEVA detrás del comprobante.
            // No conservar producto, cantidad, dinero recibido, vuelto ni pago mixto.
            try{
              if(Array.isArray(cart))cart.splice(0,cart.length);
              if(typeof renderCart==='function')renderCart();
              if(typeof persistSaleCart==='function')persistSaleCart();
            }catch(err){console.warn('Limpiar carrito confirmado',err)}
            try{localStorage.removeItem('varelia_scanner_cart_backup_v1')}catch{}
            try{legacyCart.innerHTML=''}catch{}
            input.value='';hideSuggestions();
            resetPaymentInputs(true,true);
            try{renderPay();sync()}catch(err){console.warn('Reiniciar caja después del cobro',err)}
            try{if(typeof renderSales==='function')renderSales()}catch{}

            // El flujo central ya emite varelia:checkout-confirmed y el módulo oficial
            // abre el comprobante CON logo. No crear aquí un segundo ticket de respaldo.
            // Solo reintentar el mismo comprobante oficial si por carga lenta aún no abrió.
            const retryOfficialReceipt=()=>{
              const mainOpen=!!document.getElementById('vreceiptOverlay')?.classList.contains('show');
              const emergencyOpen=!!document.getElementById('vareliaEmergencyReceipt');
              if(mainOpen||emergencyOpen)return;
              let confirmed=window.__vareliaLastReceipt||null;
              try{if(!confirmed&&Array.isArray(sales)&&sales.length>before)confirmed=sales[sales.length-1]}catch{}
              if(!confirmed)return;
              if(typeof window.VareliaReceipt?.show==='function'){
                try{window.VareliaReceipt.show(confirmed);return}catch(err){console.warn('Reintento de comprobante oficial',err)}
              }
              if(!document.getElementById('vareliaReceiptOfficialRetry')){
                const loader=document.createElement('script');
                loader.id='vareliaReceiptOfficialRetry';
                loader.src='pos-receipt.js?v=20261022-single-receipt-v36&ts='+Date.now();
                loader.onload=()=>{try{window.VareliaReceipt?.show?.(confirmed)}catch{}};
                document.head.appendChild(loader);
              }
            };
            setTimeout(retryOfficialReceipt,180);
            setTimeout(retryOfficialReceipt,900);
            finish(1200);
            return;
          }"""
s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit(f'pos-sales central checkout target count={n}')
p.write_text(s2, encoding='utf-8')

# --- index.html: cache-bust only changed modules, remove duplicate receipt watchdog ---
p = Path('index.html')
h = p.read_text(encoding='utf-8')
repls = [
    ("const BUILD='20261022-CHECKOUT-RECEIPT-V35'", "const BUILD='20261022-SALE-FLOW-V36'"),
    ('central-stock-sync.js?v=20261021-sale-cost-v29', 'central-stock-sync.js?v=20261022-commercial-preserve-v36'),
    ('pos-sales.js?v=20261022-checkout-receipt-v35', 'pos-sales.js?v=20261022-sale-reset-v36'),
    ('advanced-pricing.js?v=20261021-direct-cart-v22', 'advanced-pricing.js?v=20261022-commercial-preserve-v36'),
]
for old,new in repls:
    if old not in h:
        raise SystemExit('index target not found: '+old)
    h = h.replace(old,new,1)
watchdog='<script src="checkout-receipt-watchdog.js?v=20261021-v1"></script>\n'
if watchdog not in h:
    raise SystemExit('receipt watchdog script tag not found')
h = h.replace(watchdog,'',1)
p.write_text(h, encoding='utf-8')

# Validate that this patch did not touch unrelated sales/product logic markers.
checks = {
    'central-stock-sync.js': [
        'delete payload.sale_presentations;',
        'delete payload.advanced_pricing;',
        "varelia_commit_sale"
    ],
    'pos-sales.js': [
        'resetPaymentInputs(true,true);',
        'retryOfficialReceipt',
        'window.vareliaCentralCheckout'
    ],
    'index.html': [
        "const BUILD='20261022-SALE-FLOW-V36'",
        'central-stock-sync.js?v=20261022-commercial-preserve-v36',
        'pos-sales.js?v=20261022-sale-reset-v36',
        'advanced-pricing.js?v=20261022-commercial-preserve-v36'
    ]
}
for file, needles in checks.items():
    text=Path(file).read_text(encoding='utf-8')
    for needle in needles:
        if needle not in text:
            raise SystemExit(f'validation failed {file}: {needle}')
if 'checkout-receipt-watchdog.js?v=20261021-v1' in Path('index.html').read_text(encoding='utf-8'):
    raise SystemExit('watchdog tag still present')
print('V36 isolated sale flow patch validated')
