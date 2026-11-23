# Pruebas de integración con Postman — Microservicio Promociones

## Entrega 4: integraciones en workstation

Archivos:

- `promociones_workstation.postman_collection.json`: 32 requests y 53 aserciones contra los servicios reales de workstation.
- `promociones_workstation.postman_environment.json`: environment **Promociones - Workstation**.

### Antes de ejecutar

En el environment, complete:

| Variable | Valor |
| :-- | :-- |
| `gatewayUrl` | URL del API Gateway en workstation (por defecto `http://localhost:8080`) |
| `authUrl` | Donde se hace `POST /api/auth/login`. Normalmente el mismo Gateway |
| `promocionesUrl` | Servicio de Promociones directo, solo para `/health` (por defecto `http://localhost:3009`) |
| `id_evento` | Id de un evento real publicado en Catálogo, que se pueda comprar |
| `email_organizador` / `password_organizador` | Cuenta de Auth con rol `organizador` |
| `email_comprador` / `password_comprador` | Cuenta de Auth con rol `usuario` |

Las contraseñas quedan como variables de tipo *secret*. No suba el environment con contraseñas al repositorio.

Cada ejecución crea un código nuevo (`WS…`, variable de colección `codigo`) y usa fechas relativas a hoy, así que se puede repetir sin limpiar la base.

### Orden de ejecución (Postman → Run collection o Run folder)

1. **0. Preparación**, **I1. Auth** e **I2. API Gateway**: se ejecutan seguidas.
2. **I3. Broker**:
   1. Ejecute **3.1** (guarda el stock y los usos antes del pago; el código aparece en la consola de Postman).
   2. En la plataforma, inicie sesión con la cuenta comprador, compre entradas de `id_evento` con ese código y complete el pago en **Pagos**.
   3. Ejecute **3.2 a 3.4**.
3. **4. Desactivación**: al final; deja desactivada la promoción de prueba.

### Casos

| ID | Integración | Request | Esperado |
| :-- | :-- | :-- | :-- |
| 0.1 | — | `GET {promocionesUrl}/health` | 200, base de datos conectada |
| 0.2 | I1 | `POST {authUrl}/api/auth/login` (organizador) | 200 y cookie `jwt` |
| 0.3 | I1 | `POST {authUrl}/api/auth/login` (comprador) | 200 y cookie `jwt` |
| 1.1 | I1 | `GET /api/promociones/sesion` sin cookie | 401 |
| 1.2 | I1 | `GET /api/promociones/sesion` con cookie inválida | 401 (rechazada por Auth) |
| 1.3 | I1 | `GET /api/promociones/sesion` organizador | 200, rol `organizador` o `staff` |
| 1.4 | I1 | `GET /api/promociones/sesion` comprador | 200, rol `usuario` (guarda `id_usuario`) |
| 1.5 | I1 | `POST /api/promociones` sin sesión | 401 |
| 1.6 | I1 | `POST /api/promociones` como comprador | 403 |
| 1.7 | I1 | `GET /api/promociones` como comprador | 403 |
| 1.8 | I1 | `POST /api/promociones` como organizador | 201, stock 50 |
| 1.9 | I1 | Código duplicado | 400 "ya existe" |
| 1.10 | I1 | Fecha límite pasada | 400 |
| 1.11 | I1 | `GET /api/promociones` como organizador | 200, incluye el código |
| 1.12 | I1 | `PATCH /api/promociones/:id` extender fecha | 200 |
| 1.13 | I1 | `PATCH /api/promociones/:id` sin sesión | 401 |
| 2.1 | I2 | `POST /api/promociones/evaluar` con código vigente | 200, 20% |
| 2.2 | I2 | Código en minúsculas | 200, 20% |
| 2.3 | I2 | Código inexistente | 200, 0%, `codigo_inexistente` |
| 2.4 | I2 | Código de otro evento | 200, 0%, `otro_evento` |
| 2.5 | I2 | Datos incompletos | 400, `datos_incompletos` |
| 2.6 | I2 | `GET /api/promociones/eventos/:id/promociones` | 200, incluye el código |
| 2.7 | I2 | `POST /api/promociones/validar/:codigo` | 200, `valido: true` |
| 2.8 | I2 | Validar código inexistente | 404 |
| 3.1 | I3 | Stock y usos antes del pago | 200 |
| 3.2 | I3 | Después del pago real en Pagos | usos +1, stock −1 |
| 3.3 | I3 | Evaluar con el comprador que ya pagó | 200, 0%, `limite_usuario` |
| 3.4 | I3 | Validar con el comprador que ya pagó | 400, límite de usos |
| 4.1 | — | `PATCH` promoción inexistente | 404 |
| 4.2 | — | `PATCH` con fecha límite pasada | 400 |
| 4.3 | — | Desactivar promoción | 200, `activo: false` |
| 4.4 | I2 | Evaluar código desactivado | 200, 0%, `inactivo` |

