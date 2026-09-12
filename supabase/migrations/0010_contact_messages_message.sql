-- ---------------------------------------------------------------------
-- Agrega el campo de mensaje libre al formulario de contacto.
--
-- Antes el formulario solo pedía tema + subtema + datos de contacto,
-- sin espacio para que la persona describiera con sus palabras qué
-- necesita exactamente (talla, color, número de pedido, etc.). Sin eso,
-- quien responde el mensaje tiene que escribirle de vuelta a preguntar
-- detalles antes de poder ayudar. Con este campo, la idea es que una
-- sola respuesta ya sea la indicada.
--
-- Nullable: los mensajes ya guardados antes de este cambio no tienen
-- este dato y no hay forma de rellenarlo retroactivamente.
-- ---------------------------------------------------------------------

alter table contact_messages add column if not exists message text;
