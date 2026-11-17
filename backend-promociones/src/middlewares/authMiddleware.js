
const AuthClient = require('../clients/authCliente');

// Comprueba que el usuario tenga una sesión válida
async function validarSesion(req, res, next) {
  const cookie = req.headers.cookie;

  // Si no hay cookie, el usuario no está autenticado
  if (!cookie) {
    return res.status(401).json({
      mensaje: 'Debes iniciar sesión'
    });
  }

  try {
    // Consultar a Auth para obtener los datos del usuario
    const usuario = await AuthClient.validarUsuarioYRol(cookie);

    // Guardar el usuario para utilizarlo en las rutas
    req.usuario = usuario;
    next();

  } catch (error) {
    // Auth rechazó la sesión del usuario
    if (error.response && error.response.status === 401) {
      return res.status(401).json({
        mensaje: 'Sesión inválida o vencida'
      });
    }

    // Si Auth falla, no se permite continuar
    console.error('[Auth] Error al validar sesión:', error.message);

    return res.status(503).json({
      mensaje: 'No se pudo verificar la sesión con Auth'
    });
  }
}

// Permite administrar promociones solo a organizadores y staff
function permitirAdministracion(req, res, next) {
  const rol = req.usuario.rol;

  if (rol !== 'organizador' && rol !== 'staff') {
    return res.status(403).json({
      mensaje: 'No tienes permisos para administrar promociones'
    });
  }

  next();
}

module.exports = {
  validarSesion,
  permitirAdministracion
};
