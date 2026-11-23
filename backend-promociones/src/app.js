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
// CORS con credenciales: el frontend compartido envía la cookie jwt de Auth a través del API Gateway.
// Con "*" el navegador rechaza la respuesta cuando hay cookies, por eso se refleja el origen.
// CORS_ORIGINS=http://localhost:3000,... limita los orígenes; vacío = refleja el origen de la petición.
const ORIGENES = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: ORIGENES.length ? ORIGENES : true, credentials: true }));
app.use(express.json());


 // Registrar las solicitudes que recibe Promociones
app.use((req, res, next) => {
  if (req.path.startsWith('/api/promociones')) {
    const fecha = new Date().toISOString();
    const id = req.get('x-request-id') || 'sin-id';

    // Registrar el resultado cuando termine la solicitud
    res.on('finish', () => {
      console.log(`[API] ${fecha} id=${id} metodo=${req.method} ruta=${req.originalUrl} estado=${res.statusCode}`);
    });
  }

  next();
});


// Documentación Swagger montada (Revisión rúbrica BE1 y BE3)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Estado del microservicio: considera saludable el servicio si MongoDB está conectado.
// También informa si el consumidor de pagos (RabbitMQ) está activo.
app.get('/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  const { estadoBroker } = require('./events/broker');
  return res.status(databaseReady ? 200 : 503).json({
    servicio: 'promociones',
    estado: databaseReady ? 'ok' : 'degradado',
    base_datos: databaseReady ? 'conectada' : 'no_conectada',
    broker: estadoBroker
  });
});

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
      require('./events/broker').iniciarConsumidor(procesarPagoCompletado);
      console.log(`[Servicio Promociones] Corriendo en el puerto ${PORT}`);
      console.log(`[Swagger] Documentación disponible en http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Error de conexión:', err.message);
  });
