# Varelia 2.0 — diseño de comprobantes (referencia del usuario)

## Estilo visual confirmado
- Basar todos los comprobantes internos de venta en la captura aportada: modal blanco con bordes redondeados, cabecera «Comprobante de venta», ticket central de estilo térmico/monoespaciado, divisores punteados y total destacado.
- Encabezado con nombre y logo configurables del negocio, leyenda «COMPROBANTE INTERNO DE VENTA».
- Número único por negocio, fecha y hora, método de pago y vendedor.
- Detalle de productos, variantes, presentación (unidad, caja, blíster, kg, g), cantidades, precios, descuentos y total.
- Para efectivo: recibido y vuelto. Para pago mixto: desglose de métodos.
- Pie personalizable: «Gracias por su compra» y aclaración de comprobante interno.
- Acciones: Imprimir, Descargar PDF, Enviar por WhatsApp, Cerrar. NO mostrar controles bloqueados salvo que la función aún no esté implementada y se explique claramente.
- Botones AZULES por defecto; el propietario puede cambiar el color en Apariencia. La versión impresa debe seguir siendo legible en blanco y negro.
- Adaptar ticket a rollos de 58 mm y 80 mm, vista web, APK y PDF.
- El comprobante debe ser un registro inmutable de la venta, no depender de datos actuales del producto que puedan cambiar.
- Aislamiento por business_id: cada negocio ve solo sus propios comprobantes; vendedor según permisos.
- No confundir comprobante interno con boleta/factura electrónica SUNAT: la emisión fiscal requiere integración y cumplimiento separados.
- Pruebas obligatorias: imprimir Bluetooth real, exportación PDF, compartir WhatsApp, múltiples artículos, decimales, variantes, pagos mixtos, reimpresión y anulaciones auditables.
