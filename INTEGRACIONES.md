# Declaración de Integraciones - Promociones

| Integración | Tipo (A, B o C) | Módulo contraparte | Servicio, endpoint o tópico | Contrato (ruta en repo) | Ítem en GitHub |
| --- | --- | --- | --- | --- | --- |
| I1 | A | Auth | POST /api/auth/verify-token | Contrato Consumo de Cupón.pdf | #12 |
| I2 | C | Pagos | Queue: pago.completado | docs/contratos/I2_Pagos_PagoCompletado_Broker.md | #15 |

## Detalles de integraciones

* **I1 (Auth):** Validación de token JWT con Auth al intentar aplicar descuentos o gestionar promociones.
* **I2 (Pagos):** Consumo del evento `pago.completado` por RabbitMQ para registrar el uso en `RegistroUso` e incrementar el contador de la promoción.
