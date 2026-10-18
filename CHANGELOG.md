
# GroupHub - Historial de Cambios (Changelog)

Línea de tiempo del desarrollo y sistema de versiones de la plataforma GroupHub.

---

## [v2.1.0] - Automatización de Comunidad
**Fecha:** Mayo 2024
- **Funcionalidad:** Implementación de grupo predeterminado al registro.
- **Mejora:** Ahora todos los nuevos usuarios se unen automáticamente al grupo "Chatroom" al crear su cuenta, fomentando la participación inmediata.

## [v2.0.1] - Optimización de Descubrimiento
**Fecha:** Mayo 2024
- **Mejora:** El botón de "Refrescar" en las sugerencias de amigos ahora ofrece resultados variados mediante un sistema de aleatoriedad controlada.
- **Técnico:** Implementación de barajado de grupos de origen y "jitter" en el cálculo de relevancia de usuarios.

## [v2.0.0] - Apertura de Contenido para Tráfico Orgánico
**Fecha:** Mayo 2024 (Actual)
- **Funcionalidad:** Mensajes de grupo ahora son públicos (solo lectura) para no miembros y visitantes.
- **SEO:** Se eliminó el bloqueo de visualización en grupos privados para permitir la indexación y mejorar el tráfico orgánico.
- **Seguridad:** La capacidad de publicar mensajes sigue restringida exclusivamente a los miembros del grupo.
- **UX:** Los no miembros ahora ven una invitación a unirse en lugar de un campo de texto vacío en el tablón de mensajes.

## [v1.9.0] - Notificaciones de Hilos del Foro
**Fecha:** Mayo 2024
- **Funcionalidad:** Sistema de notificaciones para hilos seguidos.
- **Lógica:** Ahora los usuarios reciben una notificación cuando hay una nueva respuesta en un hilo que crearon o en el que han participado.
- **Técnico:** Implementación de rastreo de `participatedThreadIds` en el perfil de usuario y lógica de comparación con `lastRead` en LocalStorage.

## [v1.8.0] - Anuncios Globales (Broadcast)
**Fecha:** Mayo 2024
- **Funcionalidad:** Herramienta de transmisión global para administradores.
- **Capacidad:** Ahora el administrador puede enviar mensajes con formato Markdown a todos los grupos de la plataforma simultáneamente.
- **Integración:** Los anuncios disparan automáticamente notificaciones de "mensajes nuevos" para todos los miembros.

## [v1.7.0] - Sistema de Notificaciones Inteligentes
**Fecha:** Mayo 2024
- **Mejora:** Implementación de notificaciones granulares por grupo.
- **Funcionalidad:** Ahora los usuarios reciben una notificación individual por cada grupo que tenga mensajes nuevos desde su última visita.
- **Técnico:** Se añadió rastreo de `lastRead` en almacenamiento local y actualización automática de `updatedAt` en grupos al recibir mensajes.

## [v1.6.0] - Interactividad y UX Móvil
**Fecha:** Mayo 2024
- **Mejora:** Optimización del Dashboard para pantallas pequeñas, moviendo el botón de refresco al pie de la tarjeta para evitar desbordamientos.
- **Mejora:** Soporte completo de **Markdown** en los chats privados, permitiendo que los enlaces (como el del mensaje de bienvenida) sean clicables e interactivos.

## [v1.5.0] - Identidad Visual Dinámica
**Fecha:** Mayo 2024
- **Mejora:** Implementación de un fondo dinámico geométrico generado aleatoriamente en cada carga de página.
- **Evolución:** Se pasó de círculos simples a una mezcla de círculos, cuadrados, triángulos y elipses con opacidad controlada para mejorar la profundidad visual sin sacrificar legibilidad.

## [v1.4.0] - Automatización y Retención
**Fecha:** Mayo 2024
- **Funcionalidad:** Sistema de Mensaje Directo (DM) automático para nuevos usuarios.
- **Impacto:** Al registrarse, el sistema envía un mensaje de bienvenida del administrador con sugerencias y enlaces directos para unirse a grupos, fomentando la participación inmediata.

## [v1.3.0] - Estabilidad y Framework
**Fecha:** Mayo 2024
- **Core:** Corrección de errores críticos de servidor (Internal Server Error) relacionados con Next.js 15.
- **Técnico:** Implementación de `await params` en layouts dinámicos y robustez en la inicialización de Firebase Admin para prevenir cierres inesperados.

## [v1.2.0] - Moderación y Roles de Administrador
**Fecha:** Mayo 2024
- **Funcionalidad:** Se otorgó el rol de "Administrador de Foro" a los creadores de los mismos.
- **Herramientas:** Opción para eliminar hilos (threads) y mensajes específicos por parte de los creadores o autores.
- **Admin:** Opción de eliminación completa de foros (incluyendo subcolecciones) exclusiva para el dueño de la aplicación.

## [v1.1.0] - Optimización de Foros
**Fecha:** Mayo 2024
- **Mejora:** Implementación de ordenamiento dinámico en la lista de foros.
- **Lógica:** Los foros con actividad más reciente (mensajes más nuevos) ahora aparecen automáticamente en la parte superior.

## [v1.0.0] - Lanzamiento Inicial
**Fecha:** Mayo 2024
- **Core:** Sistema base de Autenticación (Firebase Auth).
- **Core:** Creación y gestión de Grupos (Públicos/Privados) y Eventos.
- **Core:** Sistema de Amistades y Mensajería Directa.
- **Core:** Estructura inicial de Foros y Perfiles de Usuario.

---
*Este documento se actualiza con cada hito significativo del proyecto.*
