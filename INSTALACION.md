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

## 3. Configuración


### Configuración de credenciales

El archivo `backend-promociones/.env.example` contiene las variables
necesarias para ejecutar el backend, pero no incluye las credenciales
privadas de los servicios compartidos.

Después de copiar `.env.example` como `.env`, es necesario configurar:

- `BROKER_URL`: reemplazar `USUARIO` y `CONTRASENA` por las credenciales
  del RabbitMQ disponible en workstation.
- `AUTH_SERVICE_URL`: indicar la dirección interna del servicio Auth.
- `INTERNAL_API_KEY`: utilizar la clave compartida proporcionada por Auth.
- `API_GATEWAY_PUBLIC_URL`: indicar la dirección pública del Gateway.

El backend, MongoDB, RabbitMQ y Auth deben poder comunicarse mediante
la red Docker acordada para workstation.

Las credenciales reales deben mantenerse solamente en el archivo `.env`
local o en la configuración privada del entorno.

No subir archivos `.env` ni claves privadas a GitHub.

### Dependencias externas

El `docker-compose.yml` principal inicia solamente:

- MongoDB de Promociones.
- Backend de Promociones.
- Frontend de Promociones.

El API Gateway, RabbitMQ y Auth deben estar disponibles previamente,
porque son servicios compartidos de la plataforma.

Si Auth todavía no está disponible, las rutas públicas pueden funcionar,
pero no se podrá completar el flujo de administración con una sesión real.




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


## 4. Iniciar los servicios

El proyecto incluye un `docker-compose.yml` en la carpeta principal, que permite iniciar MongoDB, el backend y el frontend con un solo comando.

Primero, comprobar que exista la red compartida:

```powershell
docker network inspect plataforma-eventos-net
```

Si es una instalación local y no existe, crearla con:

```powershell
docker network create plataforma-eventos-net
```

En workstation se debe utilizar la red acordada con el equipo de plataforma. El API Gateway, RabbitMQ y Auth deben estar disponibles por separado.

Desde la carpeta principal `Promociones-TITEC`, ejecutar:

```powershell
docker compose up -d --build
```

Comprobar el estado de los contenedores:

```powershell
docker compose ps
```

Se deben iniciar:

- `mongo-promociones`
- `promociones-service`
- `promociones-frontend`

MongoDB utiliza el volumen `bd-promociones_mongo_data` para conservar sus datos.

El archivo `seed.js` se ejecuta al inicializar una base de datos vacía. Si el volumen ya contiene datos, no se vuelven a insertar automáticamente.

No ejecutar `docker compose down -v`, porque puede eliminar los datos almacenados.


## 5. Comprobar el funcionamiento

Con los contenedores iniciados, el sistema utiliza estos puertos locales:

| Servicio | Dirección |
|---|---|
| Frontend | `http://localhost:3011` |
| Backend | `http://localhost:3009` |
| API Gateway compartido | `http://localhost:8080` |

Los puertos y direcciones pueden cambiar según la configuración de workstation.

Para comprobar el backend:

```powershell
curl.exe http://localhost:3009/health
```

Respuesta esperada cuando MongoDB está conectado:

```json
{"servicio":"promociones","estado":"ok","base_datos":"conectada"}
```

Para comprobar los registros:

```powershell
docker logs --tail 30 promociones-service
```

Para comprobar que el frontend puede consultar promociones mediante el Gateway, se puede utilizar un identificador de evento existente:

```powershell
curl.exe http://localhost:3011/api/promociones/evento/evt-demo
```

`evt-demo` corresponde al entorno de pruebas local. En workstation debe utilizarse un evento que exista en ese ambiente.


## 6. Integración con Auth

Las operaciones de creación y modificación de promociones requieren una sesión válida y un rol autorizado.

Roles permitidos para administrar promociones:

- `organizador`
- `staff`

El backend consulta el endpoint `GET /internal/validar-sesion` de Auth, enviando la cookie de sesión y la clave interna `x-api-key`.

### Pruebas locales realizadas

Se levantó el servicio Auth real junto con PostgreSQL y Keycloak. También se prepararon nueve cuentas de prueba y se comprobó su inicio de sesión.

Se verificaron los siguientes casos:

