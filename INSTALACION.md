# Instalación - Promociones-TITEC

## 1. Descripción

Promociones-TITEC es el microservicio encargado de administrar promociones, validar códigos de descuento y registrar su uso cuando se completa un pago.

El backend utiliza Node.js, Express y MongoDB. Se integra con Auth para la autenticación, con el API Gateway para exponer sus servicios y con RabbitMQ para recibir eventos del módulo Pagos.

## 2. Requisitos

- Docker y Docker Compose.
- Acceso a la red compartida `plataforma-eventos-net`.
- Microservicio Auth disponible.
- API Gateway compartido disponible.
- RabbitMQ compartido disponible.
- Node.js y npm para ejecutar el frontend mientras no esté contenedorizado.

## 3. Configuración

Dentro de `backend-promociones`, copiar el archivo `.env.example` como `.env`.

En Windows:

`copy .env.example .env`

Configurar las siguientes variables según el ambiente:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto interno del backend (3000) |
| `MONGO_URI` | Conexión a MongoDB |
| `BROKER_URL` | Conexión a RabbitMQ |
| `EVENT_EXCHANGE` | Exchange `ticketu.events` |
| `AUTH_SERVICE_URL` | Dirección interna del servicio Auth |
| `INTERNAL_API_KEY` | Clave compartida proporcionada por Auth |
| `HTTP_TIMEOUT_MS` | Tiempo máximo de espera (5000 ms) |
| `API_GATEWAY_PUBLIC_URL` | Dirección pública del API Gateway |

Las direcciones y credenciales deben corresponder a los servicios disponibles en workstation.

No se deben subir contraseñas ni archivos `.env` con credenciales reales a GitHub.

## 4. Iniciar MongoDB

Verificar que exista la red Docker compartida:

`docker network inspect plataforma-eventos-net`

Si se trata de una instalación local y la red no existe, crearla con:

`docker network create plataforma-eventos-net`

En workstation debe utilizarse la red acordada con el equipo de plataforma.

Entrar a la carpeta `bd-promociones` y ejecutar:

`docker compose up -d`

MongoDB utiliza el nombre `mongo-promociones` y el puerto interno `27017`.

El archivo `seed.js` crea las colecciones, los índices y los datos iniciales cuando se inicializa un volumen vacío.

No ejecutar `docker compose down -v`, ya que elimina volúmenes y puede provocar pérdida de datos.

## 5. Iniciar el backend

Entrar a la carpeta `backend-promociones` y ejecutar:

`docker compose up -d --build`

El backend utiliza el puerto interno 3000 y, en la configuración local actual, se publica mediante el puerto 3009.

Para comprobar su funcionamiento local:

`curl.exe http://localhost:3009/health`

Respuesta esperada:

`{"servicio":"promociones","estado":"ok","base_datos":"conectada"}`

Para consultar los registros:

`docker logs --tail 30 promociones-service`

## 6. Integración con Auth

Las operaciones de creación y modificación de promociones requieren una sesión válida y un rol autorizado.

Roles permitidos para administrar promociones:

- `organizador`
- `staff`

Una solicitud sin sesión debe devolver HTTP 401. Una solicitud de un usuario autenticado sin permisos debe devolver HTTP 403.

El backend consulta el endpoint interno `GET /internal/validar-sesion` del módulo Auth.

**Pendiente de completar:** usuarios de prueba proporcionados por Auth, clave compartida y verificación del inicio de sesión real en workstation.

## 7. Integración mediante API Gateway

Promociones ofrece los siguientes servicios:

- `GET /api/promociones/evento/:id_evento`
- `POST /api/promociones/validar/:nombre_codigo`

Las pruebas deben ejecutarse a través de la dirección del Gateway configurada para workstation.

Ejemplo local, con el Gateway en el puerto 8080:

`curl.exe http://localhost:8080/api/promociones/evento/evt-123`

Para comprobar el recorrido de las solicitudes:

`docker logs --tail 20 ticketu-api-gateway`

`docker logs --tail 20 promociones-service`

Los registros de ambos servicios contienen un identificador `requestId` que permite relacionar la petición.

## 8. Integración con RabbitMQ

Promociones consume los eventos de pagos mediante:

- Exchange: `ticketu.events`
- Routing key: `pago.completado`
- Cola: `promociones.pagos`
- Virtual host: `ticketu`

El usuario, la contraseña y el virtual host deben estar configurados en el RabbitMQ compartido.

Para comprobar la suscripción:

`docker logs --tail 30 promociones-service`

Mensaje esperado:

`[Broker] Suscrito a promociones.pagos`

Cuando se recibe un pago válido con un código promocional, el backend registra su uso y disminuye el stock disponible.

Si recibe nuevamente el mismo identificador de pago, evita registrar un segundo descuento.

## 9. Verificación de las integraciones

Las integraciones se declaran en `INTEGRACIONES.md`.

Este archivo describe cómo verificar:

- I1: autenticación y autorización con Auth.
- I2: servicios REST mediante API Gateway.
- I3: consumo de eventos de Pagos mediante RabbitMQ.

Las pruebas locales de I2 e I3 se realizaron correctamente. Deben repetirse utilizando los servicios reales disponibles en workstation.

## 10. Frontend y flujo principal

**Pendiente de completar antes de la entrega final.**

Se debe conectar el frontend a los datos reales del backend, integrar la sesión de Auth y documentar un flujo principal que pueda ejecutarse con un usuario de prueba.

La instalación definitiva debe incluir los comandos para iniciar el frontend, su dirección de acceso y los pasos concretos para crear o consultar una promoción.