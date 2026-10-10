# Varelia 2.0 — arquitectura multiusuario

## Requisitos
- Comenzar con base de datos nueva y vacía. NO borrar el proyecto anterior hasta contar con respaldo y aceptación explícita del usuario.
- Inicio de sesión con Google/Gmail mediante Supabase Auth. No usar correo como identificador: usar auth.uid() inmutable.
- Cada usuario puede crear un negocio propio. El negocio es el límite de aislamiento de datos.
- Un propietario puede invitar vendedores a su negocio con permisos limitados. El vendedor no debe obtener acceso a otros negocios.
- Cada tabla de negocio tendrá business_id obligatorio y políticas RLS que verifiquen membresía y permisos.
- Productos, categorías, movimientos, ventas, comprobantes, caja, clientes, proveedores, compras, ajustes, reportes y vendedores deben quedar aislados por business_id.
- Los comprobantes e imágenes deben usar rutas de Storage por business_id y políticas de acceso equivalentes.
- Sincronización en tiempo real opcional: la lectura inicial y el guardado no deben depender de Realtime; reintentos y reconciliación al recuperar conexión.
- Web y APK usarán el mismo backend; el APK será un cliente Android con gestión segura de sesión y almacenamiento.
- No publicar en vareliastore.tech ni sustituir la APK actual hasta superar pruebas.

## Modelo de datos propuesto
businesses(id, owner_user_id, name, created_at)
business_members(business_id, user_id, role, status)
products(id, business_id, name, sku, stock, price, ...)
categories(id, business_id, name, ...)
stock_movements(id, business_id, product_id, quantity_delta, ...)
sales(id, business_id, seller_user_id, total, ...)
sale_items(id, business_id, sale_id, product_id, quantity, ...)
receipts(id, business_id, sale_id, number, ...)
cash_sessions(id, business_id, opened_by, ...)
suppliers(id, business_id, ...)
purchases(id, business_id, ...)
customers(id, business_id, ...)

## Reglas técnicas
- Activar RLS en todas las tablas privadas y probar acceso cruzado entre dos Gmail.
- Usar transacciones/RPC atómicas para venta + descuento de stock + comprobante.
- Idempotencia para evitar ventas duplicadas durante reintentos.
- Restricciones de claves foráneas compuestas para impedir relaciones entre negocios.
- No exponer claves de servicio en la app.
- Conservar respaldo independiente del repositorio y de Supabase anterior antes de cualquier limpieza destructiva.

## Validación de aceptación
1. Gmail A crea productos y ventas; Gmail B no puede leerlos ni modificarlos.
2. Un vendedor invitado ve únicamente el negocio autorizado y las funciones permitidas.
3. Web y APK del mismo negocio muestran los mismos productos, ventas y comprobantes.
4. Cerrar y reabrir la APK restaura sesión y datos sin bucles.
5. Modo sin red informa claramente el estado y reconcilia sin duplicados.
6. Ninguna operación de borrado del entorno antiguo ocurre automáticamente.
