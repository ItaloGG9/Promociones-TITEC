const mongoose = require('mongoose');

const PromocionSchema = new mongoose.Schema({
  nombre_codigo: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  id_evento: { 
    type: String, 
    required: true 
  }, // Referencia externa (Panel/Catálogo)
  porcentaje_descuento: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 100 
  },
  fecha_inicio: { 
    type: Date, 
    required: true 
  },
  fecha_fin: { 
    type: Date, 
    required: true 
  },
  cantidad_codigos: { 
    type: Number, 
    required: true, 
    min: 0 
  }, // Stock restante
  usos_actuales: { 
    type: Number, 
    default: 0 
  },
  minimo_entradas: { 
    type: Number, 
    default: 1, 
    min: 1 
  },
  max_usos_por_cuenta: { 
    type: Number, 
    default: 1, 
    min: 1 
  },
  activo: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Promocion', PromocionSchema);