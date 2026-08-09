import { useState } from "react";
import Lightbox from "../components/Lightbox";

// Carta de bienvenida de los fundadores. Texto y foto reales — no editar el
// contenido sin que Sergio/Mario lo pidan explícitamente.
const SobreNosotros = () => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div style={pageStyle}>
      <p style={eyebrowStyle}>Una carta de los fundadores</p>
      <h2 style={titleStyle}>🍺 La Familia RiBeer's</h2>

      <div style={photoWrapOuter}>
        <div style={photoWrapInner}>
          <img
            src="/founders.jpg"
            alt="Sergio y Mario, fundadores de RiBeer's"
            onClick={() => setLightboxOpen(true)}
            style={{ ...photoImg, cursor: "zoom-in" }}
          />
        </div>
      </div>
      <p style={captionStyle}>Sergio y Mario — fundadores de RiBeer's</p>

      {lightboxOpen && (
        <Lightbox
          src="/founders.jpg"
          alt="Sergio y Mario, fundadores de RiBeer's"
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div style={dividerStyle} />

      <div style={letterStyle}>
        <p style={pStyle}>
          Querido usuario, sea bienvenido a esta barra infinita. Le agradecemos su participación; estamos
          profundamente orgullosos de contar con usted en este viaje. Debe saber que no se encuentra ante un
          conjunto de ‘unos y ceros’, sino que esta aplicación —suya— guarda una historia y un corazón
          particulares. Se trata de una verdadera cantina digital.
        </p>
        <p style={pStyle}>
          Nuestra tasca abre sus puertas para que usted pueda recorrerla y llenar sus estanterías con aquellos
          descubrimientos que haga a lo largo de los años, con las cervezas que registre allá donde vaya y con los
          conocimientos que usted quiera compartir con cada una de ellas. Ya sabe que la Taberna es la Universidad
          de la Vida.
        </p>
        <p style={pStyle}>
          Cuando Ribeer's comenzó a gestarse como idea apenas era una vaga intención nacida en una lumbre de
          sábado, alrededor de un bidón ardiendo y con la mesa puesta para medio centenar de parientes. Esa
          filosofía es la que nos alimenta.
        </p>
        <p style={pStyle}>
          Reivindicamos la Familia y la unión como forma de entender la cultura cervecera universal. Defendemos la
          tierra, el Llano, el Almendro, Badajoz y Extremadura. Y el apellido Rivero, que es el que bautiza esta
          tasca nuestra.
        </p>
        <p style={pStyle}>
          Estos dos jóvenes cerveceros le invitan a sentarse. Tiene usted una silla. Bienvenido a la Familia.
        </p>
        <p style={signatureStyle}>
          Con cariño,<br />Sergio y Mario
        </p>
      </div>
    </div>
  );
};

const pageStyle = {
  maxWidth: 640,
  margin: "0 auto",
};
const eyebrowStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#9a7d62",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  textAlign: "center",
  margin: "0 0 8px",
};
const titleStyle = {
  textAlign: "center",
  margin: "0 0 32px",
  fontSize: 26,
};
const photoWrapOuter = {
  maxWidth: 440,
  margin: "0 auto",
  borderRadius: 20,
  padding: 3,
  background: "linear-gradient(135deg, #d4af37, #5a4535 45%, #d4af37)",
  boxShadow: "0 0 50px rgba(212,175,55,0.18), 0 14px 32px rgba(0,0,0,0.5)",
};
const photoWrapInner = {
  borderRadius: 17,
  overflow: "hidden",
  background: "#0d0a06",
};
const photoImg = {
  display: "block",
  width: "100%",
  height: 340,
  objectFit: "cover",
  objectPosition: "center 25%",
};
const captionStyle = {
  textAlign: "center",
  fontSize: 12.5,
  color: "#9a7d62",
  fontStyle: "italic",
  margin: "12px 0 40px",
};
const dividerStyle = {
  width: 60,
  height: 1,
  background: "#8b6b2e",
  opacity: 0.6,
  margin: "0 auto 36px",
};
const letterStyle = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 16,
  lineHeight: 1.85,
  color: "#f0e4cc",
};
const pStyle = {
  margin: "0 0 22px",
};
const signatureStyle = {
  marginTop: 32,
  fontStyle: "italic",
  color: "#d4af37",
  fontSize: 16,
  textAlign: "right",
};

export default SobreNosotros;
