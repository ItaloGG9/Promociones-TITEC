// =====================================================================
//  seed.js — Base de datos del microservicio de Promociones (MongoDB)
//  Crea colecciones con validación de esquema, índices y datos de prueba.
//
//  Uso:
//    mongosh "mongodb://127.0.0.1:27017" seed.js
//    docker exec -i mongo-promociones mongosh < seed.js
//
//  Es idempotente: elimina y recrea las colecciones en cada ejecución.
// =====================================================================

const DB_NAME = "promociones_db";
db = db.getSiblingDB(DB_NAME);

// Números: se aceptan int/long/double porque Mongoose guarda Number como double.
const NUM = ["int", "long", "double"];

// ---------------------------------------------------------------------
// 1. Limpieza (idempotencia)
// ---------------------------------------------------------------------
["registrousos", "promocions"].forEach((c) => {
  if (db.getCollectionNames().includes(c)) db.getCollection(c).drop();
});

// ---------------------------------------------------------------------
// 2. Colección: promocions
// ---------------------------------------------------------------------
db.createCollection("promocions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "Promoción (cupón de descuento)",
      required: [
        "nombre_codigo", "id_evento", "porcentaje_descuento",
        "fecha_inicio", "fecha_fin", "cantidad_codigos",
        "usos_actuales", "minimo_entradas", "max_usos_por_cuenta", "activo",
      ],
      properties: {
        _id:                  { bsonType: "objectId", description: "PK. Identificador de la promoción." },
        nombre_codigo:        { bsonType: "string", pattern: "^[A-Z0-9_-]+$", minLength: 3, maxLength: 30,
                                description: "Código del cupón en MAYÚSCULAS. Único." },
        id_evento:            { bsonType: "string", minLength: 1,
                                description: "Referencia al evento (squad Eventos). Solo el id." },
        porcentaje_descuento: { bsonType: NUM, minimum: 1, maximum: 100, multipleOf: 1,
                                description: "Descuento entero entre 1 y 100." },
        fecha_inicio:         { bsonType: "date", description: "Inicio de vigencia." },
        fecha_fin:            { bsonType: "date", description: "Fin de vigencia." },
        cantidad_codigos:     { bsonType: NUM, minimum: 0, multipleOf: 1,
                                description: "Stock restante de usos." },
        usos_actuales:        { bsonType: NUM, minimum: 0, multipleOf: 1,
                                description: "Usos consumidos. Default 0." },
        minimo_entradas:      { bsonType: NUM, minimum: 1, multipleOf: 1,
                                description: "Mínimo de entradas en la compra. Default 1." },
        max_usos_por_cuenta:  { bsonType: NUM, minimum: 1, multipleOf: 1,
                                description: "Máximo de usos por usuario. Default 1." },
        activo:               { bsonType: "bool", description: "Habilitación manual. Default true." },
      },
    },
    // fecha_fin debe ser posterior a fecha_inicio
    $expr: { $gt: ["$fecha_fin", "$fecha_inicio"] },
  },
  validationLevel: "strict",
  validationAction: "error",
});

db.promocions.createIndex({ nombre_codigo: 1 }, { unique: true, name: "ux_promocions_nombre_codigo" });
db.promocions.createIndex({ id_evento: 1 },                       { name: "ix_promocions_id_evento" });

// ---------------------------------------------------------------------
// 3. Colección: registrousos
// ---------------------------------------------------------------------
db.createCollection("registrousos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      title: "Registro de uso de un cupón",
      required: ["id_promocion", "id_usuario", "id_evento", "id_pago", "nombre_codigo", "fecha_uso"],
      properties: {
        _id:           { bsonType: "objectId", description: "PK. Identificador del registro." },
        id_promocion:  { bsonType: "objectId", description: "FK → promocions._id." },
        id_usuario:    { bsonType: "string", minLength: 1, description: "Referencia al usuario (squad Usuarios)." },
        id_evento:     { bsonType: "string", minLength: 1, description: "Referencia al evento (squad Eventos)." },
        id_pago:       { bsonType: "string", minLength: 1, description: "Referencia al pago (squad Pagos). Único." },
        nombre_codigo: { bsonType: "string", pattern: "^[A-Z0-9_-]+$", description: "Código usado (trazabilidad)." },
        fecha_uso:     { bsonType: "date", description: "Momento del uso. Default Date.now." },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});

