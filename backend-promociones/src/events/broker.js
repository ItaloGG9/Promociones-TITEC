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
    for (const k of ['pago.completado', 'pago.realizado']) await ch.bindQueue(QUEUE, EXCHANGE, k);
    ch.prefetch(10);
    await ch.consume(QUEUE, async (msg) => {
      if (!msg) return;
      let ev;
      try { ev = JSON.parse(msg.content.toString()); }
      catch { return ch.nack(msg, false, false); }
      try {
        await handler(ev?.data && typeof ev.data === 'object' ? ev.data : ev);
        ch.ack(msg);
      } catch { ch.nack(msg, false, !msg.fields.redelivered); }
    });
    console.log('[Broker] Suscrito a', QUEUE);
  } catch (e) {
    console.error('[Broker]', e.message);
    setTimeout(() => conectar(handler), 5000);
  }
}
module.exports = { iniciarConsumidor: conectar };