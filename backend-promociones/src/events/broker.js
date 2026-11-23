const amqp = require('amqplib');
const URL = process.env.BROKER_URL;
const EXCHANGE = process.env.EVENT_EXCHANGE || 'ticketu.events';
const QUEUE = 'promociones.pagos';
const ESPERA_REINTENTO_MS = 5000;

// Estado visible en GET /health para comprobar que el consumidor de Pagos está activo
const estado = { conectado: false, consumidor_activo: false, cola: QUEUE, ultimo_error: null };

function log(mensaje) {
  console.log(`[Broker] ${new Date().toISOString()} ${mensaje}`);
}

async function conectar(handler) {
  let conn = null;
  let reintentoProgramado = false;

  // Cualquier caída (conexión, canal o consumidor cancelado por el broker) cierra todo y
  // vuelve a conectar. Así no queda una conexión abierta sin consumidor en promociones.pagos.
  const reintentar = (motivo) => {
    if (reintentoProgramado) return;
    reintentoProgramado = true;
    estado.conectado = false;
    estado.consumidor_activo = false;
    estado.ultimo_error = motivo;
    log(`${motivo}. Reintentando en ${ESPERA_REINTENTO_MS / 1000} s`);
    if (conn) conn.close().catch(() => {});
    setTimeout(() => conectar(handler), ESPERA_REINTENTO_MS);
  };

  try {
    conn = await amqp.connect(URL);
    conn.on('error', (e) => { estado.ultimo_error = e.message; });
    conn.on('close', () => reintentar('Conexión con el broker cerrada'));

    const ch = await conn.createChannel();
    ch.on('error', (e) => { estado.ultimo_error = e.message; });
    ch.on('close', () => reintentar('Canal del broker cerrado'));

    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
    await ch.assertQueue(QUEUE, { durable: true });
    // Escuchar solamente el evento acordado con Pagos
    await ch.unbindQueue(QUEUE, EXCHANGE, 'pago.realizado');
    await ch.bindQueue(QUEUE, EXCHANGE, 'pago.completado');
    await ch.prefetch(10);

    await ch.consume(QUEUE, async (msg) => {
      // msg null: el broker canceló el consumidor (por ejemplo, la cola fue eliminada)
      if (!msg) {
        reintentar('El broker canceló el consumidor de ' + QUEUE);
        return;
      }

      let ev;
      try { ev = JSON.parse(msg.content.toString()); }
      catch { return ch.nack(msg, false, false); }

      try {
        // Ignorar eventos que no correspondan a Promociones
        if (msg.fields.routingKey !== 'pago.completado') {
          ch.ack(msg);
          return;
        }

        // Obtener los datos del pago
        const datos = ev?.data && typeof ev.data === 'object' ? ev.data : ev;

        // Procesar el evento recibido
        const resultado = await handler(datos);

        // Registrar el evento y su resultado
        log(`evento=${msg.fields.routingKey} id_pago=${datos.id_pago || 'na'} estado=${resultado.estado}${resultado.motivo ? ' motivo=' + resultado.motivo : ''}`);

        ch.ack(msg);
      } catch (error) {
        // Registrar los errores al procesar el mensaje
        console.error(`[Broker] ${new Date().toISOString()} Error al procesar evento:`, error.message);
        ch.nack(msg, false, !msg.fields.redelivered);
      }
    });

    estado.conectado = true;
    estado.consumidor_activo = true;
    estado.ultimo_error = null;
    log(`Suscrito a ${QUEUE} (exchange ${EXCHANGE}, routing key pago.completado)`);
  } catch (e) {
    reintentar(e.message);
  }
}

module.exports = { iniciarConsumidor: conectar, estadoBroker: estado };
