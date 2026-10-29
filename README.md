# Promociones-TITEC

Rol: Back End
Ítems: BE1, BE2, BE3 
Responsable: Nicolas Tapia

Rol: Base de Datos 
Ítems: BD1, BD2, BD3, BD4 
Responsable: Italo Grossi

Rol: UI/UX (front end) 
Ítems: UI1, UI2, UI3 
Responsable: Diego Fernández

Rol: Gestión 
Ítems: GE1, GE2, GE3, GE4 
Responsable: Fernando Zamora

Rol: Calidad
Ítems: CA1, CA2
Responsable: Nicolas Tapia


## Integración funcional

- **Servicio provisto:** API REST de Promociones para listar promociones, validar cupones de Checkout y evaluar descuentos para Entradas.
- **Servicio consumido:** RabbitMQ compartido de TicketU; el consumidor `promociones.pagos` procesa `pago.realizado`/`pago.completado`, guarda el uso y descuenta el stock.
- **Frontend:** FrontendTitec consulta las promociones activas a través del API Gateway.
- **Panel Organizador:** no se requiere para arrancar este flujo; la validación de si un evento es gratuito queda pendiente hasta disponer de su endpoint real.

Ver [`../GUIA_INTEGRACION_PROMOCIONES.md`](../GUIA_INTEGRACION_PROMOCIONES.md) para pasos de ejecución y pruebas.
