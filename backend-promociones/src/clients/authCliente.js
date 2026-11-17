
const axios = require('axios');

// Cliente para comunicarse con el microservicio Auth
class AuthClient {

  // Consulta a Auth para validar la sesión y obtener el usuario
  static async validarUsuarioYRol(cookie) {

    const url = process.env.AUTH_SERVICE_URL;
    const clave = process.env.INTERNAL_API_KEY;

    // Comprobar que estén configurados los datos de conexión
    if (!url || !clave) {
      throw new Error('Falta configurar la conexión con Auth');
    }

    // Enviar la cookie de sesión al servicio Auth
    const respuesta = await axios.get(`${url}/internal/validar-sesion`, {
      headers: {
        Cookie: cookie,
        'x-api-key': clave
      },
      timeout: Number(process.env.HTTP_TIMEOUT_MS) || 5000
    });

    // Comprobar que Auth devolvió un usuario válido
    if (!respuesta.data ||
        respuesta.data.valido !== true ||
        !respuesta.data.usuario ||
        !respuesta.data.usuario.id_usuario ||
        !respuesta.data.usuario.rol) {
      throw new Error('Respuesta inválida del servicio Auth');
    }

    // Entregar los datos del usuario autenticado
    return respuesta.data.usuario;
  }
}

module.exports = AuthClient;
