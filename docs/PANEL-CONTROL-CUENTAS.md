# Panel principal de cuentas de Varelia

Cuenta principal solicitada: mquispe160993@gmail.com.

Estado: cuenta principal confirmada el 24 de octubre de 2026. Panel y controles de bloqueo preparados.
El envío de códigos y la aprobación obligatoria de registros nuevos siguen sin activar: falta el proveedor de correo.
Las cuentas bloqueadas o retiradas no pueden reactivarse directamente; el servidor exige completar la aprobación por código.
No se han bloqueado cuentas reales durante la instalación.

## Organización

- Cuenta principal: controla solicitudes y cuentas de todos los negocios.
- Administrador afiliado: administra únicamente su negocio.
- Vendedor: pertenece al negocio de un administrador afiliado.
- Las cuentas existentes conservan su acceso durante la incorporación del panel.

## Pantalla principal

Pestañas: Pendientes, Administradores afiliados, Vendedores y Actividad.
Filtros por correo, nombre, negocio y estado.
Cada administrador muestra su negocio y sus vendedores asociados.
Acciones: agregar mediante invitación, aprobar, rechazar, bloquear, reactivar
y retirar acceso, con registro de quién realizó cada acción y cuándo.
Retirar acceso no debe borrar ventas, tickets ni inventario históricos.

## Solicitudes y códigos

1. Una cuenta nueva se registra y confirma su correo.
2. Se crea una solicitud pendiente y se notifica a la cuenta principal.
3. El correo de la cuenta principal recibe el código, correo solicitante,
   negocio y tipo de cuenta. El código pertenece a una sola solicitud,
   caduca, tiene límite de intentos y se guarda únicamente mediante hash.
4. La cuenta principal, con sesión autenticada, confirma el código y aprueba.
5. El servidor activa la cuenta y registra la decisión. Una cuenta pendiente
   no puede acceder a los datos del negocio, tampoco mediante la API.

## Comprobaciones necesarias antes de activar

- Verificación real del correo principal y asignación por identidad Auth.
- Configurar y verificar un servicio de correo transaccional; actualmente no
  se encontró una integración de correo en el proyecto de Vercel.
- Validar que los códigos lleguen al destinatario y no se muestren a solicitantes.
- Validar separación entre negocios y que un afiliado no se eleve a principal.
- Probar código incorrecto, vencido, reutilizado, reenvíos y solicitudes repetidas.
- Bloquear cuentas también en servidor y revocar sesiones pertinentes.
- Probar propietario, vendedor, cuenta pendiente, bloqueada y principal.
- Activar el requisito de aprobación solo cuando el panel y el correo funcionen.

## Validación de servidor

Pasaron 15 comprobaciones nuevas en tests/account-control.sql y las 31 existentes
en tests/database-release.sql. Los usuarios de prueba y cambios de acceso se
revirtieron con ROLLBACK. No se enviaron invitaciones reales en las pruebas.

## Correo pendiente

Se necesita conectar un servicio de correo transaccional y verificar un dominio
remitente. El usuario confirmó que todavía no dispone de ese servicio.
El panel muestra esa limitación; no genera códigos falsos ni simula entregas.
Las invitaciones utilizan el servicio Auth de Supabase y muestran cualquier error
de envío; su entrega física no se ha certificado.
