const axios = require('axios');

const PANEL_API_URL = process.env.PANEL_SERVICE_URL || 'http://panel-service:3000/api/v1';

async function obtenerDetalleEvento(id_evento) {
  try {
    const response = await axios.get(`${PANEL_API_URL}/eventos/${id_evento}`, { timeout: 3000 });
    return response.data; // { id_evento, nombre, tipo_entrada: 'pago' | 'gratis' }
  } catch (error) {
    console.error(`[PanelClient] Error al consultar evento ${id_evento}:`, error.message);
    return null;
  }
}

module.exports = { obtenerDetalleEvento };