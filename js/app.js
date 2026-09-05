/**
 * app.js
 * Orquestador principal: login por rol (alumno/docente), navegación,
 * entrega de comprobantes a Firebase, escucha en vivo y modal.
 */

const App = (function () {

  const vistas = ['inicio', 'aprender', 'historial', 'editor'];
  let detenerEscucha = null;

  // --- Modal de confirmación ---
  const Modal = {
    _callback: null,
    abrir: function (callback, esAviso) {
      this._callback = callback;
      const btn = document.querySelector('#modal-confirmar-btn');
      if (btn) btn.textContent = esAviso ? 'OK' : 'Confirmar';
      const panel = document.querySelector('#modal-confirmar');
      panel.classList.remove('hidden');
    },
    cerrar: function () {
      document.querySelector('#modal-confirmar').classList.add('hidden');
      this._callback = null;
    },
    confirmar: function () {
      const cb = this._callback;
      this.cerrar();
      if (cb) cb();
    }
  };
  window.Modal = Modal;

  // --- Login ---
  function bindLogin() {
    const esDocente = document.querySelector('#login-es-docente');
    const bloqueClave = document.querySelector('#login-docente-block');
    const btnEntrar = document.querySelector('#login-entrar');
    const btnSalir = document.querySelector('#btn-salir');

    window.RepoError = function (e, msg) {
      alertCustom('⚠️ ' + msg);
    };

    esDocente.addEventListener('change', function () {
      bloqueClave.classList.toggle('hidden', !esDocente.checked);
    });

    btnEntrar.addEventListener('click', entrar);
    document.querySelector('#login-clave').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') entrar();
    });
    document.querySelector('#login-nombre').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') entrar();
    });

    btnSalir.addEventListener('click', function () {
      const titulo = document.querySelector('#modal-titulo');
      const texto = document.querySelector('#modal-texto');
      titulo.textContent = '¿Salir de la sesión?';
      texto.textContent = 'Se cerrará tu sesión en este dispositivo.';
      Modal.abrir(function () { salir(); });
    });
  }

  function entrar() {
    const nombre = (document.querySelector('#login-nombre').value || '').trim();
    const esDocente = document.querySelector('#login-es-docente').checked;

    if (!nombre) { alertCustom('Escribí tu nombre para entrar.'); return; }

    if (esDocente) {
      const clave = (document.querySelector('#login-clave').value || '').trim();
      if (typeof CLAVE_DOCENTE !== 'undefined' && clave === CLAVE_DOCENTE) {
        iniciarSesion(nombre, 'docente');
      } else {
        alertCustom('La clave docente es incorrecta.');
      }
      return;
    }

    iniciarSesion(nombre, 'alumno');
  }

  function iniciarSesion(nombre, rol) {
    Sesion.guardar(nombre, rol);

    document.querySelector('#view-login').classList.add('hidden');
    document.querySelector('#sesion-texto').textContent =
      rol === 'docente' ? '👩‍🏫 Docente: ' + nombre : '🎓 ' + nombre;
    document.querySelector('#btn-salir').classList.remove('hidden');
    document.querySelector('#nav-bar').classList.remove('hidden');

    apagarEscucha();

    if (rol === 'docente') {
      document.querySelector('#inicio-titulo').textContent = 'Sesión docente';
      document.querySelector('#inicio-ayuda').textContent = 'Tocá “Historial” para ver y corregir las entregas de los alumnos.';
      document.querySelectorAll('.opcion-card, .zonas-peligro').forEach(el => el.classList.add('hidden'));
      Historial.setEntregas([]);
      detenerEscucha = Repo.disponible() ? Repo.listenAll(function (lista) {
        Historial.setEntregas(lista);
        if (!document.querySelector('#view-historial').classList.contains('hidden')) Historial.render();
      }) : null;
      if (!Repo.disponible()) alertCustom('⚠️ Falta configurar Firebase: pegá tu SDK en js/firebase-config.js.');
      mostrarVista('historial');
      return;
    }

    document.querySelector('#inicio-titulo').textContent = '¿Qué comprobante querés completar?';
    document.querySelector('#inicio-ayuda').textContent = 'Elegí una opción para empezar a practicar. Cuando termines, pulsá “Entregar” para que la profesora lo vea y corrija.';
    document.querySelectorAll('.opcion-card, .zonas-peligro').forEach(el => el.classList.remove('hidden'));

    Historial.setEntregas([]);
    if (Repo.disponible()) {
      detenerEscucha = Repo.listenAlumno(nombre, function (lista) {
        Historial.setEntregas(lista);
        if (!document.querySelector('#view-historial').classList.contains('hidden')) Historial.render();
        // Si estamos viendo un comprobante propio entregado, actualizar en vivo
        const est = Editor.getEstado();
        if (est && est.firebaseId && est.estado !== 'devuelto') {
          const actualizado = lista.find(c => c && c.firebaseId === est.firebaseId);
          if (actualizado && actualizado.firebaseId === est.firebaseId &&
              JSON.stringify(actualizado.correccion) !== JSON.stringify(est.correccion)) {
            Editor.setEstado(actualizado);
          }
        }
      });
    } else {
      alertCustom('⚠️ Falta configurar Firebase: pegá tu SDK en js/firebase-config.js.');
    }

    mostrarVista('inicio');
  }

  // Detiene la escucha activa, si la hay.
  function apagarEscucha() {
    if (detenerEscucha) { detenerEscucha(); detenerEscucha = null; }
  }

  function salir() {
    apagarEscucha();
    Historial.vaciar();
    Sesion.salir();
    Editor.cargarTipo('A');
    document.querySelector('#view-login').classList.remove('hidden');
    document.querySelector('#sesion-texto').textContent = '';
    document.querySelector('#btn-salir').classList.add('hidden');
    document.querySelector('#nav-bar').classList.add('hidden');
    document.querySelector('#login-nombre').value = '';
    document.querySelector('#login-clave').value = '';
    document.querySelector('#login-es-docente').checked = false;
    document.querySelector('#login-docente-block').classList.add('hidden');
    vistas.forEach(v => {
      const el = document.querySelector('#view-' + v);
      if (el) el.classList.add('hidden');
    });
    window.scrollTo(0, 0);
  }

  // --- Navegación ---
  function mostrarVista(vista) {
    if (Sesion.esDocente() && vista === 'inicio') {
      vista = 'historial';
    }

    if (vista !== 'editor' && !Editor.getModoCorreccion()) {
      Editor.persistirEstadoActual();
    }

    vistas.forEach(v => {
      const el = document.querySelector('#view-' + v);
      if (el) el.classList.toggle('hidden', v !== vista);
    });

    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('is-active', b.getAttribute('data-view') === vista);
    });

    if (vista === 'historial') Historial.render();
    if (vista === 'editor') actualizarVisibilidadEditor();
    window.scrollTo(0, 0);
  }

  // --- Editor: nueva práctica ---
  function practicar(tipo) {
    const borrador = Storage.getEditorState();
    if (borrador && borrador.tipo === tipo && !borrador.firebaseId) {
      Editor.setEstado(borrador);
    } else {
      Editor.cargarTipo(tipo);
    }
    mostrarVista('editor');
  }

  // --- Alumno: abrir un comprobante (borrador o entrega) ---
  function abrirComprobante(comprobante) {
    Editor.abrir(comprobante);
    Editor.iniciarEscucha();
    mostrarVista('editor');
  }

  // --- Docente: abrir en modo corrección ---
  function corregirComprobante(comprobante) {
    Editor.abrirParaCorregir(comprobante);
    mostrarVista('editor');
  }

  // --- Entregar ---
  // Campos editables que NO se exigen obligatoriamente al entregar.
  const CAMPOS_OPCIONALES = {
    A: ['ingresosBrutos', 'inicioActividades'],
    B: ['ingresosBrutos', 'inicioActividades'],
    C: ['ingresosBrutos', 'inicioActividades'],
    RECIBO: [],
    CHEQUE: ['localidad'],
    CHEQUE_DIF: ['localidad'],
    NOTA: ['ingresosBrutos', 'inicioActividades', 'remitoNumero', 'impuesto']
  };
  // Valores calculados (se llenan solos), no se exigen.
  const CAMPOS_CALCULADOS = ['subtotal', 'total', 'subtotal2', 'item_sub_0', 'item_sub_1', 'item_sub_2'];

  function camposCompletos() {
    const carta = document.querySelector('#editor-contenedor .carta');
    if (!carta) return true;
    const tipo = Editor.getTipoActual();
    const opcionales = CAMPOS_OPCIONALES[tipo] || [];
    const faltantes = [];

    carta.querySelectorAll('[data-bind]').forEach(el => {
      const clave = el.getAttribute('data-bind');
      if (clave.startsWith('item_')) {
        // solo se exigen las filas con algo cargado (cant o desc)
        const fila = el.closest('.fila-item');
        if (!fila) return;
        if (CAMPOS_CALCULADOS.indexOf(clave) !== -1) return;
        const cant = fila.querySelector('[data-bind^="item_cant_"]');
        const desc = fila.querySelector('[data-bind^="item_desc_"]');
        const pu = fila.querySelector('[data-bind^="item_pu_"]');
        const filaVacia = !cant.textContent.trim() && !desc.textContent.trim() && !pu.textContent.trim();
        if (filaVacia) return; // fila sin usar
        if (!el.textContent.trim()) faltantes.push(clave);
        return;
      }
      if (CAMPOS_CALCULADOS.indexOf(clave) !== -1) return;
      if (opcionales.indexOf(clave) !== -1) return;
      if (clave === 'condicionCliente') {
        if (!el.textContent.trim()) faltantes.push(clave);
        return;
      }
      if (!el.textContent.trim()) faltantes.push(clave);
    });

    if (faltantes.length > 0) {
      alertCustom('⚠️ Faltan completar campos obligatorios: ' + faltantes.map(Editor.etiqueta).join(', ') + '.');
      return false;
    }
    return true;
  }

  function entregar() {
    if (!Sesion.esAlumno()) { alertCustom('Iniciá sesión como alumna/o para entregar.'); return; }
    if (!Repo.disponible()) { alertCustom('⚠️ Falta configurar Firebase (js/firebase-config.js) para poder entregar.'); return; }
    if (!Editor.getEstado()) return;
    if (!camposCompletos()) return;

    const titulo = document.querySelector('#modal-titulo');
    const texto = document.querySelector('#modal-texto');
    titulo.textContent = '📤 ¿Entregar a la profesora?';
    texto.textContent = 'Una vez que lo entregues, el comprobante queda bloqueado y ella podrá corregirlo.';

    Modal.abrir(function () {
      const comp = Editor.obtenerComprobante();
      if (!comp) return;
      comp.alumno = Sesion.nombre();
      comp.estado = 'entregado';
      comp.entrega = comp.entrega || {};
      comp.entrega.fecha = new Date().toISOString();
      comp.correccion = null;
      comp.fechaCreacion = comp.fechaCreacion || new Date().toISOString();

      if (!comp.firebaseId) {
        const idLocal = comp.id;
        Repo.push(comp);
        if (idLocal) Storage.eliminar(idLocal);
      } else {
        Repo.update(comp);
      }

      Storage.limpiarEditorState();
      Editor.abrir(comp);
      Editor.iniciarEscucha();
      alertCustom('📤 Entregado. La profesora lo va a corregir.');
      mostrarVista('historial');
    });
  }

  // --- Botones globales ---
  function bindAcciones() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        mostrarVista(this.getAttribute('data-view'));
      });
    });

    document.querySelectorAll('.opcion-card').forEach(card => {
      card.addEventListener('click', function () {
        practicar(this.getAttribute('data-tipo'));
      });
    });

    document.querySelector('#btn-volver-editor').addEventListener('click', function () {
      mostrarVista(Sesion.esDocente() ? 'historial' : 'inicio');
    });

    document.querySelector('#btn-guardar').addEventListener('click', function () {
      const comprobante = Editor.obtenerComprobante();
      if (!comprobante) return;
      if (!comprobante.id) {
        comprobante.id = Storage.proximoId();
        comprobante.fechaCreacion = new Date().toISOString();
      }
      comprobante.estado = 'borrador';
      Storage.guardar(comprobante);
      Editor.setEstado(comprobante);
      Storage.limpiarEditorState();
      actualizarVisibilidadEditor();
      alertCustom('✅ Borrador guardado en tu historial.');
    });

    document.querySelector('#btn-entregar').addEventListener('click', entregar);

    document.querySelector('#btn-pdf').addEventListener('click', function () {
      Pdf.generarDesdeEditor();
    });

    document.querySelector('#btn-nuevo').addEventListener('click', function () {
      const tipo = Editor.getTipoActual();
      Storage.limpiarEditorState();
      Editor.cargarTipo(tipo);
      actualizarVisibilidadEditor();
    });

    document.querySelector('#btn-ver-ayuda').addEventListener('click', function () {
      Editor.verAyuda();
    });

    document.querySelector('#btn-borrar-todo').addEventListener('click', function () {
      const titulo = document.querySelector('#modal-titulo');
      const texto = document.querySelector('#modal-texto');
      titulo.textContent = '¿Borrar todos tus borradores?';
      texto.textContent = 'Se eliminarán los borradores guardados en este dispositivo. Tus entregas ya enviadas no se tocan. ¿Estás seguro?';
      Modal.abrir(function () {
        Storage.borrarTodo();
        Historial.render();
        alertCustom('🗑️ Borradores eliminados.');
      });
    });

    const modalCancelar = document.querySelector('#modal-cancelar');
    const modalConfirmar = document.querySelector('#modal-confirmar-btn');
    if (modalCancelar) modalCancelar.addEventListener('click', function () { Modal.cerrar(); });
    if (modalConfirmar) modalConfirmar.addEventListener('click', function () { Modal.confirmar(); });
  }

  // Muestra/oculta botones del editor según el contexto
  function actualizarVisibilidadEditor() {
    const btnGuardar = document.querySelector('#btn-guardar');
    const btnEntregar = document.querySelector('#btn-entregar');
    const btnNuevo = document.querySelector('#btn-nuevo');
    const btnAyuda = document.querySelector('#btn-ver-ayuda');
    if (!btnGuardar) return;

    const est = Editor.getEstado();
    const correccion = Editor.getModoCorreccion();
    const bloqueado = Editor.esBloqueado();
    const esLocal = est && (!est.firebaseId) && (!est.estado || est.estado === 'borrador');

    btnGuardar.classList.toggle('hidden', correccion || !esLocal);
    btnEntregar.classList.toggle('hidden', correccion || bloqueado || Sesion.esDocente());
    btnNuevo.classList.toggle('hidden', correccion);
    btnAyuda.classList.toggle('hidden', correccion || bloqueado);
  }

  function alertCustom(mensaje) {
    const titulo = document.querySelector('#modal-titulo');
    const texto = document.querySelector('#modal-texto');
    titulo.textContent = 'Aviso';
    texto.textContent = mensaje;
    Modal.abrir(function () {}, true);
  }

  function init() {
    bindLogin();
    bindAcciones();
    Historial.bindEventos();
    Aprender.init();
    Docente.bindEventos();

    const previa = Sesion.get();
    if (previa && previa.nombre) {
      iniciarSesion(previa.nombre, previa.rol);
    } else {
      document.querySelector('#view-login').classList.remove('hidden');
      document.querySelector('#nav-bar').classList.add('hidden');
      document.querySelector('#btn-salir').classList.add('hidden');
    }
  }

  return {
    init,
    practicar,
    abrirComprobante,
    corregirComprobante,
    actualizarVisibilidadEditor
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.init);
} else {
  App.init();
}