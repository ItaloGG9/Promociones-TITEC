const axios = require('axios');

const ENTRADAS_SERVICE_URL = process.env.ENTRADAS_SERVICE_URL || 'http://localhost:3002/api/v1/inventario';

/**
 * Cliente de integración con el Microservicio de Entradas / Inventario.
 * Dependencia: cantidad de entradas y disponibilidad de stock por evento.
 */
class EntradasClient {
  /**
   * Consulta el stock y la cantidad de entradas vendidas/disponibles para un evento.
   * @param {string} idEvento - Identificador único del evento (ej. "evt-123").
   * @returns {Promise<{ id_evento: string, total_disponible: number, estado_evento: string }>}
   */
  static async consultarStockEvento(idEvento) {
    try {
      const response = await axios.get(`${ENTRADAS_SERVICE_URL}/evento/${idEvento}`, {
        timeout: 2000
      });
      return response.data;
    } catch (error) {
      console.error(`[EntradasClient] Error al consultar inventario para ${idEvento}:`, error.message);
      return null;
    }
  }

  /**
   * Verifica la cantidad de entradas asociadas a una reserva o compra.
   * @param {string} idReserva - Identificador de la reserva.
   * @returns {Promise<{ cantidad_entradas: number, id_evento: string }>}
   */
  static async obtenerCantidadEntradas(idReserva) {
    try {
      const response = await axios.get(`${ENTRADAS_SERVICE_URL}/reservas/${idReserva}`, {
        timeout: 2000
      });
      return response.data;
    } catch (error) {
      console.error(`[EntradasClient] Error al consultar reserva ${idReserva}:`, error.message);
      return null;
    }
  }
}

module.exports = EntradasClient;