// Estilo visual directo para el cliente
const clientStockStyle = document.createElement('style');
clientStockStyle.textContent = `
  .public-stock-text {
    font-size: 12px;
    font-weight: 800;
    color: var(--p, #be185d);
    margin-top: 4px;
    display: inline-block;
  }
`;
document.head.appendChild(clientStockStyle);

// Función para mostrar solo la cantidad restante
window.formatoStockCliente = function(stock, unit) {
  const cant = Number(stock || 0);
  const u = unit ? unit : 'unidades';
  return `<div class="public-stock-text">Quedan ${cant} ${u}</div>`;
};
