import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MessageCircle,
  Package,
  ShoppingBag,
} from "lucide-react";
import { Reveal } from "@/components/yei/Reveal";
import { submitContactMessage } from "@/lib/contact";

export const Route = createFileRoute("/contacto")({
  // `ref` llega desde la página de agradecimiento tras el pago
  // (`/pedido/$reference`), para que la persona pueda escribirnos sobre
  // ese pedido concreto sin tener que copiarlo a mano.
  validateSearch: (search: Record<string, unknown>) =>
    z.object({ ref: z.string().trim().min(1).max(80).optional() }).parse(search),
  head: () => ({
    meta: [
      { title: "Contacto — YEI Apparel" },
      {
        name: "description",
        content:
          "Cuéntanos qué necesitas y te contactamos. Atención personalizada de YEI Apparel.",
      },
      { property: "og:title", content: "Contacto — YEI Apparel" },
      { property: "og:url", content: "/contacto" },
    ],
    links: [{ rel: "canonical", href: "/contacto" }],
  }),
  component: Contacto,
});

type Topic = "comprar" | "pedido" | "otro";

const TOPICS: {
  id: Topic;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
}[] = [
  {
    id: "comprar",
    label: "Quiero comprar",
    description: "Tallas, disponibilidad, pago o envío",
    icon: ShoppingBag,
  },
  {
    id: "pedido",
    label: "Tengo un pedido",
    description: "Seguimiento, cambios o factura",
    icon: Package,
  },
  {
    id: "otro",
    label: "Otra consulta",
    description: "Alianzas, prensa o trabajar con nosotros",
    icon: MessageCircle,
  },
];

const SUBTOPICS: Record<Topic, string[]> = {
  comprar: [
    "Tallas y guía de medidas",
    "Disponibilidad de una pieza o color",
    "Métodos de pago",
    "Envíos y tiempos de entrega",
    "Compra al por mayor",
  ],
  pedido: [
    "Sobre mi compra reciente",
    "Mi pedido no ha llegado",
    "Cambios o devoluciones",
    "Modificar o cancelar mi pedido",
    "Factura o comprobante",
  ],
  otro: ["Alianzas y prensa", "Sugerencia o reclamo", "Algo más"],
};

/** Guía el mensaje libre según el subtema, para que la persona sepa qué
 * detalles conviene incluir y la respuesta pueda ser certera de una. */
const MESSAGE_HINTS: Record<string, string> = {
  "Sobre mi compra reciente":
    "Cuéntanos qué necesitas sobre este pedido (cambiar la talla, confirmar el envío, etc.).",
  "Tallas y guía de medidas":
    "Ej: Soy talla M en H&M, ¿qué talla me recomiendan para el Set Nala?",
  "Disponibilidad de una pieza o color":
    "Ej: ¿Tienen el Set Berea disponible en borgoña, talla S?",
  "Métodos de pago": "Ej: ¿Aceptan pago contra entrega en Bogotá?",
  "Envíos y tiempos de entrega":
    "Ej: ¿Cuánto tarda el envío a Medellín y cuánto cuesta?",
  "Compra al por mayor":
    "Ej: Tengo una tienda y quiero comprar por volumen, ¿manejan precios mayoristas?",
  "Mi pedido no ha llegado":
    "Ej: Mi pedido #1234 debía llegar el lunes y no ha llegado.",
  "Cambios o devoluciones":
    "Ej: Quiero cambiar la talla del Set Nala que compré, pedido #1234.",
  "Modificar o cancelar mi pedido":
    "Ej: Quiero cambiar la dirección de envío de mi pedido #1234.",
  "Factura o comprobante":
    "Ej: Necesito la factura de mi pedido #1234 a nombre de...",
  "Alianzas y prensa": "Ej: Represento a una marca/medio y quiero proponerles...",
  "Sugerencia o reclamo": "Cuéntanos qué pasó, con el mayor detalle posible.",
  "Algo más": "Cuéntanos con el mayor detalle posible qué necesitas.",
};

