// docente.js
// Panel de corrección: la profesora pone nota, estado, comentario general
// y marca casillas con error tocándolas en la carta. Al guardar, sube la
// corrección a Firebase y el alumno la ve en vivo.

const Docente = (function () {

  // Llena el panel con los datos del comprobante a corregir.
  function pintarPanel(comprobante) {
    const elAlumno = document.querySelector('#corr-alumno');
    const nota = document.querySelector('#corr-nota');
    const aprobado = document.querySelector('#corr-aprobado');
    const comentario = document.querySelector('#corr-comentario');

    if (!elAlumno) return;
    const corr = (comprobante && comprobante.correccion) || {};

    elAlumno.textContent = (comprobante && comprobante.alumno) || '';
    nota.value = corr.nota || '';
    aprobado.value = corr.aprobado || '';
    comentario.value = corr.comentario || '';
  }

  // Levanta los valores del panel + las casillas marcadas en la carta.
  function recolectar() {
    const estado = Editor.getEstado();
    if (!estado) return null;

    return {
      nota: (document.querySelector('#corr-nota') || {}).value || '',
      aprobado: (document.querySelector('#corr-aprobado') || {}).value || '',
      comentario: (document.querySelector('#corr-comentario') || {}).value || ''
    };
  }

  // Antes de guardar hay que recopilar los campos de la carta (que el
  // docente pudo ver pero no editar). Se unen a la corrección.
  function cerrarCorreccion(estadoNuevo, recargarPanel, estadoFinal) {
    const panel = recolectar();
    const errores = Editor.obtenerErroresMarcados();

    // Si no hay errores marcados y no se eligió estado, se aprueba automáticamente.
    let aprobado = panel.aprobado;
    if (!aprobado && Object.keys(errores).length === 0) aprobado = 'aprobado';

    const correccion = {
      nota: panel.nota,
      aprobado: aprobado,
      comentario: panel.comentario,
      errores: errores,
      corregidoPor: Sesion.nombre() || 'docente',
      fecha: new Date().toISOString(),
      corregido: true
    };

    estadoNuevo.correccion = correccion;
    estadoNuevo.estado = estadoFinal || 'corregido';
    estadoNuevo.fechaEdicion = new Date().toISOString();

    Repo.update(estadoNuevo);
    if (recargarPanel) pintarPanel(estadoNuevo);
  }

  // Guarda la corrección (deja el trabajo en estado "corregido").
  function guardarCorreccion() {
    const estado = Editor.getEstado();
    if (!estado) return;

    const nuevo = Editor.recopilarEstadoDesdeCarta();
    if (!nuevo) return;

    // El docente capturó posibles casillas marcadas; ocultar panel y volver
    cerrarCorreccion(nuevo, false);

    alertCustom('✅ Corrección guardada y enviada al alumno.');
    Docente.cerrarModoCorreccion();
  }

  // Devuelve el trabajo al alumno para que corrija (estado "devuelto").
  function devolverTrabajo() {
    const estado = Editor.getEstado();
    if (!estado) return;

    const nuevo = Editor.recopilarEstadoDesdeCarta();
    if (!nuevo) return;

    cerrarCorreccion(nuevo, false, 'devuelto');

    alertCustom('🔁 Trabajo devuelto al alumno para corregir.');
    Docente.cerrarModoCorreccion();
  }

  // Sale del modo corrección (vuelve a la vista de historial/navegación).
  function cerrarModoCorreccion() {
    Editor.finCorreccion();
    Editor.detenerEscucha();
    document.querySelector('#view-editor').classList.add('hidden');
    document.querySelector('#panel-correccion').classList.add('hidden');
    document.querySelector('#resumen-correccion').classList.add('hidden');
    document.querySelector('#view-historial').classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === 'historial');
    });
    Historial.render();
    window.scrollTo(0, 0);
  }

  // Botones del panel
  function bindEventos() {
    const btnGuardar = document.querySelector('#corr-guardar');
    const btnDevolver = document.querySelector('#corr-devolver');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarCorreccion);
    if (btnDevolver) btnDevolver.addEventListener('click', devolverTrabajo);
  }

  function alertCustom(mensaje) {
    const titulo = document.querySelector('#modal-titulo');
    const texto = document.querySelector('#modal-texto');
    titulo.textContent = 'Aviso';
    texto.textContent = mensaje;
    Modal.abrir(function () {}, true);
  }

  return { pintarPanel, guardarCorreccion, devolverTrabajo, cerrarModoCorreccion, bindEventos };
})();