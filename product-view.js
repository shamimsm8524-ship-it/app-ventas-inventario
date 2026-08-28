(()=>{
  // Inyección de estilos de stock para la vista pública y modal
  const s = document.createElement('style');
  s.textContent = `
    .public-stock-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 999px;
      margin: 6px 0;
    }
    .public-stock-badge.in {
      background: #d1fae5;
      color: #047857;
    }
    .public-stock-badge.out {
      background: #fee2e2;
      color: #b91c1c;
    }
    .card-agotado {
      opacity: 0.65;
    }
    .btn-agotado {
      background: #e2e8f0 !important;
      color: #94a3b8 !important;
      cursor: not-allowed !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(s);

  // Observer para insertar el stock automáticamente en todas las tarjetas del catálogo público
  function actualizarTarjetasPublicas() {
    const cards = document.querySelectorAll('.product, .product-card, [data-product-id], article');
    cards.forEach(card => {
      if (card.dataset.stockInjected) return;
      
      let stock = null;
      let unit = 'Unidades';
      
      // Buscar en el catálogo local si está disponible
      const id = card.dataset.productId || card.getAttribute('data-id') || card.querySelector('[data-add]')?.dataset.add || card.querySelector('[data-edit]')?.dataset.edit;
      if (id && window.products) {
        const p = window.products.find(x => String(x.id) === String(id));
        if (p) {
          stock = Number(p.stock || 0);
          unit = p.unit || 'Unidades';
        }
      }
      
      // Si no encontró por ID, intentar leer dataset embebido de Supabase
      if (stock === null && card.dataset.stock !== undefined) {
        stock = Number(card.dataset.stock || 0);
        unit = card.dataset.unit || 'Unidades';
      }

      if (stock !== null) {
        card.dataset.stockInjected = "true";
        const badge = document.createElement('div');
        if (stock <= 0) {
          badge.innerHTML = '<span class="public-stock-badge out">🚫 Agotado</span>';
          card.classList.add('card-agotado');
          const addBtn = card.querySelector('.btn-primary, [data-add], .btn-add');
          if (addBtn) {
            addBtn.classList.add('btn-agotado');
            addBtn.textContent = 'Sin stock';
            addBtn.disabled = true;
          }
        } else {
          badge.innerHTML = `<span class="public-stock-badge in">🟢 Quedan ${stock} ${unit}</span>`;
        }
        
        const targetContainer = card.querySelector('.pb, .product-info, .card-body') || card;
        const priceEl = targetContainer.querySelector('.price, .product-price');
        if (priceEl && priceEl.nextSibling) {
          targetContainer.insertBefore(badge, priceEl.nextSibling);
        } else {
          targetContainer.appendChild(badge);
        }
      }
    });
  }

  // Ejecutar periódicamente para detectar productos renderizados dinámicamente
  setInterval(actualizarTarjetasPublicas, 500);
  window.addEventListener('DOMContentLoaded', actualizarTarjetasPublicas);
})();
