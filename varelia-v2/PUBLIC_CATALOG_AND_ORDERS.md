# Varelia 2.0 — catálogo público, pedidos y comprobantes

## Catálogo público por negocio
- URL pública única por negocio, compartible en WhatsApp y redes sociales.
- Mostrar solo productos publicados por el propietario; nunca exponer costos, ganancias, datos privados de clientes ni inventarios de otros negocios.
- Filtros por categoría, nombre, código y variantes; fotos y precios configurados por negocio.
- Selección de unidad, caja, blíster, peso (kg/g), talla y color cuando aplique.
- Carrito, cantidades y cálculo del total con conversión de presentaciones.
- Opciones configurables: delivery, recojo en tienda, transportistas y tarifas.
- Mostrar medios de pago aceptados y QR Yape/Plin del negocio cuando el dueño los configure.
- Redes sociales, horario, ubicación, contacto y WhatsApp del negocio.

## Pedidos
- Generar número único por negocio y comprobante de pedido con logo, nombre, datos de contacto, productos, presentación, cantidad, subtotal, envío, total y estado.
- Estados: pendiente, confirmado, pagado, preparado, enviado, entregado, cancelado.
- La orden pendiente NO es comprobante de pago ni venta confirmada.
- El vendedor/propietario revisa pedidos en Administración > Pedidos, confirma disponibilidad y pago.
- Reservas o descuentos de stock solo mediante reglas explícitas y operaciones transaccionales; evitar ventas duplicadas.
- Enviar confirmación por WhatsApp con enlace al pedido, sin exponer información privada a terceros.
- Los comprobantes de pedido deben seguir el mismo estilo térmico de Varelia y permitir imprimir/descargar PDF.
- Tras confirmación de venta, emitir comprobante interno de venta distinto, con el estilo ya aprobado.

## Seguridad
- La lectura pública del catálogo se hará mediante una vista/API limitada que exponga solo campos públicos.
- El cliente no podrá modificar precios, stock, estado de pago o business_id desde el navegador.
- Las órdenes públicas se validarán en backend con controles antiabuso, identificador no adivinable y restricciones de acceso.
- Cada negocio conserva su identidad, logo, tema y datos aislados de los demás negocios.
- No publicar ni activar el catálogo hasta completar pruebas de seguridad y flujo de pedidos.
