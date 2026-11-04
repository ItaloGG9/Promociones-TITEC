# Contrato de Integración I2: Evento Pago Completado (RabbitMQ)

* **Módulo emisor:** Pagos
* **Módulo receptor:** Promociones
* **Exchange:** `titec_events_exchange` (Topic)
* **Routing Key:** `pago.completado`
* **Queue Name:** `promociones_pago_completado_queue`

## Esquema del Mensaje (JSON)

```json
{
  "evento": "PAGO_COMPLETADO",
  "pagoId": "651a2b3c4d5e6f7a8b9c0d1e",
  "usuarioId": "usr_987654321",
  "codigoPromocion": "FIESTA2026",
  "montoTotal": 25000,
  "descuentoAplicado": 5000,
  "fechaPago": "2026-11-04T10:30:00.000Z"
}

## Respuestas y Códigos de Error
* **Procesamiento Exitoso**: Se crea un documento en registros_uso y se incrementa promocion.usosActuales. El mensaje se confirma con channel.ack(msg).

* **Error de Validación / Mensaje Mal Formado**: Si falta codigoPromocion o pagoId, se descarta el mensaje sin reintentar con channel.nack(msg, false, false).

* **Error Temporal Base de Datos**: Se rechaza el mensaje para reencolarlo con channel.nack(msg, false, true).
