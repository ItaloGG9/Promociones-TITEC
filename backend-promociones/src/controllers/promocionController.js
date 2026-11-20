const Promocion = require('../models/Promocion');
const RegistroUso = require('../models/RegistroUso');
const mongoose = require('mongoose');

// Reglas de fechas de una promoción (se validan aquí aunque el front ya las controle,
// porque la API también se puede llamar por el gateway o Postman).
function validarFechas(fechaInicio, fechaFin) {
  const inicio = fechaInicio ? new Date(fechaInicio) : null;
  const fin = fechaFin ? new Date(fechaFin) : null;
  if (fechaInicio && Number.isNaN(inicio.getTime())) return 'La fecha de inicio no es válida.';
  if (fechaFin && Number.isNaN(fin.getTime())) return 'La fecha límite no es válida.';
  if (fin && fin.getTime() < Date.now()) return 'La fecha límite no puede ser una fecha pasada.';
  if (inicio && fin && fin.getTime() < inicio.getTime()) return 'La fecha límite no puede ser anterior a la fecha de inicio.';
  return null;
}

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

    // Comprobar que se ingresó un código promocional
    if (typeof nombre_codigo !== 'string' || !nombre_codigo.trim()) {
      return res.status(400).json({ mensaje: 'Debes ingresar un código promocional.' });
    }

    // El microservicio Panel Organizador no está disponible en este entorno.
    // id_evento se conserva como referencia externa; la creación no depende
    // de una llamada remota inexistente. La elegibilidad del evento debe
    // verificarse al integrar el servicio real del organizador.

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ mensaje: 'Datos inválidos', detalle: ['fecha_inicio y fecha_fin son obligatorias.'] });
    }
    const errorFechas = validarFechas(fecha_inicio, fecha_fin);
    if (errorFechas) {
      return res.status(400).json({ mensaje: errorFechas });
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
    if (error.name === 'ValidationError') return res.status(400).json({ mensaje: 'Datos inválidos', detalle: Object.values(error.errors).map(e => e.message) });
    if (error.code === 11000) return res.status(400).json({ mensaje: 'El código promocional ya existe.' });
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

// Listado completo para el panel de administración del frontend compartido
// (FrontendTitec, src/modules/promociones/api.ts -> listarPromociones: GET /api/promociones)
exports.listarTodas = async (req, res) => {
  try {
    const promociones = await Promocion.find().sort({ createdAt: -1 });
    return res.status(200).json(promociones);
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al obtener promociones.' });
  }
};

// Usuario de la sesión según Auth, para el frontend compartido
// (FrontendTitec, src/modules/promociones/api.ts -> obtenerSesion: GET /api/promociones/sesion)
exports.obtenerSesion = (req, res) => {
  return res.status(200).json({
    id_usuario: req.usuario.id_usuario,
    rol_usuario: req.usuario.rol,
  });
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

    if (fecha_inicio || fecha_fin) {
      // Se valida la combinación final: lo que llega + lo que ya tenía la promoción.
      // La fecha límite solo se exige futura cuando se cambia (desactivar una promoción vencida sigue permitido).
      const inicioFinal = fecha_inicio || promo.fecha_inicio;
      const errorFechas = fecha_fin
        ? validarFechas(inicioFinal, fecha_fin)
        : validarFechas(fecha_inicio, null)
          || (new Date(fecha_inicio) > promo.fecha_fin ? 'La fecha de inicio no puede ser posterior a la fecha límite.' : null);
      if (errorFechas) {
        return res.status(400).json({ mensaje: errorFechas });
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
  // Servicio provisto a Entradas por el API Gateway (I2):
  //   POST /api/promociones/evaluar  { id_evento, id_usuario, cantidad_entradas, codigo_promocion? }
  // Entradas (FrontendTitec, modules/entradas/api.ts) aplica el descuento si porcentaje_descuento > 0.
  // Si no aplica, responde 200 con porcentaje_descuento 0 y el motivo (Entradas sigue sin descuento).
  try {
    const { id_evento, id_usuario, cantidad_entradas } = req.body || {};
    const codigo = String(req.body?.codigo_promocion || req.body?.nombre_codigo || '').trim().toUpperCase();
    const cantidad = Number(cantidad_entradas);

    if (!id_evento || !id_usuario || !Number.isFinite(cantidad) || cantidad < 1) {
      return res.status(400).json({ porcentaje_descuento: 0, motivo: 'datos_incompletos',
        mensaje: 'Datos incompletos para evaluar la promoción (id_evento, id_usuario y cantidad_entradas).' });
    }

    const sinDescuento = (motivo, mensaje) => res.status(200).json({ porcentaje_descuento: 0, motivo, mensaje });
    const ahora = new Date();
    let promo;

    if (codigo) {
      promo = await Promocion.findOne({ nombre_codigo: codigo });
      if (!promo) return sinDescuento('codigo_inexistente', 'El código promocional no existe.');
      if (promo.id_evento !== String(id_evento)) return sinDescuento('otro_evento', 'El código no corresponde a este evento.');
      if (!promo.activo) return sinDescuento('inactivo', 'El código promocional no está activo.');
      if (promo.fecha_inicio > ahora) return sinDescuento('no_vigente', 'El código promocional aún no está vigente.');
      if (promo.fecha_fin < ahora) return sinDescuento('expirado', 'El código promocional ha expirado.');
      if (promo.cantidad_codigos <= 0) return sinDescuento('agotado', 'El código promocional está agotado.');
      if (cantidad < promo.minimo_entradas) return sinDescuento('minimo_entradas', `Este código requiere al menos ${promo.minimo_entradas} entradas.`);
    } else {
      // Sin código: promoción automática vigente del evento (comportamiento anterior)
      promo = await Promocion.findOne({
        id_evento: String(id_evento), activo: true,
        fecha_inicio: { $lte: ahora }, fecha_fin: { $gte: ahora },
        cantidad_codigos: { $gt: 0 }, minimo_entradas: { $lte: cantidad },
      });
      if (!promo) return sinDescuento('sin_promocion', 'No hay promociones vigentes para este evento.');
    }

    const usosUsuario = await RegistroUso.countDocuments({ id_promocion: promo._id, id_usuario: String(id_usuario) });
    if (usosUsuario >= promo.max_usos_por_cuenta) {
      return sinDescuento('limite_usuario', 'Ya alcanzaste el límite de usos de este código.');
    }

    return res.status(200).json({
      porcentaje_descuento: promo.porcentaje_descuento,
      id_promocion: promo._id.toString(),
      nombre_codigo: promo.nombre_codigo,
      descripcion: `Descuento del ${promo.porcentaje_descuento}% con el código ${promo.nombre_codigo}`,
    });
  } catch (error) {
    console.error(`[Evaluar] error: ${error.message}`);
    return res.status(500).json({ porcentaje_descuento: 0, mensaje: 'Error interno del servicio de Promociones.' });
  }
};