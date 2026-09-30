const mongoose = require('mongoose');

const RegistroUsoSchema = new mongoose.Schema({
  id_promocion: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Promocion', 
    required: true 
  },
  id_usuario: { 
    type: String, 
    required: true 
  }, // Referencia externa (Auth)
  id_evento: { 
    type: String, 
    required: true 
  },  // Referencia externa
  id_pago: { 
    type: String, 
    required: true, 
    unique: true 
  }, // Trazabilidad con Pagos
  nombre_codigo: { 
    type: String, 
    required: true 
  },
  fecha_uso: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('RegistroUso', RegistroUsoSchema);