db.registrousos.createIndex({ id_pago: 1 }, { unique: true, name: "ux_registrousos_id_pago" });
// Soporta el control de abuso: usos de una promoción por cuenta
db.registrousos.createIndex({ id_promocion: 1, id_usuario: 1 }, { name: "ix_registrousos_promocion_usuario" });

// ---------------------------------------------------------------------
// 4. Datos de prueba
// ---------------------------------------------------------------------
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const ayer = new Date(now.getTime() - DAY);
const en90 = new Date(now.getTime() + 90 * DAY);

const res = db.promocions.insertMany([
  // Caso feliz principal
  { nombre_codigo: "DESC50",    id_evento: "evt-123", porcentaje_descuento: 50, fecha_inicio: ayer, fecha_fin: en90,
    cantidad_codigos: 99, usos_actuales: 1, minimo_entradas: 1, max_usos_por_cuenta: 1, activo: true },
  // Requiere mínimo de entradas y permite 2 usos por cuenta
  { nombre_codigo: "GRUPO20",   id_evento: "evt-123", porcentaje_descuento: 20, fecha_inicio: ayer, fecha_fin: en90,
    cantidad_codigos: 50, usos_actuales: 0, minimo_entradas: 4, max_usos_por_cuenta: 2, activo: true },
  // Otro evento
  { nombre_codigo: "VERANO15",  id_evento: "evt-456", porcentaje_descuento: 15, fecha_inicio: ayer, fecha_fin: en90,
    cantidad_codigos: 200, usos_actuales: 0, minimo_entradas: 1, max_usos_por_cuenta: 1, activo: true },
  // Sin stock
  { nombre_codigo: "AGOTADO10", id_evento: "evt-123", porcentaje_descuento: 10, fecha_inicio: ayer, fecha_fin: en90,
    cantidad_codigos: 0, usos_actuales: 10, minimo_entradas: 1, max_usos_por_cuenta: 1, activo: true },
  // Vencido
  { nombre_codigo: "EXPIRADO30", id_evento: "evt-123", porcentaje_descuento: 30,
    fecha_inicio: new Date("2025-01-01T00:00:00Z"), fecha_fin: new Date("2025-02-01T00:00:00Z"),
    cantidad_codigos: 100, usos_actuales: 0, minimo_entradas: 1, max_usos_por_cuenta: 1, activo: true },
  // Desactivado manualmente
  { nombre_codigo: "INACTIVO25", id_evento: "evt-456", porcentaje_descuento: 25, fecha_inicio: ayer, fecha_fin: en90,
    cantidad_codigos: 100, usos_actuales: 0, minimo_entradas: 1, max_usos_por_cuenta: 1, activo: false },
]);

const idDesc50 = db.promocions.findOne({ nombre_codigo: "DESC50" })._id;

db.registrousos.insertOne({
  id_promocion: idDesc50, id_usuario: "usr-001", id_evento: "evt-123",
  id_pago: "pay-0001", nombre_codigo: "DESC50", fecha_uso: now,
});

// ---------------------------------------------------------------------
// 5. Resumen
// ---------------------------------------------------------------------
print(`\nBase ${DB_NAME} lista.`);
print(`  promocions:   ${db.promocions.countDocuments()} documentos`);
print(`  registrousos: ${db.registrousos.countDocuments()} documentos`);
print(`  índices promocions:   ${db.promocions.getIndexes().map((i) => i.name).join(", ")}`);
print(`  índices registrousos: ${db.registrousos.getIndexes().map((i) => i.name).join(", ")}`);
