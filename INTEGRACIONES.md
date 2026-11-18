# Integraciones - Promociones-TITEC

## Evaluación 3

El módulo Promociones-TITEC administra códigos promocionales, permite validarlos mediante una API REST y registra su uso cuando recibe eventos de pago.

Para la evaluación se implementaron las siguientes integraciones:

| Integración | Tipo | Módulo contraparte | Servicio, ruta o tópico | Cómo se evidencia |
|---|---|---|---|---|
| I1 | A. Autenticación | Auth | `GET /internal/validar-sesion` | Validación de sesiones y restricción de acceso según el rol |
| I2 | B. API Gateway | API Gateway (consumidor previsto: Entradas) | `POST /api/promociones/validar/{nombre_codigo}` | Respuestas HTTP y trazabilidad con `x-request-id` |
| I3 | C. Broker | Pagos | `pago.completado` | Consumo del evento, registro del uso y actualización del stock |

## I1. Autenticación

Promociones consulta al servicio Auth para validar la sesión del usuario. La solicitud se realiza mediante el endpoint `GET /internal/validar-sesion`, enviando la cookie de sesión y la clave interna `x-api-key`.

Las operaciones de creación y modificación de promociones requieren una sesión válida y un rol autorizado (`organizador` o `staff`). Los compradores no tienen permisos para administrar promociones.

**Archivos:**
- `backend-promociones/src/clients/authCliente.js`
- `backend-promociones/src/middlewares/authMiddleware.js`
- `backend-promociones/src/routes/promocionRoutes.js`

### Pruebas locales realizadas

Se levantó el servicio Auth real junto con PostgreSQL y Keycloak. Se inicializó su base de datos y se ejecutó el procedimiento de preparación de usuarios QA, que finalizó con nueve cuentas y nueve inicios de sesión correctos.

Posteriormente se comprobó lo siguiente:

- Promociones pudo comunicarse con Auth a través de la red interna de Docker.
- Una solicitud a `/internal/validar-sesion` sin cookie respondió HTTP 401.
- El inicio de sesión de un usuario organizador respondió HTTP 200.
- Auth validó correctamente la sesión del organizador, devolviendo HTTP 200 y el rol `organizador`.
- Una solicitud de creación de promoción sin sesión respondió HTTP 401 con el mensaje `Debes iniciar sesión`.
- Una solicitud de creación con sesión válida de organizador llegó al controlador. Al no incluir los datos obligatorios, respondió HTTP 400 con el mensaje `Debes ingresar un código promocional`.
- Un comprador pudo iniciar sesión, pero al intentar crear una promoción recibió HTTP 403 con el mensaje `No tienes permisos para administrar promociones`.
- La modificación de una promoción sin sesión también fue rechazada con HTTP 401.

Estas pruebas se realizaron a través de los servicios reales de Auth y Promociones, utilizando el API Gateway para las solicitudes de creación.

### Pendiente de comprobar

- El flujo completo desde el navegador, incluyendo el envío automático de cookies.
- El rechazo de sesiones vencidas o revocadas.
- Una creación o modificación exitosa con todos los datos requeridos.
- La autorización de un usuario `staff`.
- La repetición de las pruebas con los servicios compartidos en workstation.

**Contrato de referencia:**
- `arquitectura-main/CONTRATO_INTEGRACION_AUTH.md` (repositorio del equipo de Auth).

## I2. API Gateway

Promociones provee la validación de códigos promocionales mediante el API Gateway.

**Ruta:**

`POST /api/promociones/validar/{nombre_codigo}`

La dirección del Gateway se configura según el entorno de despliegue.

### Pruebas locales realizadas

- Consulta de promociones de un evento: HTTP 200.
- Validación de un código existente: HTTP 200.
- Validación de un código inexistente: HTTP 404.
- Solicitud con parámetros incompletos: HTTP 400.

### Comando de verificación local

Ejecutar en PowerShell:

```powershell
$datos = @{
    id_evento = "evt-demo"
    cantidad_entradas = 1
    usuario = @{
        id_usuario = "qa-prueba"
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod `
    -Uri "http://localhost:8080/api/promociones/validar/INTEGRACION2910" `
    -Method POST `
    -ContentType "application/json" `
    -Body $datos
```

En la prueba local se obtuvo:

```json
{
  "valido": true,
  "porcentaje_descuento": 20,
  "id_evento": "evt-demo"
}
```

