/**
 * historial.js
 * Muestra los comprobantes según el rol:
 * - Alumno: borradores locales + sus entregas (en vivo desde Firebase).
 * - Docente: todas las entregas, con botón para corregir.
 * Permite filtrar, abrir, ver PDF y borrar borradores.
 */

const Historial = (function () {

  const NOMBRES = { A: 'Factura A', B: 'Factura B', C: 'Factura C', RECIBO: 'Recibo', CHEQUE: 'Cheque común', CHEQUE_DIF: 'Cheque de pago diferido', NOTA: 'Nota de débito/crédito' };
  const ESTADO = {
    borrador: 'Borrador',
    entregado: 'Entregado',
    devuelto: 'Devuelto',
    corregido: 'Corregido'
  };

  let entregas = []; // llegan por escucha en vivo (ver entrada/vista docente)

  function setEntregas(lista) {
    entregas = lista || [];
  }

  function vaciar() {
    entregas = [];
  }

  function esDocente() {
    return Sesion.esDocente();
  }

  // Para el alumno: borradores locales + entregas suyas. Para docente: solo entregas.
  function origenDatos() {
    if (esDocente()) {
      return entregas.slice();
    }
    const borradores = Storage.getHistorial();
    return borradores.concat(entregas);
  }

  function render() {
    const contenedor = document.querySelector('#lista-historial');
    if (!contenedor) return;

    const estadoFiltro = {
      tipo: (document.querySelector('#filtro-tipo') || {}).value || '',
      texto: ((document.querySelector('#filtro-texto') || {}).value || '').trim().toLowerCase()
    };

    let lista = origenDatos();

    lista = lista.sort(function (a, b) {
      const fa = a.fechaEdicion || a.entrega && a.entrega.fecha || a.fechaCreacion || '';
      const fb = b.fechaEdicion || b.entrega && b.entrega.fecha || b.fechaCreacion || '';
      return fb < fa ? -1 : fb > fa ? 1 : 0;
    });

    if (estadoFiltro.tipo) {
      lista = lista.filter(c => c.tipo === estadoFiltro.tipo);
    }
    if (estadoFiltro.texto) {
      lista = lista.filter(c => {
        const buscaEn = [
          c.razonSocialCliente, c.razonSocialEmisor,
          c.numeroFactura, c.numeroRecibo, c.numeroCheque,
          c.concepto, c.beneficiario, c.montoNumeros, c.fechaEmision
        ].join(' ').toLowerCase();
        return buscaEn.includes(estadoFiltro.texto);
      });
    }

    if (lista.length === 0) {
      const vacio = document.createElement('div');
      vacio.className = 'vacio-historial';
      vacio.textContent = esDocente()
        ? 'Todavía no hay entregas de alumnos.'
        : 'Todavía no tenés comprobantes.';
      contenedor.innerHTML = '';
      contenedor.appendChild(vacio);
      return;
    }

    contenedor.innerHTML = '';
    lista.forEach(function (c) {
      contenedor.appendChild(crearItem(c));
    });
  }

  function crearItem(c) {
    const item = document.createElement('div');
    item.className = 'item-historial ' + (c.estado || 'borrador');

    const info = document.createElement('div');
    info.className = 'item-info';

    const tipo = document.createElement('div');
    tipo.className = 'item-tipo';
    tipo.textContent = NOMBRES[c.tipo] || c.tipo;

    if (c.estado && c.estado !== 'borrador') {
      const badge = document.createElement('span');
      badge.className = 'badge-estado ' + badgeClass(c);
      badge.textContent = badgeTexto(c);
      tipo.appendChild(badge);
      if (c.estado === 'corregido' && c.correccion && c.correccion.nota) {
        const nota = document.createElement('span');
        nota.className = 'badge-nota';
        nota.textContent = 'Nota: ' + c.correccion.nota;
        tipo.appendChild(nota);
      }
    }

    const fecha = document.createElement('div');
    fecha.className = 'item-fecha';
    fecha.textContent = formatearFecha(c.fechaEdicion || (c.entrega && c.entrega.fecha) || c.fechaCreacion);

    const resumen = document.createElement('div');
    resumen.className = 'item-resumen';
    resumen.textContent = resumir(c);

    info.appendChild(tipo);
    info.appendChild(fecha);
    info.appendChild(resumen);

    const acciones = document.createElement('div');
    acciones.className = 'item-acciones';

    if (esDocente()) {
      // Docente: corregir entregas pendientes, ver las corregidas
      const pendiente = c.estado === 'entregado' || c.estado === 'devuelto';
      const btnCorregir = document.createElement('button');
      btnCorregir.className = 'btn-corregir';
      btnCorregir.textContent = pendiente ? '✏️ Corregir' : '👁 Ver';
      btnCorregir.addEventListener('click', function () {
        App.corregirComprobante(c);
      });
      acciones.appendChild(btnCorregir);
    } else {
      // Alumno: ver/editar según el estado
      const btnVer = document.createElement('button');
      btnVer.textContent = c.estado && c.estado !== 'borrador' ? '👁 Ver' : '👁 Editar';
      btnVer.addEventListener('click', function () {
        App.abrirComprobante(c);
      });
      acciones.appendChild(btnVer);
    }

    const btnPdf = document.createElement('button');
    btnPdf.className = 'btn-pdf';
    btnPdf.textContent = '📄 PDF';
    btnPdf.addEventListener('click', function () {
      Pdf.generarDesdeDatos(c);
    });
    acciones.appendChild(btnPdf);

    // Borrar solo borradores locales (alumno)
    if (!esDocente() && (!c.estado || c.estado === 'borrador')) {
      const btnBorrar = document.createElement('button');
      btnBorrar.className = 'btn-borrar';
      btnBorrar.textContent = '🗑️';
      btnBorrar.addEventListener('click', function () {
        confirmarBorrado(c);
      });
      acciones.appendChild(btnBorrar);
    }

    item.appendChild(info);
    item.appendChild(acciones);

    return item;
  }

  function badgeClass(c) {
    if (c.estado === 'corregido' && c.correccion) {
      if (c.correccion.aprobado === 'aprobado') return 'badge-aprobado';
      if (c.correccion.aprobado === 'desaprobado') return 'badge-desaprobado';
    }
    return 'badge-' + c.estado;
  }

  function badgeTexto(c) {
    if (c.estado === 'corregido' && c.correccion) {
      if (c.correccion.aprobado === 'aprobado') return '✅ Aprobado';
      if (c.correccion.aprobado === 'desaprobado') return '❌ Desaprobado';
      if (c.correccion.aprobado === 'enproceso') return '🔄 En proceso';
    }
    return ESTADO[c.estado] || c.estado;
  }

  function resumir(c) {
    const partes = [];
    const num = c.numeroFactura || c.numeroRecibo || c.numeroCheque;
    if (num) partes.push('N° ' + num);
    if (esDocente() && c.alumno) partes.push('👤 ' + c.alumno);
    const cliente = c.razonSocialCliente || c.beneficiario || c.recibiDe;
    if (cliente) partes.push(cliente);
    const total = c.montoNumeros || c.total;
    if (total) partes.push('$ ' + total);
    return partes.join(' · ');
  }

  function formatearFecha(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function confirmarBorrado(c) {
    const titulo = document.querySelector('#modal-titulo');
    const texto = document.querySelector('#modal-texto');
    titulo.textContent = '¿Eliminar este borrador?';
    texto.textContent = 'Esta acción no se puede deshacer.';

    Modal.abrir(function () {
      Storage.eliminar(c.id);
      render();
    });
  }

  function bindEventos() {
    const filtroTipo = document.querySelector('#filtro-tipo');
    const filtroTexto = document.querySelector('#filtro-texto');
    if (filtroTipo) filtroTipo.addEventListener('change', render);
    if (filtroTexto) filtroTexto.addEventListener('input', render);
  }

  return {
    render,
    bindEventos,
    setEntregas,
    vaciar
  };
})();