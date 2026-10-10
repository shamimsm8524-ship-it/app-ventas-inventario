# Sincronización automática Varelia 2.0

## Comportamiento esperado
- Supabase es la fuente de verdad para web y APK.
- Cada cliente consulta datos iniciales al abrir y se suscribe a cambios solo de su negocio.
- Tablas: productos, ventas, inventario, pedidos, configuración y estados.
- Un cambio se refleja sin recargar; al reconectar se vuelve a consultar el estado completo, no se confía solo en eventos perdidos.
- Mostrar estados: Conectado, Reconectando, Sin conexión, Error. Nunca dejar 'Conectando...' indefinidamente.
- Suscripciones se limpian al cambiar de negocio o cerrar sesión.
- Usar filtros por business_id y RLS; validar autorización en backend. Los eventos públicos del catálogo solo deben exponer datos publicados, nunca tablas privadas.
- Evitar múltiples suscripciones o escrituras duplicadas; usar idempotencia en checkout y ventas.
- Inventario y venta se registran en una sola transacción en servidor con bloqueo/validación de stock.
- No prometer modo offline de ventas hasta implementar cola persistente, claves idempotentes, resolución de conflictos y pruebas.

## Implementación compartida de frontend
`web/sync.js` contiene el gestor de conexión/reconexión. La app debe llamar a `VareliaSync.connect(client, businessId, handlers)` después de autenticarse y verificar membresía; llamar `disconnect()` al salir o cambiar negocio.

## Pendiente
Configurar Supabase Realtime publication para tablas privadas autorizadas; integrar gestor con las vistas reales, probar web/APK, caídas de internet, RLS y dos negocios simultáneos.
