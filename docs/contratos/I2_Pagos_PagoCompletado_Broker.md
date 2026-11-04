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
