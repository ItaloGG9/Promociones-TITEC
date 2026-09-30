# Evidencias de Pruebas de Funcionalidad - Microservicio Promociones

**Fecha de ejecución:** 30 de Septiembre de 2026  
**Entorno de pruebas:** Localhost (Node.js/Express) + MongoDB Atlas  
**Herramienta de verificación:** OpenAPI / Swagger UI (`http://localhost:3005/api-docs`)

---

## Resumen de Casos de Prueba Ejecutados

| ID Caso | Módulo / Endpoint | Escenario Evaluado | Entrada | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | `GET /api/v1/promociones/evento/:id` | Listar promociones por evento | `id_evento: "evt-123"` | Código `200 OK` con lista de cupones | Lista obtenida (`DESC50`, `GRUPO20`, etc.) | **APROBADO** |
| **TC-02** | `POST /api/v1/promociones` | Creación de nuevo cupón | Payload con código `PRUEBA10` | Código `201 Created` con ID asignado | Cupón persistido en MongoDB | **APROBADO** |
| **TC-03** | `PATCH /api/v1/promociones/:id` | Control de error por ID inexistente | `id_promocion: "000000000000000000000000"` | Código `404 Not Found` | Código `404` con mensaje controlado | **APROBADO** |
| **TC-04** | `POST /promociones/validar/:codigo` | Validación Checkout - Cupón vigente | Código `DESC50`, 2 entradas | Código `200 OK`, `valido: true`, `50%` desc. | Código `200 OK`, descuento calculado | **APROBADO** |
| **TC-05** | `POST /promociones/validar/:codigo` | Validación Checkout - Cupón expirado | Código `EXPIRADO30` | Código `400 Bad Request`, `valido: false` | Código `400 Bad Request`, mensaje de vigencia | **APROBADO** |
| **TC-06** | `POST /promociones/validar/:codigo` | Validación Checkout - Mínimo de entradas | Código `GRUPO20`, 2 entradas (requiere 4) | Código `400 Bad Request`, `valido: false` | Código `400 Bad Request`, mensaje de mínimo | **APROBADO** |
| **TC-07** | `POST /api/v1/promociones/evaluar` | Integración Entradas - Evento con promo | `id_evento: "evt-123"`, 2 entradas | Código `200 OK` con promoción activa (50%) | Código `200 OK` con datos de promo | **APROBADO** |
| **TC-08** | `POST /api/v1/promociones/evaluar` | Integración Entradas - Evento sin promo | `id_evento: "evt-999"`, 2 entradas | Código `200 OK`, `porcentaje_descuento: 0` | Código `200 OK` sin descuento aplicado | **APROBADO** |