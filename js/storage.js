/**
 * storage.js
 * Capa de acceso a localStorage.
 * - Guarda/lee el historial completo de comprobantes.
 * - Guarda/lee el estado actual del editor (esquema: currentState).
 */

const Storage = (function () {
  const KEY = 'comprobantesEscolares';
  const KEY_EDITOR = 'comprobantesEscolaresEditor';

  function leerTodo() {
    try {
      const datos = JSON.parse(localStorage.getItem(KEY));
      return datos && Array.isArray(datos) ? datos : [];
    } catch (e) {
      return [];
    }
  }

  function escribirTodo(lista) {
    localStorage.setItem(KEY, JSON.stringify(lista));
  }

  function getHistorial() {
    return leerTodo();
  }

  // Guarda un nuevo comprobante (o actualiza si existe el id)
  function guardar(comprobante) {
    const lista = leerTodo();
    const idx = lista.findIndex(c => c.id === comprobante.id);
    if (idx >= 0) {
      lista[idx] = comprobante;
    } else {
      lista.unshift(comprobante);
    }
    escribirTodo(lista);
  }

  function eliminar(id) {
    const lista = leerTodo().filter(c => c.id !== id);
    escribirTodo(lista);
  }

  // Devuelve el siguiente número de ID incremental
  function proximoId() {
    const lista = leerTodo();
    let max = 0;
    lista.forEach(c => {
      const n = parseInt(c.id, 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return String(max + 1);
  }

  // --- Estado del editor ---
  function getEditorState() {
    try {
      return JSON.parse(localStorage.getItem(KEY_EDITOR)) || null;
    } catch (e) {
      return null;
    }
  }

  function setEditorState(estado) {
    localStorage.setItem(KEY_EDITOR, JSON.stringify(estado));
  }

  function limpiarEditorState() {
    localStorage.removeItem(KEY_EDITOR);
  }

  // Borra todo el historial y el estado del editor
  function borrarTodo() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_EDITOR);
  }

  return {
    getHistorial,
    guardar,
    eliminar,
    proximoId,
    getEditorState,
    setEditorState,
    limpiarEditorState,
    borrarTodo
  };
})();