### Evidencia

- Captura del resumen del Runner de Postman ejecutado en workstation (URL del Gateway visible).
- O con Newman, desde la workstation:

  ```bash
  npx newman run promociones_workstation.postman_collection.json \
    -e promociones_workstation.postman_environment.json \
    --env-var password_organizador=... --env-var password_comprador=... \
    -r cli,json --reporter-json-export resultados_workstation.json
  ```

- Para I2, los logs de Promociones muestran el `x-request-id` que agrega el Gateway: `docker logs promociones-service | grep "\[API\]"`.
- Para I3, los logs muestran el evento procesado: `docker logs promociones-service | grep "\[Broker\]"`, y la colección `registrousos` guarda el `id_pago` de Pagos.

## Colecciones anteriores (pruebas locales, Evaluaciones 1 a 3)

> Estas colecciones se usaron antes de integrar Auth: no envían la cookie de sesión, por lo que hoy crear y modificar responden 401. La carpeta 5 usa `/test/webhook`, que simula a Pagos. Para la Entrega 4 la evidencia es la colección de workstation descrita arriba.

Archivos:

- `promociones_sistema.postman_collection.json`: colección (36 requests, 90 aserciones)
- `promociones_local.postman_environment.json`: entorno con `gatewayUrl = http://localhost:8080` y `baseUrl = http://localhost:3009`

### Pruebas a través del API Gateway (puerto 8080)

1. Crear la red (solo la primera vez):

   ```bash
   docker network create plataforma-eventos-net
   ```

2. Levantar el Gateway (`cd api-gateway && docker compose up -d`) y el servicio
   (`cd backend-promociones && docker compose up -d`, con `MONGO_URI` definido en un `.env`).
3. En Postman: importar la colección y el entorno, y seleccionar el entorno **Promociones Local**.
4. Ejecutar la carpeta **0. Gateway (puerto 8080)**: clic derecho → **Run folder**.

| ID | Petición | Esperado |
| :-- | :-- | :-- |
| 0.1 | `POST http://localhost:8080/api/promociones` | 201, promoción creada |
| 0.2 | `POST http://localhost:8080/api/promociones` (código `FIESTA2026`) | 201 la primera vez; en las siguientes, 400 "ya existe" |
| 0.3 | `POST http://localhost:8080/api/promociones/validar/FIESTA2026` | 200, `valido: true`, 20% |
| 0.4 | `GET http://localhost:8080/api/promociones/evento/evt-123` | 200, incluye `FIESTA2026` |

Para la evidencia: sacar captura de cada request mostrando la URL con `:8080` y el código 201/200,
y del resumen del Runner.

### Cómo ejecutar (servicio directo)

1. Levantar MongoDB (`docker compose up -d` en `bd-promociones/`) y el backend (`npm start` en `backend-promociones/`).
2. En Postman: **Import** → seleccionar los dos archivos JSON.
3. Seleccionar el entorno **Promociones Local**.
4. Clic derecho en la colección → **Run collection** → **Run** (ejecutar en orden, todas las carpetas).

También por consola con Newman:

