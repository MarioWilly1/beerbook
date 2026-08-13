// Log de diagnóstico temporal, no bloqueante — pensado para reemplazar los
// alert() que veníamos usando (la depuración remota de Chrome no conecta en
// el dispositivo de prueba). alert() detiene el hilo de JS y depende del
// puente nativo del WebView para el diálogo; si ESO es lo que falla (no
// nuestro código — ver la nota en BarcodeScanner.jsx), seguir agregando
// alerts no serviría para nada. Esto en cambio solo acumula strings en un
// array y notifica a quien esté suscripto (el overlay en pantalla) — cero
// dependencia del puente nativo.
let entries = [];
let listeners = [];

export function logDebug(msg) {
  entries = [...entries, { msg, t: Date.now() }];
  listeners.forEach((fn) => fn(entries));
}

export function subscribeDebugLog(fn) {
  listeners.push(fn);
  fn(entries);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}
