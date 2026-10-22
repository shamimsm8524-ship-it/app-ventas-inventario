from pathlib import Path

p = Path('pos-sales.js')
s = p.read_text()

checkout_old = """            const cloudOk=await window.vareliaCentralCheckout();
            if(!cloudOk){finish(100);return;}

            // Venta confirmada: dejar preparada una venta NUEVA detrás del comprobante."""
checkout_new = """            const cloudOk=await window.vareliaCentralCheckout();
            if(!cloudOk){finish(100);return;}
            // Recordar que esta venta ya fue cobrada. Solo en ese caso, al volver
            // a entrar a Venta, se inicia una caja nueva. Un carrito pendiente se conserva.
            window.__vareliaSaleCompletedPendingReset=true;
            try{localStorage.setItem('varelia_sale_completed_pending_reset_v1','1')}catch{}

            // Venta confirmada: dejar preparada una venta NUEVA detrás del comprobante."""
if checkout_old in s:
    s = s.replace(checkout_old, checkout_new, 1)
elif 'varelia_sale_completed_pending_reset_v1' not in s:
    raise SystemExit('Checkout anchor not found; no files changed')

nav_old = """      document.addEventListener('click',e=>{const b=e.target.closest('.nav [data-view=\"sales\"]');if(!b)return;setTimeout(()=>input.focus(),120)},true);"""
nav_new = """      document.addEventListener('click',e=>{
        const b=e.target.closest('.nav [data-view=\"sales\"],#vmobileNav button,.vmobileNav button,.mobileNav button');
        if(!b)return;
        const target=String(b.dataset.view||b.dataset.mobileTab||b.dataset.mobileView||'').trim().toLowerCase();
        const label=String(b.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase();
        const isSales=b.matches('.nav [data-view=\"sales\"]')||target==='sales'||label==='venta'||label==='ventas';
        if(!isSales)return;
        let completed=!!window.__vareliaSaleCompletedPendingReset;
        try{completed=completed||localStorage.getItem('varelia_sale_completed_pending_reset_v1')==='1'}catch{}
        if(completed){
          window.__vareliaSaleCompletedPendingReset=false;
          try{localStorage.removeItem('varelia_sale_completed_pending_reset_v1')}catch{}
          setTimeout(()=>{startNew(true);input.focus()},100);
          return;
        }
        setTimeout(()=>input.focus(),120);
      },true);"""
if nav_old in s:
    s = s.replace(nav_old, nav_new, 1)
elif 'const isSales=' not in s:
    raise SystemExit('Sales navigation anchor not found; no files changed')

p.write_text(s)

p = Path('index.html')
s = p.read_text()
s = s.replace("const BUILD='20261022-NEW-SALE-RESET-V37'", "const BUILD='20261022-COMPLETED-SALE-RESET-V38'", 1)
s = s.replace('pos-sales.js?v=20261022-new-sale-reset-v37', 'pos-sales.js?v=20261022-completed-sale-reset-v38', 1)
p.write_text(s)
