Observer para insertar el stock automáticamente en todas las tarjetas del catálogo público
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
