// sincronizacion.js
// Capa de acceso a Firebase Realtime Database.
// Sube comprobantes entregados, escucha cambios en vivo (para alumno y docente).
const Repo = (function () {

  function configOk() {
    return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG &&
      FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf('TU_') === -1 &&
      !!FIREBASE_CONFIG.databaseURL && FIREBASE_CONFIG.databaseURL.indexOf('TU_') === -1;
  }

  // Inicializa Firebase una sola vez si la configuración está completa.
  if (configOk() && typeof firebase !== 'undefined' && !firebase.apps.length) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
    } catch (e) {
      // si falla, la app trabaja en modo local
    }
  }

  let dbOk = null;

  // Intenta acceder a la base de datos. Si el proyecto no tiene una
  // Realtime Database creada, devuelve null en vez de romper la app.
  function baseDatos() {
    if (dbOk === null) {
      try {
        const db = firebase.database();
        dbOk = db ? true : false;
      } catch (e) {
        dbOk = false;
      }
    }
    return dbOk;
  }

  function disponible() {
    return configOk() &&
      typeof firebase !== 'undefined' &&
      firebase.apps.length > 0 &&
      baseDatos();
  }

  function lista() {
    return firebase.database().ref('comprobantes');
  }

  function uno(id) {
    return lista().child(id);
  }

  function arreglo(snap) {
    const v = snap.val();
    if (!v) return [];
    return Object.keys(v).map(k => v[k]);
  }

  // Crea un nuevo comprobante en la nube. Devuelve el firebaseId.
  function push(comprobante) {
    const ref = lista().push();
    comprobante.firebaseId = ref.key;
    ref.set(comprobante).catch(notificarError);
    return comprobante.firebaseId;
  }

  // Actualiza un comprobante existente (usa su firebaseId).
  function update(comprobante) {
    if (comprobante && comprobante.firebaseId) {
      uno(comprobante.firebaseId).set(comprobante).catch(notificarError);
    }
  }

  function remove(id) {
    if (id) uno(id).remove().catch(notificarError);
  }

  function notificarError(e) {
    const msg = 'No se pudo guardar en Firebase. Revisá que la Realtime Database esté creada y sus reglas permitan leer/escribir.';
    if (typeof console !== 'undefined') console.error('Firebase:', e && e.code || e);
    if (window.RepoError) window.RepoError(e, msg);
  }

  function get(id, cb) {
    uno(id).once('value', s => cb(s.val()));
  }

  // Escucha todos los comprobantes (modo docente).
  function listenAll(cb) {
    const fn = s => cb(arreglo(s));
    lista().on('value', fn);
    return function () { lista().off('value', fn); };
  }

  // Escucha los comprobantes de un alumno (por nombre).
  function listenAlumno(nombre, cb) {
    const fn = s => cb(arreglo(s).filter(c => c && c.alumno === nombre));
    lista().on('value', fn);
    return function () { lista().off('value', fn); };
  }

  // Escucha un solo comprobante por su firebaseId.
  function listenUno(id, cb) {
    const ref = uno(id);
    const fn = s => cb(s.val());
    ref.on('value', fn);
    return function () { ref.off('value', fn); };
  }

  return { disponible, push, update, remove, get, listenAll, listenAlumno, listenUno };
})();