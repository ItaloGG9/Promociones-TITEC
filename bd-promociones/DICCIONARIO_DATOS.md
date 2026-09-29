# Diccionario de datos — Microservicio de Promociones

| Ítem | Valor |
|---|---|
| Motor | MongoDB 7.x (base documental propia del microservicio) |
| Base de datos | `promociones_db` |
| Cadena de conexión (local) | `mongodb://127.0.0.1:27017/promociones_db` |
| Script de creación | `seed.js` (colecciones, validación `$jsonSchema`, índices y datos de prueba) |
| Colecciones | `promocions`, `registrousos` |

## Convenciones de nomenclatura

- Colecciones: nombre en minúsculas generado por Mongoose a partir del modelo (`Promocion` → `promocions`, `RegistroUso` → `registrousos`).
- Atributos: `snake_case` en español.
- Llave primaria: `_id` (ObjectId) en todas las colecciones.
- Referencias a otros squads: prefijo `id_` y tipo `String`, sin replicar su información (BD2).
- Referencias internas (FK): prefijo `id_` y tipo `ObjectId`.
- Índices: `ux_<coleccion>_<campo>` para los únicos y `ix_<coleccion>_<campo>` para los de búsqueda.

## Colección `promocions`

Define cada cupón de descuento y sus reglas de uso.

| Campo | Tipo | Nulo | Default | Restricciones | Descripción |
|---|---|---|---|---|---|
| `_id` | ObjectId | No | autogenerado | **PK** | Identificador de la promoción. |
| `nombre_codigo` | String | No | — | **Único**, mayúsculas `^[A-Z0-9_-]+$`, 3–30 caracteres | Código que ingresa el comprador (ej. `DESC50`). |
| `id_evento` | String | No | — | Referencia externa | Id del evento al que aplica. Lo genera el squad de **Eventos**. |
| `porcentaje_descuento` | Number (entero) | No | — | 1 a 100 | Porcentaje de descuento sobre el valor de las entradas. |
| `fecha_inicio` | Date | No | — | — | Desde cuándo el cupón es válido. |
| `fecha_fin` | Date | No | — | Debe ser mayor que `fecha_inicio` | Hasta cuándo el cupón es válido. |
| `cantidad_codigos` | Number (entero) | No | — | ≥ 0 | Stock restante de usos. Se descuenta en cada uso. |
| `usos_actuales` | Number (entero) | No | 0 | ≥ 0 | Cantidad de veces que se ha usado el cupón. |
| `minimo_entradas` | Number (entero) | No | 1 | ≥ 1 | Mínimo de entradas en la compra para aplicar el cupón. |
| `max_usos_por_cuenta` | Number (entero) | No | 1 | ≥ 1 | Máximo de usos permitidos por usuario (control de abuso). |
| `activo` | Boolean | No | true | — | Permite deshabilitar el cupón manualmente. |

**Índices**

| Nombre | Campos | Tipo | Propósito |
|---|---|---|---|
| `_id_` | `_id` | Único (PK) | Llave primaria. |
| `ux_promocions_nombre_codigo` | `nombre_codigo` | Único | Evita códigos repetidos y acelera la validación del cupón. |
| `ix_promocions_id_evento` | `id_evento` | Simple | Listar promociones de un evento. |

## Colección `registrousos`

Registra cada transacción que consumió un cupón. Sirve para limitar usos por cuenta y rastrear el pago asociado.

| Campo | Tipo | Nulo | Default | Restricciones | Descripción |
|---|---|---|---|---|---|
| `_id` | ObjectId | No | autogenerado | **PK** | Identificador del registro de uso. |
| `id_promocion` | ObjectId | No | — | **FK → `promocions._id`** | Promoción que se usó. |
| `id_usuario` | String | No | — | Referencia externa | Id del comprador. Lo genera el squad de **Usuarios**. |
| `id_evento` | String | No | — | Referencia externa | Id del evento de la compra. Lo genera el squad de **Eventos**. |
| `id_pago` | String | No | — | **Único**, referencia externa | Id de la transacción. Lo genera el squad de **Pagos**. Evita registrar dos veces el mismo pago. |
| `nombre_codigo` | String | No | — | Mayúsculas | Código usado. Se guarda para trazabilidad aunque luego cambie la promoción. |
| `fecha_uso` | Date | No | `Date.now` | — | Fecha y hora del uso. |

**Índices**

| Nombre | Campos | Tipo | Propósito |
|---|---|---|---|
| `_id_` | `_id` | Único (PK) | Llave primaria. |
| `ux_registrousos_id_pago` | `id_pago` | Único | Un pago solo puede consumir un cupón una vez. |
| `ix_registrousos_promocion_usuario` | `id_promocion`, `id_usuario` | Compuesto | Contar usos de un cupón por cuenta (`max_usos_por_cuenta`). |

## Relaciones

| Origen | Destino | Cardinalidad | Descripción |
|---|---|---|---|
| `registrousos.id_promocion` | `promocions._id` | N : 1 | Una promoción tiene cero o muchos usos; cada uso pertenece a una sola promoción. |

No hay ciclos: `registrousos` depende de `promocions` y `promocions` no depende de ninguna otra colección.

## Datos de otros squads (BD2)

La base **no** contiene colecciones de usuarios, eventos ni pagos. De esos módulos solo se guardan sus identificadores:

| Campo | Squad dueño del dato | Dónde se usa |
|---|---|---|
| `id_evento` | Eventos | `promocions`, `registrousos` |
| `id_usuario` | Usuarios | `registrousos` |
| `id_pago` | Pagos | `registrousos` |

## Datos de prueba (`seed.js`)

| `nombre_codigo` | Evento | % | Escenario que permite probar |
|---|---|---|---|
| `DESC50` | evt-123 | 50 | Cupón válido (caso feliz). Ya tiene un uso de `usr-001` con `pay-0001`. |
| `GRUPO20` | evt-123 | 20 | Mínimo 4 entradas y 2 usos por cuenta. |
| `VERANO15` | evt-456 | 15 | Cupón válido de otro evento. |
| `AGOTADO10` | evt-123 | 10 | Sin stock (`cantidad_codigos = 0`). |
| `EXPIRADO30` | evt-123 | 30 | Fuera de vigencia. |
| `INACTIVO25` | evt-456 | 25 | Desactivado (`activo = false`). |
