# Revisión de Varelia — 23 de octubre de 2026

## Cambios realizados

- Compra por lote con cantidad explícita y cálculo de costo unitario con seis decimales en la nube.
- Costos de compra independientes en cada presentación comercial, además de sus precios de venta.
- Registro del costo de la presentación elegida en cada venta para conservar las ganancias históricas.
- Guardado conjunto de producto, presentaciones y características; se conserva el formulario al fallar la sincronización.
- Un solo controlador para guardar productos; las imágenes continúan en IndexedDB.
- Validación de códigos repetidos, costos negativos y cantidades inválidas; se conservan cantidades decimales de mercadería por peso.
- Formato del importe cero, escape de texto HTML, persistencia del tema y correcciones de inicialización de navegación móvil.
- Automatización de pruebas y publicación estática reparada; compilación de APK solo por solicitud manual.

## Datos corregidos con confirmación del propietario

- Vaporera: cajón de S/120 con 36 unidades; costo unitario S/3.333333.
- La venta afectada de una unidad a S/15 ahora registra ganancia de S/11.67.
- Medio cajón: 18 unidades, en lugar de 19.
- El cajón conserva su precio de venta y registra costo de compra S/120. Los otros costos independientes no se inventaron.

## Comprobaciones

- 108 archivos y bloques JavaScript comprobados sintácticamente.
- 24 pruebas de regresión de cálculos, validaciones y persistencia.
- Pruebas transaccionales reales de venta unitaria, docenas, stock insuficiente, cantidad cero, mínimo mayorista y costos independientes. Los datos de prueba se revirtieron.
- Prueba de navegador Chromium móvil con servicios externos simulados: verifica el toque del botón Google y el guardado de costos independientes. No sustituye una sesión real con Google ni pruebas físicas de cámara o impresora.

## Publicación y límites

Los cambios están en GitHub. GitHub Pages puede publicar la copia estática.
Vercel rechazó temporalmente despliegues con HTTP 402 por límite diario. Después aceptó el último commit dc1c0a82d2a4b38ea11464d276a293f9bed7f9d8. El despliegue dpl_21GWz6bE4nujiGq85rwHuANpat1f está READY en producción y asociado a vareliastore.tech y www.vareliastore.tech. La auditoría de navegador móvil del mismo commit terminó correctamente (ejecución 39889453838).

No se garantiza ausencia absoluta de errores: quedan fuera de la prueba automatizada el teléfono físico, impresoras, cámara y el consentimiento real de Google.


## Segunda revisión: funciones, cuentas y navegación móvil

- Se bloquearon cambios directos de rol, permisos, negocio y plan desde clientes autenticados. Las políticas de compras y caja comprueban quién crea el registro.
- Cobros normales y fiados usan una clave persistida de intento; repetir el mismo cobro devuelve la venta original.
- Stock por talla/color se descuenta y repone dentro de la transacción de venta/devolución. Los borradores no restauran inventario sincronizado agotado ni se comparten entre cuentas.
- Las cantidades decimales sobreviven a reposiciones y devoluciones. Los ajustes manuales se confirman contra el stock actual del servidor.
- La edición de productos usa control de versión y bloquea dobles envíos; un reintento conserva el ID del producto.
- Se corrigieron navegación a compras/proveedores, los botones de editar/eliminar proveedor y restauraciones de pantalla tardías.
- Proveedores y nuevas compras se guardan en la nube. La compra registra artículos, costos y stock atómicamente, revierte todo ante un artículo inválido y permite reintentos sin duplicación. Las compras históricas locales se conservan; no se vuelven a aplicar al stock.
- La salida de sesión limpia datos visibles, carrito, comprobantes y conexiones de inventario.

Validación: 27 pruebas de regresión de JavaScript y 31 comprobaciones transaccionales de PostgreSQL con usuarios temporales y rollback. Navegador Chromium móvil: Google responde, formulario de producto, ocho pantallas, seis pestañas móviles, creación/edición de proveedor y formulario real de ingreso de mercadería con backend simulado. Se inspeccionaron capturas de acceso, presentaciones, inventario y caja.

Límites: la apertura visual de una pantalla no certifica todas sus operaciones. El consentimiento real de Google, cámara, Bluetooth e impresión requieren prueba en equipo físico. Los nuevos cierres de caja se confirman en la nube y admiten reintentos. Se conserva su cálculo actual como instantánea de caja; los cierres históricos locales no se migran automáticamente.
