const Promocion = require('../models/Promocion');
const RegistroUso = require('../models/RegistroUso');

function normalizar(p) {
  const s = p && typeof p === 'object' ? p : {};
  return {
    id_pago: s.id_pago ?? s.pagoId,
    id_usuario: s.id_usuario ?? s.usuarioId,
    id_evento: s.id_evento ?? s.eventoId,
    nombre_codigo: s.nombre_codigo ?? s.nombreCodigo,
  };
}

async function procesarPagoCompletado(payload) {
  const d = normalizar(payload);
  const codigo = typeof d.nombre_codigo === 'string' ? d.nombre_codigo.trim() : '';
  if (!codigo) return { estado: 'ignorado', motivo: 'sin_codigo' };
  if (!d.id_pago || !d.id_usuario) return { estado: 'ignorado', motivo: 'payload_incompleto' };

  const idPago = String(d.id_pago);
  const promo = await Promocion.findOne({ nombre_codigo: codigo.toUpperCase() });
  if (!promo) return { estado: 'ignorado', motivo: 'codigo_inexistente' };

  try { // 1) el índice único de id_pago actúa de candado
    await RegistroUso.create({
      id_promocion: promo._id, id_usuario: String(d.id_usuario),
      id_evento: String(d.id_evento || promo.id_evento),
      id_pago: idPago, nombre_codigo: promo.nombre_codigo,
    });
  } catch (e) {
    if (e && e.code === 11000) return { estado: 'duplicado' };
    throw e;
  }

  try { // 2) descuento atómico, sin bajar de 0
    await Promocion.updateOne({ _id: promo._id }, [{ $set: {
      cantidad_codigos: { $max: [0, { $subtract: ['$cantidad_codigos', 1] }] },
      usos_actuales: { $add: ['$usos_actuales', 1] },
    } }], { updatePipeline: true });
  } catch (e) {
    await RegistroUso.deleteOne({ id_pago: idPago }).catch(() => {});
    throw e;
  }
  return { estado: 'procesado' };
}
module.exports = { procesarPagoCompletado };