# Varelia 2.0 — estado real de implementación y lanzamiento seguro

## Código implementado en esta rama
- `web/receipt.js` y `web/receipt.css`: componente de ticket para pedidos y ventas, datos por negocio y estilo aprobado.
- `storefront/index.html` y `storefront/storefront.js`: catálogo público por ID de negocio, búsqueda, carrito, formulario, pedido por RPC y modal de comprobante.
- `supabase/001_initial_schema.sql` y `002_public_storefront.sql`: borradores de tablas y funciones, NO aplicados ni verificados.

## Bloqueantes antes de poner en producción
1. Crear un proyecto Supabase NUEVO; configurar OAuth Google y URLs autorizadas.
2. Probar migraciones SQL en una base de datos desechable. Revisar las FK compuestas, roles, privilegios de tabla, SECURITY DEFINER y políticas RLS. **No aplicar ciegamente las migraciones**.
3. Implementar anti-spam de pedidos con CAPTCHA validado en servidor, rate limiting y límites de solicitudes; idempotencia de checkout para evitar pedidos duplicados.
4. Garantizar que el pedido se crea íntegramente y que la respuesta devuelve un snapshot inmutable y verificable del precio/productos para imprimir el comprobante. La UI actual usa snapshot del carrito y es preliminar.
5. Implementar panel privado de administración de catálogo: publicación por producto, personalización de logo, dirección, RUC, pie de ticket, redes, Yape/Plin y costos de entrega.
6. Implementar panel de pedidos, cambios de estado autorizados, confirmación de pago, conversión a venta, stock y transacciones atómicas.
7. Implementar checkout POS seguro, caja, reportes, costos, ganancias, fiados, variantes, peso, códigos de barras, inventario, proveedores, compras y permisos de vendedores.
8. Añadir pruebas automatizadas de aislamiento entre negocios, pedidos manipulados, cálculo de peso y stock concurrente.
9. Validar responsive y accesibilidad, impresión térmica 58/80 mm, Bluetooth Android, PDF real y compartir WhatsApp.
10. Configurar hosting y empaquetar APK Android; pruebas en dispositivos reales y revisión de seguridad.

## Importante
- El catálogo `storefront/` no se ha desplegado ni probado en navegador real.
- La URL prevista es `/storefront/?business=<UUID>`, cuando exista hosting configurado.
- Los botones de comprobante 'Descargar comprobante' abren impresión del navegador para elegir guardar como PDF; no hay exportación PDF nativa todavía.
- Los pedidos NO deben aceptarse públicamente hasta cerrar los bloqueantes de seguridad.
- Nunca borrar app, GitHub, Vercel o datos anteriores sin respaldo y autorización explícita.
