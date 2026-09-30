const axios = require('axios');

const CATALOGO_API_URL = process.env.CATALOGO_SERVICE_URL || 'http://catalogo-service:3000/api/v1';

async function consultarPrecioEvento(id_evento) {
  try {
    const response = await axios.get(`${CATALOGO_API_URL}/eventos/${id_evento}/precio`, { timeout: 3000 });
    return response.data; // { id_evento, precio_base }
  } catch (error) {
    console.error(`[CatalogoClient] Error al consultar precio del evento ${id_evento}:`, error.message);
    return null;
  }
}

module.exports = { consultarPrecioEvento };