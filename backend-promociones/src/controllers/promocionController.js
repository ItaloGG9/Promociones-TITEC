const Promocion = require('../models/Promocion');
const RegistroUso = require('../models/RegistroUso');
const { obtenerDetalleEvento } = require('../clients/panelClient');
const mongoose = require('mongoose');

// H1: Crear código de descuento (asociado a evento pagado)
exports.crearPromocion = async (req, res) => {
  try {
    const { 
      nombre_codigo, 
      id_evento, 
      porcentaje_descuento, 
      fecha_inicio, 
      fecha_fin, 
      cantidad_codigos, 
      minimo_entradas, 
      max_usos_por_cuenta 
    } = req.body;

    // Validación contra el servicio de Panel Organizador
    const evento = await obtenerDetalleEvento(id_evento);
    if (evento && evento.tipo_entrada === 'gratis') {
      return res.status(400).json({ 
        mensaje: 'No se pueden crear códigos promocionales para eventos gratuitos.' 
      });
    }

    const promocionExistente = await Promocion.findOne({ nombre_codigo: nombre_codigo.toUpperCase() });
    if (promocionExistente) {
      return res.status(400).json({ mensaje: 'El código promocional ya existe.' });
    }

    const nuevaPromocion = new Promocion({
      nombre_codigo,
      id_evento,
      porcentaje_descuento,
      fecha_inicio,
      fecha_fin,
      cantidad_codigos,
      minimo_entradas: minimo_entradas || 1,
      max_usos_por_cuenta: max_usos_por_cuenta || 1
    });

    await nuevaPromocion.save();
    return res.status(201).json(nuevaPromocion);
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al crear la promoción.', error: error.message });
  }
};

// Listar promociones asociadas a un evento
exports.listarPorEvento = async (req, res) => {
  try {
    const { id_evento } = req.params;
    const promociones = await Promocion.find({ id_evento });
    return res.status(200).json(promociones);
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al obtener promociones.', error: error.message });
  }
};

// Modificación y desactivación de códigos
exports.modificarPromocion = async (req, res) => {
  try {
    const { id_promocion } = req.params;
    const { fecha_inicio, fecha_fin, cantidad_codigos, activo, nombre_codigo, porcentaje_descuento } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id_promocion)) {
      return res.status(404).json({ mensaje: 'Promoción no encontrada.' });
    }

    const promo = await Promocion.findById(id_promocion);
    if (!promo) {
      return res.status(404).json({ mensaje: 'Promoción no encontrada.' });
    }

    // Bloqueo de edición si ya ha sido utilizado al menos una vez
    if (promo.usos_actuales > 0) {
      if ((nombre_codigo && nombre_codigo.toUpperCase() !== promo.nombre_codigo) || 
          (porcentaje_descuento !== undefined && porcentaje_descuento !== promo.porcentaje_descuento)) {
        return res.status(400).json({
          mensaje: 'No se puede modificar el nombre del código ni el porcentaje de un cupón que ya fue utilizado.'
        });
      }
    }

    if (fecha_inicio) promo.fecha_inicio = fecha_inicio;
    if (fecha_fin) promo.fecha_fin = fecha_fin;
    if (cantidad_codigos !== undefined) promo.cantidad_codigos = cantidad_codigos;
    if (activo !== undefined) promo.activo = activo;
    if (porcentaje_descuento !== undefined) promo.porcentaje_descuento = porcentaje_descuento;
    if (nombre_codigo) promo.nombre_codigo = nombre_codigo.toUpperCase();

    await promo.save();
    return res.status(200).json(promo);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ mensaje: 'Promoción no encontrada.' });
    }
    return res.status(500).json({ mensaje: 'Error al actualizar la promoción.', error: error.message });
  }
};

// Contrato Checkout: POST /promociones/validar/:nombre_codigo (BE3 / Consumido por Checkout)
exports.validarCodigo = async (req, res) => {
  try {
    const { nombre_codigo } = req.params;
    const { id_evento, cantidad_entradas, usuario } = req.body;

    if (!id_evento || !cantidad_entradas || !usuario || !usuario.id_usuario) {
      return res.status(400).json({ valido: false, mensaje: 'Parámetros de validación incompletos.' });
    }

    const promo = await Promocion.findOne({ nombre_codigo: nombre_codigo.toUpperCase() });
    if (!promo) {
      return res.status(404).json({ valido: false, mensaje: 'El código promocional no existe.' });
    }

    if (!promo.activo) {
      return res.status(400).json({ valido: false, mensaje: 'El código se encuentra desactivado.' });
    }

    if (promo.id_evento !== id_evento) {
      return res.status(400).json({ valido: false, mensaje: 'El código no pertenece a este evento.' });
    }

    const ahora = new Date();
    if (ahora < promo.fecha_inicio || ahora > promo.fecha_fin) {
      return res.status(400).json({ valido: false, mensaje: 'El código promocional ha expirado o aún no entra en vigencia.' });
    }

    if (promo.cantidad_codigos <= 0) {
      return res.status(400).json({ valido: false, mensaje: 'No quedan cupones disponibles para este código.' });
    }

    if (cantidad_entradas < promo.minimo_entradas) {
      return res.status(400).json({ 
        valido: false, 
        mensaje: `Este código requiere la compra mínima de ${promo.minimo_entradas} entradas.` 
      });
    }

    // Regla de usos máximos por cuenta/usuario en este evento
    const usosPrevios = await RegistroUso.countDocuments({
      id_promocion: promo._id,
      id_usuario: usuario.id_usuario
    });

    if (usosPrevios >= promo.max_usos_por_cuenta) {
      return res.status(400).json({ 
        valido: false, 
        mensaje: 'Ya alcanzaste el límite de usos permitidos para este código.' 
      });
    }

    return res.status(200).json({
      valido: true,
      porcentaje_descuento: promo.porcentaje_descuento,
      id_evento: promo.id_evento
    });
  } catch (error) {
    return res.status(500).json({ valido: false, mensaje: 'Error interno del servidor.', error: error.message });
  }
};

// Contrato Entradas: POST /api/v1/promociones/evaluar (BE3 / Consumido por Entradas/Inventario)
exports.evaluarPromocionVigente = async (req, res) => {
  try {
    const { id_evento, id_usuario, cantidad_entradas } = req.body;

    if (!id_evento || !id_usuario || !cantidad_entradas) {
      return res.status(400).json({ mensaje: 'Datos incompletos para evaluar la promoción.' });
    }

    const ahora = new Date();
    // Busca alguna promoción automática/activa para el evento
    const promo = await Promocion.findOne({
      id_evento,
      activo: true,
      fecha_inicio: { $lte: ahora },
      fecha_fin: { $gte: ahora },
      cantidad_codigos: { $gt: 0 },
      minimo_entradas: { $lte: cantidad_entradas }
    });

    if (!promo) {
      return res.status(200).json({ porcentaje_descuento: 0 });
    }

    const usosUsuario = await RegistroUso.countDocuments({
      id_promocion: promo._id,
      id_usuario
    });

    if (usosUsuario >= promo.max_usos_por_cuenta) {
      return res.status(200).json({ porcentaje_descuento: 0 });
    }

    return res.status(200).json({
      porcentaje_descuento: promo.porcentaje_descuento,
      id_promocion: promo._id.toString()
    });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error interno del servicio de Promociones.', error: error.message });
  }
};