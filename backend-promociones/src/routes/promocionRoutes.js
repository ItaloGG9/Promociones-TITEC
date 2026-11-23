const express = require('express');
const router = express.Router();
const controller = require('../controllers/promocionController');
const { validarSesion, permitirAdministracion } = require('../middlewares/authMiddleware');

// Rutas publicadas por el API Gateway (/api/promociones/* se reenvía sin reescribir la ruta).
// Las consume el frontend compartido (FrontendTitec, src/modules/promociones/api.ts),
// Entradas (POST /api/promociones/evaluar) y el checkout (POST /api/promociones/validar/:codigo).

/**
 * @openapi
 * /api/promociones/sesion:
 *   get:
 *     summary: Usuario de la sesión actual según Auth
 *     description: La usa el frontend compartido para saber si mostrar el panel de administración.
 *     tags: [Administración]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Sesión válida
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Sesion' }
 *       401: { $ref: '#/components/responses/SinSesion' }
 *       503: { $ref: '#/components/responses/AuthNoDisponible' }
 */
router.get('/api/promociones/sesion', validarSesion, controller.obtenerSesion);

/**
 * @openapi
 * /api/promociones:
 *   get:
 *     summary: Listar todas las promociones
 *     description: Panel de administración del frontend compartido. Ordenadas de la más reciente a la más antigua.
 *     tags: [Administración]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de promociones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Promocion' }
 *       401: { $ref: '#/components/responses/SinSesion' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       503: { $ref: '#/components/responses/AuthNoDisponible' }
 *   post:
 *     summary: Crear un código promocional (HU-01)
 *     tags: [Administración]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PromocionNueva' }
 *     responses:
 *       201:
 *         description: Promoción creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Promocion' }
 *       400:
 *         description: Datos inválidos (código vacío o duplicado, porcentaje fuera de 1-100, fecha límite pasada o anterior al inicio)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { mensaje: 'La fecha límite no puede ser una fecha pasada.' }
 *       401: { $ref: '#/components/responses/SinSesion' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       503: { $ref: '#/components/responses/AuthNoDisponible' }
 */
router.get('/api/promociones', validarSesion, permitirAdministracion, controller.listarTodas);
router.post('/api/promociones', validarSesion, permitirAdministracion, controller.crearPromocion);

/**
 * @openapi
 * /api/promociones/eventos/{id_evento}/promociones:
 *   get:
 *     summary: Listar las promociones de un evento
 *     description: También disponible como `GET /api/promociones/evento/{id_evento}`.
 *     tags: [Consulta]
 *     parameters:
 *       - in: path
 *         name: id_evento
 *         required: true
 *         schema: { type: string }
 *         example: evt-123
 *     responses:
 *       200:
 *         description: Lista de promociones del evento (vacía si no tiene)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Promocion' }
 */
router.get('/api/promociones/eventos/:id_evento/promociones', controller.listarPorEvento);
router.get('/api/promociones/evento/:id_evento', controller.listarPorEvento);

/**
 * @openapi
 * /api/promociones/{id_promocion}:
 *   patch:
 *     summary: Modificar o desactivar un código promocional (HU-03 / HU-04)
 *     tags: [Administración]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id_promocion
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PromocionCambios' }
 *     responses:
 *       200:
 *         description: Promoción actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Promocion' }
 *       400:
 *         description: Fechas inválidas, o intento de cambiar nombre o porcentaje de un código ya usado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401: { $ref: '#/components/responses/SinSesion' }
 *       403: { $ref: '#/components/responses/SinPermiso' }
 *       404:
 *         description: Promoción no encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example: { mensaje: 'Promoción no encontrada.' }
 *       503: { $ref: '#/components/responses/AuthNoDisponible' }
 */
router.patch('/api/promociones/:id_promocion', validarSesion, permitirAdministracion, controller.modificarPromocion);

/**
 * @openapi
 * /api/promociones/validar/{nombre_codigo}:
 *   post:
 *     summary: Validar un código promocional en el checkout
 *     tags: [Integración Checkout]
 *     parameters:
 *       - in: path
 *         name: nombre_codigo
 *         required: true
 *         schema: { type: string }
 *         example: VERANO2027
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ValidacionSolicitud' }
 *     responses:
 *       200:
 *         description: Código válido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidacionRespuesta' }
 *       400:
 *         description: Parámetros incompletos, código desactivado, de otro evento, fuera de vigencia, sin stock, bajo el mínimo de entradas o límite de usos alcanzado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidacionRespuesta' }
 *             example: { valido: false, mensaje: 'El código promocional ha expirado o aún no entra en vigencia.' }
 *       404:
 *         description: El código no existe
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidacionRespuesta' }
 *             example: { valido: false, mensaje: 'El código promocional no existe.' }
 */
router.post('/api/promociones/validar/:nombre_codigo', controller.validarCodigo);

/**
 * @openapi
 * /api/promociones/evaluar:
 *   post:
 *     summary: Evaluar el descuento de una compra (servicio requerido por Entradas)
 *     description: |
 *       Entradas/Inventario llama a esta ruta por el API Gateway antes de confirmar la compra
 *       (contrato I2). Si no corresponde descuento responde 200 con `porcentaje_descuento: 0`
 *       y el `motivo`, para que Entradas continúe la compra sin descuento.
 *     tags: [Integración Entradas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EvaluacionSolicitud' }
 *     responses:
 *       200:
 *         description: Evaluación realizada (con o sin descuento)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EvaluacionRespuesta' }
 *             examples:
 *               con_descuento:
 *                 value: { porcentaje_descuento: 20, id_promocion: '6740c1f2a3b4c5d6e7f80910', nombre_codigo: 'VERANO2027', descripcion: 'Descuento del 20% con el código VERANO2027' }
 *               sin_descuento:
 *                 value: { porcentaje_descuento: 0, motivo: 'expirado', mensaje: 'El código promocional ha expirado.' }
 *       400:
 *         description: Faltan id_evento, id_usuario o cantidad_entradas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EvaluacionRespuesta' }
 *             example: { porcentaje_descuento: 0, motivo: 'datos_incompletos', mensaje: 'Datos incompletos para evaluar la promoción (id_evento, id_usuario y cantidad_entradas).' }
 */
router.post('/api/promociones/evaluar', controller.evaluarPromocionVigente);

// Alias de compatibilidad (versiones anteriores y pruebas de evaluaciones previas).
router.post('/api/v1/promociones', validarSesion, permitirAdministracion, controller.crearPromocion);
router.get('/api/v1/promociones/evento/:id_evento', controller.listarPorEvento);
router.patch('/api/v1/promociones/:id_promocion', validarSesion, permitirAdministracion, controller.modificarPromocion);
router.post('/api/v1/promociones/evaluar', controller.evaluarPromocionVigente);
router.post('/promociones/validar/:nombre_codigo', controller.validarCodigo);

module.exports = router;
