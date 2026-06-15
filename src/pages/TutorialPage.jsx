import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import Footer from "../components/Footer";
import { theme as t, hairSpan, globalKeyframes } from "../lib/theme";

const SECTIONS = [
  { id: "bienvenida",       title: "Bienvenida a CoreScope",                kicker: "Introducción" },
  { id: "antes-de-empezar", title: "Antes de empezar",                  kicker: "Checklist" },
  { id: "crear",            title: "Crear una encuesta paso a paso",    kicker: "Operación" },
  { id: "publicar",         title: "Publicar y compartir",              kicker: "Distribución" },
  { id: "dashboard",        title: "Cómo leer el dashboard",            kicker: "Lectura" },
  { id: "ciclo",            title: "Gestionar el ciclo de vida",        kicker: "Mantenimiento" },
  { id: "buenas-practicas", title: "Buenas prácticas",                  kicker: "Método" },
  { id: "faq",              title: "Errores comunes y FAQ",             kicker: "Soporte" },
];

export default function TutorialPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        setActiveId(top.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const jumpTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        ${globalKeyframes}
        .ghost-cta { transition: all 0.15s ease; }
        .ghost-cta:hover { background: ${t.color.brandTint}; border-color: ${t.color.brandLineHover}; color: ${t.color.brand}; }
        .toc-link { transition: color 0.15s ease, background 0.15s ease; }
        .toc-link:hover { color: ${t.color.brand}; background: ${t.color.brandTint}; }
        .ext-link { color: ${t.color.brand}; text-decoration: none; border-bottom: 1px solid ${t.color.brandLine}; transition: border-color 0.15s ease; }
        .ext-link:hover { border-color: ${t.color.brand}; }
        .toc-details { display: none; }
        @media (max-width: 900px) {
          .tut-layout { grid-template-columns: 1fr !important; gap: 0 !important; }
          .tut-sidebar { display: none !important; }
          .toc-details { display: block; margin-bottom: 32px; }
        }
      `}</style>

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.topBarInner}>
          <div style={S.brandMark}>
            <Logo variant="horizontal" size={12} color="#2563eb" />
            <span style={S.brandSep} />
            <span style={S.brandTag}>Guía operativa · v1</span>
          </div>
          <button className="ghost-cta" onClick={() => navigate("/surveys")} style={S.backBtn}>
            <span style={S.backArrow}>←</span>
            <span>Volver a mis pulsos</span>
          </button>
        </div>
      </div>

      <div style={{ ...S.layout }} className="tut-layout">
        {/* Sidebar TOC */}
        <aside style={S.sidebar} className="tut-sidebar">
          <div style={S.tocHeader}>
            <span style={hairSpan} />
            <span style={S.tocLabel}>Contenido</span>
          </div>
          <nav style={S.tocNav}>
            {SECTIONS.map((s, idx) => {
              const active = activeId === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={jumpTo(s.id)}
                  className="toc-link"
                  style={{
                    ...S.tocLink,
                    ...(active ? S.tocLinkActive : {}),
                  }}
                >
                  <span style={{ ...S.tocNum, color: active ? t.color.brand : t.color.mutedFaint }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span style={S.tocText}>{s.title}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main style={S.main}>
          {/* Hero */}
          <div style={{ animation: mounted ? "fadeUp 0.5s ease both" : "none" }}>
            <div style={S.metaLine}>
              <span style={S.metaTag}>GUÍA</span>
              <span style={hairSpan} />
              <span style={S.metaValue}>USO DE LA PLATAFORMA · v1</span>
            </div>
            <h1 style={S.title}>Cómo operar Pulse</h1>
            <p style={S.subtitle}>
              De la creación de un pulso hasta la lectura del dashboard del cliente. Todo lo que necesitas saber para usar la plataforma con criterio profesional.
            </p>
          </div>

          {/* TOC mobile */}
          <details className="toc-details" style={S.tocDetails}>
            <summary style={S.tocDetailsSummary}>Índice de contenidos</summary>
            <div style={S.tocDetailsList}>
              {SECTIONS.map((s, idx) => (
                <a key={s.id} href={`#${s.id}`} onClick={jumpTo(s.id)} style={S.tocLink}>
                  <span style={S.tocNum}>{String(idx + 1).padStart(2, "0")}</span>
                  <span style={S.tocText}>{s.title}</span>
                </a>
              ))}
            </div>
          </details>

          {/* ─── Sección 1 ─── */}
          <Section idx={0}>
            <Para>
              <b>Pulse</b> es la plataforma para crear, distribuir y analizar pulsos de satisfacción organizacional. Cada consultor maneja sus propios pulsos: los datos viven aislados por cuenta, no hay visibilidad cruzada entre consultores.
            </Para>
            <Para>
              Un flujo típico tiene cuatro momentos: <KbdChip>Crear</KbdChip> un pulso con preguntas del banco o personalizadas, <KbdChip>Publicar</KbdChip> para generar el link y el QR, <KbdChip>Compartir</KbdChip> el link a respondentes y el dashboard al cliente, y <KbdChip>Leer</KbdChip> resultados en tiempo real.
            </Para>

            <SubTitle>Glosario rápido</SubTitle>
            <Glossary items={[
              { term: "Pulso",           def: "Una encuesta completa: título, cliente, preguntas, branding y estado." },
              { term: "Respondente",     def: "Persona anónima que contesta el formulario público. No se guarda su identidad." },
              { term: "Variable",        def: "Grupo de preguntas de la misma escala que se promedian juntas en el dashboard (ej: \"Facilitador\")." },
              { term: "Demográfica",     def: "Pregunta de segmentación con opciones (cargo, antigüedad, área). Permite cortar resultados." },
              { term: "Dashboard token", def: "Link separado del de respuesta. Es lo que se le envía al cliente para que vea métricas en vivo." },
              { term: "Banco",           def: "Catálogo compartido de preguntas reutilizables. Puedes sumar las tuyas y quedan disponibles." },
            ]} />
          </Section>

          {/* ─── Sección 2 ─── */}
          <Section idx={1}>
            <Para>
              Antes de abrir el constructor, conviene tener todo a mano. Si te falta algo en este checklist, el flujo se va a interrumpir a la mitad y vas a perder contexto.
            </Para>
            <Checklist items={[
              { label: "Nombre del cliente",            note: "Como aparece en el contrato. Va a verlo el respondente arriba del formulario." },
              { label: "Logo del cliente como URL pública", note: "No un archivo: una URL que empiece con https:// y termine en .png, .jpg, .svg o .webp. Si no la tienes, ver sección 03.3." },
              { label: "Lista de preguntas o plantilla", note: "Tienes 4 plantillas listas. Si vas a personalizar, anota las preguntas antes." },
              { label: "Escala default",                 note: "Likert 5 (1-5), Likert 7, Likert 10 o NPS (0-10). Es la escala que se aplica a todas las preguntas Likert salvo override." },
              { label: "Fecha tentativa de cierre",      note: "Opcional. Después de esa fecha, el formulario público se bloquea." },
            ]} />
          </Section>

          {/* ─── Sección 3 ─── */}
          <Section idx={2}>
            <Para>
              El constructor (<KbdChip>Crear pulso</KbdChip> desde la lista) tiene dos partes: <b>plantillas</b> arriba para empezar rápido, y <b>banco de preguntas</b> abajo para armar a medida. Puedes empezar por una plantilla y editarla, o construir desde cero.
            </Para>

            <Step n={1} title="Elegir una plantilla o empezar en blanco">
              <Para>Tienes cuatro plantillas listas:</Para>
              <BulletList items={[
                <><b>Estándar</b> — 9 preguntas. Evaluación completa post-taller con escala de notas, NPS y abierta. Es el más usado.</>,
                <><b>Post-taller completa</b> — 16 preguntas. Kirkpatrick Nivel 1 y 2: satisfacción, facilitación, NPS, aprendizaje, confianza.</>,
                <><b>Pulso rápido</b> — 5 preguntas. Sólo Nivel 1: relevancia, facilitador, satisfacción, NPS, comentarios.</>,
                <><b>Evaluación del facilitador</b> — 6 preguntas. Foco en metodología, claridad, ritmo, ejemplos y comodidad.</>,
              ]} />
              <Para>Al aplicar una plantilla, las preguntas quedan precargadas. Puedes sumar, sacar o reordenar antes de guardar.</Para>
            </Step>

            <Step n={2} title="Completar los datos básicos">
              <BulletList items={[
                <><b>Título</b> — entre 3 y 255 caracteres. Aparece en tu lista interna y en el dashboard del cliente.</>,
                <><b>Cliente</b> — el nombre que ve el respondente. Mínimo 2 caracteres.</>,
                <><b>Color primary</b> — color de marca del cliente. Va a teñir botones y acentos del formulario público.</>,
                <><b>Escala default</b> — Likert 5, Likert 7, Likert 10 o NPS. Se puede sobrescribir por pregunta.</>,
              ]} />
            </Step>

            <Step n={3} title="Cómo obtener una URL pública para el logo" highlight>
              <Para>
                Este es el paso donde más usuarios se traban. El campo Logo espera <b>una dirección de imagen</b>, no un archivo subido. Si pegas una cadena que empieza con <Code>data:image/...</Code> el sistema rechaza la creación.
              </Para>

              <SubTitle>Procedimiento con Google Imágenes</SubTitle>

              <MiniStep n="3.1" title="Buscar la imagen">
                Abre <a href="https://images.google.com" target="_blank" rel="noopener noreferrer" className="ext-link">images.google.com</a>. Busca el nombre del cliente seguido de la palabra <Code>logo</Code>. Para evitar logos pixelados, usa <KbdChip>Herramientas → Tamaño → Grande</KbdChip>.
              </MiniStep>

              <MiniStep n="3.2" title="Copiar la dirección correcta">
                Haz clic derecho sobre la imagen y elige <KbdChip>Copiar dirección de imagen</KbdChip>.
                <ContextMenuMock />
              </MiniStep>

              <Callout variant="warning" title="No uses 'Copiar imagen' ni 'Copiar imagen como Data URL'">
                Esas opciones copian la imagen completa codificada como una cadena que puede pesar varios miles de caracteres. El campo Logo no acepta ese formato: si la pegas, al guardar el pulso vas a ver "Error al crear" o "Error en el servidor".
              </Callout>

              <MiniStep n="3.3" title="Validar y pegar">
                Una URL válida empieza con <Code>https://</Code> y termina en <Code>.png</Code>, <Code>.jpg</Code>, <Code>.jpeg</Code>, <Code>.svg</Code> o <Code>.webp</Code>. Pégala en el campo Logo del Builder. Si aparece la previsualización a la izquierda del input, la URL funciona.
              </MiniStep>

              <SubTitle>Alternativas recomendadas</SubTitle>
              <BulletList items={[
                <><b>Pedírselo al cliente</b> — siempre lo mejor. Avísale que necesitas una imagen en formato horizontal o cuadrado.</>,
                <><b>Sitio web oficial del cliente</b> — entra al sitio, clic derecho sobre el logo del header, <KbdChip>Copiar dirección de imagen</KbdChip>.</>,
                <><b>Servicios de logos por dominio</b> — <a href="https://clearbit.com/logo" target="_blank" rel="noopener noreferrer" className="ext-link">Clearbit Logo</a> o <a href="https://brandfetch.com" target="_blank" rel="noopener noreferrer" className="ext-link">Brandfetch</a>. Devuelven una URL pública pasando el dominio del cliente.</>,
              ]} />
            </Step>

            <Step n={4} title="Seleccionar preguntas del banco">
              <Para>
                El banco está organizado por categorías (Satisfacción, Facilitador, Aprendizaje, Demográficas, etc). Usa el filtro de categoría arriba del listado para acotar. Click en una pregunta para agregarla al pulso; click de nuevo para sacarla.
              </Para>
              <Para>
                Si una pregunta no se ajusta exactamente, puedes <b>sobrescribir el texto solo para este pulso</b> usando el campo <KbdChip>Texto personalizado</KbdChip> al lado de la pregunta. Esto no modifica el banco.
              </Para>
            </Step>

            <Step n={5} title="Crear preguntas personalizadas">
              <Para>
                Cuando no hay nada en el banco que sirva, haz clic en <KbdChip>Pregunta personalizada</KbdChip>. Necesitas definir:
              </Para>
              <BulletList items={[
                <><b>Texto</b> — la pregunta tal cual la va a leer el respondente.</>,
                <><b>Tipo</b> — Likert (1-N), NPS (0-10), Abierta (texto libre), Sí/No, u Opción única.</>,
                <><b>Categoría</b> — para organización; no afecta cómo se muestra.</>,
                <>Si eliges Opción única o demográfica, vas a tener que cargar las opciones disponibles (mínimo 2).</>,
              ]} />
              <Callout variant="info" title="Tu pregunta queda en el banco">
                Las preguntas personalizadas que creas se guardan en tu banco privado. La próxima vez vas a poder reutilizarlas sin tener que reescribirlas.
              </Callout>
            </Step>

            <Step n={6} title="Agrupar preguntas en variables">
              <Para>
                Una <b>variable</b> es un grupo de preguntas que se promedia y reporta como un único indicador en el dashboard. Por ejemplo, una variable "Facilitador" puede agrupar tres preguntas Likert sobre claridad, dominio del tema y ritmo: en el dashboard ves un solo promedio.
              </Para>
              <Callout variant="info" title="Restricción de escala">
                Todas las preguntas dentro de una variable tienen que usar la <b>misma escala</b>. No puedes mezclar Likert 5 con NPS en una misma variable porque el promedio dejaría de tener sentido.
              </Callout>
            </Step>

            <Step n={7} title="Preguntas demográficas">
              <Para>
                Las demográficas sirven para <b>segmentar</b> los resultados (cargo, antigüedad, área, sucursal). Siempre tienen opciones cerradas y mínimo 2 opciones. Por defecto las ve solo el consultor: si quieres que el cliente también pueda filtrar por una demográfica en su dashboard, márcala como pública en el detalle del pulso.
              </Para>
            </Step>

            <Step n={8} title="Fecha de cierre">
              <Para>
                Opcional. Si la configuras, el formulario público (<Code>/s/[token]</Code>) deja de aceptar respuestas pasada esa fecha y muestra un mensaje al respondente. El pulso sigue figurando como activo en tu lista; eres tú quien lo pasa a CLOSED si quieres cerrarlo formalmente.
              </Para>
            </Step>
          </Section>

          {/* ─── Sección 4 ─── */}
          <Section idx={3}>
            <Para>
              Cuando guardes el pulso por primera vez nace en estado <KbdChip>DRAFT</KbdChip>: existe en tu cuenta pero el link público no responde. Hay que publicarlo para que los respondentes puedan acceder.
            </Para>

            <StateDiagram />

            <SubTitle>Lo que hay para compartir</SubTitle>
            <BulletList items={[
              <><b>Link público</b> — formato <Code>/s/[token]</Code>. Es el que va al respondente para que conteste. Compartilo por correo, WhatsApp o el canal del cliente.</>,
              <><b>QR descargable</b> — útil para impresos, slides finales del taller, o para que el facilitador lo proyecte. Se genera automáticamente desde el detalle del pulso.</>,
              <><b>Dashboard del cliente</b> — formato <Code>/d/[token]</Code>. <b>Es un link distinto</b> que se envía al cliente para que vea los resultados en vivo. Tiene su propio token: no comparte URL con el link de respuesta.</>,
            ]} />

            <Callout variant="warning" title="No mezcles el link de respuesta con el del dashboard">
              El error más frecuente cuando un cliente dice "no veo nada" es haberle enviado <Code>/s/[token]</Code> (formulario de respuesta) en lugar de <Code>/d/[token]</Code> (dashboard). Verifica la URL antes de enviarla.
            </Callout>
          </Section>

          {/* ─── Sección 5 ─── */}
          <Section idx={4}>
            <Para>
              El dashboard tiene dos vistas: la <b>interna</b> (la tuya, con todo el detalle) y la <b>pública del cliente</b> (versión filtrada según lo que marcaste como público). Ambas se actualizan automáticamente cada 30 segundos mientras estés viendo la página.
            </Para>

            <SubTitle>Bloques principales</SubTitle>
            <DashboardBlocks />

            <SubTitle>Filtros</SubTitle>
            <Para>
              Si hay demográficas, aparece una barra de filtros arriba: clickeando una opción (por ej. "Cargo: Jefatura") el dashboard recalcula todas las métricas considerando sólo ese subgrupo. Útil para comparar segmentos.
            </Para>

            <Callout variant="info" title="Comentarios abiertos siempre visibles">
              Las respuestas a preguntas de tipo Abierta se listan completas, sin promedios. Útil para detectar comentarios cualitativos que las métricas no capturan.
            </Callout>
          </Section>

          {/* ─── Sección 6 ─── */}
          <Section idx={5}>
            <Para>
              Una vez publicado, un pulso puede pasar por varios estados según necesites. Todo se hace desde el detalle del pulso.
            </Para>

            <Glossary items={[
              { term: "Cerrar",             def: "Pasa de ACTIVE a CLOSED. Deja de aceptar respuestas nuevas. El dashboard sigue accesible." },
              { term: "Reabrir",            def: "Solo si está CLOSED. Vuelve a ACTIVE. Útil si necesitas extender una ventana de respuesta." },
              { term: "Duplicar",           def: "Crea una copia en DRAFT con las mismas preguntas, branding y variables. NO copia respuestas. Se le añade \"(copia)\" al título. La copia queda automáticamente vinculada como ola siguiente del original — para habilitar comparativos en el dashboard." },
              { term: "Marcar favorito",    def: "Click en la estrella de la esquina superior derecha de cada card en Mis pulsos. La pestaña 'Favoritos' filtra solo los marcados, independiente del estado." },
              { term: "Limpiar respuestas", def: "Borra todas las respuestas sin tocar las preguntas. Requiere escribir el título exacto del pulso como confirmación. Bloqueado en CLOSED." },
              { term: "Eliminar",           def: "Borra el pulso entero (preguntas, respuestas, variables). Es irreversible. Confirmación doble." },
            ]} />

            <Callout variant="warning" title="Limpiar respuestas vs Eliminar">
              <b>Limpiar respuestas</b> sirve para sacar respuestas de prueba antes de enviar el link real al cliente. <b>Eliminar</b> destruye todo el pulso. Si dudas entre las dos, casi siempre quieres Limpiar.
            </Callout>

            <SubTitle>Olas: comparar dos mediciones del mismo cliente</SubTitle>
            <Para>
              Si una encuesta es la continuación de otra (ej. Q2 que sigue a Q1 del mismo cliente), se puede vincular como <b>ola siguiente</b>. Cuando duplicás un pulso, la copia queda enlazada automáticamente al original. También se puede editar a mano desde el detalle del pulso → <KbdChip>Editar info</KbdChip> → campo <b>Ola anterior</b>.
            </Para>
            <Para>
              Cuando una encuesta tiene una ola anterior vinculada, su dashboard muestra un toggle adicional <KbdChip>Comparar con ola anterior</KbdChip> arriba a la derecha (junto al toggle de Vista). Al activarlo, cada pregunta muestra el delta vs la ola anterior — <Code>↑5pp</Code> verde si subió la favorabilidad, <Code>↓3pp</Code> rojo si bajó. Si una pregunta es nueva (no existía en la ola anterior), aparece un badge <Code>NUEVA</Code>.
            </Para>
            <Callout variant="info" title="Matching de preguntas entre olas">
              Las preguntas se matchean por su <b>identidad en el banco</b> (no por texto). Es decir: si modificás el texto de una pregunta en Q2 pero usás la misma del banco, sigue matcheando con su versión en Q1. Si reemplazás una pregunta por otra del banco, queda como "Nueva".
            </Callout>
          </Section>

          {/* ─── Sección 7 ─── */}
          <Section idx={6}>
            <Para>
              Reglas que vienen de la experiencia operando pulsos en clientes reales. No son obligatorias pero te ahorran malos resultados.
            </Para>
            <TipsList items={[
              { title: "Entre 5 y 12 preguntas", body: "Más allá de 12, la tasa de finalización cae. Si tienes dudas, parte de la plantilla Pulso rápido (5) y agrega según necesidad." },
              { title: "Una idea por pregunta", body: "Evita enunciados con \"y\". \"¿El facilitador fue claro y dinámico?\" mezcla dos atributos: si el respondente cree que fue claro pero no dinámico, no sabe qué contestar." },
              { title: "Nada de doble negación", body: "\"No estoy en desacuerdo con que el taller no fue útil\" obliga a pensar de más. Reescribe en positivo." },
              { title: "NPS solo una vez por encuesta", body: "El Net Promoter Score tiene sentido como métrica única y comparable. Múltiples NPS confunden y diluyen la señal." },
              { title: "Una pregunta abierta al final", body: "Da espacio para comentarios cualitativos. Es donde más aprendes cuando los promedios son altos pero algo no terminó de cerrar." },
              { title: "Demográficas agrupadas, no mezcladas", body: "Todas las demográficas al principio o todas al final. Mezclarlas con preguntas de contenido rompe el ritmo del respondente." },
              { title: "Anonimato sin excepciones", body: "Nunca pidas nombre, email o cualquier identificador. La plataforma está diseñada para ser anónima — si necesitas trazabilidad, no es la herramienta indicada." },
              { title: "Comunica el anonimato al cliente", body: "Antes de enviar el link, déjale por escrito al cliente que las respuestas son anónimas y que ni tú puedes ver quién respondió qué. Aumenta la sinceridad de las respuestas." },
              { title: "Una cadencia razonable", body: "Por unidad de capacitación: un pulso final post-taller. Para clima/satisfacción continua: trimestral. Más seguido genera fatiga y deteriora la calidad de las respuestas." },
            ]} />
          </Section>

          {/* ─── Sección 8 ─── */}
          <Section idx={7}>
            <FAQ
              q="Veo 'Error al crear el pulso' o 'Error en el servidor' al guardar"
              a={<>Casi siempre es el logo. Si pegaste algo que empieza con <Code>data:image/...</Code> o subiste una imagen pegada de Google directamente, no va a funcionar. Vuelve a la <a href="#crear" onClick={jumpTo("crear")} className="ext-link">sección 03.3</a> y consigue una URL pública.</>}
            />
            <FAQ
              q="Publiqué el pulso pero no me llegan respuestas"
              a={<>Verifica tres cosas: (1) el estado figura como <KbdChip>ACTIVE</KbdChip> en el detalle, no DRAFT. (2) estás compartiendo el link <Code>/s/[token]</Code>, no el de tu lista interna. (3) la fecha de cierre, si la configuraste, todavía no pasó.</>}
            />
            <FAQ
              q="El cliente abre el link y no ve métricas, ve un formulario"
              a={<>Le enviaste el link de respuesta (<Code>/s/[token]</Code>) en lugar del dashboard (<Code>/d/[token]</Code>). Son tokens distintos: cópialos por separado desde el detalle del pulso.</>}
            />
            <FAQ
              q="Necesito cambiar la escala de una pregunta que ya tiene respuestas"
              a={<>Está bloqueado por el backend: cambiar la escala alteraría la interpretación de los números históricos (un 3 en Likert 5 no es lo mismo que un 3 en Likert 10). La solución es <b>duplicar</b> el pulso: la copia nace sin respuestas y ahí puedes cambiar la escala libremente.</>}
            />
            <FAQ
              q="Quiero borrar respuestas de prueba sin perder el pulso ni las preguntas"
              a={<>Usa <KbdChip>Limpiar respuestas</KbdChip> en el detalle del pulso. Para confirmar tienes que escribir el título exacto del pulso (es una salvaguarda contra clics accidentales). Solo funciona en estados DRAFT y ACTIVE; si el pulso está CLOSED, reábrelo primero.</>}
            />
            <FAQ
              q="El link de mi pulso devuelve 'Encuesta cerrada' aunque yo no la cerré"
              a={<>Probablemente venció la fecha de cierre. El backend bloquea respuestas pasada esa fecha aunque el estado siga en ACTIVE. Edita el pulso y limpia o extiende la fecha.</>}
            />
            <FAQ
              q="Mi sesión se cerró sola"
              a={<>El token de autenticación dura 30 días. Si pasaste ese tiempo sin entrar, tendrás que iniciar sesión de nuevo con Google. Es esperado, no es un error.</>}
            />
          </Section>

          <div style={S.endMark}>
            <span style={hairSpan} />
            <span style={S.endTag}>Fin de la guía · v1</span>
            <span style={hairSpan} />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mini-componentes locales (no se reutilizan fuera de esta página)
