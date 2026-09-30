const Promocion = require('../models/Promocion');
const RegistroUso = require('../models/RegistroUso');

async function procesarPagoCompletado(payload) {
  try {
    const { id_pago, id_usuario, id_evento, nombre_codigo } = payload;

    if (!nombre_codigo || !id_pago) {
      return; // Se descarta si la compra no utilizó código
    }

    const promo = await Promocion.findOne({ nombre_codigo: nombre_codigo.toUpperCase() });
    if (!promo) {
      console.warn(`[Evento Pagos] Código ${nombre_codigo} no encontrado.`);
      return;
    }

    // Decrementa cupón disponible e incrementa usos
    if (promo.cantidad_codigos > 0) {
      promo.cantidad_codigos -= 1;
      promo.usos_actuales += 1;
      await promo.save();
    }

    // Registra la trazabilidad del uso
    await RegistroUso.create({
      id_promocion: promo._id,
      id_usuario,
      id_evento,
      id_pago,
      nombre_codigo: promo.nombre_codigo
    });

    console.log(`[Evento Pagos] Descuento registrado exitosamente para el pago ${id_pago}`);
  } catch (error) {
    console.error('[Evento Pagos] Error al procesar pago completado:', error.message);
  }
}

module.exports = { procesarPagoCompletado };
