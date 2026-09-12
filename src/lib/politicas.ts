/**
 * Texto legal de YEI APPAREL, adaptado a la normativa colombiana:
 * Ley 1480 de 2011 (Estatuto del Consumidor) y Ley 1581 de 2012 con su
 * Decreto reglamentario 1377 de 2013 (protección de datos personales).
 *
 * Los valores entre corchetes son marcadores que deben reemplazarse con
 * los datos reales de la empresa antes de publicar. La página los resalta
 * en pantalla justamente para que no pasen desapercibidos.
 */

export type Bloque =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; items: string[] }
  | { tipo: "pasos"; items: string[] }
  | { tipo: "destacado"; texto: string }
  | { tipo: "subtitulo"; texto: string };

export type Politica = {
  numero: string;
  titulo: string;
  intro?: string;
  bloques: Bloque[];
};

export const POLITICAS: Politica[] = [
  {
    numero: "1",
    titulo: "Política de envíos",
    intro:
      "En YEI APPAREL trabajamos para que tu pedido llegue a ti de manera segura y en el menor tiempo posible.",
    bloques: [
      { tipo: "subtitulo", texto: "Procesamiento de pedidos" },
      {
        tipo: "parrafo",
        texto:
          "Una vez realizada la compra, nuestro equipo realizará la preparación y validación del pedido. Los pedidos serán procesados en días hábiles, de lunes a viernes.",
      },
      {
        tipo: "parrafo",
        texto:
          "El tiempo de preparación del pedido puede ser de 1 a 3 días hábiles antes de ser entregado a la empresa transportadora.",
      },
      { tipo: "subtitulo", texto: "Tiempos de entrega" },
      {
        tipo: "parrafo",
        texto:
          "Los tiempos de entrega pueden variar dependiendo de la ciudad o municipio de destino y de la empresa transportadora. Como referencia, los tiempos estimados son:",
      },
      {
        tipo: "lista",
        items: [
          "Bogotá y municipios cercanos: entre 1 y 3 días hábiles.",
          "Ciudades principales de Colombia: entre 2 y 5 días hábiles.",
          "Otros municipios y zonas de cobertura especial: el tiempo podrá variar según la ubicación.",
        ],
      },
      {
        tipo: "parrafo",
        texto:
          "Estos tiempos son estimados y pueden verse afectados por factores externos, temporadas de alta demanda, condiciones climáticas, novedades logísticas o situaciones propias de la empresa transportadora.",
      },
      { tipo: "subtitulo", texto: "Costo del envío" },
      {
        tipo: "parrafo",
        texto:
          "El valor del envío será informado al momento de finalizar la compra y podrá variar según la ciudad de destino, el peso y las dimensiones del pedido.",
      },
      {
        tipo: "parrafo",
        texto:
          "En caso de realizar campañas de envío gratuito, las condiciones serán informadas previamente en nuestra página web o canales oficiales.",
      },
      { tipo: "subtitulo", texto: "Información de entrega" },
      {
        tipo: "parrafo",
        texto:
          "Es responsabilidad del cliente proporcionar correctamente los datos de envío, incluyendo nombre completo, dirección, ciudad, teléfono y demás información necesaria para realizar la entrega.",
      },
      {
        tipo: "parrafo",
        texto:
          "YEI APPAREL no se hace responsable por retrasos o inconvenientes ocasionados por información incorrecta o incompleta proporcionada por el cliente.",
      },
      { tipo: "subtitulo", texto: "Seguimiento del pedido" },
      {
        tipo: "parrafo",
        texto:
          "Una vez el pedido sea entregado a la empresa transportadora, el cliente podrá recibir la información necesaria para realizar el seguimiento de su envío, cuando aplique.",
      },
      { tipo: "subtitulo", texto: "Pedidos no entregados" },
      {
        tipo: "parrafo",
        texto:
          "Si un pedido no puede ser entregado debido a información incorrecta, ausencia reiterada del destinatario u otras causas atribuibles al cliente, los costos adicionales que puedan generarse por un nuevo envío deberán ser asumidos por el cliente.",
      },
      {
        tipo: "parrafo",
        texto:
          "Si tienes alguna inquietud sobre tu pedido, puedes comunicarte con nosotros a través de nuestros canales oficiales de atención.",
      },
    ],
  },
  {
    numero: "2",
    titulo: "Política de cambios y devoluciones",
    intro:
      "En YEI APPAREL queremos que ames cada una de tus prendas y tengas una excelente experiencia con nuestra marca. Por esta razón, contamos con la siguiente política de cambios y devoluciones, la cual incorpora los derechos que la ley colombiana reconoce a todo consumidor en ventas a distancia o por medios electrónicos.",
    bloques: [
      {
        tipo: "subtitulo",
        texto: "2.1 Derecho de retracto (Artículo 47, Ley 1480 de 2011)",
      },
      {
        tipo: "destacado",
        texto:
          "Esta sección es de obligatorio cumplimiento para toda venta realizada por medios no tradicionales o a distancia (incluyendo la página web, WhatsApp, redes sociales, etc.) y no puede ser eliminada ni limitada por la marca.",
      },
      {
        tipo: "parrafo",
        texto:
          "Por tratarse de una compra realizada a través de medios electrónicos o a distancia, el cliente tiene derecho a retractarse de la compra sin necesidad de justificar su decisión, dentro de los cinco (5) días hábiles siguientes a la entrega del producto.",
      },
      {
        tipo: "parrafo",
        texto: "Para ejercer este derecho, el cliente deberá:",
      },
      {
        tipo: "pasos",
        items: [
          "Informar su decisión a YEI APPAREL a través de nuestros canales oficiales de atención, indicando el número de pedido.",
          "Devolver el producto en las mismas condiciones en que fue recibido: sin uso, sin lavar, con todas sus etiquetas originales y, en lo posible, en su empaque original.",
          "Asumir el costo del transporte de devolución, salvo que la ley disponga lo contrario o que el motivo del retracto se deba a un error o defecto atribuible a YEI APPAREL (en cuyo caso aplica la sección 2.4).",
        ],
      },
      {
        tipo: "parrafo",
        texto:
          "Cuando el retracto sea procedente, YEI APPAREL reembolsará la totalidad del dinero pagado, sin descuentos ni retenciones, a través del mismo medio de pago utilizado en la compra, en un plazo máximo de treinta (30) días calendario contados a partir de la fecha en que el cliente ejerza el derecho de retracto.",
      },
      {
        tipo: "parrafo",
        texto:
          "Excepciones legales: el derecho de retracto no aplica a productos elaborados conforme a las especificaciones del consumidor (por ejemplo, prendas personalizadas o hechas a la medida) ni a productos que por su naturaleza no puedan ser devueltos, de acuerdo con el artículo 47 de la Ley 1480 de 2011.",
      },
      {
        tipo: "subtitulo",
        texto: "2.2 Cambios voluntarios (beneficio adicional de la marca)",
      },
      {
        tipo: "parrafo",
        texto:
          "De manera adicional al derecho de retracto, y como beneficio propio de nuestra marca, aceptamos solicitudes de cambio (por ejemplo, de talla o color) dentro de los tres (3) días calendario siguientes a la recepción del pedido, sin perjuicio de que el cliente pueda optar, dentro de los 5 días hábiles señalados en el numeral 2.1, por el retracto y la devolución del dinero en su lugar.",
      },
      {
        tipo: "parrafo",
        texto:
          "Para solicitar un cambio, el cliente deberá comunicarse con YEI APPAREL a través de nuestros canales oficiales de atención e informar el número de pedido y el motivo de la solicitud.",
      },
      {
        tipo: "parrafo",
        texto:
          "Para que una prenda pueda ser cambiada, deberá cumplir con las siguientes condiciones:",
      },
      {
        tipo: "lista",
        items: [
          "Estar en perfecto estado.",
          "No haber sido usada, lavada, alterada o modificada.",
          "Conservar todas sus etiquetas originales.",
          "No presentar manchas, olores, daños o señales de uso.",
          "Ser enviada en condiciones adecuadas para su revisión.",
        ],
      },
      {
        tipo: "parrafo",
        texto:
          "Los cambios están sujetos a disponibilidad de inventario. En caso de que la referencia, talla o color solicitado no se encuentre disponible, el cliente podrá elegir otro producto de igual o mayor valor. En caso de seleccionar una prenda de mayor valor, deberá asumir el pago del excedente.",
      },
      {
        tipo: "parrafo",
        texto:
          "Los costos de envío relacionados con cambios por motivos diferentes a defectos de calidad o errores atribuibles a YEI APPAREL deberán ser asumidos por el cliente.",
      },
      {
        tipo: "parrafo",
        texto:
          "Sobre los reembolsos en cambios voluntarios: para solicitudes de cambio por talla, color o preferencia del cliente (distintas del derecho de retracto del numeral 2.1), YEI APPAREL no realiza reembolsos en dinero; en su lugar, el cliente podrá elegir otro producto disponible en la tienda por un valor igual o mayor, asumiendo la diferencia si aplica. Esto no afecta en ningún caso el derecho de retracto ni la garantía legal descrita en el numeral 2.4, que sí dan lugar a devolución del dinero cuando proceda conforme a la ley.",
      },
      {
        tipo: "subtitulo",
        texto: "2.3 Productos que no aplican para cambio voluntario",
      },
      {
        tipo: "parrafo",
        texto: "No serán aceptadas para cambio (numeral 2.2) las prendas que:",
      },
      {
        tipo: "lista",
        items: [
          "Hayan sido usadas o lavadas.",
          "Presenten manchas, olores, daños o señales de uso.",
          "Hayan sido modificadas o alteradas por el cliente.",
          "No cuenten con sus etiquetas originales.",
          "Sean enviadas fuera del plazo establecido para solicitar el cambio.",
        ],
      },
      {
        tipo: "subtitulo",
        texto: "2.4 Garantía legal y productos con defectos de calidad",
      },
      {
        tipo: "parrafo",
        texto:
          "Todos los productos comercializados por YEI APPAREL cuentan con la garantía legal establecida en los artículos 7 a 18 de la Ley 1480 de 2011, cuyo término mínimo es de un (1) año contado a partir de la entrega del producto, salvo que la naturaleza del bien o su etiquetado indiquen un término distinto.",
      },
      {
        tipo: "parrafo",
        texto:
          "Si recibes una prenda con algún defecto de calidad o un error atribuible a YEI APPAREL, comunícate con nosotros lo antes posible a través de nuestros canales oficiales, adjuntando fotografías y la información de tu pedido.",
      },
      {
        tipo: "parrafo",
        texto:
          "Conforme a la ley, ante un defecto de calidad el cliente puede elegir, sin costo alguno, entre:",
      },
      {
        tipo: "lista",
        items: [
          "La reparación gratuita del producto,",
          "El cambio del producto por otro de las mismas características, o",
          "La devolución del dinero pagado.",
        ],
      },
      {
        tipo: "parrafo",
        texto:
          "YEI APPAREL dará respuesta a la reclamación en un plazo máximo de quince (15) días hábiles, conforme al artículo 58 de la Ley 1480 de 2011. Cuando el inconveniente sea atribuible a YEI APPAREL, los costos relacionados con el proceso de devolución, cambio o reposición (incluyendo el envío) serán asumidos por la marca.",
      },
      { tipo: "subtitulo", texto: "Consideraciones importantes" },
      {
        tipo: "parrafo",
        texto:
          "Te recomendamos revisar cuidadosamente la guía de tallas y las características de cada producto antes de realizar tu compra. Nuestro equipo estará disponible para resolver cualquier inquietud sobre tallas, colores o productos antes de realizar el pedido.",
      },
      {
        tipo: "parrafo",
        texto:
          "Para solicitar un cambio, ejercer el derecho de retracto o reportar un inconveniente con tu pedido, puedes comunicarte con nosotros a través de nuestros canales oficiales de atención.",
      },
      {
        tipo: "parrafo",
        texto:
          "Si YEI APPAREL no da respuesta satisfactoria a tu solicitud, puedes acudir a la Superintendencia de Industria y Comercio (SIC), autoridad encargada de la protección al consumidor en Colombia.",
      },
    ],
  },
  {
    numero: "3",
    titulo: "Política de privacidad y tratamiento de datos personales",
    intro:
      "En YEI APPAREL valoramos la privacidad y seguridad de nuestros clientes. La información personal suministrada a través de nuestra página web y demás canales será tratada de manera responsable y de acuerdo con la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas que las modifiquen, adicionen o reglamenten.",
    bloques: [
      { tipo: "subtitulo", texto: "3.1 Responsable del tratamiento" },
      {
        tipo: "lista",
        items: [
          "Razón social: [NOMBRE O RAZÓN SOCIAL DE YEI APPAREL]",
          "NIT: [NIT DE LA EMPRESA]",
          "Domicilio: [DIRECCIÓN / CIUDAD]",
          "Correo electrónico de contacto para temas de datos personales: [CORREO ELECTRÓNICO]",
          "Canales oficiales de atención: [CANALES DE ATENCIÓN AL CLIENTE]",
        ],
      },
      { tipo: "subtitulo", texto: "3.2 Información que recopilamos" },
      { tipo: "parrafo", texto: "Podemos recopilar información como:" },
      {
        tipo: "lista",
        items: [
          "Nombre y apellidos.",
          "Número de teléfono.",
          "Dirección de correo electrónico.",
          "Dirección de envío.",
          "Información necesaria para procesar y entregar los pedidos.",
          "Información relacionada con las compras realizadas.",
        ],
      },
      { tipo: "subtitulo", texto: "3.3 Finalidades del tratamiento" },
      {
        tipo: "parrafo",
        texto:
          "La información suministrada por nuestros clientes podrá ser utilizada para:",
      },
      {
        tipo: "lista",
        items: [
          "Procesar y gestionar pedidos.",
          "Realizar envíos y entregas.",
          "Comunicarnos con los clientes sobre sus compras.",
          "Brindar atención al cliente.",
          "Enviar información sobre novedades, lanzamientos, promociones y campañas, cuando el cliente haya autorizado expresamente recibir estas comunicaciones.",
          "Mejorar nuestra experiencia de compra y servicios.",
          "Dar cumplimiento a obligaciones legales, contables, tributarias o requerimientos de autoridades competentes.",
        ],
      },
      { tipo: "subtitulo", texto: "3.4 Autorización del titular" },
      {
        tipo: "parrafo",
        texto:
          "De acuerdo con el artículo 9 de la Ley 1581 de 2012, el tratamiento de los datos personales requiere la autorización previa, expresa e informada del titular. Esta autorización se obtiene al momento en que el cliente proporciona sus datos a través de la página web, formularios, canales de atención u otros medios habilitados por YEI APPAREL, mediante la aceptación de la presente política.",
      },
      {
        tipo: "parrafo",
        texto:
          "El titular podrá revocar su autorización y/o solicitar la supresión de sus datos en cualquier momento, salvo que exista un deber legal o contractual que impida su eliminación inmediata.",
      },
      { tipo: "subtitulo", texto: "3.5 Derechos de los titulares" },
      {
        tipo: "parrafo",
        texto:
          "Conforme al artículo 8 de la Ley 1581 de 2012, los titulares de los datos personales tienen derecho a:",
      },
      {
        tipo: "lista",
        items: [
          "Conocer, actualizar y rectificar sus datos personales.",
          "Solicitar prueba de la autorización otorgada a YEI APPAREL.",
          "Ser informado sobre el uso que se le ha dado a sus datos.",
          "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.",
          "Revocar la autorización y/o solicitar la supresión del dato cuando no se respeten los principios, derechos y garantías constitucionales y legales.",
          "Acceder de forma gratuita a sus datos personales que hayan sido objeto de tratamiento.",
        ],
      },
      {
        tipo: "subtitulo",
        texto: "3.6 Procedimiento para consultas y reclamos",
      },
      {
        tipo: "parrafo",
        texto:
          "El titular, sus causahabientes o representantes podrán presentar consultas o reclamos relacionados con sus datos personales a través de [CORREO ELECTRÓNICO / CANAL DE ATENCIÓN], indicando su identificación y el motivo de la solicitud.",
      },
      {
        tipo: "lista",
        items: [
          "Las consultas serán atendidas en un término máximo de diez (10) días hábiles contados desde la fecha de recibo, prorrogable por cinco (5) días hábiles adicionales cuando no sea posible atenderla en dicho plazo, informando al titular los motivos de la demora.",
          "Los reclamos serán atendidos en un término máximo de quince (15) días hábiles contados a partir del día siguiente a la fecha de su recibo. Si no es posible atender el reclamo dentro de dicho término, se informará al interesado los motivos de la demora y la fecha en que se atenderá su reclamo, la cual no podrá superar los ocho (8) días hábiles siguientes al vencimiento del primer término.",
        ],
      },
      { tipo: "subtitulo", texto: "3.7 Transferencia y transmisión de datos" },
      {
        tipo: "parrafo",
        texto:
          "Para el cumplimiento de las finalidades descritas, YEI APPAREL podrá compartir información con terceros que actúan como encargados del tratamiento, tales como empresas transportadoras, pasarelas o plataformas de pago y proveedores de herramientas tecnológicas o de mensajería, quienes estarán obligados a dar a los datos el mismo nivel de protección exigido por la ley.",
      },
      { tipo: "subtitulo", texto: "3.8 Vigencia de la base de datos" },
      {
        tipo: "parrafo",
        texto:
          "Los datos personales serán conservados durante el tiempo necesario para cumplir con las finalidades para las cuales fueron recolectados, así como durante los términos legales de conservación de información comercial, contable y tributaria, y serán eliminados o anonimizados una vez dichos términos hayan vencido.",
      },
      { tipo: "subtitulo", texto: "3.9 Seguridad de la información" },
      {
        tipo: "parrafo",
        texto:
          "YEI APPAREL adopta medidas razonables, técnicas y administrativas, para proteger la información personal de sus clientes y evitar accesos no autorizados, pérdida, uso indebido o divulgación de los datos.",
      },
      {
        tipo: "parrafo",
        texto:
          "Los pagos realizados a través de nuestra página web son procesados mediante plataformas de pago que cuentan con sus propios protocolos y medidas de seguridad. YEI APPAREL no almacena información confidencial de tarjetas bancarias cuando los pagos son procesados directamente por plataformas de pago autorizadas.",
      },
      { tipo: "subtitulo", texto: "3.10 Autoridad de control" },
      {
        tipo: "parrafo",
        texto:
          "La Superintendencia de Industria y Comercio (SIC) es la autoridad nacional encargada de vigilar el cumplimiento de la normativa de protección de datos personales en Colombia. Los titulares podrán presentar ante esta entidad las quejas o reclamos que consideren pertinentes.",
      },
      { tipo: "subtitulo", texto: "3.11 Vigencia de esta política" },
      {
        tipo: "parrafo",
        texto:
          "Esta política rige a partir de su publicación en los canales oficiales de YEI APPAREL y podrá ser modificada en cualquier momento para reflejar cambios normativos o en las prácticas de tratamiento de datos de la empresa. Cualquier modificación sustancial será informada a los titulares por los canales disponibles.",
      },
    ],
  },
  {
    numero: "4",
    titulo: "Términos y condiciones de uso",
    intro:
      "El acceso y uso del sitio web de YEI APPAREL implica la aceptación plena de los presentes términos y condiciones. Si no estás de acuerdo con ellos, te pedimos abstenerte de usar el sitio o realizar compras a través de él.",
    bloques: [
      { tipo: "subtitulo", texto: "4.1 Objeto" },
      {
        tipo: "parrafo",
        texto:
          'YEI APPAREL es una tienda en línea de moda femenina que comercializa prendas de vestir a través de este sitio web, dirigido a consumidores ubicados en Colombia. Estos términos regulan la relación entre YEI APPAREL y cualquier persona que navegue o compre en el sitio ("el usuario" o "el cliente").',
      },
      { tipo: "subtitulo", texto: "4.2 Capacidad para contratar" },
      {
        tipo: "parrafo",
        texto:
          "Al realizar una compra, el usuario declara ser mayor de edad y tener capacidad legal para celebrar contratos conforme a la ley colombiana. Las compras realizadas por menores de edad deberán contar con la autorización y supervisión de sus padres o representantes legales.",
      },
      { tipo: "subtitulo", texto: "4.3 Productos, precios y disponibilidad" },
      {
        tipo: "parrafo",
        texto:
          "Los precios publicados en el sitio están expresados en pesos colombianos (COP) e incluyen los impuestos aplicables, salvo que se indique lo contrario. YEI APPAREL se reserva el derecho de modificar precios y disponibilidad de los productos sin previo aviso, sin que esto afecte los pedidos ya confirmados y pagados.",
      },
      {
        tipo: "parrafo",
        texto:
          "Hacemos nuestro mejor esfuerzo para que las fotografías, colores y descripciones de los productos sean lo más fieles posible a la realidad; sin embargo, pueden existir variaciones leves debidas a la pantalla del dispositivo usado para navegar o a características propias de cada prenda.",
      },
      { tipo: "subtitulo", texto: "4.4 Proceso de compra y pago" },
      {
        tipo: "parrafo",
        texto:
          "La compra se perfecciona cuando el pago es aprobado por la pasarela de pagos correspondiente. YEI APPAREL utiliza pasarelas de pago autorizadas y vigiladas para procesar las transacciones; no almacena en sus propios servidores números completos de tarjetas ni códigos de seguridad.",
      },
      {
        tipo: "parrafo",
        texto:
          "En caso de que un pago sea rechazado, quede pendiente o presente alguna inconsistencia, el pedido no se procesará hasta que se confirme el pago correspondiente.",
      },
      {
        tipo: "parrafo",
        texto:
          "Las condiciones de entrega, cambios y devoluciones se rigen por las políticas 1 y 2 de este documento, que forman parte integral de estos términos.",
      },
      { tipo: "subtitulo", texto: "4.5 Uso del sitio" },
      {
        tipo: "parrafo",
        texto: "Al usar este sitio, el usuario se compromete a:",
      },
      {
        tipo: "lista",
        items: [
          "Proporcionar información veraz, actualizada y completa al realizar un pedido o contactar a la marca.",
          "No usar el sitio con fines fraudulentos, ilícitos o que puedan dañar, inutilizar o sobrecargar la plataforma.",
          "No intentar acceder sin autorización a áreas restringidas, sistemas o datos de otros usuarios.",
          "No reproducir, copiar ni distribuir el contenido del sitio con fines comerciales sin autorización previa y escrita de YEI APPAREL.",
        ],
      },
      { tipo: "subtitulo", texto: "4.6 Propiedad intelectual" },
      {
        tipo: "parrafo",
        texto:
          "El nombre YEI APPAREL, su logotipo, diseños, fotografías, textos y demás contenidos del sitio son propiedad de YEI APPAREL o se usan con la debida autorización, y están protegidos por las normas de propiedad intelectual e industrial vigentes en Colombia. Queda prohibida su reproducción total o parcial sin autorización expresa.",
      },
      { tipo: "subtitulo", texto: "4.7 Limitación de responsabilidad" },
      {
        tipo: "parrafo",
        texto:
          "YEI APPAREL no será responsable por fallas temporales de disponibilidad del sitio, interrupciones causadas por terceros (proveedores de hosting, pasarelas de pago, transportadoras) ni por el uso indebido que el usuario haga de la plataforma. Nada de lo anterior limita los derechos que la Ley 1480 de 2011 reconoce al consumidor, en particular la garantía legal descrita en el numeral 2.4.",
      },
      { tipo: "subtitulo", texto: "4.8 Enlaces a terceros" },
      {
        tipo: "parrafo",
        texto:
          "El sitio puede contener enlaces a redes sociales o plataformas de terceros (Instagram, WhatsApp, pasarelas de pago). YEI APPAREL no controla ni se hace responsable por el contenido o las políticas de privacidad de esos sitios externos.",
      },
      { tipo: "subtitulo", texto: "4.9 Modificaciones" },
      {
        tipo: "parrafo",
        texto:
          "YEI APPAREL podrá actualizar estos términos y condiciones en cualquier momento para reflejar cambios normativos, operativos o del sitio. La versión vigente es siempre la publicada en este documento; los pedidos ya confirmados se rigen por los términos vigentes al momento de la compra.",
      },
      { tipo: "subtitulo", texto: "4.10 Ley aplicable y jurisdicción" },
      {
        tipo: "parrafo",
        texto:
          "Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia derivada de su interpretación o aplicación se someterá a las autoridades judiciales y administrativas colombianas competentes, incluida la Superintendencia de Industria y Comercio (SIC) en materia de protección al consumidor.",
      },
    ],
  },
  {
    numero: "5",
    titulo: "Política de cookies",
    intro:
      "Este sitio usa cookies y tecnologías de almacenamiento local para funcionar correctamente. Aquí explicamos qué se usa hoy y cómo puedes gestionarlo.",
    bloques: [
      { tipo: "subtitulo", texto: "5.1 ¿Qué son las cookies?" },
      {
        tipo: "parrafo",
        texto:
          "Las cookies y tecnologías similares (como el almacenamiento local del navegador) son pequeños archivos que un sitio web guarda en tu dispositivo para recordar información entre visitas o durante tu navegación.",
      },
      { tipo: "subtitulo", texto: "5.2 Qué usamos actualmente" },
      {
        tipo: "destacado",
        texto:
          "Hoy YEI APPAREL solo usa almacenamiento técnico esencial: guardar el contenido de tu carrito de compras en tu propio navegador, para que no se pierda si recargas la página o cierras la pestaña por error. No usamos cookies de analítica, publicidad ni redes sociales de terceros.",
      },
      {
        tipo: "lista",
        items: [
          "Carrito de compras: recuerda las prendas que agregaste, en tu propio navegador, hasta que completes la compra o las elimines.",
          "Preferencia de cookies: recuerda la elección que hiciste en el aviso de cookies, para no volver a preguntarte en cada visita.",
        ],
      },
      {
        tipo: "subtitulo",
        texto: "5.3 Cookies que podríamos usar en el futuro",
      },
      {
        tipo: "parrafo",
        texto:
          "Si en el futuro incorporamos herramientas de analítica (para entender qué páginas visitan más nuestros clientes) o de publicidad (para mostrar anuncios relevantes en redes sociales), actualizaremos esta política antes de activarlas y pediremos tu consentimiento a través del mismo aviso de cookies del sitio.",
      },
      { tipo: "subtitulo", texto: "5.4 Cómo gestionar tu elección" },
      {
        tipo: "parrafo",
        texto:
          'Puedes elegir entre "Aceptar" y "Solo esenciales" en el aviso que aparece la primera vez que visitas el sitio. Como hoy no usamos cookies distintas a las esenciales, ambas opciones dejan el sitio funcionando exactamente igual. También puedes borrar las cookies y el almacenamiento local en cualquier momento desde la configuración de tu navegador.',
      },
      { tipo: "subtitulo", texto: "5.5 Más información" },
      {
        tipo: "parrafo",
        texto:
          "Para cualquier duda sobre el uso de cookies o el tratamiento de tus datos personales, consulta la política 3 de este documento (Política de privacidad y tratamiento de datos personales) o contáctanos por nuestros canales oficiales.",
      },
    ],
  },
];