El resultado confirma que el Gateway recibe la solicitud, la reenvía a Promociones y entrega la respuesta correspondiente. La validación del código no descuenta stock.

### Trazabilidad de solicitudes

Se comprobó que el Gateway recibe las solicitudes HTTP y las reenvía al backend de Promociones.

Cuando el cliente envía un identificador `x-request-id`, este se conserva en la respuesta del Gateway y aparece en los logs del backend.

**Ejemplo de prueba:**

```powershell
curl.exe -i -H "x-request-id: prueba-i2-gateway-1811" "http://localhost:8080/api/promociones/evento/evt-demo"
```

La solicitud respondió HTTP 200 y el identificador apareció en los registros de Promociones.

**Observación:** en una prueba donde el Gateway generó automáticamente el identificador, el backend registró `id=sin-id`. Por lo tanto, la propagación del identificador generado por el Gateway todavía requiere revisión con el equipo responsable.

### Logs de verificación

```powershell
docker logs --tail 20 ticketu-api-gateway
docker logs --tail 20 promociones-service
```

Estos registros permiten revisar las solicitudes procesadas por ambos servicios. Para correlacionarlas se utiliza el identificador `x-request-id` cuando está disponible en los dos registros.

La prueba debe repetirse en workstation con la dirección del Gateway y los datos correspondientes a ese entorno.

## I3. Broker

Promociones consume eventos del microservicio Pagos mediante RabbitMQ.

**Configuración:**
- Exchange: `ticketu.events`
- Routing key: `pago.completado`
- Cola: `promociones.pagos`
- Virtual host: `ticketu`

**Archivos:**
- `backend-promociones/src/events/broker.js`
- `backend-promociones/src/events/pagoConsumer.js`

**Contrato de referencia:**
- `arquitectura-pagos-main/docs/contratos/Contrato_Promociones_Pagos_v1.1.docx` (repositorio del equipo de Pagos).

### Pruebas locales realizadas

Se comprobó el procesamiento de eventos publicados manualmente en RabbitMQ:

- Promociones recibió y procesó un evento `pago.completado`.
- Se registró el uso del código promocional en MongoDB.
- El stock disminuyó de 9 a 8.
- Al publicar nuevamente el mismo pago, el consumidor lo identificó como duplicado.
- El pago duplicado no modificó por segunda vez el stock.

### Verificación de la suscripción

La conexión con RabbitMQ se comprobó mediante:

```powershell
docker exec ticketu-rabbitmq rabbitmqctl list_queues -p ticketu name messages_ready messages_unacknowledged consumers
```

La última prueba entregó:

```text
name                messages_ready  messages_unacknowledged  consumers
promociones.pagos   0               0                        1
```

Esto confirma que la cola `promociones.pagos` existe, no tiene mensajes pendientes y mantiene un consumidor conectado.

También se verificó su asociación con el exchange `ticketu.events` y la routing key `pago.completado`.

El backend registra la suscripción a la cola en sus logs.

### Logs de verificación

```powershell
docker logs --tail 30 promociones-service
```

Los registros permiten revisar el procesamiento de los eventos recibidos y los pagos identificados como duplicados.

### Prueba de disponibilidad del broker

Se ejecutó una segunda instancia del backend con una dirección de RabbitMQ inaccesible.

Durante la prueba:

- Se registraron intentos fallidos de conexión con RabbitMQ.
- El endpoint `/health` continuó respondiendo HTTP 200.
- No se interrumpió el broker compartido.

Esta prueba permitió comprobar que el backend seguía respondiendo solicitudes HTTP cuando no podía conectarse al broker.

### Pendiente de comprobar

- La recepción de un evento emitido directamente por el microservicio Pagos real en workstation.
- La repetición de la prueba de disponibilidad del broker en el entorno definitivo.

## Observaciones finales

Las pruebas descritas se realizaron en un entorno local con los servicios correspondientes.

La autenticación real con Auth, la validación de promociones a través del Gateway y el consumo de eventos publicados manualmente mediante RabbitMQ fueron comprobados.

Para la evaluación en workstation será necesario verificar nuevamente las conexiones entre los módulos desplegados por los distintos equipos, especialmente el flujo completo desde Pagos hacia Promociones.

Las rutas, los identificadores de eventos y los usuarios de los ejemplos corresponden al entorno local de pruebas y deberán ajustarse a los datos disponibles en workstation.