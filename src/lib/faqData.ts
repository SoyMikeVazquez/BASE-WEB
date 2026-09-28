export interface FAQDetail {
  question: string;
  answer: string;
}

export interface FAQItem {
  id: string;
  title: string;
  intro?: string;
  details?: FAQDetail[];
  tags: string[];
}

export interface FAQCategory {
  id: string;
  name: string;
  icon: string; // CSS-friendly icon description or emoji
  items: FAQItem[];
}

export const FAQ_DOCUMENTATION: FAQCategory[] = [
  {
    id: "ecosistema",
    name: "Licencia y Ecosistema",
    icon: "🔌",
    items: [
      {
        id: "libertad-software",
        title: "1. Libertad de Software",
        intro: "A diferencia de nuestra competencia, no queremos tenerte atado de por vida ni quitarte el acceso a tu trabajo si decides pausar una suscripción. Sabemos que tu negocio dependerá de esta herramienta, por eso no ofrecemos un servicio mensual, sino un pago único. Pagas el monto total y el ecosistema es tuyo.\n\nNo podrás comercializarlo, pero sí personalizarlo. Olvídate de cobros extras, aumentos sorpresa o cuotas ocultas. Míralo así: estás comprando un auto último modelo para ir más rápido. No puedes replicar sus piezas para venderlas, pero puedes personalizarlo a tu gusto. Si lo usas poco o mucho, no pasa nada; es un activo que ya le pertenece a tu negocio.",
        details: [
          {
            question: "¿Qué pasa si quiero añadir modificaciones?",
            answer: "Siguiendo con la analogía del auto, puedes agregarle modificaciones, ya sean simples o complejas. Solo pagas un monto extra único que dependerá de la complejidad, y los cambios serán permanentes."
          },
          {
            question: "¿Se cobra extra por solucionar errores o bugs?",
            answer: "En absoluto."
          }
        ],
        tags: ["suscripcion", "costo", "personalizacion", "pago unico", "errores", "bugs", "modificaciones", "codigo"]
      },
      {
        id: "plataforma-web-app",
        title: "2. Plataforma Web y App Móvil",
        intro: "Tu ecosistema se compone de una plataforma optimizada para funcionar correctamente en web y una aplicación diseñada específicamente para dispositivos móviles. Ambas están construidas con tecnología de punta para garantizar rapidez y eficiencia.",
        details: [
          {
            question: "¿Qué nombre tendrá mi app?",
            answer: "El nombre de tu negocio."
          },
          {
            question: "¿Dónde podré ver mi plataforma web?",
            answer: "Puedes alojarla en tu propia página web o en la nuestra mediante un subdominio con tu nombre. También puedes iniciar en nuestro subdominio y luego migrarla a tu dominio propio sin costo adicional. ¡Tú decides dónde vivirán tus herramientas!"
          },
          {
            question: "¿Puedo subir la app a mi propia cuenta de Apple?",
            answer: "Así es, puedes publicarla directamente en tu cuenta de desarrollador de Apple."
          },
          {
            question: "¿Qué pasa si quiero subir la plataforma a mi página web?",
            answer: "Puedo guiarte paso a paso para hacerlo sin necesidad de que me des tus accesos. Ten en cuenta que si no cuentas con un dominio propio o un servidor, esos son costos independientes que corren por tu cuenta. Sin embargo, podemos recomendarte plataformas económicas y confiables que nosotros mismos usamos."
          },
          {
            question: "¿Dónde se almacenan mis datos?",
            answer: "Tendrás control y acceso total. Todo se almacena en una plataforma llamada Supabase. Se te entregarán el correo y la contraseña de acceso, los cuales podrás cambiar una vez liquidado el pago total del ecosistema."
          },
          {
            question: "¿Qué pasa si cambio la contraseña de la base de datos antes de tiempo?",
            answer: "El sistema (app y web) se bloqueará automáticamente. Deberás abrir un ticket de soporte para reactivarlo, un proceso que tomará un mínimo de 24 horas."
          }
        ],
        tags: ["apple", "app store", "ios", "servidor", "dominio", "web", "supabase", "base de datos", "contraseña", "bloqueo", "alojamiento", "nombre"]
      },
      {
        id: "inteligencia-artificial",
        title: "3. Inteligencia Artificial Integrada",
        intro: "Tu ecosistema cuenta con un sistema de inteligencia artificial integrado en la app y en la plataforma web, pero su gestión es independiente. Tú tienes el control: puedes elegir el modelo que prefieras (Gemini, ChatGPT, Grok, etc.), decidir cuánto usarlo y cuánto invertir, pagando solo por lo que te haga sentir más cómodo.",
        tags: ["ia", "inteligencia artificial", "gemini", "chatgpt", "grok", "api key", "credito", "costos"]
      }
    ]
  },
  {
    id: "operacion",
    name: "Operación y Funcionalidades",
    icon: "⚙️",
    items: [
      {
        id: "gestion-citas",
        title: "1. Gestión de Citas",
        intro: "Tus clientes podrán agendar citas y acumular puntos usando únicamente su número de teléfono. No necesitan registrarse ni crear cuentas tediosas, evitando que se sientan hostigados. Si lo desean, pueden completar su perfil de manera totalmente opcional con su correo, nombre o fotografía.",
        details: [
          {
            question: "Notificaciones",
            answer: "El sistema envía recordatorios y confirmaciones automáticas de las citas vía WhatsApp y correo electrónico."
          }
        ],
        tags: ["citas", "agenda", "whatsapp", "notificaciones", "recordatorios", "telefono", "puntos"]
      },
      {
        id: "tarjeta-fidelidad",
        title: "2. Tarjeta de Fidelidad",
        intro: "Podrás generar un código QR único para cada cliente. Tu personal solo tendrá que escanearlo para sumar puntos por cada visita, vinculándolo únicamente a su número celular.",
        tags: ["qr", "puntos", "tarjeta", "fidelidad", "descuentos", "cliente", "escanear"]
      },
      {
        id: "gestion-inteligente",
        title: "3. Sistema de Gestión Inteligente",
        intro: "Lleva el control real de tus finanzas con una interfaz amigable y práctica. Podrás registrar operaciones, ingreso de productos, gastos operativos y compra de insumos. Además, facilita la contabilidad individual de tu equipo, calculando sus comisiones automáticamente.",
        details: [
          {
            question: "Rol: Personal",
            answer: "Registra sus propios ingresos, productos vendidos y gastos operativos (comidas, uso de material del negocio, etc.)."
          },
          {
            question: "Rol: Recepción",
            answer: "Mantiene un control general de cada miembro del personal y registra los gastos operativos diarios del negocio."
          },
          {
            question: "Rol: Administrador",
            answer: "Visualiza toda la información financiera en tiempo real, obteniendo datos automáticos y comparativas exactas del rendimiento del personal y la recepción."
          }
        ],
        tags: ["finanzas", "comisiones", "gastos", "insumos", "roles", "personal", "recepcion", "administrador", "reporte", "contabilidad"]
      },
      {
        id: "asistencia-nfc",
        title: "4. Asistencia y Puntualidad con NFC",
        intro: "Olvídate de los registros en papel. Tu personal marcará su hora exacta de entrada y salida simplemente acercando su teléfono a un sensor NFC. El sistema puede configurarse para aplicar descuentos automáticos basados en sus horarios previamente establecidos.",
        tags: ["nfc", "asistencia", "reloj", "horario", "descuentos", "entrada", "salida", "personal"]
      },
      {
        id: "catalogo-ventas",
        title: "5. Catálogo de Productos y Ventas en Línea",
        intro: "Como administrador, podrás cargar tu catálogo de productos para su venta física en el local o en línea a través de tu página web o la aplicación.",
        details: [
          {
            question: "Importante sobre pagos en línea",
            answer: "Para procesar pagos digitales, es indispensable enlazar una pasarela de pago (como Mercado Pago, Stripe, Clip, etc.). Estas plataformas cobran una comisión estándar que ronda entre el 3.5% y el 4.8% por transacción. Esto es un requisito legal, técnico e internacional ineludible para cualquier tienda en línea."
          }
        ],
        tags: ["ventas", "catalogo", "productos", "mercado pago", "stripe", "clip", "pagos", "comision", "tarjeta", "tienda"]
      },
      {
        id: "proveedores-inventario",
        title: "6. Proveedores e Inventario",
        intro: "Mantén tu stock sincronizado de forma inteligente. El inventario general se actualiza automáticamente con los pedidos y el cierre de entregas de tus proveedores. Los productos en línea mantienen una sincronía perfecta con los físicos, y además puedes asignar inventario específico a los miembros de tu personal.",
        tags: ["stock", "inventario", "proveedores", "pedidos", "personal", "sincronizacion"]
      }
    ]
  },
  {
    id: "legal",
    name: "Aclaraciones Legales",
    icon: "⚖️",
    items: [
      {
        id: "mantenimiento-legal",
        title: "Aclaraciones Legales y de Mantenimiento",
        details: [
          {
            question: "Mantenimiento",
            answer: "Al finalizar el pago de tu ecosistema, si deseas que una persona monitoree la aplicación para resolver emergencias o revisar datos, puedes contratar un servicio de mantenimiento mensual por $480. No es un cargo recurrente obligatorio; puedes contratarlo solo en los meses que lo requieras. Sin embargo, ante cualquier bug o error, será necesario activar esta mensualidad para que el equipo lo solucione."
          },
          {
            question: "Propiedad Intelectual",
            answer: "Este ecosistema se distribuye a diferentes negocios. Queda estrictamente prohibida su reventa a terceros, a menos que exista un acuerdo formal y previo con los propietarios del software, específicamente con Miguel Angel Vazquez Acosta."
          },
          {
            question: "Uso Comercial",
            answer: "El software no puede ser replicado para su uso comercial de ninguna manera."
          }
        ],
        tags: ["mantenimiento", "soporte", "pago mensual", "propiedad intelectual", "reventa", "miguel angel vazquez acosta", "licencia", "comercial"]
      }
    ]
  }
];