// ─────────────────────────────────────────────────────────────

function Section({ idx, children }) {
  const meta = SECTIONS[idx];
  return (
    <section
      id={meta.id}
      style={{
        ...S.section,
        animation: `fadeUp 0.5s ease ${0.05 + idx * 0.05}s both`,
      }}
    >
      <div style={S.sectionHeader}>
        <div style={S.sectionMeta}>
          <span style={S.sectionNum}>{String(idx + 1).padStart(2, "0")}</span>
          <span style={hairSpan} />
          <span style={S.sectionKicker}>{meta.kicker}</span>
        </div>
        <h2 style={S.sectionTitle}>{meta.title}</h2>
      </div>
      <div style={S.sectionBody}>{children}</div>
    </section>
  );
}

function Para({ children }) {
  return <p style={S.para}>{children}</p>;
}

function SubTitle({ children }) {
  return <h3 style={S.subTitle}>{children}</h3>;
}

function Step({ n, title, highlight, children }) {
  return (
    <div style={{ ...S.step, ...(highlight ? S.stepHighlight : {}) }}>
      <div style={S.stepHead}>
        <span style={{ ...S.stepNum, background: highlight ? t.color.brand : t.color.brandTint, color: highlight ? "#fff" : t.color.brand }}>
          {String(n).padStart(2, "0")}
        </span>
        <h3 style={S.stepTitle}>{title}</h3>
      </div>
      <div style={S.stepBody}>{children}</div>
    </div>
  );
}

