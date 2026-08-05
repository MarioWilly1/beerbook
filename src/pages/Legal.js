import React from "react";
import { Link } from "react-router-dom";

// Página pública (fuera de <Layout>, sin requerir sesión — mismo patrón que
// LugarPage.js) que publica el texto completo de Política de Privacidad y
// Términos de Servicio. Contenido estático provisto por el responsable de la
// app; no se traduce a otros idiomas porque es un documento legal único.

const TopBar = () => (
  <div style={topBarStyle}>
    <Link to="/" style={brandLinkStyle}>🍺 RiBeer's</Link>
  </div>
);

const Section = ({ children }) => <h2 style={sectionStyle}>{children}</h2>;
const SubSection = ({ children }) => <h3 style={subSectionStyle}>{children}</h3>;
const List = ({ children }) => <ul style={listStyle}>{children}</ul>;
const Note = ({ children }) => <p style={noteStyle}>{children}</p>;
const P = ({ children }) => <p style={pStyle}>{children}</p>;

const Legal = () => (
  <div style={pageStyle}>
    <TopBar />

    <div style={contentStyle}>
      <Link to="/" style={backLinkStyle}>← Volver</Link>

      <h1 style={titleStyle}>RiBeer's — Política de Privacidad y Términos de Servicio</h1>
      <p style={metaStyle}><strong>Última actualización:</strong> [FECHA] — Versión 0.1 (borrador de trabajo)</p>

      <div style={warningBoxStyle}>
        ⚠️ <strong>AVISO IMPORTANTE:</strong> este documento es un borrador generado como punto de partida y NO
        constituye asesoramiento legal. Debe ser revisado, corregido y aprobado por un abogado especializado en
        protección de datos (RGPD/LOPDGDD) antes de entrar en vigor de forma definitiva.
      </div>

      <hr style={hrStyle} />
      <h1 style={partTitleStyle}>PARTE 1 — POLÍTICA DE PRIVACIDAD</h1>

      <Section>1. Responsable del tratamiento</Section>
      <P>
        Mario Fernando Rivero Ramírez (persona física) · DNI 80264821L · Calle el Tejo 5, 06011 Badajoz, España ·
        ribeers.app@gmail.com
      </P>
      <P>
        A los efectos del Reglamento General de Protección de Datos (RGPD, UE 2016/679) y la Ley Orgánica 3/2018 de
        Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), el responsable del
        tratamiento de los datos personales recabados a través de la aplicación RiBeer's es la persona indicada
        arriba.
      </P>

      <Section>2. Datos que recopilamos</Section>
      <SubSection>2.1. Datos que proporcionas directamente:</SubSection>
      <List>
        <li>Email y contraseña (o autenticación mediante Google) al registrarte</li>
        <li>Nombre de usuario, foto de perfil (avatar) y biografía</li>
        <li>Fecha de nacimiento, para verificar que eres mayor de 18 años (requisito legal por tratarse de
          contenido relacionado con el consumo de alcohol)</li>
        <li>País de origen (opcional)</li>
        <li>Fotografías que subas de las cervezas que registres o de copas coleccionables</li>
        <li>Comentarios, valoraciones y cualquier otro contenido que publiques</li>
        <li>Mensajes enviados a través del chat con otros usuarios</li>
      </List>
      <SubSection>2.2. Datos recopilados automáticamente:</SubSection>
      <List>
        <li>Ubicación geográfica (solo si activas voluntariamente esta función al registrar una cerveza; puedes
          marcarla como privada)</li>
        <li>Datos de uso e interacción con la aplicación (cervezas registradas, logros, progreso, actividad)</li>
        <li>Idioma preferido del dispositivo/navegador</li>
        <li>Dirección IP y datos técnicos básicos del dispositivo, con fines de seguridad</li>
      </List>

      <Section>3. Finalidad del tratamiento</Section>
      <P>Tratamos tus datos personales para:</P>
      <List>
        <li>Crear y gestionar tu cuenta de usuario</li>
        <li>Permitir el funcionamiento de las funciones sociales (amigos, feed, chat, historias)</li>
        <li>Calcular tu progreso, nivel, logros y clasificaciones (rankings)</li>
        <li>Verificar que eres mayor de edad, conforme a la normativa aplicable</li>
        <li>Prevenir fraude, abuso o comportamiento malicioso dentro de la aplicación</li>
        <li>Mostrarte contenido en tu idioma preferido</li>
        <li>Comunicarnos contigo por motivos relacionados con el servicio (soporte, avisos importantes)</li>
      </List>

      <Section>4. Base legal del tratamiento</Section>
      <List>
        <li><strong>Ejecución del contrato:</strong> para prestarte el servicio que solicitas al registrarte y usar
          la aplicación</li>
        <li><strong>Consentimiento:</strong> para funciones opcionales como compartir tu ubicación o hacer público
          tu perfil</li>
        <li><strong>Interés legítimo:</strong> para medidas de seguridad y prevención de fraude</li>
        <li><strong>Obligación legal:</strong> en su caso, para el cumplimiento de requisitos normativos aplicables
          (por ejemplo, verificación de edad)</li>
      </List>

      <Section>5. Con quién compartimos tus datos</Section>
      <P>No vendemos tus datos personales a terceros. Compartimos datos únicamente con:</P>
      <List>
        <li>Supabase Inc. (proveedor de infraestructura de base de datos y almacenamiento) — actúa como encargado
          del tratamiento</li>
        <li>Vercel Inc. (proveedor de alojamiento web)</li>
        <li>MyMemory (servicio de traducción automática) — recibe únicamente el texto de descripciones de
          cervezas, nunca datos personales de usuarios</li>
        <li>Otros usuarios de la aplicación, en la medida en que tú decidas hacer pública cierta información
          (perfil público, feed, comentarios)</li>
      </List>
      <Note>[Completar si se añaden más proveedores: pasarelas de pago, servicios de publicidad como Google
        AdMob, etc.]</Note>

      <Section>6. Transferencias internacionales</Section>
      <P>
        Algunos de nuestros proveedores (como Supabase y Vercel) pueden alojar datos en servidores ubicados fuera
        del Espacio Económico Europeo. En tal caso, nos aseguramos de que existan garantías adecuadas conforme al
        RGPD (como las Cláusulas Contractuales Tipo de la Comisión Europea).
      </P>
      <Note>[Verificar con cada proveedor la ubicación exacta de los servidores y las garantías contractuales
        vigentes]</Note>

      <Section>7. Conservación de los datos</Section>
      <P>
        Conservamos tus datos personales mientras mantengas tu cuenta activa. Si solicitas la eliminación de tu
        cuenta, eliminaremos o anonimizaremos tus datos personales en un plazo razonable, salvo que debamos
        conservar cierta información por obligación legal.
      </P>

      <Section>8. Tus derechos</Section>
      <P>Como usuario, tienes derecho a:</P>
      <List>
        <li>Acceder a los datos personales que tenemos sobre ti</li>
        <li>Rectificar datos inexactos</li>
        <li>Solicitar la supresión de tus datos ("derecho al olvido")</li>
        <li>Solicitar la portabilidad de tus datos</li>
        <li>Oponerte al tratamiento u obtener su limitación</li>
        <li>Retirar tu consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento
          anterior</li>
      </List>
      <P>
        Puedes ejercer estos derechos escribiendo a ribeers.app@gmail.com. También tienes derecho a presentar una
        reclamación ante la Agencia Española de Protección de Datos (www.aepd.es) si consideras que no hemos
        tratado tus datos correctamente.
      </P>

      <Section>9. Menores de edad</Section>
      <P>
        RiBeer's está dirigida exclusivamente a personas mayores de 18 años, por tratarse de una aplicación
        relacionada con el consumo de bebidas alcohólicas. Verificamos la edad mediante una declaración de fecha
        de nacimiento en el registro. Si detectamos que un usuario es menor de edad, procederemos a la eliminación
        de su cuenta.
      </P>

      <Section>10. Seguridad</Section>
      <P>
        Aplicamos medidas técnicas y organizativas para proteger tus datos, incluyendo cifrado de contraseñas,
        control de acceso mediante políticas de seguridad a nivel de fila (Row Level Security) en nuestra base de
        datos, y auditorías periódicas de seguridad.
      </P>

      <Section>11. Cookies y almacenamiento local</Section>
      <P>
        Utilizamos almacenamiento local del navegador/dispositivo (localStorage y similares) para recordar tus
        preferencias (como el idioma seleccionado) y mantener tu sesión iniciada. No utilizamos cookies de
        publicidad de terceros en la versión actual de la aplicación.
      </P>

      <Section>12. Cambios en esta política</Section>
      <P>
        Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos de cambios importantes a
        través de la propia aplicación.
      </P>

      <hr style={hrStyle} />
      <h1 style={partTitleStyle}>PARTE 2 — TÉRMINOS DE SERVICIO</h1>

      <Section>1. Aceptación de los términos</Section>
      <P>
        Al registrarte y utilizar RiBeer's, aceptas estos Términos de Servicio en su totalidad. Si no estás de
        acuerdo, no debes utilizar la aplicación.
      </P>

      <Section>2. Descripción del servicio</Section>
      <P>
        RiBeer's es una aplicación para catalogar, descubrir y compartir experiencias relacionadas con la cerveza,
        que incluye funciones sociales, de gamificación (niveles, logros, prestigio) y de comunidad.
      </P>

      <Section>3. Requisito de edad mínima</Section>
      <P>
        Debes tener al menos 18 años para crear una cuenta y utilizar RiBeer's. Al registrarte, declaras y
        garantizas que cumples este requisito.
      </P>

      <Section>4. Cuenta de usuario</Section>
      <List>
        <li>Eres responsable de mantener la confidencialidad de tu contraseña</li>
        <li>Eres responsable de toda la actividad que ocurra bajo tu cuenta</li>
        <li>Debes proporcionar información veraz al registrarte</li>
        <li>Nos reservamos el derecho de suspender o eliminar cuentas que incumplan estos términos</li>
      </List>

      <Section>5. Contenido generado por el usuario</Section>
      <P>Al publicar fotografías, comentarios, sugerencias de cervezas o copas, u otro contenido en RiBeer's:</P>
      <List>
        <li>Mantienes la propiedad de tu contenido</li>
        <li>Nos concedes una licencia no exclusiva para mostrar, almacenar y distribuir dicho contenido dentro de
          la aplicación</li>
        <li>Garantizas que tienes derecho a compartir ese contenido y que no infringe derechos de terceros</li>
        <li>No debes publicar contenido ilegal, difamatorio, que incluya a menores de forma inapropiada, o que
          infrinja derechos de propiedad intelectual de terceros (por ejemplo, no reproducir logotipos o
          imágenes de marcas registradas de cerveceras sin autorización)</li>
      </List>

      <Section>6. Moneda virtual ("Chapas") y objetos cosméticos</Section>
      <List>
        <li>Las Chapas son una moneda virtual sin valor monetario real, que se obtiene únicamente jugando dentro
          de la aplicación (subiendo de nivel, completando retos, alcanzando prestigios)</li>
        <li>Las Chapas no pueden comprarse con dinero real en la versión actual, ni canjearse por dinero, premios
          físicos o cualquier equivalente monetario</li>
        <li>Los objetos cosméticos (etiquetas, marcos de avatar) adquiridos con Chapas son de uso exclusivamente
          dentro de la aplicación</li>
      </List>
      <Note>[Si en el futuro se introduce la compra de Chapas con dinero real o sorteos con premios reales, esta
        sección deberá actualizarse y podría requerir cumplir normativa adicional sobre juego/sorteos]</Note>

      <Section>7. Conducta prohibida</Section>
      <P>No está permitido:</P>
      <List>
        <li>Crear cuentas falsas o suplantar la identidad de otra persona</li>
        <li>Manipular el sistema de puntuación, logros o rankings mediante trampas técnicas</li>
        <li>Acosar, amenazar o discriminar a otros usuarios</li>
        <li>Publicar contenido sexual, violento o que involucre a menores de edad</li>
        <li>Intentar acceder sin autorización a otras cuentas o a la infraestructura de la aplicación</li>
      </List>

      <Section>8. Propiedad intelectual</Section>
      <P>
        El nombre RiBeer's, el diseño, el código fuente y los elementos visuales de la aplicación son propiedad de
        Mario Fernando Rivero Ramírez y su/s socio/s en el proyecto, y están protegidos por la normativa de
        propiedad intelectual aplicable. No está permitida su reproducción sin autorización.
      </P>

      <Section>9. Limitación de responsabilidad</Section>
      <P>
        RiBeer's se ofrece "tal cual". No garantizamos que el servicio esté libre de errores o interrupciones. No
        somos responsables de las decisiones que tomes basándote en la información compartida por otros usuarios
        (por ejemplo, precios de cervezas en un local, que son datos aportados por la comunidad y no verificados
        oficialmente).
      </P>

      <Section>10. Consumo responsable de alcohol</Section>
      <P>
        RiBeer's promueve el disfrute y descubrimiento de la cerveza de forma responsable. No fomentamos el
        consumo excesivo de alcohol. Recuerda que el consumo de alcohol puede ser perjudicial para la salud.
      </P>

      <Section>11. Terminación</Section>
      <P>
        Puedes eliminar tu cuenta en cualquier momento desde la configuración de la aplicación. Nos reservamos el
        derecho de suspender o eliminar cuentas que incumplan estos Términos de Servicio.
      </P>

      <Section>12. Ley aplicable y jurisdicción</Section>
      <Note>[A definir con asesoría legal: normalmente se establece la legislación española y los juzgados del
        domicilio del responsable, sujeto a las normas de protección al consumidor aplicables]</Note>

      <Section>13. Modificaciones de estos términos</Section>
      <P>
        Podemos modificar estos Términos de Servicio ocasionalmente. Te notificaremos cambios importantes a
        través de la aplicación. El uso continuado tras dichos cambios implica su aceptación.
      </P>

      <Section>14. Contacto</Section>
      <P>ribeers.app@gmail.com · Calle el Tejo 5, 06011 Badajoz, España</P>
    </div>
  </div>
);

