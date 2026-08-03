import React from "react";

// Ícono de "Chapa" (moneda del sistema de cosméticos): chapa de botella
// real y básica — círculo con borde dentado (forma de corona, como una
// chapa de cerveza vista de frente) — en vez de un emoji tipo moneda/
// método de pago que confundía sobre qué es esta unidad.
const ChapaIcon = ({ size = 16, color = "#d4af37" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon
      points="12.00,1.50 14.07,4.27 17.25,2.91 17.66,6.34 21.09,6.75 19.73,9.93 22.50,12.00 19.73,14.07 21.09,17.25 17.66,17.66 17.25,21.09 14.07,19.73 12.00,22.50 9.93,19.73 6.75,21.09 6.34,17.66 2.91,17.25 4.27,14.07 1.50,12.00 4.27,9.93 2.91,6.75 6.34,6.34 6.75,2.91 9.93,4.27"
      fill={color}
    />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#0d0a06" strokeOpacity="0.35" strokeWidth="1" />
  </svg>
);

export default ChapaIcon;