function MiniStep({ n, title, children }) {
  return (
    <div style={S.miniStep}>
      <div style={S.miniStepHead}>
        <span style={S.miniStepNum}>{n}</span>
        <span style={S.miniStepTitle}>{title}</span>
      </div>
      <div style={S.miniStepBody}>{children}</div>
    </div>
  );
}

function Callout({ variant = "info", title, children }) {
  const palette = {
    info:    { border: t.color.brand,  bg: t.color.brandTint,  fg: t.color.brand, icon: <IconInfo /> },
    warning: { border: t.color.danger, bg: t.color.dangerTint, fg: t.color.danger, icon: <IconWarn /> },
    tip:     { border: t.color.success,bg: "rgba(37,99,235,0.08)", fg: "#007f7f", icon: <IconTip /> },
  }[variant];

  return (
    <div style={{ ...S.callout, borderLeft: `3px solid ${palette.border}`, background: palette.bg }}>
      <div style={{ ...S.calloutHead, color: palette.fg }}>
        <span style={S.calloutIcon}>{palette.icon}</span>
        <span style={S.calloutTitle}>{title}</span>
      </div>
      <div style={S.calloutBody}>{children}</div>
    </div>
  );
}

function KbdChip({ children }) {
  return <span style={S.kbd}>{children}</span>;
}

