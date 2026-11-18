# Integraciones - Promociones-TITEC

## Evaluación 3

El módulo Promociones-TITEC administra códigos promocionales, permite validarlos mediante una API REST y registra su uso cuando recibe eventos de pago.

Se declaran las tres integraciones exigidas para la evaluación.

| Integración | Tipo | Módulo contraparte | Servicio, ruta o tópico | Cómo se evidencia | Dónde verificarlo |
|---|---|---|---|---|---|
| I1 | A. Autenticación | Auth | `GET /internal/validar-sesion` | Validación de sesión y restricción por rol | Rutas de Promociones y logs de Auth |
| I2 | B. API Gateway | API Gateway (consumidor previsto: Entradas) | `POST /api/promociones/validar/{nombre_codigo}` | Respuesta HTTP y trazas con `x-request-id` | Logs del Gateway y de Promociones |
| I3 | C. Broker | Pagos | `pago.completado` | Consumo del evento y registro del uso del cupón | RabbitMQ, logs de Promociones y MongoDB |

## I1. Autenticación

Promociones consulta a Auth para validar la sesión del usuario.

Las operaciones de creación y modificación requieren una sesión válida y un rol autorizado (`organizador` o `staff`).

Archivos:
- `backend-promociones/src/clients/authCliente.js`
- `backend-promociones/src/middlewares/authMiddleware.js`
- `backend-promociones/src/routes/promocionRoutes.js`

Prueba local realizada:
- Crear una promoción sin sesión devuelve HTTP 401 y el mensaje `Debes iniciar sesión`.
- Editar una promoción sin sesión también fue rechazado con HTTP 401.

Pendiente:
- Verificar inicio de sesión y roles con Auth real en workstation.
- Comprobar el rechazo de sesiones o tokens inválidos o vencidos.
- Confirmar el uso de la sesión sin copiar tokens manualmente.
- Comprobar una operación autorizada con rol `organizador` o `staff` y el rechazo HTTP 403 de un usuario autenticado sin ese rol.

Contrato de referencia:
- `arquitectura-main/CONTRATO_INTEGRACION_AUTH.md` (repositorio del equipo de Auth).

## I2. API Gateway

Promociones provee la validación de cupones mediante el API Gateway.

Ruta:
`POST /api/promociones/validar/{nombre_codigo}`

La dirección del Gateway se configura según el entorno de despliegue.

Pruebas locales realizadas:
- Consulta de promociones: HTTP 200.
- Validación de un cupón existente: HTTP 200.
- Validación de un cupón inexistente: HTTP 404.

### Comando de verificación local

Ejecutar en PowerShell:

```powershell
$datos = @{
    id_evento = "evt-demo"
    cantidad_entradas = 1
    precio_base = 15000
    usuario = @{
        id_usuario = "prueba-gw-1711"
        rol_usuario = "cliente"
    }
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post `
    -Uri "http://localhost:8080/api/promociones/validar/INTEGRACION2910" `
    -ContentType "application/json" `
    -Body $datos
```

Si el cupón es válido, el servicio debe responder indicando que la promoción es válida y entregar el porcentaje de descuento correspondiente. En la prueba local se obtuvo `{"valido":true,"porcentaje_descuento":20,"id_evento":"evt-demo"}`.

### Trazabilidad de solicitudes

Se comprobó que el Gateway recibe las solicitudes HTTP y las reenvía correctamente al backend de Promociones.

Al enviar un identificador `x-request-id` desde el cliente, este se conserva en la respuesta del Gateway y aparece en los logs del backend.

Ejemplo de prueba:

```powershell
curl.exe -i -H "x-request-id: prueba-i2-gateway-1811" "http://localhost:8080/api/promociones/evento/evt-demo"
```

La solicitud respondió HTTP 200 y el mismo identificador apareció en los logs de Promociones.

**Observación:** cuando el Gateway generó automáticamente el identificador en una prueba local, este no apareció en los logs del backend (`id=sin-id`). La propagación automática queda pendiente de verificar con el equipo responsable del Gateway.

### Logs de verificación

```powershell
docker logs --tail 20 ticketu-api-gateway
docker logs --tail 20 promociones-service
```

Los registros permiten comprobar las solicitudes procesadas por ambos servicios. Para correlacionarlas con certeza debe verificarse un `x-request-id` compartido.

La prueba debe repetirse en workstation utilizando los datos iniciales y la dirección del Gateway correspondiente.

## I3. Broker

Promociones consume eventos del microservicio Pagos mediante RabbitMQ.

Configuración:
- Exchange: `ticketu.events`
- Routing key: `pago.completado`
- Cola: `promociones.pagos`
- Virtual host: `ticketu`

Archivos:
- `backend-promociones/src/events/broker.js`
- `backend-promociones/src/events/pagoConsumer.js`

Contrato de referencia:
- `arquitectura-pagos-main/docs/contratos/Contrato_Promociones_Pagos_v1.1.docx` (repositorio del equipo de Pagos).

Pruebas locales realizadas:
- Promociones recibió y procesó un evento `pago.completado` publicado manualmente.
- Se registró el uso del cupón en MongoDB.
- El stock disminuyó de 9 a 8.
- Un pago repetido se identificó como duplicado.
- El pago duplicado no modificó nuevamente el stock.

### Verificación de la suscripción

Se comprobó la configuración de RabbitMQ con los siguientes comandos:

```powershell
docker exec ticketu-rabbitmq rabbitmqctl list_queues -p ticketu name messages consumers

docker exec ticketu-rabbitmq rabbitmqctl list_bindings -p ticketu source_name destination_name routing_key
```

Resultados:
- La cola `promociones.pagos` existe.
- La cola tenía un consumidor conectado y ningún mensaje pendiente al momento de la consulta.
- La cola está asociada al exchange `ticketu.events`.
- La routing key utilizada es `pago.completado`.
- El backend registra `[Broker] Suscrito a promociones.pagos`.

Las pruebas de procesamiento se realizaron con eventos publicados manualmente en el entorno local. La integración con un evento emitido por el módulo Pagos real sigue pendiente de comprobar en workstation.

### Logs de verificación

```powershell
docker logs --tail 30 promociones-service
```

En los registros se puede observar el identificador del pago, la fecha y el estado del procesamiento.

### Prueba de disponibilidad del broker

- Se ejecutó una segunda instancia del backend con una dirección de RabbitMQ inaccesible.
- Se registraron los intentos fallidos de conexión.
- El endpoint `/health` continuó respondiendo HTTP 200.
- La prueba se realizó localmente, sin interrumpir el broker compartido.

Pendiente:
- Comprobar la recepción de un evento emitido por el módulo Pagos real en workstation.
- Repetir la prueba de disponibilidad con la configuración definitiva de workstation.

## Observación

Las pruebas descritas fueron realizadas en un entorno local. Las tres integraciones deben verificarse nuevamente en el ambiente de pruebas del curso (workstation), con los servicios compartidos y las credenciales correspondientes.

Las rutas, los identificadores de eventos y los usuarios de los ejemplos corresponden al entorno de pruebas local y deben ajustarse a los datos disponibles en workstation.
