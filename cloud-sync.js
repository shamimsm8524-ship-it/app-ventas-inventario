// Varelia · Fase 1 de migración a Supabase: Productos y Categorías.
// A partir de este archivo, "products" y "categories" pasan a sincronizarse
// con las tablas varelia_products / varelia_categories (ver supabase/schema.sql).
// Todo lo demás (ventas, proveedores, mercadería, movimientos, caja) sigue
// funcionando exactamente igual que antes, guardado solo en este dispositivo.
(() => {
  if (window.__vareliaCloudSync) return;
  window.__vareliaCloudSync = true;

  const ready = fn => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn)
    : fn();

  ready(() => {
    if (typeof products === 'undefined' || typeof categories === 'undefined' || typeof K === 'undefined') return;

    const SPECS_KEY = 'varelia_product_specs_v1';
    let sb = null;
    let businessId = null;
    let categoryIdByName = new Map();
    let categoryNameById = new Map();

    function toast(msg) {
      if (window.vareliaToast) window.vareliaToast(msg);
      else console.log('[Varelia]', msg);
    }

    function guardOnline(actionLabel) {
      if (navigator.onLine) return true;
      alert('Necesitas conexión a internet para ' + actionLabel + '. Tus productos y categorías ahora se guardan en la nube de Varelia.');
      return false;
    }

    async function waitContext() {
      for (let i = 0; i < 80 && !window.vareliaSupabase; i++) await new Promise(r => setTimeout(r, 120));
      sb = window.vareliaSupabase;
      if (!sb) return false;
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return false;
      const { data: profile, error } = await sb.from('profiles').select('business_id').eq('id', user.id).maybeSingle();
      if (error || !profile?.business_id) return false;
      businessId = profile.business_id;
      return true;
    }

    function mapProductRow(row) {
      return {
        id: row.id,
        _legacyId: row.legacy_id || '',
        barcode: row.barcode || '',
        name: row.name || '',
        category: row.category_id ? (categoryNameById.get(row.category_id) || '') : '',
        buyPrice: +row.buy_price || 0,
        sellPrice: +row.sell_price || 0,
        stock: +row.stock || 0,
        unit: row.unit || 'Unidad',
        reorderLevel: +row.reorder_level || 0,
        description: row.description || '',
        specifications: row.specifications || '',
        image: row.image_data || ''
      };
    }

    function persistLocalCache() {
      try {
        localStorage.setItem(K.categories, JSON.stringify(categories));
        localStorage.setItem(K.products, JSON.stringify(products.map(p => {
          const c = { ...p };
          delete c.image;
          delete c._legacyId;
          return c;
        })));
      } catch (e) { console.warn('No se pudo cachear localmente', e); }
    }

    async function fetchCloud() {
      const { data: cats, error: ce } = await sb.from('varelia_categories')
        .select('id,name').eq('business_id', businessId).order('name');
      if (ce) { console.error('cloud-sync: no se pudieron leer categorías', ce); return false; }
      categoryNameById = new Map((cats || []).map(c => [c.id, c.name]));
      categoryIdByName = new Map((cats || []).map(c => [c.name, c.id]));

      const { data: prods, error: pe } = await sb.from('varelia_products')
        .select('*').eq('business_id', businessId).order('name');
      if (pe) { console.error('cloud-sync: no se pudieron leer productos', pe); return false; }

      categories = (cats || []).map(c => c.name);
      products = (prods || []).map(mapProductRow);
      persistLocalCache();
      if (typeof render === 'function') render();
      return true;
    }

    // Sube solo lo que exista en este dispositivo y todavía no esté en la nube.
    // Nunca borra ni reemplaza lo que ya está sincronizado.
    async function importMissing(missingProducts, missingCategoryNames) {
      let specsMap = {};
      try { specsMap = JSON.parse(localStorage.getItem(SPECS_KEY) || '{}') || {}; } catch { }

      for (const name of missingCategoryNames) {
        const { data, error } = await sb.from('varelia_categories')
          .upsert({ business_id: businessId, name }, { onConflict: 'business_id,name' })
          .select('id,name').single();
        if (error) { console.error('Importando categoría', name, error); continue; }
        categoryIdByName.set(data.name, data.id);
        categoryNameById.set(data.id, data.name);
      }

      for (const p of missingProducts) {
        const legacyId = String(p.id);
        const categoryId = p.category ? (categoryIdByName.get(p.category) || null) : null;
        const row = {
          business_id: businessId,
          legacy_id: legacyId,
          category_id: categoryId,
          barcode: p.barcode || null,
          name: p.name || 'Producto sin nombre',
          description: p.description || null,
          specifications: specsMap[legacyId] || p.specifications || null,
          buy_price: +p.buyPrice || 0,
          sell_price: +p.sellPrice || 0,
          stock: +p.stock || 0,
          unit: p.unit || 'Unidad',
          reorder_level: +p.reorderLevel || 0,
          image_data: p.image || null
        };
        const { error } = await sb.from('varelia_products')
          .upsert(row, { onConflict: 'business_id,legacy_id' });
        if (error) console.error('Importando producto', p.name, error);
      }
    }

    async function maybeImportMissing(localProductsSnapshot, localCategoriesSnapshot) {
      const cloudKeys = new Set();
      for (const p of products) {
        cloudKeys.add(String(p.id));
        if (p._legacyId) cloudKeys.add(String(p._legacyId));
      }
      const missingProducts = localProductsSnapshot.filter(p => !cloudKeys.has(String(p.id)));
      const missingCategoryNames = localCategoriesSnapshot.filter(name => name && !categoryIdByName.has(name));
      if (!missingProducts.length && !missingCategoryNames.length) return;

      const ok = confirm(
        `Encontramos ${missingProducts.length} producto(s) y ${missingCategoryNames.length} categoría(s) guardados solo en este dispositivo, que todavía no están en la nube de Varelia.\n\n` +
        `¿Quieres subirlos ahora? No se borra ni se reemplaza nada, solo se agrega lo que falta.`
      );
      if (!ok) { toast('Puedes volver a intentarlo más tarde recargando la app.'); return; }

      toast('Subiendo productos y categorías pendientes…');
      await importMissing(missingProducts, missingCategoryNames);
      await fetchCloud();
      toast('Listo. Tus productos y categorías están sincronizados con la nube.');
    }

    async function syncProductUpsert(p, isNew) {
      if (!businessId) return;
      const categoryId = p.category ? (categoryIdByName.get(p.category) || null) : null;
      const payload = {
        business_id: businessId,
        category_id: categoryId,
        barcode: p.barcode || null,
        name: p.name || 'Producto sin nombre',
        description: p.description || null,
        buy_price: +p.buyPrice || 0,
        sell_price: +p.sellPrice || 0,
        stock: +p.stock || 0,
        unit: p.unit || 'Unidad',
        reorder_level: +p.reorderLevel || 0,
        image_data: p.image || null
      };
      try {
        if (isNew) {
          payload.legacy_id = String(p.id);
          const { data, error } = await sb.from('varelia_products').insert(payload).select('id').single();
          if (error) throw error;
          p.id = data.id;
        } else {
          const { error } = await sb.from('varelia_products').update(payload)
            .eq('business_id', businessId).eq('id', p.id);
          if (error) throw error;
        }
        persistLocalCache();
      } catch (e) {
        console.error('No se pudo sincronizar el producto con la nube', e);
        toast('No se pudo guardar en la nube. Revisa tu conexión e inténtalo otra vez.');
      }
    }

    function hookProductForm() {
      if (typeof productForm === 'undefined' || !productForm) return;

      document.addEventListener('submit', e => {
        if (e.target !== productForm) return;
        if (!guardOnline('guardar productos')) { e.preventDefault(); e.stopImmediatePropagation(); }
      }, true);

      productForm.addEventListener('submit', () => {
        const existing = String(productId.value || '');
        const before = new Set(products.map(p => String(p.id)));
        setTimeout(async () => {
          let id = existing;
          if (!id) {
            const created = products.find(p => !before.has(String(p.id)));
            id = created ? String(created.id) : '';
          }
          if (!id) return;
          const p = products.find(x => String(x.id) === id);
          if (p) await syncProductUpsert(p, !existing);
        }, 0);
      }, true);
    }

    function hookProductDelete() {
      if (typeof productGrid === 'undefined' || !productGrid) return;

      document.addEventListener('click', e => {
        const btn = e.target.closest?.('[data-delete]');
        if (!btn || !productGrid.contains(btn)) return;
        if (!guardOnline('eliminar productos')) { e.preventDefault(); e.stopImmediatePropagation(); }
      }, true);

      productGrid.addEventListener('click', async e => {
        const id = e.target?.dataset?.delete;
        if (!id || !businessId) return;
        const { error } = await sb.from('varelia_products').delete()
          .eq('business_id', businessId).eq('id', id);
        if (error) console.error('No se pudo eliminar el producto en la nube', error);
      }, true);
    }

    function hookCategoryCreate() {
      if (typeof addCategory === 'undefined' || !addCategory) return;

      document.addEventListener('click', e => {
        const btn = e.target.closest?.('#addCategory');
        if (!btn) return;
        if (!guardOnline('crear categorías')) { e.preventDefault(); e.stopImmediatePropagation(); }
      }, true);

      addCategory.addEventListener('click', () => {
        const name = (typeof newCategoryName !== 'undefined' && newCategoryName?.value || '').trim();
        setTimeout(async () => {
          if (!name || !categories.includes(name) || categoryIdByName.has(name)) return;
          const { data, error } = await sb.from('varelia_categories')
            .upsert({ business_id: businessId, name }, { onConflict: 'business_id,name' })
            .select('id,name').single();
          if (error) { console.error('No se pudo crear la categoría en la nube', error); return; }
          categoryIdByName.set(data.name, data.id);
          categoryNameById.set(data.id, data.name);
        }, 0);
      }, true);

      // Nota: hoy el botón "Eliminar" de categorías no tiene ningún listener
      // conectado en index.html (bug preexistente, no de esta migración),
      // así que no hay nada que sincronizar todavía para ese caso.
    }

    async function init() {
      const ok = await waitContext();
      if (!ok) return;

      const localProductsSnapshot = products.slice();
      const localCategoriesSnapshot = categories.slice();

      await fetchCloud();
      await maybeImportMissing(localProductsSnapshot, localCategoriesSnapshot);

      hookProductForm();
      hookProductDelete();
      hookCategoryCreate();

      setInterval(() => { if (document.visibilityState === 'visible') fetchCloud().catch(() => {}); }, 10000);
      window.addEventListener('focus', () => fetchCloud().catch(() => {}));
    }

    init();
  });
})();