const pageStyle = {
  minHeight: "100vh",
  background: "#0d0a06",
};
const topBarStyle = {
  background: "#1c1409",
  borderBottom: "1px solid #2e2215",
  padding: "14px 24px",
};
const brandLinkStyle = {
  color: "#d4af37",
  fontWeight: 700,
  fontSize: 16,
  textDecoration: "none",
  fontFamily: "'Playfair Display', Georgia, serif",
};
const contentStyle = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "32px 20px 64px",
};
const backLinkStyle = {
  display: "inline-block",
  marginBottom: 20,
  color: "#8b6b2e",
  fontSize: 13,
  textDecoration: "none",
};
const titleStyle = {
  margin: "0 0 8px",
  fontSize: 26,
  lineHeight: 1.3,
};
const metaStyle = {
  color: "#9a7d62",
  fontSize: 13,
  margin: "0 0 20px",
};
const warningBoxStyle = {
  background: "rgba(139,32,32,0.15)",
  border: "1px solid #8b2020",
  borderRadius: 10,
  padding: "14px 16px",
  fontSize: 13,
  color: "#c07a3f",
  lineHeight: 1.6,
  marginBottom: 8,
};
const hrStyle = {
  border: "none",
  borderTop: "1px solid #2e2215",
  margin: "32px 0",
};
const partTitleStyle = {
  fontSize: 20,
  color: "#d4af37",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  textAlign: "center",
  margin: "0 0 28px",
};
const sectionStyle = {
  fontSize: 18,
  color: "#d4af37",
  margin: "28px 0 10px",
};
const subSectionStyle = {
  fontSize: 15,
  color: "#f0e4cc",
  margin: "16px 0 8px",
};
const pStyle = {
  fontSize: 14,
  color: "#f0e4cc",
  lineHeight: 1.7,
  margin: "0 0 12px",
};
const listStyle = {
  margin: "0 0 12px",
  paddingLeft: 20,
  color: "#f0e4cc",
  fontSize: 14,
  lineHeight: 1.7,
};
const noteStyle = {
  fontSize: 12,
  color: "#9a7d62",
  fontStyle: "italic",
  margin: "0 0 20px",
  padding: "8px 12px",
  background: "#1c1409",
  borderRadius: 6,
  border: "1px dashed #2e2215",
};

export default Legal;
