const amqp = require('amqplib');
const URL = process.env.BROKER_URL || 'amqp://ticketu:ticketu_dev@localhost:5672/ticketu';
const EXCHANGE = process.env.EVENT_EXCHANGE || 'ticketu.events';
const QUEUE = 'promociones.pagos';

async function conectar(handler) {
  try {
    const conn = await amqp.connect(URL);
    conn.on('close', () => setTimeout(() => conectar(handler), 5000));
    conn.on('error', () => {});
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
    await ch.assertQueue(QUEUE, { durable: true });
    // Escuchar solamente el evento acordado con Pagos
    await ch.unbindQueue(QUEUE, EXCHANGE, 'pago.realizado');
    await ch.bindQueue(QUEUE, EXCHANGE, 'pago.completado');
    ch.prefetch(10);
    await ch.consume(QUEUE, async (msg) => {
      if (!msg) return;
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
        console.log(`[Broker] ${new Date().toISOString()} evento=${msg.fields.routingKey} id_pago=${datos.id_pago || 'na'} estado=${resultado.estado}`);

        ch.ack(msg);

      } catch (error) {
        // Registrar los errores al procesar el mensaje
        console.error(`[Broker] ${new Date().toISOString()} Error al procesar evento:`, error.message);

        ch.nack(msg, false, !msg.fields.redelivered);
      }

    });
    console.log('[Broker] Suscrito a', QUEUE);
  } catch (e) {
    console.error('[Broker]', e.message);
    setTimeout(() => conectar(handler), 5000);
  }
}
module.exports = { iniciarConsumidor: conectar };