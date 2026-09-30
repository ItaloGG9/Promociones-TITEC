const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api/v1/auth';

/**
 * Cliente de integración con el Microservicio de Auth.
 * Dependencia: usuario (id, rol) según tabla de dependencias TITEC 2026-2.
 */
class AuthClient {
  /**
   * Valida un token de sesión o consulta la identidad y rol de un usuario.
   * @param {string} token - Token de autenticación del usuario.
   * @returns {Promise<{ id_usuario: string, rol_usuario: string }>}
   */
  static async validarUsuarioYRol(token) {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/verificar`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 2000
      });
      return response.data;
    } catch (error) {
      console.error('[AuthClient] Error al consultar servicio de Auth:', error.message);
      // Retorno controlado para resiliencia en caso de servicio caído o mock
      return null;
    }
  }
}

module.exports = AuthClient;