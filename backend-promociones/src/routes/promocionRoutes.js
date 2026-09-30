const express = require('express');
const router = express.Router();
const controller = require('../controllers/promocionController');

/**
 * @openapi
 * /api/v1/promociones:
 *   post:
 *     summary: Crear un nuevo código promocional (HU-01)
 *     tags: [Promociones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre_codigo, id_evento, porcentaje_descuento, fecha_inicio, fecha_fin, cantidad_codigos]
 *             properties:
 *               nombre_codigo: { type: string, example: "FIESTA2026" }
 *               id_evento: { type: string, example: "evt-123" }
 *               porcentaje_descuento: { type: number, example: 20 }
 *               fecha_inicio: { type: string, format: date-time }
 *               fecha_fin: { type: string, format: date-time }
 *               cantidad_codigos: { type: number, example: 100 }
 *               minimo_entradas: { type: number, example: 2 }
 *               max_usos_por_cuenta: { type: number, example: 1 }
 *     responses:
 *       201: { description: Promoción creada exitosamente }
 *       400: { description: Error de validación o evento gratuito }
 */
router.post('/api/v1/promociones', controller.crearPromocion);

/**
 * @openapi
 * /api/v1/promociones/evento/{id_evento}:
 *   get:
 *     summary: Listar promociones de un evento
 *     tags: [Promociones]
 *     parameters:
 *       - in: path
 *         name: id_evento
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista de promociones obtenida }
 */
router.get('/api/v1/promociones/evento/:id_evento', controller.listarPorEvento);

/**
 * @openapi
 * /api/v1/promociones/{id_promocion}:
 *   patch:
 *     summary: Modificar o desactivar un código promocional
 *     tags: [Promociones]
 *     parameters:
 *       - in: path
 *         name: id_promocion
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha_inicio: { type: string, format: date-time }
 *               fecha_fin: { type: string, format: date-time }
 *               cantidad_codigos: { type: number }
 *               activo: { type: boolean }
 *     responses:
 *       200: { description: Promoción actualizada exitosamente }
 *       400: { description: Parámetros inválidos o intento de modificar cupón usado }
 */
router.patch('/api/v1/promociones/:id_promocion', controller.modificarPromocion);

/**
 * @openapi
 * /promociones/validar/{nombre_codigo}:
 *   post:
 *     summary: Validar código promocional en checkout (Contrato Checkout)
 *     tags: [Integración Checkout/Pagos]
 *     parameters:
 *       - in: path
 *         name: nombre_codigo
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_evento, cantidad_entradas, usuario, precio_base]
 *             properties:
 *               id_evento: { type: string, example: "evt-123" }
 *               cantidad_entradas: { type: integer, example: 2 }
 *               precio_base: { type: number, example: 15000 }
 *               usuario:
 *                 type: object
 *                 properties:
 *                   id_usuario: { type: string, example: "usr-999" }
 *                   rol_usuario: { type: string, example: "cliente" }
 *     responses:
 *       200: { description: Código evaluado exitosamente }
 *       400: { description: Código expirado, límite superado o entradas insuficientes }
 *       404: { description: Código no encontrado }
 */
router.post('/promociones/validar/:nombre_codigo', controller.validarCodigo);

/**
 * @openapi
 * /api/v1/promociones/evaluar:
 *   post:
 *     summary: Evaluar promoción vigente para Entradas/Inventario (Contrato Entradas)
 *     tags: [Integración Entradas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_evento, id_usuario, cantidad_entradas]
 *             properties:
 *               id_evento: { type: string, example: "evt-77889" }
 *               id_usuario: { type: string, example: "usr-12345" }
 *               cantidad_entradas: { type: integer, example: 2 }
 *     responses:
 *       200: { description: Evaluación completada }
 *       400: { description: Datos incompletos }
 */
router.post('/api/v1/promociones/evaluar', controller.evaluarPromocionVigente);

module.exports = router;