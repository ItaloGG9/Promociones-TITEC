# Pruebas del Sistema con Postman - Microservicio Promociones

Archivos:

- `promociones_sistema.postman_collection.json`: colección (32 requests, 81 aserciones)
- `promociones_local.postman_environment.json`: entorno con `baseUrl = http://localhost:3005`

## Cómo ejecutar

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

## Casos de prueba

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
