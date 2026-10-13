(function(){
  'use strict';
  if (window.__vareliaReportTicketFixV1) return;
  window.__vareliaReportTicketFixV1 = true;

  const normalize = value => String(value == null ? '' : value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const money = value => 'S/ ' + (Number(value) || 0).toFixed(2);
  const numberText = value => (Number(value) || 0).toLocaleString('es-PE', {
    useGrouping: false, maximumFractionDigits: 3
  });
  function arrayOf(name) {
    try {
      if (Array.isArray(window[name])) return window[name];
      return eval('typeof ' + name + ' !== "undefined" && Array.isArray(' + name + ') ? ' + name + ' : []');
    } catch (_) { return []; }
  }
  function isCancelled(sale) {
    const status = normalize(sale.status || sale.state || sale.saleStatus || '');
    return sale.cancelled === true || sale.canceled === true || sale.voided === true ||
      ['cancelled','canceled','voided','cancelada','cancelado','anulada','anulado'].includes(status);
  }
  function ticketKey(sale) {
    const receipt = sale.receiptNumber || sale.receipt_number || sale.receiptNo ||
      sale.ticketNumber || sale.ticket_number || sale.ticketNo || sale.ticket;
    return receipt != null && String(receipt).trim() ? String(receipt).trim().toUpperCase() : '';
  }
  function validSaleRows() {
    return arrayOf('sales').filter(sale => sale && !isCancelled(sale));
  }
  function generatedTicketSales(sales) {
    const unique = new Map();
    sales.forEach(sale => {
      const key = ticketKey(sale);
      if (!key) return;
      if (!unique.has(key)) unique.set(key, sale);
      else {
        const previous = unique.get(key);
        const a = Array.isArray(previous.items) ? previous.items.length : 0;
        const b = Array.isArray(sale.items) ? sale.items.length : 0;
        if (b > a) unique.set(key, sale);
      }
    });
    return Array.from(unique.values());
  }
  function methodKey(value) {
    const v = normalize(value);
    if (v.includes('yape')) return 'Yape';
    if (v.includes('plin')) return 'Plin';
    if (v.includes('transf')) return 'Transferencia';
    if (v.includes('tarj') || v.includes('card')) return 'Tarjeta';
    if (v.includes('efect')) return 'Efectivo';
    if (v.includes('fiado') || v.includes('credito') || v.includes('credit')) return 'Fiado';
    return String(value || 'Efectivo').trim();
  }
  function summarize(tickets) {
    const result = { count: tickets.length, revenue: 0, payments: Object.create(null) };
    tickets.forEach(sale => {
      const total = Number(sale.total) || 0;
      result.revenue += total;
      const breakdown = sale.paymentBreakdown || sale.paymentDetails?.breakdown ||
        sale.payment?.breakdown || sale.paymentMethodBreakdown;
      let allocated = false;
      if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)) {
        Object.entries(breakdown).forEach(([name, raw]) => {
          const amount = Number(raw) || 0;
          if (amount > 0) {
            const key = methodKey(name);
            result.payments[key] = (result.payments[key] || 0) + amount;
            allocated = true;
          }
        });
      }
      if (!allocated) {
        const key = methodKey(sale.paymentMethod || sale.payment_method || 'Efectivo');
        result.payments[key] = (result.payments[key] || 0) + total;
      }
    });
    return result;
  }
  function productSummary(tickets) {
    const products = arrayOf('products');
    const result = new Map();
    tickets.forEach(sale => {
      (Array.isArray(sale.items) ? sale.items : []).forEach(item => {
        const productId = item.id != null ? item.id :
          (item.productId != null ? item.productId : item.product_id);
        const product = products.find(p => productId != null && String(p.id) === String(productId));
        const name = String(item.name || product?.name || 'Producto').trim();
        const rawQty = item.qty != null ? item.qty :
          (item.quantity != null ? item.quantity : (item.cantidad != null ? item.cantidad : 1));
        const qty = Number(rawQty) || 0;
        const rawUnit = String(item.unit || item.saleUnit || item.sale_unit || item.unitType ||
          item.measureUnit || item.measure_unit || item.quantityUnit || item.presentation ||
          item.saleUnitName || item.unitName || item.unidadMedida ||
          product?.unit || product?.saleUnit || product?.sale_unit || product?.unitType ||
          product?.measureUnit || product?.measure_unit || product?.quantityUnit ||
          product?.presentation || product?.unidad || product?.unidades ||
          product?.saleUnitName || product?.unitName || product?.unidadMedida || '').trim();
        const unit = normalize(rawUnit).replace(/[.]/g, '');
        const unitAliases = {
          'kg':'kg','kilo':'kg','kilos':'kg','kilogramo':'kg','kilogramos':'kg',
          'g':'g','gr':'g','gramo':'g','gramos':'g','gram':'g',
          'unidad':'unidad','unidades':'unidad','unid':'unidad','und':'unidad','u':'unidad',
          'caja':'caja','cajas':'caja','blister':'blister','blisters':'blister',
          'paquete':'paquete','paquetes':'paquete'
        };
        const productName = normalize(name);
        const inferredUnit = unitAliases[unit] || (
          /zanahoria/.test(productName) ? 'kg' : ''
        );
        const isGram = inferredUnit === 'g';
        const weighted = item.saleType === 'weight' || item.byWeight === true ||
          product?.saleType === 'weight' || product?.byWeight === true ||
          ['kg','g'].includes(inferredUnit) ||
          (!Number.isInteger(qty) && qty > 0);
        const key = normalize(name);
        if (!result.has(key)) result.set(key, {name, qty: 0, weighted: false, unit: inferredUnit || rawUnit || 'unidad', unitKind: inferredUnit, grams: false});
        const entry = result.get(key);
        entry.qty += qty;
        if (weighted) entry.weighted = true;
        if (inferredUnit && (!entry.unitKind || entry.unitKind === 'unidad')) entry.unitKind = inferredUnit;
        if (isGram) entry.grams = true;
        if (!entry.unitKind && rawUnit) entry.unit = rawUnit;
      });
    });
    return result;
  }
  function displayProductQuantity(info) {
    const unit = normalize(info.unitKind || info.unit || 'unidad');
    if (unit === 'g' || unit === 'gramo' || unit === 'gramos') {
      const grams = info.qty * (info.qty <= 100 ? 1000 : 1);
      return numberText(grams) + ' g';
    }
    if (unit === 'kg' || info.weighted) {
      if (info.qty > 0 && info.qty < 1) return numberText(info.qty * 1000) + ' g';
      return numberText(info.qty) + ' kg';
    }
    const aliases = {unidad:'Unidad',unidades:'Unidad',caja:'Caja',cajas:'Caja',blister:'Blíster',blisters:'Blíster',paquete:'Paquete',paquetes:'Paquete'};
    return numberText(info.qty) + ' ' + (aliases[unit] || info.unit || 'Unidad');
  }
  function visible(element) {
    if (!element || !element.getClientRects().length) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0;
  }
  function findReportModal() {
    const candidates = Array.from(document.querySelectorAll('dialog,[role="dialog"],.modal,div,section,article'))
      .filter(element => {
        if (!visible(element)) return false;
        const value = normalize(element.innerText || element.textContent || '');
        return value.includes('ticket promedio') && value.includes('productos mas vendidos') &&
          value.length < 7000;
      });
    candidates.sort((a, b) =>
      String(a.innerText || a.textContent || '').length -
      String(b.innerText || b.textContent || '').length);
    return candidates[0] || null;
  }
  function leafWithText(root, label) {
    return Array.from(root.querySelectorAll('*')).find(element =>
      element.children.length === 0 && normalize(element.textContent) === normalize(label));
  }
  function setValueBesideLabel(root, label, pattern, value) {
    const labelElement = leafWithText(root, label);
    if (!labelElement) return;
    let parent = labelElement.parentElement;
    for (let depth = 0; parent && depth < 5; depth++, parent = parent.parentElement) {
      const values = Array.from(parent.querySelectorAll('*')).filter(element =>
        element.children.length === 0 && element !== labelElement && pattern.test(String(element.textContent || '').trim()));
      if (!values.length) continue;
      values.sort((a, b) => String(a.textContent).length - String(b.textContent).length);
      const target = values[0];
      if (String(target.textContent).trim() !== String(value)) target.textContent = String(value);
      return;
    }
  }
  function appendProductUnits(root, productMap) {
    const numberWithOptionalUnit = /^-?\d+(?:[.,]\d+)?(?:\s*(?:kg|g|gr|gramos?|unidades?|unid\.?|cajas?|bl[ií]ster(?:es)?|paquetes?))?$/i;
    productMap.forEach((info, key) => {
      const productLabel = leafWithText(root, info.name);
      if (!productLabel) return;
      let parent = productLabel.parentElement;
      for (let depth = 0; parent && depth < 5; depth++, parent = parent.parentElement) {
        const quantities = Array.from(parent.querySelectorAll('*')).filter(element =>
          element.children.length === 0 && element !== productLabel &&
          numberWithOptionalUnit.test(String(element.textContent || '').trim()));
        if (!quantities.length) continue;
        quantities.sort((a, b) => String(a.textContent).length - String(b.textContent).length);
        const target = quantities[0];
        const rendered = displayProductQuantity(info);
        if (String(target.textContent).trim() !== rendered) target.textContent = rendered;
        return;
      }
    });
  }
  function patchReport() {
    try {
      const modal = findReportModal();
      if (!modal) return;
      const sales = validSaleRows();
      if (!sales.length) return;
      const tickets = generatedTicketSales(sales);
      if (!tickets.length) return;
      const totalSales = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
      setValueBesideLabel(modal, 'Ticket promedio', /^S\/\s*[\d,.]+$/i,
        money(totalSales / tickets.length));
      appendProductUnits(modal, productSummary(sales));
    } catch (error) {
      console.warn('Varelia: no se pudo actualizar el resumen por tickets', error);
    }
  }
  function start() {
    const observer = new MutationObserver(() => patchReport());
    if (document.documentElement) observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true
    });
    document.addEventListener('click', () => window.setTimeout(patchReport, 80), true);
    window.addEventListener('focus', patchReport);
    window.addEventListener('pageshow', patchReport);
    window.setInterval(patchReport, 2500);
    patchReport();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();