const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Microservicio de Promociones - TicketU',
      version: '1.0.0',
      description: 'API del módulo de promociones para gestión y validación de cupones de descuento.'
    },
    servers: [
  {
    url: 'https://promociones-titec-production.up.railway.app',
    description: 'Servidor de Producción (Railway)'
  },
  {
    url: 'http://localhost:3005',
    description: 'Servidor de desarrollo local'
  }
],
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJSDoc(options);
