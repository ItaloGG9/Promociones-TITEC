require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const promocionRoutes = require('./routes/promocionRoutes');
const { procesarPagoCompletado } = require('./events/pagoConsumer');

const app = express();
const PORT = process.env.PORT || 3005;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/promociones_db';

// Middlewares
app.use(cors());
app.use(express.json());

// Documentación Swagger montada (Revisión rúbrica BE1 y BE3)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas de la API
app.use('/', promocionRoutes);

// Endpoint simulador para pruebas del evento asíncrono de Pagos
app.post('/test/webhook/pago-completado', async (req, res) => {
  await procesarPagoCompletado(req.body);
  res.status(200).json({ status: 'Evento recibido y procesado' });
});

// Conexión MongoDB y arranque
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[MongoDB] Conexión establecida');
    app.listen(PORT, () => {
      console.log(`[Servicio Promociones] Corriendo en el puerto ${PORT}`);
      console.log(`[Swagger] Documentación disponible en http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Error de conexión:', err.message);
  });