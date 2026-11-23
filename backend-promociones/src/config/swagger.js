const swaggerJSDoc = require('swagger-jsdoc');

// Servidores: el API Gateway de la plataforma (si se configuró su dirección pública)
// y el propio servicio (rutas relativas). Las rutas son las mismas en ambos casos,
// porque el Gateway reenvía /api/promociones/* sin reescribir la ruta.
const servers = [];
if (process.env.API_GATEWAY_PUBLIC_URL) {
  servers.push({ url: process.env.API_GATEWAY_PUBLIC_URL, description: 'API Gateway de TicketU' });
}
servers.push({ url: '/', description: 'Servicio de Promociones (acceso directo)' });

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Microservicio de Promociones - TicketU',
      version: '1.1.0',
      description: [
        'API del módulo Promociones: administración de códigos promocionales y evaluación de descuentos.',
        '',
        '**Integraciones**',
        '- **I1 Auth:** las rutas marcadas con candado requieren la cookie de sesión `jwt` emitida por Auth (`POST /api/auth/login`). Promociones la valida con `GET /internal/validar-sesion` de Auth. Roles con permiso de administración: `organizador` y `staff`.',
        '- **I2 API Gateway:** todas las rutas se publican por el Gateway bajo `/api/promociones/*`. Entradas consume `POST /api/promociones/evaluar`.',
        '- **I3 Broker (Pagos):** Promociones consume el evento `pago.completado` (exchange `ticketu.events`, cola `promociones.pagos`). Por cada pago con `nombre_codigo` registra el uso (idempotente por `id_pago`) y descuenta una unidad del stock. No es una ruta HTTP, por eso no aparece en la lista.',
        '',
        'Las rutas `/api/v1/promociones/...` y `/promociones/validar/{nombre_codigo}` se mantienen como alias de compatibilidad.',
        '',
        'Nota: el navegador no permite que Swagger UI envíe la cookie `jwt` manualmente. Para probar las rutas protegidas, inicie sesión en la aplicación desde el mismo origen o use la colección Postman de `backend-promociones/tests`.',
      ].join('\n'),
    },
    servers,
    tags: [
      { name: 'Administración', description: 'Gestión de promociones (requiere sesión de organizador o staff)' },
      { name: 'Consulta', description: 'Consultas públicas de promociones' },
      { name: 'Integración Entradas', description: 'Servicio requerido por Entradas/Inventario (I2)' },
      { name: 'Integración Checkout', description: 'Validación de código en el checkout' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'jwt', description: 'Cookie de sesión HttpOnly emitida por Auth' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { mensaje: { type: 'string', example: 'Debes iniciar sesión' } },
        },
        Promocion: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '6740c1f2a3b4c5d6e7f80910' },
            nombre_codigo: { type: 'string', example: 'VERANO2027' },
            id_evento: { type: 'string', description: 'Referencia externa al evento (Catálogo/Panel organizador)', example: 'evt-123' },
            porcentaje_descuento: { type: 'number', minimum: 1, maximum: 100, example: 20 },
            fecha_inicio: { type: 'string', format: 'date-time', example: '2026-12-01T00:00:00.000Z' },
            fecha_fin: { type: 'string', format: 'date-time', example: '2027-01-31T23:59:59.000Z' },
            cantidad_codigos: { type: 'integer', minimum: 0, description: 'Stock restante', example: 100 },
            usos_actuales: { type: 'integer', example: 0 },
            minimo_entradas: { type: 'integer', minimum: 1, example: 1 },
            max_usos_por_cuenta: { type: 'integer', minimum: 1, example: 1 },
            activo: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PromocionNueva: {
          type: 'object',
          required: ['nombre_codigo', 'id_evento', 'porcentaje_descuento', 'fecha_inicio', 'fecha_fin', 'cantidad_codigos'],
          properties: {
            nombre_codigo: { type: 'string', example: 'VERANO2027' },
            id_evento: { type: 'string', example: 'evt-123' },
            porcentaje_descuento: { type: 'number', minimum: 1, maximum: 100, example: 20 },
            fecha_inicio: { type: 'string', format: 'date-time', example: '2026-12-01T00:00:00.000Z' },
            fecha_fin: { type: 'string', format: 'date-time', description: 'No puede ser pasada ni anterior a fecha_inicio', example: '2027-01-31T23:59:59.000Z' },
            cantidad_codigos: { type: 'integer', minimum: 0, example: 100 },
            minimo_entradas: { type: 'integer', minimum: 1, default: 1, example: 1 },
            max_usos_por_cuenta: { type: 'integer', minimum: 1, default: 1, example: 1 },
          },
        },
        PromocionCambios: {
          type: 'object',
          description: 'Todos los campos son opcionales. Si el código ya fue usado, no se puede cambiar su nombre ni su porcentaje.',
          properties: {
            fecha_inicio: { type: 'string', format: 'date-time', example: '2026-12-01T00:00:00.000Z' },
            fecha_fin: { type: 'string', format: 'date-time', example: '2027-02-28T23:59:59.000Z' },
            cantidad_codigos: { type: 'integer', minimum: 0, example: 150 },
            activo: { type: 'boolean', example: false },
            porcentaje_descuento: { type: 'number', minimum: 1, maximum: 100, example: 25 },
            nombre_codigo: { type: 'string', example: 'VERANO2027' },
          },
        },
        Sesion: {
          type: 'object',
          properties: {
            id_usuario: { type: 'string', example: '1d3f5a7b-0000-4000-8000-000000000001' },
            rol_usuario: { type: 'string', enum: ['usuario', 'organizador', 'staff'], example: 'organizador' },
          },
        },
        EvaluacionSolicitud: {
          type: 'object',
          required: ['id_evento', 'id_usuario', 'cantidad_entradas'],
          properties: {
            id_evento: { type: 'string', example: 'evt-123' },
            id_usuario: { type: 'string', example: '1d3f5a7b-0000-4000-8000-000000000001' },
            cantidad_entradas: { type: 'integer', minimum: 1, example: 2 },
            codigo_promocion: { type: 'string', description: 'Opcional. Sin código se busca la promoción automática vigente del evento.', example: 'VERANO2027' },
          },
        },
        EvaluacionRespuesta: {
          type: 'object',
          properties: {
            porcentaje_descuento: { type: 'number', description: '0 cuando no aplica descuento', example: 20 },
            id_promocion: { type: 'string', example: '6740c1f2a3b4c5d6e7f80910' },
            nombre_codigo: { type: 'string', example: 'VERANO2027' },
            descripcion: { type: 'string', example: 'Descuento del 20% con el código VERANO2027' },
            motivo: {
              type: 'string',
              description: 'Solo cuando porcentaje_descuento es 0',
              enum: ['codigo_inexistente', 'otro_evento', 'inactivo', 'no_vigente', 'expirado', 'agotado', 'minimo_entradas', 'limite_usuario', 'sin_promocion', 'datos_incompletos'],
            },
            mensaje: { type: 'string' },
          },
        },
        ValidacionSolicitud: {
          type: 'object',
          required: ['id_evento', 'cantidad_entradas', 'usuario'],
          properties: {
            id_evento: { type: 'string', example: 'evt-123' },
            cantidad_entradas: { type: 'integer', example: 2 },
            precio_base: { type: 'number', example: 15000 },
            usuario: {
              type: 'object',
              required: ['id_usuario'],
              properties: {
                id_usuario: { type: 'string', example: '1d3f5a7b-0000-4000-8000-000000000001' },
                rol_usuario: { type: 'string', example: 'usuario' },
              },
            },
          },
        },
        ValidacionRespuesta: {
          type: 'object',
          properties: {
            valido: { type: 'boolean', example: true },
            porcentaje_descuento: { type: 'number', example: 20 },
            id_evento: { type: 'string', example: 'evt-123' },
            mensaje: { type: 'string' },
          },
        },
      },
      responses: {
        SinSesion: { description: 'Sin sesión o sesión inválida según Auth', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { mensaje: 'Debes iniciar sesión' } } } },
        SinPermiso: { description: 'La sesión es válida, pero el rol no es organizador ni staff', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { mensaje: 'No tienes permisos para administrar promociones' } } } },
        AuthNoDisponible: { description: 'No fue posible consultar a Auth', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJSDoc(options);
