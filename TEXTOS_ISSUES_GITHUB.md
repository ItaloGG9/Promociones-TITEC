# Textos para GitHub (Issues) — Entrega 4

## 1. Issue nuevo: integración con Auth (I1)

**Título:** Integración API: Validar sesión y rol del usuario (Auth)

**Asignado a:** responsable de Back End · **Milestone:** sprint de la Entrega 4

**Cuerpo (copiar y pegar):**

```markdown
Como Sistema de Promociones, necesito validar la sesión del usuario con el servicio Auth para permitir que solo organizadores y staff creen, listen y modifiquen promociones.

**Módulo contraparte:** Auth
**Tipo de integración:** A. Autenticación
**Contrato:** `docs/contratos/Contrato_I1_Auth_Promociones.docx`
**Servicio consumido:** `GET {AUTH_SERVICE_URL}/internal/validar-sesion` con la cookie `jwt` del usuario y el header `x-api-key` (INTERNAL_API_KEY)

**Dependencias de datos a recibir (según tabla):**
- `id_usuario` (Auth)
- `rol` (Auth)

### Criterios de Aceptación
- Sin cookie de sesión, las rutas de administración responden 401 "Debes iniciar sesión".
- Si Auth rechaza la cookie (vencida o inválida), Promociones responde 401.
- Con sesión válida y rol `usuario`, crear, listar todas o modificar promociones responde 403.
- Con sesión válida y rol `organizador` o `staff`, se puede crear, listar y modificar promociones.
- Si Auth no responde, Promociones responde 503 sin caerse.
- `GET /api/promociones/sesion` devuelve `{ id_usuario, rol_usuario }` para el frontend compartido.
- La dirección de Auth y la clave interna se leen desde variables de entorno.

### Política de seguridad (autorización)
La clave interna (`INTERNAL_API_KEY`) no se versiona en el repositorio. Administración restringida a los roles `organizador` y `staff`.

### Definition of Done (equipo):
- [ ] PR revisado
- [ ] Rutas protegidas documentadas en Swagger (401/403)
- [ ] Casos 1.1 a 1.13 de `promociones_workstation.postman_collection.json` ejecutados en workstation

### Definition of Done (proyecto):
- [ ] Probado contra Auth real en workstation
- [ ] Desplegado en integración (workstation)
- [ ] Docs centrales al día (INTEGRACIONES.md)
```

---

## 2. Agregar a los issues #9 (Entradas) y #11 (Pagos)

Al inicio del cuerpo de cada uno, agregar (editar issue → pegar arriba):

**#9:**

```markdown
**Módulo contraparte:** Entradas/Inventario (a través del API Gateway)
**Tipo de integración:** B. API Gateway
**Contrato:** `docs/contratos/Contrato_I2_Promociones_Entradas.docx`
**Servicio provisto:** `POST /api/promociones/evaluar` — pruebas 2.1 a 2.8 y 4.4 de la colección de workstation
```

**#11:**

```markdown
**Módulo contraparte:** Pagos
**Tipo de integración:** C. Broker
**Contrato:** `docs/contratos/Contrato_I3_Pagos_Promociones.docx`
**Evento consumido:** `pago.completado` (exchange `ticketu.events`, cola `promociones.pagos`) — pruebas 3.1 a 3.4 de la colección de workstation
```

---

## 3. Comentario para cerrar el #10 (Catálogo) como fuera de alcance

Cerrar con **Close as not planned** y este comentario:

```markdown
Se cierra como fuera de alcance de la Entrega 4. Promociones no necesita suscribirse a la creación de eventos: la promoción guarda solo `id_evento` como referencia y los eventos se obtienen del Catálogo/Panel organizador en el frontend compartido. Las integraciones implementadas son I1 (Auth), I2 (API Gateway, consumida por Entradas) e I3 (Broker, evento de Pagos).
```

---

## 4. Estado de las historias (GE3)

Después de verificar en workstation, cerrar las historias e integraciones que cumplan todos sus criterios (candidatas: #3, #4, #5, #6, #7, #9, #11 y el issue nuevo de Auth). Ojo con el #1: su segundo criterio (bloquear códigos en eventos gratuitos) no está implementado, así que debe quedar abierto o con un comentario que lo explique. Dejar abierto lo que no funcione, para que el tablero coincida con lo instalado. Asignar todas al milestone/sprint de la Entrega 4 (o al que corresponda) para cumplir GE1.