function Code({ children }) {
  return <code style={S.code}>{children}</code>;
}

function Checklist({ items }) {
  return (
    <ul style={S.checklist}>
      {items.map((it, i) => (
        <li key={i} style={S.checkItem}>
          <span style={S.checkBox}><IconCheck /></span>
          <div style={{ flex: 1 }}>
            <div style={S.checkLabel}>{it.label}</div>
            {it.note && <div style={S.checkNote}>{it.note}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BulletList({ items }) {
  return (
    <ul style={S.bullets}>
      {items.map((it, i) => (
        <li key={i} style={S.bulletItem}>
          <span style={S.bulletDot} />
          <span style={S.bulletBody}>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function TipsList({ items }) {
  return (
    <ol style={S.tips}>
      {items.map((it, i) => (
        <li key={i} style={S.tipItem}>
          <div style={S.tipNum}>{String(i + 1).padStart(2, "0")}</div>
          <div style={{ flex: 1 }}>
            <div style={S.tipTitle}>{it.title}</div>
            <div style={S.tipBody}>{it.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FAQ({ q, a }) {
  return (
    <div style={S.faq}>
      <div style={S.faqQ}><IconChevron /><span>{q}</span></div>
      <div style={S.faqA}>{a}</div>
    </div>
  );
}

function Glossary({ items }) {
  return (
    <div style={S.glossary}>
      {items.map((it, i) => (
        <div key={i} style={S.glossaryRow}>
          <div style={S.glossaryTerm}>{it.term}</div>
          <div style={S.glossaryDef}>{it.def}</div>
        </div>
      ))}
    </div>
  );
}

// Diagrama de estados DRAFT → ACTIVE → CLOSED
function StateDiagram() {
  return (
    <div style={S.diagram}>
      <StateBox label="DRAFT" color={t.color.mutedSoft} bg="rgba(255,255,255,0.04)" />
      <Arrow label="Publicar" />
      <StateBox label="ACTIVE" color="#fff" bg={t.color.brand} solid />
      <Arrow label="Cerrar" />
      <StateBox label="CLOSED" color={t.color.danger} bg={t.color.dangerTint} />
      <Arrow label="Reabrir" reverse />
    </div>
  );
}

function StateBox({ label, color, bg, solid }) {
  return (
    <div style={{
      ...S.stateBox,
      background: bg,
      color,
      border: solid ? `1px solid ${t.color.brand}` : `1px solid ${t.color.brandLine}`,
    }}>
      {label}
    </div>
  );
}

function Arrow({ label, reverse }) {
  return (
    <div style={S.arrowWrap}>
      <span style={S.arrowLabel}>{label}</span>
      <span style={S.arrowLine}>{reverse ? "←" : "→"}</span>
    </div>
  );
}

// Mock visual del menú contextual del navegador
function ContextMenuMock() {
  const items = [
    "Abrir imagen en pestaña nueva",
    "Guardar imagen como…",
    { label: "Copiar dirección de imagen", highlight: true },
    "Copiar imagen",
    "Copiar imagen como Data URL",
    "Buscar imagen con Google Lens",
  ];
  return (
    <div style={S.menuMock}>
      <div style={S.menuMockHead}>
        <span style={S.menuDot} />
        <span style={S.menuDot} />
        <span style={S.menuDot} />
        <span style={S.menuMockTitle}>Menú contextual del navegador</span>
      </div>
      <ul style={S.menuMockList}>
        {items.map((it, i) => {
          const label = typeof it === "string" ? it : it.label;
          const high = typeof it === "object" && it.highlight;
          return (
            <li key={i} style={{
              ...S.menuMockItem,
              ...(high ? S.menuMockItemHighlight : {}),
            }}>
              <span style={S.menuMockBullet}>{high ? "→" : ""}</span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Bloques del dashboard explicados visualmente
function DashboardBlocks() {
  const blocks = [
    { title: "Toggle de vista", desc: "Arriba a la derecha hay dos botones: Favorabilidad y Promedio + distribución. El primero agrupa respuestas en favorable (4-5) / neutral (3) / desfavorable (1-2). El segundo muestra promedio simple e histograma completo. Tu elección se guarda y aplica a todos tus dashboards." },
    { title: "Favorabilidad por pregunta", desc: "Vista comparativa horizontal de todas las preguntas Likert, ordenadas por % favorable. Identifica fortalezas y debilidades de un vistazo. Filtros para mostrar afirmación / etiqueta / ambas y para ordenar por mayor o menor favorabilidad." },
    { title: "Preguntas de escala (Likert)", desc: "Una card por pregunta con el % favorable grande + barra apilada al 100% (favorable / neutral / desfavorable) o promedio + histograma de 5 barras, según el toggle activo. Cada card tiene un botón de exportar como PNG en la esquina superior derecha." },
    { title: "Variables", desc: "Si definiste variables, cada una se agrega con su barra apilada de favorabilidad o promedio según el toggle. La tabla de detalle muestra qué preguntas componen cada variable." },
    { title: "Resultados por segmento", desc: "Para cada demográfica activada, los datos se cruzan con cada pregunta. En modo favorabilidad muestra barras apiladas por segmento, en modo promedio muestra barras de avg." },
    { title: "NPS", desc: "Distribución detractores / pasivos / promotores y el score neto. Solo si hay una pregunta NPS en el pulso (no se ve afectado por el toggle)." },
    { title: "Comparativos cross-ola", desc: "Si esta encuesta está vinculada a otra como 'siguiente ola', aparece un toggle adicional 'Comparar con ola anterior'. Activarlo carga el dashboard de la ola previa y muestra deltas (↑Xpp verde / ↓Xpp rojo) en cada pregunta. Ver sección 06." },
    { title: "Filtros demográficos", desc: "Si hay preguntas demográficas, aparecen como chips arriba. Clickear una opción (ej. 'Cargo: Jefatura') recalcula todas las métricas considerando solo ese subgrupo." },
    { title: "Comentarios abiertos", desc: "Listado completo de respuestas a preguntas Abiertas, sin agregación. Lectura cualitativa — útil para detectar comentarios que las métricas no capturan." },
  ];
  return (
    <div style={S.dashGrid}>
      {blocks.map((b, i) => (
        <div key={i} style={S.dashBlock}>
          <div style={S.dashBlockHead}>
            <span style={S.dashBlockNum}>{String(i + 1).padStart(2, "0")}</span>
            <span style={S.dashBlockTitle}>{b.title}</span>
          </div>
          <p style={S.dashBlockDesc}>{b.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Iconos (Lucide-style, inline) ─────────────────────────
const iconProps = (color = "currentColor") => ({
  width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
  stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
});
const IconInfo  = () => <svg {...iconProps()}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconWarn  = () => <svg {...iconProps()}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconTip   = () => <svg {...iconProps()}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14A6 6 0 1 0 6 9a6 6 0 0 0 3 5.19V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1z"/></svg>;
const IconCheck = () => <svg {...iconProps(t.color.brand)} width={11} height={11}><polyline points="20 6 9 17 4 12"/></svg>;
const IconChevron = () => <svg {...iconProps(t.color.brand)} width={12} height={12} style={{ marginRight: 8, flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>;

// ─── Estilos ───────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    fontFamily: t.font.body,
    color: t.color.inkSoft,
    ...t.blueprintBg,
  },

  // Top bar
  topBar: {
    background: t.color.surface,
    borderBottom: t.hairline,
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 1px 0 0 rgba(37,99,235,0.04)",
  },
  topBarInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandMark: { display: "flex", alignItems: "center", gap: 12 },
  brandSep: { width: 1, height: 14, background: "rgba(37,99,235,0.22)", display: "inline-block" },
  brandTag: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 600,
    letterSpacing: t.track.widest, color: t.color.brand, textTransform: "uppercase",
  },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 16px",
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLine}`,
    background: "transparent",
    color: t.color.muted,
    fontFamily: t.font.display, fontSize: 11, fontWeight: 600,
    letterSpacing: t.track.wider, textTransform: "uppercase",
    cursor: "pointer",
  },
  backArrow: { fontSize: 13, lineHeight: 1, color: t.color.brand },

  // Layout
  layout: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "44px 24px 24px",
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 56,
    alignItems: "start",
  },

  // Sidebar
  sidebar: {
    position: "sticky",
    top: 80,
    paddingTop: 8,
  },
  tocHeader: {
    display: "inline-flex", alignItems: "center", gap: 10,
    marginBottom: 18,
  },
  tocLabel: {
    fontFamily: t.font.display, fontSize: 9, fontWeight: 700,
    letterSpacing: t.track.technical, color: t.color.mutedSoft, textTransform: "uppercase",
  },
  tocNav: {
    display: "flex", flexDirection: "column", gap: 2,
  },
  tocLink: {
    display: "grid", gridTemplateColumns: "32px 1fr", alignItems: "center", gap: 8,
    padding: "10px 10px",
    borderRadius: t.radius.sharp,
    textDecoration: "none",
    color: t.color.muted,
    fontFamily: t.font.body, fontSize: 13, fontWeight: 500,
    cursor: "pointer",
    lineHeight: 1.3,
  },
  tocLinkActive: {
    color: t.color.brand,
    background: t.color.brandTint,
    fontWeight: 600,
  },
  tocNum: {
    fontFamily: t.font.display, fontSize: 9, fontWeight: 700,
    letterSpacing: t.track.widest,
  },
  tocText: {
    lineHeight: 1.3,
  },

  // TOC mobile
  tocDetails: {
    background: t.color.surface,
    border: t.hairline,
    borderRadius: t.radius.card,
    padding: 16,
    marginTop: 24,
  },
  tocDetailsSummary: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: t.track.widest, color: t.color.brand, textTransform: "uppercase",
    cursor: "pointer", userSelect: "none",
  },
  tocDetailsList: {
    display: "flex", flexDirection: "column", gap: 2,
    marginTop: 12, paddingTop: 12, borderTop: t.hairlineSoft,
  },

  // Main
  main: {
    minWidth: 0,
  },

  // Hero
  metaLine: {
    display: "inline-flex", alignItems: "center", gap: 12,
    marginBottom: 14, flexWrap: "wrap",
  },
  metaTag: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: t.track.technical, color: t.color.brand, textTransform: "uppercase",
  },
  metaValue: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 600,
    letterSpacing: t.track.widest, color: t.color.mutedSoft, textTransform: "uppercase",
  },
  title: {
    fontFamily: t.font.display, fontSize: 44, fontWeight: 700,
    margin: 0, color: t.color.ink,
    letterSpacing: t.track.tight, lineHeight: 1.04,
  },
  subtitle: {
    fontSize: 15, color: t.color.mutedSoft,
    margin: "12px 0 0", fontFamily: t.font.body,
    maxWidth: 620, lineHeight: 1.6,
  },

  // Section
  section: {
    marginTop: 72,
    paddingTop: 32,
    borderTop: t.hairline,
    scrollMarginTop: 80,
  },
  sectionHeader: { marginBottom: 28 },
  sectionMeta: {
    display: "inline-flex", alignItems: "center", gap: 10,
    marginBottom: 12,
  },
  sectionNum: {
    fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    letterSpacing: t.track.tight, color: t.color.brand,
  },
  sectionKicker: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 600,
    letterSpacing: t.track.widest, color: t.color.mutedSoft, textTransform: "uppercase",
  },
  sectionTitle: {
    fontFamily: t.font.display, fontSize: 28, fontWeight: 700,
    margin: 0, color: t.color.ink,
    letterSpacing: t.track.tight, lineHeight: 1.12,
  },
  sectionBody: {},

  // Paragraph + subtitle
  para: {
    fontFamily: t.font.body, fontSize: 15, lineHeight: 1.7,
    color: t.color.inkSoft, margin: "0 0 16px",
  },
  subTitle: {
    fontFamily: t.font.display, fontSize: 16, fontWeight: 700,
    color: t.color.ink, margin: "28px 0 14px",
    letterSpacing: "-0.01em",
  },

  // Step
  step: {
    background: t.color.surface,
    border: t.hairline,
    borderRadius: t.radius.card,
    padding: "22px 24px 8px",
    marginTop: 18,
  },
  stepHighlight: {
    border: `1px solid ${t.color.brand}`,
    boxShadow: "0 10px 30px -20px rgba(37,99,235,0.4)",
  },
  stepHead: {
    display: "flex", alignItems: "center", gap: 14, marginBottom: 10,
  },
  stepNum: {
    fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    letterSpacing: t.track.wider,
    padding: "6px 10px",
    borderRadius: t.radius.sharp,
    minWidth: 32, textAlign: "center", lineHeight: 1,
  },
  stepTitle: {
    fontFamily: t.font.display, fontSize: 17, fontWeight: 700,
    margin: 0, color: t.color.ink, letterSpacing: "-0.01em",
  },
  stepBody: {
    paddingBottom: 14,
  },

  // MiniStep (sub-steps dentro de Step 3)
  miniStep: {
    paddingLeft: 18,
    borderLeft: `2px solid ${t.color.brandLineSoft}`,
    marginTop: 18,
    paddingBottom: 6,
  },
  miniStepHead: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
  },
  miniStepNum: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: t.track.wider, color: t.color.brand, textTransform: "uppercase",
  },
  miniStepTitle: {
    fontFamily: t.font.display, fontSize: 13, fontWeight: 700, color: t.color.ink,
    letterSpacing: "-0.005em",
  },
  miniStepBody: {
    fontFamily: t.font.body, fontSize: 14, lineHeight: 1.7, color: t.color.inkSoft,
  },

  // Callout
  callout: {
    borderRadius: t.radius.card,
    padding: "16px 20px",
    marginTop: 18,
    marginBottom: 6,
  },
  calloutHead: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
  },
  calloutIcon: { display: "inline-flex", alignItems: "center" },
  calloutTitle: {
    fontFamily: t.font.display, fontSize: 12, fontWeight: 700,
    letterSpacing: t.track.wide, textTransform: "uppercase",
  },
  calloutBody: {
    fontFamily: t.font.body, fontSize: 14, lineHeight: 1.65,
    color: t.color.inkSoft,
  },

  // Kbd chip
  kbd: {
    display: "inline-block",
    padding: "2px 8px",
    margin: "0 2px",
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: t.track.wide, textTransform: "uppercase",
    color: t.color.brand,
    background: t.color.brandTint,
    border: `1px solid ${t.color.brandLine}`,
    borderRadius: t.radius.sharp,
    lineHeight: 1.5,
    whiteSpace: "nowrap",
  },

  // Code inline
  code: {
    display: "inline-block",
    padding: "1px 6px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    color: t.color.brand,
    background: "rgba(37,99,235,0.07)",
    borderRadius: t.radius.sharp,
    border: `1px solid ${t.color.brandLineSoft}`,
  },

  // Checklist
  checklist: {
    listStyle: "none", padding: 0, margin: "8px 0 0",
    display: "flex", flexDirection: "column", gap: 12,
  },
  checkItem: {
    display: "flex", alignItems: "flex-start", gap: 14,
    padding: "14px 16px",
    background: t.color.surface,
    border: t.hairline,
    borderRadius: t.radius.card,
  },
  checkBox: {
    width: 22, height: 22, flexShrink: 0,
    borderRadius: t.radius.sharp,
    background: t.color.brandTint,
    border: `1px solid ${t.color.brandLine}`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  checkLabel: {
    fontFamily: t.font.display, fontSize: 13, fontWeight: 700,
    color: t.color.ink, letterSpacing: "-0.005em",
    marginBottom: 2,
  },
  checkNote: {
    fontFamily: t.font.body, fontSize: 13, lineHeight: 1.55,
    color: t.color.muted,
  },

  // Bullets
  bullets: {
    listStyle: "none", padding: 0, margin: "8px 0 16px",
    display: "flex", flexDirection: "column", gap: 8,
  },
  bulletItem: {
    display: "flex", alignItems: "flex-start", gap: 12,
  },
  bulletDot: {
    width: 5, height: 5, borderRadius: "50%",
    background: t.color.brand,
    marginTop: 10, flexShrink: 0,
  },
  bulletBody: {
    fontFamily: t.font.body, fontSize: 14.5, lineHeight: 1.7,
    color: t.color.inkSoft, flex: 1,
  },

  // Tips list (buenas prácticas)
  tips: {
    listStyle: "none", padding: 0, margin: "8px 0 0",
    display: "flex", flexDirection: "column", gap: 0,
  },
  tipItem: {
    display: "flex", alignItems: "flex-start", gap: 18,
    padding: "20px 0",
    borderBottom: t.hairlineSoft,
  },
  tipNum: {
    fontFamily: t.font.display, fontSize: 20, fontWeight: 700,
    color: t.color.brandLine, letterSpacing: t.track.tight,
    minWidth: 38, lineHeight: 1,
  },
  tipTitle: {
    fontFamily: t.font.display, fontSize: 15, fontWeight: 700,
    color: t.color.ink, marginBottom: 4, letterSpacing: "-0.01em",
  },
  tipBody: {
    fontFamily: t.font.body, fontSize: 14, lineHeight: 1.65,
    color: t.color.muted,
  },

  // FAQ
  faq: {
    padding: "20px 0",
    borderBottom: t.hairlineSoft,
  },
  faqQ: {
    display: "flex", alignItems: "center",
    fontFamily: t.font.display, fontSize: 15, fontWeight: 700,
    color: t.color.ink, marginBottom: 8, letterSpacing: "-0.005em",
    lineHeight: 1.35,
  },
  faqA: {
    fontFamily: t.font.body, fontSize: 14, lineHeight: 1.7,
    color: t.color.muted,
    paddingLeft: 20,
  },

  // Glossary
  glossary: {
    background: t.color.surface,
    border: t.hairline,
    borderRadius: t.radius.card,
    overflow: "hidden",
    marginTop: 12,
  },
  glossaryRow: {
    display: "grid", gridTemplateColumns: "180px 1fr",
    gap: 20,
    padding: "16px 20px",
    borderBottom: t.hairlineSoft,
    alignItems: "start",
  },
  glossaryTerm: {
    fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    letterSpacing: t.track.wider, color: t.color.brand, textTransform: "uppercase",
    lineHeight: 1.4,
  },
  glossaryDef: {
    fontFamily: t.font.body, fontSize: 14, lineHeight: 1.6,
    color: t.color.inkSoft,
  },

  // Diagram
  diagram: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 14, flexWrap: "wrap",
    padding: "22px 16px",
    background: t.color.surface,
    border: t.hairline,
    borderRadius: t.radius.card,
    margin: "16px 0 20px",
  },
  stateBox: {
    padding: "10px 18px",
    borderRadius: t.radius.sharp,
    fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    letterSpacing: t.track.wider, textTransform: "uppercase",
    minWidth: 80, textAlign: "center",
  },
  arrowWrap: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  },
  arrowLabel: {
    fontFamily: t.font.display, fontSize: 9, fontWeight: 600,
    letterSpacing: t.track.widest, color: t.color.mutedSoft, textTransform: "uppercase",
  },
  arrowLine: {
    fontSize: 16, color: t.color.brand, lineHeight: 1,
  },

  // Context menu mock
  menuMock: {
    background: t.color.surface,
    border: t.hairline,
    borderRadius: t.radius.card,
    overflow: "hidden",
    margin: "14px 0 16px",
    maxWidth: 380,
    boxShadow: "0 10px 30px -20px rgba(37,99,235,0.3)",
  },
  menuMockHead: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px",
    background: "rgba(255,255,255,0.025)",
    borderBottom: t.hairlineSoft,
  },
  menuDot: {
    width: 8, height: 8, borderRadius: "50%",
    background: t.color.mutedFaint,
  },
  menuMockTitle: {
    marginLeft: 8,
    fontFamily: t.font.display, fontSize: 9, fontWeight: 600,
    letterSpacing: t.track.widest, color: t.color.mutedSoft, textTransform: "uppercase",
  },
  menuMockList: {
    listStyle: "none", padding: "6px 0", margin: 0,
  },
  menuMockItem: {
    display: "grid", gridTemplateColumns: "24px 1fr",
    alignItems: "center", gap: 4,
    padding: "7px 14px",
    fontFamily: t.font.body, fontSize: 13,
    color: t.color.inkSoft,
  },
  menuMockItemHighlight: {
    background: t.color.brandTint,
    color: t.color.brand,
    fontWeight: 700,
  },
  menuMockBullet: {
    fontFamily: t.font.display, fontSize: 11, fontWeight: 700,
    color: t.color.brand,
    textAlign: "center",
  },

  // Dashboard blocks
  dashGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12, marginTop: 12,
  },
  dashBlock: {
    background: t.color.surface,
    border: t.hairline,
    borderRadius: t.radius.card,
    padding: "16px 18px",
  },
  dashBlockHead: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
  },
  dashBlockNum: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: t.track.widest, color: t.color.brandBright,
  },
  dashBlockTitle: {
    fontFamily: t.font.display, fontSize: 13, fontWeight: 700,
    color: t.color.ink, letterSpacing: "-0.005em",
  },
  dashBlockDesc: {
    fontFamily: t.font.body, fontSize: 13, lineHeight: 1.55,
    color: t.color.muted, margin: 0,
  },

  // End mark
  endMark: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
    marginTop: 64, paddingTop: 32,
  },
  endTag: {
    fontFamily: t.font.display, fontSize: 10, fontWeight: 700,
    letterSpacing: t.track.technical, color: t.color.mutedSoft, textTransform: "uppercase",
  },
};
