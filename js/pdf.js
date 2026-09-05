/**
 * pdf.js
 * Genera un PDF a partir de una carta de comprobante usando html2pdf.js.
 * Puede generar desde el editor actual o desde un comprobante guardado.
 */

const Pdf = (function () {

  function nombreArchivo(comprobante) {
    const tipo = { A: 'FacturaA', B: 'FacturaB', C: 'FacturaC', RECIBO: 'Recibo', CHEQUE: 'Cheque', NOTA: 'NotaDebitoCredito' };
    const base = tipo[comprobante.tipo] || 'Comprobante';
    const num = comprobante.numeroFactura || comprobante.numeroRecibo || comprobante.numeroCheque || '';
    return base + (num ? '_' + num : '') + '.pdf';
  }

  // Genera HTML de la carta a partir de datos guardados
  function renderDesdeDatos(comprobante) {
    const template = document.querySelector('#plantilla-' + comprobante.tipo);
    if (!template) return null;
    const clon = template.content.cloneNode(true);
    const carta = clon.querySelector('.carta');

    // Quitar contenidoeditable para el PDF (que no se pueda editar)
    carta.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute('contenteditable');
    });

    // Aplicar valores
    carta.querySelectorAll('[data-bind]').forEach(el => {
      const t = el.localName;
      if (t === 'select') {
        el.value = comprobante.alicuota || '21';
        return;
      }
      const clave = el.getAttribute('data-bind');
      if (clave.startsWith('item_')) {
        const partes = clave.split('_');
        const campo = partes[1];
        const idx = parseInt(partes[2], 10);
        const it = (comprobante.items && comprobante.items[idx]) || {};
        el.textContent = it[campo] || '';
        return;
      }
      const valor = comprobante[clave];
      if (valor !== undefined && valor !== null) el.textContent = valor;
    });

    // Calcular totales
    const items = (comprobante.items || []).map(it => ({ desc: it.desc || '', cant: it.cant || '', pu: it.pu || '' }));
    const alicuota = comprobante.alicuota || '21';
    const res = Calculos.totalFactura(items, alicuota, comprobante.tipo);

    carta.querySelectorAll('[data-calc="item_sub"]').forEach(el => {
      const fila = el.closest('.fila-item');
      if (!fila) return;
      const idx = parseInt(el.getAttribute('data-fila'), 10);
      const it = items[idx] || {};
      el.textContent = Calculos.formato(Calculos.aDos(Calculos.aNumero(it.cant) * Calculos.aNumero(it.pu)));
    });

    const elSub = carta.querySelector('[data-bind="subtotal"]');
    const elIva = carta.querySelector('[data-bind="iva"]');
    const elTotal = carta.querySelector('[data-bind="total"]');
    if (elSub) elSub.textContent = Calculos.formato(res.subtotal);
    if (comprobante.tipo === 'A') {
      // Factura A: el IVA lo carga el alumno (no se calcula). Total = subtotal + IVA.
      const ivaManual = Calculos.aNumero(elIva ? elIva.textContent : '');
      if (elTotal) elTotal.textContent = Calculos.formato(Calculos.aDos(res.subtotal + ivaManual));
    } else if (comprobante.tipo === 'NOTA') {
      // Nota: Sub-Total → + Impuesto (manual) → Sub-Total → + IVA (manual) → TOTAL.
      const elImpuesto = carta.querySelector('[data-bind="impuesto"]');
      const elSub2 = carta.querySelector('[data-bind="subtotal2"]');
      const sub2 = Calculos.aDos(res.subtotal + Calculos.aNumero(elImpuesto ? elImpuesto.textContent : ''));
      if (elSub2) elSub2.textContent = Calculos.formato(sub2);
      const ivaManual = Calculos.aNumero(elIva ? elIva.textContent : '');
      if (elTotal) elTotal.textContent = Calculos.formato(Calculos.aDos(sub2 + ivaManual));
    } else {
      if (elIva) elIva.textContent = Calculos.formato(res.iva);
      if (elTotal) elTotal.textContent = Calculos.formato(res.total);
    }

    return carta;
  }

  // Genera PDF a partir de datos guardados en el historial
  function generarDesdeDatos(comprobante) {
    if (typeof html2pdf === 'undefined') {
      avisarSinLibreria();
      return;
    }
    const carta = renderDesdeDatos(comprobante);
    if (!carta) return;
    // Hacer el div temporal visible fuera de pantalla
    const contenedorTemp = document.createElement('div');
    contenedorTemp.style.position = 'absolute';
    contenedorTemp.style.left = '-9999px';
    contenedorTemp.style.top = '0';
    contenedorTemp.appendChild(carta);
    document.body.appendChild(contenedorTemp);

    const margen = comprobante.tipo === 'NOTA' ? 0 : 10;
    const opt = {
      margin: margen,
      filename: nombreArchivo(comprobante),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(carta).save().then(function () {
      document.body.removeChild(contenedorTemp);
    });
  }

  // Genera PDF a partir de la carta actual del editor
  function generarDesdeEditor() {
    const carta = window._cartaActual;
    if (!carta) {
      avisarSinLibreria();
      return;
    }
    if (typeof html2pdf === 'undefined') {
      avisarSinLibreria();
      return;
    }

    // Obtener el comprobante para el nombre
    const datos = Editor.obtenerComprobante();
    const nombre = datos ? nombreArchivo(datos) : 'Comprobante.pdf';

    // Clonar la carta para no interferir con el editor
    const clonPadre = carta.parentElement.cloneNode(true);
    const clone = clonPadre.querySelector('.carta');

    // Quitar contenteditable del clon
    if (clone) {
      clone.querySelectorAll('[contenteditable="true"]').forEach(el => el.removeAttribute('contenteditable'));
      // El placeholder no debe imprimirse
      clone.querySelectorAll('.placeholder-vacio').forEach(el => el.classList.remove('placeholder-vacio'));
      clone.querySelectorAll('#alicuota').forEach(s => {
        const span = document.createElement('span');
        span.className = 'val';
        span.textContent = s.value + '%';
        s.parentNode.replaceChild(span, s);
      });
    }

    const contenedorTemp = document.createElement('div');
    contenedorTemp.style.position = 'absolute';
    contenedorTemp.style.left = '-9999px';
    contenedorTemp.appendChild(clone || carta);
    document.body.appendChild(contenedorTemp);

    const margen = datos && datos.tipo === 'NOTA' ? 0 : 10;
    const opt = {
      margin: margen,
      filename: nombre,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(clone || carta).save().then(function () {
      document.body.removeChild(contenedorTemp);
    });
  }

  // Si la librería no está cargada, avisamos
  function avisarSinLibreria() {
    if (typeof html2pdf === 'undefined' && window.Modal) {
      const titulo = document.querySelector('#modal-titulo');
      const texto = document.querySelector('#modal-texto');
      if (titulo) titulo.textContent = 'Sin conexión';
      if (texto) texto.textContent = 'No se pudo cargar la librería de PDF. Revisá tu conexión a internet e intentá de nuevo.';
      window.Modal.abrir(function () {}, true);
    }
  }

  return {
    generarDesdeEditor,
    generarDesdeDatos
  };
})();