function Contacto() {
  const { ref } = Route.useSearch();

  const [step, setStep] = useState<1 | 2 | 3>(ref ? 3 : 1);
  const [topic, setTopic] = useState<Topic | null>(ref ? "pedido" : null);
  const [subtopic, setSubtopic] = useState<string | null>(
    ref ? "Sobre mi compra reciente" : null,
  );
  const [name, setName] = useState("");
  const [contactMethod, setContactMethod] = useState<"email" | "telefono">(
    "email",
  );
  const [contactValue, setContactValue] = useState("");
  const [message, setMessage] = useState(
    ref ? `Mi número de pedido es ${ref}. ` : "",
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si `ref` cambia (por ejemplo, se navega aquí de nuevo desde otro
  // pedido sin recargar la página), el flujo se re-arma con el nuevo
  // número en vez de quedarse con el mensaje del pedido anterior.
  useEffect(() => {
    if (!ref) return;
    setStep(3);
    setTopic("pedido");
    setSubtopic("Sobre mi compra reciente");
    setMessage(`Mi número de pedido es ${ref}. `);
  }, [ref]);

  const chooseTopic = (t: Topic) => {
    setTopic(t);
    setSubtopic(null);
    setStep(2);
  };

  const chooseSubtopic = (s: string) => {
    setSubtopic(s);
    setStep(3);
  };

  const goBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !contactValue.trim() ||
      !message.trim() ||
      !topic ||
      !subtopic
    )
      return;

    setSending(true);
    setError(null);

    try {
      const result = await submitContactMessage({
        data: {
          name: name.trim(),
          contactMethod,
          contactValue: contactValue.trim(),
          topic,
          subtopic,
          message: message.trim(),
        },
      });
      if (!result.ok) {
        setError(result.notice ?? "No pudimos enviar tu mensaje.");
        setSending(false);
        return;
      }
    } catch (err) {
      console.error("Error saving contact message", err);
      setError("No pudimos enviar tu mensaje. Inténtalo de nuevo.");
      setSending(false);
      return;
    }

    setSending(false);
    setSent(true);
  };

  const resetFlow = () => {
    setStep(1);
    setTopic(null);
    setSubtopic(null);
    setName("");
    setContactValue("");
    setMessage("");
    setSent(false);
  };

  return (
    <div className="min-h-screen bg-nude">
      <section className="px-5 pb-10 pt-36 lg:px-10 lg:pt-48">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="eyebrow text-terracota text-xs lg:text-sm">
            ✦ Estamos para ayudarte ✦
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] lg:text-7xl xl:text-8xl text-chocolate font-medium">
            Hablemos de lo que{" "}
            <span className="italic text-terracota">necesitas</span>
          </h1>
        </div>
      </section>

      <section className="px-5 pb-28 lg:px-10">
        <div className="mx-auto max-w-[720px]">
          {/* Indicador de pasos */}
          {!sent && (
            <div className="mb-10 flex items-center justify-center gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-mono font-bold transition-colors ${
                      step >= n
                        ? "border-chocolate bg-chocolate text-marfil"
                        : "border-chocolate/25 text-chocolate/40"
                    }`}
                  >
                    {step > n ? <Check className="h-3.5 w-3.5" /> : n}
                  </span>
                  {n < 3 && (
                    <span
                      className={`h-[1.5px] w-8 sm:w-14 transition-colors ${
                        step > n ? "bg-chocolate" : "bg-chocolate/20"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="notch-frame bg-chocolate/10 p-[1.5px] shadow-2xl">
            <div className="notch-frame min-h-[420px] bg-marfil p-6 sm:p-10 lg:p-14">
              {sent ? (
                <Reveal className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <div className="grid h-14 w-14 place-items-center bg-terracota text-marfil notch-frame-sm">
                    <Check className="h-7 w-7 stroke-[2.5]" />
                  </div>
                  <h2 className="mt-6 font-display text-3xl sm:text-4xl text-chocolate font-medium">
                    ¡Listo, {name.split(" ")[0]}!
                  </h2>
                  <p className="mt-3 max-w-sm text-sm sm:text-base text-chocolate/75 font-light">
                    Recibimos tu mensaje sobre{" "}
                    <span className="text-terracota font-medium">
                      {subtopic}
                    </span>
                    . Te escribimos pronto por{" "}
                    {contactMethod === "email" ? "correo" : "teléfono"}.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={resetFlow}
                      className="btn-yei notch-frame-sm bg-nude text-chocolate hover:bg-chocolate/15 px-6 py-3 text-xs font-semibold tracking-widest cursor-pointer"
                    >
                      Enviar otro mensaje
                    </button>
                    <Link
                      to="/tienda"
                      className="btn-yei notch-frame-sm bg-chocolate text-marfil hover:bg-chocolate/90 px-6 py-3 text-xs font-semibold tracking-widest"
                    >
                      Ir a la tienda
                    </Link>
                  </div>
                </Reveal>
              ) : step === 1 ? (
                <Reveal key="step1">
                  <p className="label-xs text-chocolate/60 text-xs font-semibold tracking-widest uppercase">
                    Paso 1 de 3
                  </p>
                  <h2 className="mt-2 font-display text-2xl sm:text-3xl text-chocolate font-medium">
                    ¿Qué necesitas?
                  </h2>
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {TOPICS.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => chooseTopic(t.id)}
                          className="group notch-frame-sm flex flex-col items-center gap-3 bg-nude p-6 text-center transition-all hover:bg-chocolate/10 active:scale-[0.97] cursor-pointer"
                        >
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-chocolate text-marfil transition-transform group-hover:scale-110">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="font-display text-lg text-chocolate font-medium">
                            {t.label}
                          </span>
                          <span className="text-xs text-chocolate/60 font-light">
                            {t.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Reveal>
              ) : step === 2 && topic ? (
                <Reveal key="step2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-chocolate/60 hover:text-terracota transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Atrás
                  </button>
                  <p className="label-xs mt-4 text-chocolate/60 text-xs font-semibold tracking-widest uppercase">
                    Paso 2 de 3
                  </p>
                  <h2 className="mt-2 font-display text-2xl sm:text-3xl text-chocolate font-medium">
                    Cuéntanos un poco más
                  </h2>
                  <div className="mt-8 flex flex-col gap-3">
                    {SUBTOPICS[topic].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => chooseSubtopic(s)}
                        className="group flex items-center justify-between notch-frame-sm bg-nude px-6 py-4 text-left transition-all hover:bg-chocolate/10 active:scale-[0.98] cursor-pointer"
                      >
                        <span className="font-display text-lg text-chocolate font-medium">
                          {s}
                        </span>
                        <ArrowRight className="h-4 w-4 text-terracota transition-transform group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </Reveal>
              ) : (
                <Reveal key="step3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-chocolate/60 hover:text-terracota transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Atrás
                  </button>
                  <p className="label-xs mt-4 text-chocolate/60 text-xs font-semibold tracking-widest uppercase">
                    Paso 3 de 3
                  </p>
                  <h2 className="mt-2 font-display text-2xl sm:text-3xl text-chocolate font-medium">
                    ¿Cómo te contactamos?
                  </h2>
                  <p className="mt-2 text-sm text-chocolate/70 font-light">
                    Sobre:{" "}
                    <span className="text-terracota font-medium">
                      {subtopic}
                    </span>
                  </p>

                  <form
                    onSubmit={handleSubmit}
                    className="mt-8 flex flex-col gap-5"
                  >
                    <div>
                      <label
                        htmlFor="contact-message"
                        className="label-xs mb-2 block text-chocolate/70 text-xs font-semibold tracking-widest uppercase"
                      >
                        Cuéntanos exactamente qué necesitas
                      </label>
                      <textarea
                        id="contact-message"
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                          (subtopic && MESSAGE_HINTS[subtopic]) ||
                          "Entre más detalle nos des, más rápido y preciso podemos responderte."
                        }
                        className="w-full resize-none notch-frame-sm bg-terracota/10 px-5 py-3.5 text-sm text-chocolate placeholder:text-chocolate/40 outline-none transition-all focus:bg-terracota/16"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contact-name"
                        className="label-xs mb-2 block text-chocolate/70 text-xs font-semibold tracking-widest uppercase"
                      >
                        Tu nombre
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="¿Cómo te llamas?"
                        className="w-full notch-frame-sm bg-terracota/10 px-5 py-3.5 text-sm text-chocolate placeholder:text-chocolate/40 outline-none transition-all focus:bg-terracota/16"
                      />
                    </div>

                    <div>
                      <span className="label-xs mb-2 block text-chocolate/70 text-xs font-semibold tracking-widest uppercase">
                        Prefiero que me escriban por
                      </span>
                      <div className="flex gap-3">
                        {(["email", "telefono"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setContactMethod(m)}
                            className={`notch-frame-sm px-5 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors cursor-pointer ${
                              contactMethod === m
                                ? "bg-chocolate text-marfil"
                                : "border border-terracota/40 text-chocolate/60 hover:text-chocolate"
                            }`}
                          >
                            {m === "email" ? "Correo" : "Teléfono"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-value"
                        className="label-xs mb-2 block text-chocolate/70 text-xs font-semibold tracking-widest uppercase"
                      >
                        {contactMethod === "email"
                          ? "Correo electrónico"
                          : "Número de teléfono"}
                      </label>
                      <input
                        id="contact-value"
                        type={contactMethod === "email" ? "email" : "tel"}
                        required
                        value={contactValue}
                        onChange={(e) => setContactValue(e.target.value)}
                        placeholder={
                          contactMethod === "email"
                            ? "tu@correo.com"
                            : "+57 300 000 0000"
                        }
                        className="w-full notch-frame-sm bg-terracota/10 px-5 py-3.5 text-sm text-chocolate placeholder:text-chocolate/40 outline-none transition-all focus:bg-terracota/16"
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-terracota font-light">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={sending}
                      className="btn-yei notch-frame-sm mt-2 bg-chocolate text-marfil hover:bg-chocolate/90 disabled:opacity-60 shadow-lg px-8 py-4 text-xs font-semibold tracking-widest cursor-pointer"
                    >
                      <span>{sending ? "Enviando…" : "Enviar"}</span>
                      <ArrowRight className="h-4 w-4 text-terracota" />
                    </button>
                  </form>
                </Reveal>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
