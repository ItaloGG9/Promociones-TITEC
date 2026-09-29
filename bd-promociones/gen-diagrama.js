db = db.getSiblingDB("promociones_db");
const REF_EXTERNA = { id_evento: "Eventos", id_usuario: "Usuarios", id_pago: "Pagos" };
const colecciones = db.getCollectionInfos({ type: "collection" }).filter((c) => !c.name.startsWith("system."));
const nombres = colecciones.map((c) => c.name);
const relaciones = [];
const lineas = ["erDiagram"];
colecciones.forEach((info) => {
  const schema = (info.options.validator || {}).$jsonSchema || {};
  const props = schema.properties || {};
  const requeridos = new Set(schema.required || []);
  const unicos = new Set();
  db.getCollection(info.name).getIndexes().forEach((ix) => {
    const campos = Object.keys(ix.key);
    if (ix.unique && campos.length === 1) unicos.add(campos[0]);
  });
  lineas.push(`  ${info.name} {`);
  Object.entries(props).forEach(([campo, def]) => {
    let tipo = Array.isArray(def.bsonType) ? "number" : def.bsonType || "mixed";
    if (tipo === "bool") tipo = "boolean";
    const claves = [];
    if (campo === "_id") claves.push("PK");
    const esFK = def.bsonType === "objectId" && campo !== "_id" && campo.startsWith("id_");
    if (esFK) claves.push("FK");
    if (unicos.has(campo)) claves.push("UK");
    const notas = [requeridos.has(campo) || campo === "_id" ? "NOT NULL" : "NULL"];
    if (REF_EXTERNA[campo]) notas.push(`ref ${REF_EXTERNA[campo]}`);
    if (def.minimum !== undefined && def.maximum !== undefined) notas.push(`${def.minimum}-${def.maximum}`);
    else if (def.minimum !== undefined) notas.push(`min ${def.minimum}`);
    lineas.push(`    ${tipo} ${campo}${claves.length ? " " + claves.join(",") : ""} "${notas.join(", ")}"`);
    if (esFK) {
      const base = campo.replace(/^id_/, "");
      const destino = nombres.find((n) => n.startsWith(base));
      if (destino) relaciones.push(`  ${destino} ||--o{ ${info.name} : "${campo}"`);
    }
  });
  lineas.push("  }");
});
print(lineas.concat(relaciones).join("\n"));