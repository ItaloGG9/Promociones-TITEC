# Base de datos — Microservicio de Promociones

## 1. Levantar MongoDB

**Opción A: Docker Compose (recomendada, ejecuta el seed automáticamente)**

```bash
docker compose up -d
```

**Opción B: contenedor suelto + seed manual**

```bash
docker run -d -p 27017:27017 --name mongo-promociones mongo:7
docker exec -i mongo-promociones mongosh < seed.js
```

**Opción C: MongoDB local**

```bash
mongosh "mongodb://127.0.0.1:27017" seed.js
```

El seed es idempotente: se puede volver a ejecutar para dejar la base en su estado inicial.

## 2. Verificar

```bash
docker exec -it mongo-promociones mongosh promociones_db --eval 'db.promocions.find({}, {nombre_codigo:1}).toArray()'
```

Deberían aparecer `DESC50`, `GRUPO20`, `VERANO15`, `AGOTADO10`, `EXPIRADO30`, `INACTIVO25`.

## 3. Conexión para el backend (`.env`)

```
MONGO_URI=mongodb://127.0.0.1:27017/promociones_db
```

## 4. Diagrama "generado desde la base de datos" (BD1–BD4)

La rúbrica pide que el diagrama salga **de la base real**. Con la base ya creada:

1. Abrir **DbSchema** (versión gratuita) o **Moon Modeler** → Connect → MongoDB → `mongodb://127.0.0.1:27017/promociones_db`.
2. Hacer *reverse engineering* de `promocions` y `registrousos` (se leen los validadores `$jsonSchema`, así que salen tipos y campos obligatorios).
3. Dibujar la relación virtual `registrousos.id_promocion → promocions._id` y exportar a PNG.
4. Como respaldo, MongoDB Compass → pestaña **Schema** e **Indexes** de cada colección (capturas).

`docs/diagrama_bd.png` es una versión de referencia del mismo modelo, por si se necesita para la presentación.

## Archivos

| Archivo | Contenido |
|---|---|
| `seed.js` | Crea colecciones con validación, índices y datos de prueba. |
| `docker-compose.yml` | Levanta Mongo y ejecuta `seed.js` al crearse. |
| `DICCIONARIO_DATOS.md` | Diccionario de datos (BD3). |
| `docs/diagrama_bd.png` | Diagrama de referencia del modelo. |
