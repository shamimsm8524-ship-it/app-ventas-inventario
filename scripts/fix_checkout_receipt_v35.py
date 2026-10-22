from pathlib import Path
import re

p=Path('pos-sales.js')
s=p.read_text(encoding='utf-8')

old_cash="""          const raw=cashCandidates.find(v=>String(v??'').trim()!=='');
          received=Math.max(0,Number(String(raw??'').replace(',','.'))||0);
          if(visibleMethod==='Efectivo'){
            if(received)breakdown.Efectivo=received;
"""
new_cash="""          const raw=cashCandidates.find(v=>String(v??'').trim()!=='');
          // En efectivo, dejar el campo vacío significa pago exacto. Solo un valor
          // escrito explícitamente se usa para calcular faltante/vuelto.
          const cashBlank=raw==null||String(raw).trim()==='';
          received=(visibleMethod==='Efectivo'&&cashBlank)
            ? total
            : Math.max(0,Number(String(raw??'').replace(',','.'))||0);
          if(visibleMethod==='Efectivo'){
            if(received)breakdown.Efectivo=received;
"""
if old_cash not in s:
    raise SystemExit('cash snapshot block not found')
s=s.replace(old_cash,new_cash,1)

old_cloud="""          if(typeof window.vareliaCentralCheckout==='function'){
            const cloudOk=await window.vareliaCentralCheckout();
            if(!cloudOk){finish(100);return;}
            try{sync();renderPay()}catch{}
            try{if(typeof renderSales==='function')renderSales()}catch{}
            finish(1200);
            return;
          }
"""
new_cloud="""          if(typeof window.vareliaCentralCheckout==='function'){
            const cloudOk=await window.vareliaCentralCheckout();
            if(!cloudOk){finish(100);return;}
            try{sync();renderPay()}catch{}
            try{if(typeof renderSales==='function')renderSales()}catch{}
            // La venta ya fue confirmada por el flujo central. Abrir el comprobante
            // también desde el botón visible para no depender de un único listener.
            showPaidReceipt(before,p,state);
            setTimeout(()=>{
              const mainOpen=!!document.getElementById('vreceiptOverlay')?.classList.contains('show');
              const backupOpen=!!document.getElementById('vareliaEmergencyReceipt')||!!document.getElementById('vareliaReceiptWatchdog');
              if(mainOpen||backupOpen)return;
              let confirmed=window.__vareliaLastReceipt||null;
              try{if(!confirmed&&Array.isArray(sales)&&sales.length>before)confirmed=sales[sales.length-1]}catch{}
              if(confirmed)showEmergencyReceipt(confirmed);
            },450);
            finish(1200);
            return;
          }
"""
if old_cloud not in s:
    raise SystemExit('central checkout branch not found')
s=s.replace(old_cloud,new_cloud,1)
p.write_text(s,encoding='utf-8')

idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
h2,n=re.subn(r"const BUILD='[^']+'", "const BUILD='20261022-CHECKOUT-RECEIPT-V35'", h, count=1)
if n!=1:
    raise SystemExit('build marker not found')
h3,n=re.subn(r'pos-sales\.js\?v=[^"\']+', 'pos-sales.js?v=20261022-checkout-receipt-v35', h2, count=1)
if n!=1:
    raise SystemExit('pos-sales cache tag not found')
idx.write_text(h3,encoding='utf-8')

check=p.read_text(encoding='utf-8')
for required in [
    "const cashBlank=raw==null||String(raw).trim()===''",
    'showPaidReceipt(before,p,state);',
    'if(confirmed)showEmergencyReceipt(confirmed);'
]:
    if required not in check:
        raise SystemExit('validation missing: '+required)

print('checkout receipt V35 patch validated')
