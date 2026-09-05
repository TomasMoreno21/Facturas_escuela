// auth.js
// Sesión simple: guarda en el dispositivo quién estoy usando (nombre y rol).
const Sesion = (function () {
  const KEY = 'comprobantesSesion';

  function guardar(nombre, rol) {
    localStorage.setItem(KEY, JSON.stringify({ nombre: nombre, rol: rol }));
  }

  function get() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  function nombre() {
    const s = get();
    return s ? s.nombre : '';
  }

  function esDocente() {
    const s = get();
    return !!s && s.rol === 'docente';
  }

  function esAlumno() {
    const s = get();
    return !!s && s.rol === 'alumno';
  }

  function salir() {
    localStorage.removeItem(KEY);
  }

  return { guardar, get, nombre, esDocente, esAlumno, salir };
})();