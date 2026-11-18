
# Integraciones - Promociones-TITEC

## Evaluación 3

El módulo Promociones-TITEC administra códigos promocionales, permite validarlos mediante una API REST y registra su uso cuando recibe eventos de pago.

Se declaran las tres integraciones exigidas para la evaluación.

| Integración | Tipo | Módulo contraparte | Servicio, ruta o tópico | Cómo se evidencia | Dónde verificarlo |
|---|---|---|---|---|---|
| I1 | A. Autenticación | Auth | GET /internal/validar-sesion | Validación de sesión y restricción por rol | Rutas de Promociones y logs de Auth |
| I2 | B. API Gateway | Entradas / Gateway | POST /api/promociones/validar/{nombre_codigo} | Respuesta HTTP y trazas con requestId | Logs del Gateway y de Promociones |
| I3 | C. Broker | Pagos | pago.completado | Consumo del evento y registro del uso del cupón | RabbitMQ, logs de Promociones y MongoDB |

## I1. Autenticación

Promociones consulta a Auth para validar la sesión del usuario.

Las operaciones de creación y modificación requieren una sesión válida y un rol autorizado (organizador o staff).

Archivos:
- backend-promociones/src/clients/authCliente.js
- backend-promociones/src/middlewares/authMiddleware.js
- backend-promociones/src/routes/promocionRoutes.js

Prueba realizada:
- Crear una promoción sin sesión devuelve HTTP 401.

Pendiente:
- Verificar inicio de sesión y roles con Auth real en workstation.
- Comprobar el rechazo de tokens inválidos o vencidos.
- Confirmar el uso de la sesión sin copiar tokens manualmente.

Contrato de referencia:
- arquitectura-main/CONTRATO_INTEGRACION_AUTH.md

## I2. API Gateway

Promociones provee la validación de cupones mediante el API Gateway.

Ruta:
POST /api/promociones/validar/{nombre_codigo}

La dirección del Gateway se configura mediante variables de entorno.

Pruebas locales realizadas:
- Consulta de promociones: HTTP 200.
- Validación de un cupón existente: HTTP 200.
- Validación de un cupón inexistente: HTTP 404.

Comando de verificación local:

curl.exe -i -X POST "http://localhost:8080/api/promociones/validar/INTEGRACION2910" -H "Content-Type: application/json" -d "{\"id_evento\":\"evt-demo\",\"cantidad_entradas\":1,\"precio_base\":15000,\"usuario\":{\"id_usuario\":\"prueba-gw-1711\",\"rol_usuario\":\"cliente\"}}"

La petición puede identificarse mediante x-request-id en los registros del Gateway y de Promociones.

Logs:

docker logs --tail 20 ticketu-api-gateway
docker logs --tail 20 promociones-service

La prueba debe repetirse en workstation con los datos iniciales y la dirección del Gateway correspondiente.

## I3. Broker

Promociones consume eventos del microservicio Pagos mediante RabbitMQ.

Configuración:
- Exchange: ticketu.events
- Routing key: pago.completado
- Cola: promociones.pagos
- Virtual host: ticketu

Archivos:
- backend-promociones/src/events/broker.js
- backend-promociones/src/events/pagoConsumer.js

Contrato:
- arquitectura-pagos-main/docs/contratos/Contrato_Promociones_Pagos_v1.1.docx

Pruebas locales realizadas:
- Promociones recibe y procesa pago.completado.
- Se registra el uso del cupón en MongoDB.
- El stock disminuye de 9 a 8.
- Un pago repetido se identifica como duplicado.
- El pago duplicado no modifica nuevamente el stock.

Logs de verificación:

docker logs --tail 30 promociones-service

En los registros se puede observar el identificador del pago, la fecha y el estado del procesamiento.

Pendiente:
- Comprobar la integración con el módulo Pagos real en workstation.
- Verificar el comportamiento cuando RabbitMQ no está disponible.

## Observación

Las pruebas descritas fueron realizadas en un entorno local.

Las tres integraciones deben verificarse nuevamente en el ambiente de pruebas del curso (workstation), con los servicios compartidos y las credenciales correspondientes.