```bash
npx newman run promociones_sistema.postman_collection.json -e promociones_local.postman_environment.json
```

La colección crea sus propios datos con códigos y eventos únicos por ejecución (variable `run`),
así que no depende del `seed.js` y se puede ejecutar las veces que sea sin limpiar la base de datos.

### Casos de prueba

| ID | Endpoint | Escenario | Esperado |
| :-- | :-- | :-- | :-- |
| 1.1 | `POST /api/v1/promociones` | Crear promoción vigente (código en minúsculas) | 201, código en MAYÚSCULAS, valores por defecto |
| 1.2 | `POST /api/v1/promociones` | Crear promoción grupal (mín. 4 entradas, 2 usos) | 201 |
| 1.3 | `POST /api/v1/promociones` | Crear promoción con fechas pasadas | 201 |
| 1.4 | `POST /api/v1/promociones` | Código duplicado | 400 "ya existe" |
| 1.5 | `POST /api/v1/promociones` | Porcentaje fuera de rango (150) | 400 |
| 1.6 | `POST /api/v1/promociones` | Sin campos obligatorios | 400 |
| 2.1 | `GET /api/v1/promociones/evento/:id` | Listar promociones del evento | 200, arreglo con 3 |
| 2.2 | `GET /api/v1/promociones/evento/:id` | Evento sin promociones | 200, `[]` |
| 3.1 | `POST /promociones/validar/:codigo` | Código vigente | 200, `valido: true`, 20% |
| 3.2 | `POST /promociones/validar/:codigo` | Código escrito en minúsculas | 200 |
| 3.3 | `POST /promociones/validar/:codigo` | Código inexistente | 404 |
| 3.4 | `POST /promociones/validar/:codigo` | Parámetros incompletos | 400 |
| 3.5 | `POST /promociones/validar/:codigo` | Código de otro evento | 400 |
| 3.6 | `POST /promociones/validar/:codigo` | Código expirado | 400 |
| 3.7 | `POST /promociones/validar/:codigo` | No cumple mínimo de entradas | 400 |
| 3.8 | `POST /promociones/validar/:codigo` | Cumple mínimo de entradas | 200, 30% |
| 4.1 | `POST /api/v1/promociones/evaluar` | Evento con promoción vigente | 200, 20% + `id_promocion` |
| 4.2 | `POST /api/v1/promociones/evaluar` | Evento sin promoción | 200, 0% |
| 4.3 | `POST /api/v1/promociones/evaluar` | Datos incompletos | 400 |
| 5.1 | `POST /test/webhook/pago-completado` | Pago completado con cupón | 200, stock 100→99, usos 0→1 |
| 5.2 | `POST /promociones/validar/:codigo` | Mismo usuario supera `max_usos_por_cuenta` | 400 |
| 5.3 | `POST /api/v1/promociones/evaluar` | Usuario que ya usó el cupón | 200, 0% |
| 5.4 | `POST /promociones/validar/:codigo` | Otro usuario usa el mismo código | 200 |
| 5.5 | `POST /test/webhook/pago-completado` | Evento de pago duplicado (mismo `id_pago`) | Stock no baja dos veces |
| 6.1 | `PATCH /api/v1/promociones/:id` | Cambiar porcentaje de cupón ya usado | 400 |
| 6.2 | `PATCH /api/v1/promociones/:id` | Extender fecha y stock de cupón usado | 200 |
| 6.3 | `PATCH /api/v1/promociones/:id` | Desactivar promoción | 200, `activo: false` |
| 6.4 | `POST /promociones/validar/:codigo` | Validar código desactivado | 400 |
| 6.5 | `PATCH /api/v1/promociones/:id` | Dejar promoción sin stock | 200 |
| 6.6 | `POST /promociones/validar/:codigo` | Validar código sin stock | 400 |
| 6.7 | `PATCH /api/v1/promociones/:id` | ID inexistente | 404 |
| 6.8 | `PATCH /api/v1/promociones/:id` | ID mal formado | 404 |
