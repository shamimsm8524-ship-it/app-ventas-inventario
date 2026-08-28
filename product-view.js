/**
 * product-view.js - Vista ampliada de productos y especificaciones
 */
(()=>{
  if (window.__vareliaProductViewLoaded) return;
  window.__vareliaProductViewLoaded = true;

  const style = document.createElement('style');
  style.textContent = `
    #productDetailDialog {
      width: min(94vw, 480px);
      border: 0;
      border-radius: 24px;
      padding: 0;
      background: var(--card, #fff);
      color: var(--ink, #111827);
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
    }
    #productDetailDialog::backdrop {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
    }
    .pdetail-box {
      padding: 20px;
    }
    .pdetail-img {
      width: 100%;
      max-height: 280px;
      object-fit: cover;
      border-radius: 16px;
      background: var(--bg, #f6f8fc);
      margin-bottom: 14px;
    }
    .pdetail-title {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 4px;
    }
    .pdetail-meta {
      font-size: 13px;
      color: var(--muted, #6b7280);
      margin-bottom: 10px;
    }
    .pdetail-price {
      font-size: 22px;
      font-weight: 900;
      color: var(--p, #be185d);
      margin-bottom: 12px;
    }
    .pdetail-desc {
      font-size: 13.5px;
      line-height: 1.5;
      color: var(--ink, #111827);
      background: var(--bg, #f6f8fc);
      padding: 12px;
      border-radius: 12px;
      margin-bottom: 16px;
      white-space: pre-line;
    }
  `;
  document.head.appendChild(style);

  const dialog = document.createElement('dialog');
  dialog.id = 'productDetailDialog';
  dialog.innerHTML = `
    <div class="pdetail-box">
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
        <button type="button" class="close" id="closeProductDetail" style="border:0;background:transparent;font-size:22px;cursor:pointer">×</button>
      </div>
      <img id="pdetailImg" class="pdetail-img" src="" alt="Producto" hidden>
      <h3 id="pdetailTitle" class="pdetail-title"></h3>
      <div id="pdetailMeta" class="pdetail-meta"></div>
      <div id="pdetailPrice" class="pdetail-price"></div>
      <div id="pdetailDesc" class="pdetail-desc"></div>
      <button type="button" class="btn primary" id="pdetailAddBtn" style="width:100%">Vender</button>
    </div>
  `;
  document.body.appendChild(dialog);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => 'S/ ' + Number(n || 0).toFixed(2);

  document.getElementById('closeProductDetail').onclick = () => dialog.close();

  document.addEventListener('click', e => {
    const photo = e.target.closest('.photo, .pb h3');
    if (!photo) return;
    const card = photo.closest('.product');
    if (!card) return;

    const id = card.querySelector('[data-edit]')?.dataset.edit || card.querySelector('[data-add]')?.dataset.add;
    if (!id || !window.products) return;

    const p = window.products.find(x => String(x.id) === String(id));
    if (!p) return;

    const img = document.getElementById('pdetailImg');
    if (p.image) {
      img.src = p.image;
      img.hidden = false;
    } else {
      img.hidden = true;
    }

    document.getElementById('pdetailTitle').textContent = p.name;
    document.getElementById('pdetailMeta').textContent = `${p.category || 'General'}${p.barcode ? ' · ' + p.barcode : ''}`;
    document.getElementById('pdetailPrice').textContent = money(p.sellPrice);
    
    const desc = p.description || p.specifications || 'Sin descripción adicional.';
    document.getElementById('pdetailDesc').textContent = desc;

    const addBtn = document.getElementById('pdetailAddBtn');
    addBtn.onclick = () => {
      dialog.close();
      if (typeof openSale === 'function' && typeof addToCart === 'function') {
        openSale();
        addToCart(p);
      }
    };

    dialog.showModal();
  });
})();