- Promociones pudo comunicarse con Auth mediante la red Docker.
- Una solicitud sin sesión respondió HTTP 401.
- Un organizador inició sesión correctamente y Auth devolvió el rol `organizador`.
- Una solicitud de creación con sesión de organizador llegó al controlador y respondió HTTP 400 debido a que faltaban datos obligatorios.
- Un comprador autenticado intentó crear una promoción y recibió HTTP 403 por falta de permisos.

Estas pruebas confirman el funcionamiento local de la autenticación y las restricciones de acceso.

Queda pendiente comprobar el flujo completo desde el navegador, las sesiones vencidas o revocadas y repetir las pruebas con los servicios compartidos de workstation.

## 7. Integración mediante API Gateway

Promociones ofrece los siguientes servicios:

- `GET /api/promociones/evento/:id_evento`
- `GET /api/promociones/eventos/:id_evento/promociones` (frontend compartido, detalle del evento)
- `GET /api/promociones/sesion` (frontend compartido: usuario de la sesión según Auth; 401 sin sesión)
- `GET /api/promociones` (frontend compartido: panel de administración; organizador o staff)
- `POST /api/promociones` y `PATCH /api/promociones/:id_promocion` (crear y modificar; organizador o staff)
- `POST /api/promociones/validar/:nombre_codigo`

Las pruebas deben ejecutarse a través de la dirección del Gateway configurada para workstation.

Ejemplo local, con el Gateway en el puerto 8080:

curl.exe http://localhost:8080/api/promociones/evento/evt-demo

Para comprobar el recorrido de las solicitudes:

`docker logs --tail 20 ticketu-api-gateway`

`docker logs --tail 20 promociones-service`

Se comprobó que, cuando el cliente envía el encabezado x-request-id, este aparece en la respuesta del Gateway y en los logs de Promociones. La propagación del identificador generado automáticamente por el Gateway todavía requiere revisión.

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

Las tres integraciones fueron comprobadas en el entorno local. I1 se probó con Auth real y distintos roles de usuario; I2, mediante solicitudes al API Gateway; e I3, mediante eventos de pago publicados manualmente en RabbitMQ. Queda pendiente verificar el evento emitido directamente por el servicio Pagos y repetir las pruebas en workstation.


## 10. Frontend y flujo principal

El frontend está desarrollado con Next.js y se ejecuta mediante Docker junto al backend y MongoDB.

En el entorno local se accede desde:

`http://localhost:3011`

La interfaz permite consultar las promociones almacenadas en MongoDB a través del API Gateway.

También incluye formularios para crear y editar promociones, además de la opción de activar o desactivar una promoción.

Estas operaciones utilizan las rutas protegidas del backend y requieren una sesión válida con rol `organizador` o `staff`.

Las solicitudes sin sesión devuelven HTTP 401 y las solicitudes de usuarios autenticados sin autorización deben devolver HTTP 403.



### Configuración del evento

El frontend utiliza la variable `NEXT_PUBLIC_EVENTO_ID` para identificar
el evento cuyas promociones se muestran en el panel.

Por defecto utiliza `evt-demo`, que corresponde al entorno de pruebas local.

Para utilizar otro evento en workstation, configurar la variable antes de
construir el frontend:

```powershell
$env:NEXT_PUBLIC_EVENTO_ID = "ID_DEL_EVENTO"
docker compose up -d --build --no-deps promociones-frontend
```

Reemplazar `ID_DEL_EVENTO` por un identificador existente en el ambiente.

Como Next.js incorpora esta variable durante la compilación, es necesario
reconstruir la imagen cuando se cambia el evento.




### Verificación local realizada

Se comprobó el siguiente recorrido:

1. Iniciar el sistema con `docker compose up -d --build`.
2. Acceder al frontend mediante el puerto 3011.
3. Consultar la promoción `INTEGRACION2910` del evento `evt-demo`.
4. Comprobar que se muestran sus datos almacenados en MongoDB.
5. Intentar crear o editar una promoción sin iniciar sesión.
6. Verificar que el backend rechaza las operaciones con HTTP 401.

### Verificación pendiente en workstation

La integración local entre Promociones y Auth fue comprobada mediante solicitudes HTTP. Sin embargo, todavía se debe verificar el recorrido completo desde el navegador, incluyendo el inicio de sesión, el envío automático de cookies y la creación o edición de promociones con un usuario autorizado.

También será necesario utilizar los identificadores de eventos, usuarios y direcciones correspondientes al entorno de workstation.
