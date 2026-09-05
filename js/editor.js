// editor.js
// Renderiza la carta del comprobante, sincroniza campos, recálculos
// automáticos y maneja: modo editable (borrador/devuelto), modo bloqueado
// (entregado/corregido) y modo corrección (docente marcando errores).

const Editor = (function () {
  let estado = null;
  let tipoActual = 'A';
  let modoCorreccion = false;
  let _tooltip = null;
  let limpiarUno = null;

  const LABELS = {
    razonSocialEmisor: 'Razón social del emisor', cuitEmisor: 'CUIT del emisor',
    condicionEmisor: 'Condición frente al IVA del emisor', domicilioEmisor: 'Domicilio del emisor',
    puntoVenta: 'Punto de venta', numeroFactura: 'N° de factura',
    fechaEmision: 'Fecha de emisión', cuitEmisor2: 'CUIT del emisor',
    ingresosBrutos: 'Ingresos brutos', inicioActividades: 'Inicio de actividades',
    razonSocialCliente: 'Razón social del cliente', cuitCliente: 'CUIT/DNI del cliente',
    condicionCliente: 'Condición frente al IVA del cliente', domicilioCliente: 'Domicilio del cliente',
    localidadCliente: 'Localidad del cliente',
    numeroRecibo: 'N° de recibo', recibiDe: 'Recibí de', concepto: 'En concepto de',
    formaPago: 'Mediante', dni: 'DNI',
    banco: 'Banco', numeroCheque: 'N° de cheque', localidad: 'Localidad', diaEmision: 'Día de emisión',
    mesEmision: 'Mes de emisión', anioEmision: 'Año de emisión',
    beneficiario: 'Beneficiario', aclaracion: 'Aclaración',
    diaPago: 'Día de pago', mesPago: 'Mes de pago', anioPago: 'Año de pago',
    montoNumeros: 'Monto en números', montoLetras: 'Monto en letras', impuesto: 'Impuesto', condicionVenta: 'Condiciones de venta', remitoNumero: 'Remito N°', subtotal2: 'Sub-Total',
    subtotal: 'Subtotal', iva: 'IVA', total: 'Total'
  };

  function estadoVacio(tipo) {
    return {
      id: null,
      firebaseId: null,
      tipo: tipo,
      alumno: '',
      estado: 'borrador',
      fechaCreacion: null,
      fechaEdicion: null,
      entrega: null,
      correccion: null,
      razonSocialEmisor: '', cuitEmisor: '', condicionEmisor: '', domicilioEmisor: '',
      puntoVenta: '', numeroFactura: '', fechaEmision: '', cuitEmisor2: '',
      ingresosBrutos: '', inicioActividades: '',
      razonSocialCliente: '', cuitCliente: '', condicionCliente: '', domicilioCliente: '', localidadCliente: '',
      items: [
        { desc: '', cant: '', pu: '' },
        { desc: '', cant: '', pu: '' },
        { desc: '', cant: '', pu: '' }
      ],
      alicuota: '21',
      numeroRecibo: '', recibiDe: '', concepto: '', formaPago: '', dni: '',
      banco: '', numeroCheque: '', localidad: '', diaEmision: '', mesEmision: '', anioEmision: '',
      beneficiario: '', aclaracion: '', diaPago: '', mesPago: '', anioPago: '',
      montoNumeros: '', montoLetras: '', impuesto: '', subtotal2: '', condicionVenta: '', remitoNumero: '',
    };
  }

  function getEstado() { return estado; }
  function setEstado(nuevo) {
    estado = nuevo;
    tipoActual = nuevo.tipo;
    pintar();
  }
  function getTipoActual() { return tipoActual; }
  function getModoCorreccion() { return modoCorreccion; }

  // Comprobante bloqueado = no se puede editar (entregado/corregido o en corrección docente).
  function esBloqueado() {
    if (modoCorreccion) return true;
    const s = estado ? (estado.estado || 'borrador') : 'borrador';
    return s === 'entregado' || s === 'corregido';
  }

  function abrir(comprobante) {
    modoCorreccion = false;
    estado = comprobante || estadoVacio(tipoActual || 'A');
    tipoActual = estado.tipo;
    detenerEscucha();
    pintar();
  }

  // Abre un comprobante para que la docente lo corrija.
  function abrirParaCorregir(comprobante) {
    modoCorreccion = true;
    estado = comprobante;
    tipoActual = comprobante.tipo;
    detenerEscucha();
    pintar();
  }

  function cargarTipo(tipo) {
    modoCorreccion = false;
    tipoActual = tipo;
    estado = estadoVacio(tipo);
    detenerEscucha();
    pintar();
  }

  function getTemplate(tipo) {
    return document.querySelector('#plantilla-' + tipo);
  }

  function pintar() {
    const contenedor = document.querySelector('#editor-contenedor');
    const titulo = document.querySelector('#editor-titulo');
    if (!contenedor || !estado) return;

    tipoActual = estado.tipo;
    const template = getTemplate(estado.tipo);
    if (!template) return;

    contenedor.innerHTML = '';
    const clon = template.content.cloneNode(true);
    const carta = clon.querySelector('.carta');

    titulo.textContent = tituloComprobante();
    window._cartaActual = carta;

    aplicarValores(clon, estado);
    sincronizarItemsDesdeEstado(clon, estado);
    sincronizarChecks(clon, estado);

    const alicuotaSel = clon.querySelector('#alicuota');
    if (alicuotaSel) alicuotaSel.value = estado.alicuota || '21';

    // Bloqueo: quitar edición y deshabilitar alícuota
    const bloqueado = esBloqueado();
    if (bloqueado) {
      carta.classList.add('carta-bloqueada');
      carta.querySelectorAll('[contenteditable="true"]').forEach(el => el.removeAttribute('contenteditable'));
      carta.querySelectorAll('.check-iva, .check-venta').forEach(el => { el.disabled = true; });
      if (alicuotaSel) alicuotaSel.disabled = true;
    }
    if (modoCorreccion) {
      carta.classList.add('carta-correccion');
    }

    recalcular(carta);

    // Marcar errores ya corregidos
    if (estado.correccion && estado.correccion.errores) {
      aplicarMarcaErrores(carta, estado.correccion.errores);
    }

    contenedor.appendChild(clon);
    bindearCarta(carta);

    pintarPaneles();
  }

  function tituloComprobante() {
    const nombreTipo = { A: 'Factura A', B: 'Factura B', C: 'Factura C', RECIBO: 'Recibo', CHEQUE: 'Cheque común', CHEQUE_DIF: 'Cheque de pago diferido', NOTA: 'Nota de débito/crédito' };
    const base = nombreTipo[estado.tipo] || 'Comprobante';
    if (modoCorreccion) return 'Corregir ' + base + ' · ' + (estado.alumno || '');
    if (estado.estado === 'borrador') return 'Nuevo ' + base;
    if (estado.estado === 'entregado') return base + ' · Entregado';
    if (estado.estado === 'devuelto') return base + ' · Devuelto para corregir';
    if (estado.estado === 'corregido') return base + ' · Corregido';
    return base;
  }

  function aplicarValores(clon, estado) {
    clon.querySelectorAll('[data-bind]').forEach(el => {
      const clave = el.getAttribute('data-bind');
      if (clave.startsWith('item_')) return;
      const valor = estado[clave];
      if (valor !== undefined && valor !== null) el.textContent = valor;
    });
  }

  function sincronizarItemsDesdeEstado(clon, estado) {
    const items = estado.items || [];
    clon.querySelectorAll('.fila-item').forEach((fila, i) => {
      const it = items[i] || { desc: '', cant: '', pu: '' };
      const desc = fila.querySelector('[data-bind="item_desc_' + i + '"]');
      const cant = fila.querySelector('[data-bind="item_cant_' + i + '"]');
      const pu = fila.querySelector('[data-bind="item_pu_' + i + '"]');
      if (desc) desc.textContent = it.desc || '';
      if (cant) cant.textContent = it.cant !== '' && it.cant !== undefined && it.cant !== null ? it.cant : '';
      if (pu) pu.textContent = it.pu !== '' && it.pu !== undefined && it.pu !== null ? it.pu : '';
    });
  }

  function sincronizarChecks(clon, estado) {
    var grupos = [['.check-iva', 'condicionCliente'], ['.check-venta', 'condicionVenta']];
    grupos.forEach(function (g) {
      const valor = (estado && estado[g[1]]) || '';
      clon.querySelectorAll(g[0]).forEach(function (chk) {
        chk.checked = chk.value === valor;
      });
    });
  }

  function recopilarEstadoDesdeCarta() {
    const carta = window._cartaActual;
    if (!carta || !estado) return estado;

    const nuevo = JSON.parse(JSON.stringify(estado));

    carta.querySelectorAll('[data-bind]').forEach(el => {
      const clave = el.getAttribute('data-bind');
      if (clave.startsWith('item_')) {
        const partes = clave.split('_');
        const campo = partes[1];
        const idx = parseInt(partes[2], 10);
        if (nuevo.items[idx]) nuevo.items[idx][campo] = el.textContent.trim();
        return;
      }
      nuevo[clave] = el.textContent.trim();
    });

    const alicuotaSel = carta.querySelector('#alicuota');
    if (alicuotaSel) nuevo.alicuota = alicuotaSel.value;

    return nuevo;
  }

  function recalcular(carta) {
    if (!carta) return;
    const tipo = estado ? estado.tipo : tipoActual;

    const items = [];
    carta.querySelectorAll('.fila-item').forEach(fila => {
      const desc = fila.querySelector('[data-bind^="item_desc_"]');
      const cant = fila.querySelector('[data-bind^="item_cant_"]');
      const pu = fila.querySelector('[data-bind^="item_pu_"]');
      items.push({
        desc: desc ? desc.textContent.trim() : '',
        cant: cant ? cant.textContent.trim() : '',
        pu: pu ? pu.textContent.trim() : ''
      });
    });

    const alicuota = (carta.querySelector('#alicuota') || { value: '21' }).value;

    carta.querySelectorAll('[data-calc="item_sub"]').forEach(el => {
      const fila = el.closest('.fila-item');
      if (!fila) return;
      const cant = fila.querySelector('[data-bind^="item_cant_"]');
      const pu = fila.querySelector('[data-bind^="item_pu_"]');
      el.textContent = Calculos.formato(Calculos.aDos(Calculos.aNumero(cant ? cant.textContent : '') * Calculos.aNumero(pu ? pu.textContent : '')));
    });

    const res = Calculos.totalFactura(items, alicuota, tipo);

    const elSubtotal = carta.querySelector('[data-bind="subtotal"]');
    const elIva = carta.querySelector('[data-bind="iva"]');
    const elTotal = carta.querySelector('[data-bind="total"]');

    // Subtotal y subtotales de items se calculan automáticamente (cant × pu).
    const subtotal = res.subtotal;
    if (elSubtotal) elSubtotal.textContent = Calculos.formato(subtotal);

    if (tipo === 'A') {
      // Factura A: el IVA lo escribe el alumno (no se calcula solo).
      // El total = subtotal + IVA ingresado.
      if (elTotal) {
        const ivaEscrito = Calculos.aNumero(elIva ? elIva.textContent : '');
        elTotal.textContent = Calculos.formato(Calculos.aDos(subtotal + ivaEscrito));
      }
    } else if (tipo === 'NOTA') {
      // Nota de débito/crédito: Sub-Total → + Impuesto (manual) → Sub-Total → + IVA (manual) → TOTAL.
      const elImpuesto = carta.querySelector('[data-bind="impuesto"]');
      const elSub2 = carta.querySelector('[data-bind="subtotal2"]');
      const sub2 = Calculos.aDos(subtotal + Calculos.aNumero(elImpuesto ? elImpuesto.textContent : ''));
      if (elSub2) elSub2.textContent = Calculos.formato(sub2);
      if (elTotal) {
        const ivaEscrito = Calculos.aNumero(elIva ? elIva.textContent : '');
        elTotal.textContent = Calculos.formato(Calculos.aDos(sub2 + ivaEscrito));
      }
    } else {
      // B y C: sin IVA discriminado, total = subtotal.
      if (elIva && !elIva.isContentEditable) elIva.textContent = Calculos.formato(res.iva);
      if (elTotal) elTotal.textContent = Calculos.formato(res.total);
    }
  }

  // Vincula eventos según el modo de la carta.
  function bindearCarta(carta) {
    if (!carta) return;

    if (modoCorreccion) {
      bindearCorreccion(carta);
      return;
    }

    if (esBloqueado()) {
      return; // solo lectura
    }

    // Modo editable
    const tooltip = obtenerTooltip();
    carta.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.addEventListener('blur', function () {
        ocultarTooltip(tooltip);
        recalcular(carta);
        // Si quedó vacío, volvemos a mostrar el placeholder.
        if (el.hasAttribute('data-placeholder') && !el.textContent.trim()) {
          el.classList.add('placeholder-vacio');
        }
        persistirEstadoActual();
      });
      el.addEventListener('input', function () {
        recalcular(carta);
        if (el.hasAttribute('data-placeholder')) {
          el.classList.toggle('placeholder-vacio', !el.textContent.trim());
        }
      });
      el.addEventListener('focus', function () {
        // Al seleccionar el campo, se borra el placeholder y se puede escribir.
        el.classList.remove('placeholder-vacio');
        const ayuda = el.getAttribute('data-ayuda');
        if (ayuda) {
          const rect = el.getBoundingClientRect();
          tooltip.textContent = ayuda;
          tooltip.style.left = (rect.left + 10) + 'px';
          tooltip.style.top = (rect.bottom + 6) + 'px';
          tooltip.classList.remove('hidden');
        } else {
          ocultarTooltip(tooltip);
        }
      });
      el.addEventListener('click', function (e) { e.stopPropagation(); });
      if (el.hasAttribute('data-placeholder') && !el.textContent.trim()) {
        el.classList.add('placeholder-vacio');
      }
    });

    const alicuotaSel = carta.querySelector('#alicuota');
    if (alicuotaSel) {
      alicuotaSel.addEventListener('change', function () {
        recalcular(carta);
        persistirEstadoActual();
      });
    }

    [
      ['.check-iva', 'condicionCliente'],
      ['.check-venta', 'condicionVenta']
    ].forEach(function (grupo) {
      const grupoSel = grupo[0];
      const bind = grupo[1];
      carta.querySelectorAll(grupoSel).forEach(chk => {
        chk.addEventListener('change', function () {
          const valEl = carta.querySelector('[data-bind="' + bind + '"]');
          if (chk.checked) {
            carta.querySelectorAll(grupoSel).forEach(c => { if (c !== chk) c.checked = false; });
            if (valEl) valEl.textContent = chk.value;
          } else if (valEl && valEl.textContent === chk.value) {
            valEl.textContent = '';
          }
          recalcular(carta);
          persistirEstadoActual();
        });
      });
    });

    carta.addEventListener('click', function () { ocultarTooltip(tooltip); });
  }

  // En modo corrección: tocar una casilla la marca como error (con comentario opcional).
  function bindearCorreccion(carta) {
    carta.querySelectorAll('.val[data-bind]').forEach(el => {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        el.classList.toggle('marco-error');
        if (el.classList.contains('marco-error')) {
          const actual = el.getAttribute('data-comentario-error') || '';
          const c = prompt('Comentario para la casilla (opcional):', actual);
          if (c !== null) el.setAttribute('data-comentario-error', c);
        } else {
          el.setAttribute('data-comentario-error', '');
        }
      });
    });
  }

  // Aplica las casillas marcadas con error sobre la carta.
  function aplicarMarcaErrores(carta, errores) {
    Object.keys(errores || {}).forEach(clave => {
      // para items, la clave guardada es item_campo_idx
      let sel = '[data-bind="' + clave + '"]';
      const el = carta.querySelector(sel);
      if (el) {
        el.classList.add('marco-error');
        if (errores[clave]) el.setAttribute('data-comentario-error', errores[clave]);
      }
    });
  }

  // Colecta los errores marcados como { clave: comentario }.
  function obtenerErroresMarcados() {
    const carta = window._cartaActual;
    const errores = {};
    if (!carta) return errores;
    carta.querySelectorAll('.val.marco-error[data-bind]').forEach(el => {
      const clave = el.getAttribute('data-bind');
      let comentario = el.getAttribute('data-comentario-error') || '';
      if (comentario === 'null') comentario = '';
      if (comentario) errores[clave] = comentario;
      else errores[clave] = true;
    });
    return errores;
  }

  function obtenerTooltip() {
    if (_tooltip) return _tooltip;
    _tooltip = document.createElement('div');
    _tooltip.className = 'ayuda-tooltip hidden';
    document.body.appendChild(_tooltip);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.carta')) _tooltip.classList.add('hidden');
    });
    return _tooltip;
  }

  function ocultarTooltip(tooltip) {
    tooltip.classList.add('hidden');
  }

  function verAyuda() {
    const carta = window._cartaActual;
    if (carta && !esBloqueado()) {
      carta.classList.toggle('modo-ayuda');
      marcarVacios(carta);
    }
  }

  function marcarVacios(carta) {
    if (carta.classList.contains('modo-ayuda')) {
      carta.querySelectorAll('[data-bind]').forEach(el => {
        el.classList.toggle('vacio', !el.textContent.trim());
      });
    } else {
      carta.querySelectorAll('[data-bind]').forEach(el => el.classList.remove('vacio'));
    }
  }

  function obtenerComprobante() {
    const datos = recopilarEstadoDesdeCarta();
    if (!datos) return null;
    datos.fechaEdicion = new Date().toISOString();
    return datos;
  }

  // Guarda el borrador local (solo comprobantes nuevos, no entregados).
  function persistirEstadoActual() {
    const datos = recopilarEstadoDesdeCarta();
    if (datos && !datos.id && !datos.firebaseId && datos.estado === 'borrador') {
      datos.fechaEdicion = new Date().toISOString();
      Storage.setEditorState(datos);
    }
  }

  // Escucha en vivo un comprobante entregado (para ver la corrección apenas salga).
  function iniciarEscucha() {
    detenerEscucha();
    if (!estado || !estado.firebaseId || modoCorreccion) return;
    limpiarUno = Repo.listenUno(estado.firebaseId, function (d) {
      if (!d) return;
      if (!estado || estado.estado === 'devuelto') return; // no pisar edición
      estado = d;
      pintar();
    });
  }

  function detenerEscucha() {
    if (limpiarUno) { limpiarUno(); limpiarUno = null; }
  }

  // Reinicia el modo corrección (se sale del modo docente).
  function finCorreccion() {
    modoCorreccion = false;
  }

  // Pinta el panel de corrección (docente) o el resumen (alumno).
  function pintarPaneles() {
    const panel = document.querySelector('#panel-correccion');
    const resumen = document.querySelector('#resumen-correccion');
    const banner = document.querySelector('#banner-devuelto');
    if (!panel || !resumen) return;

    if (modoCorreccion) {
      panel.classList.remove('hidden');
      resumen.classList.add('hidden');
      if (banner) banner.classList.add('hidden');
      if (typeof Docente !== 'undefined') Docente.pintarPanel(estado);
      return;
    }

    panel.classList.add('hidden');

    if (estado.estado === 'corregido' || estado.estado === 'devuelto') {
      resumen.innerHTML = htmlResumen(estado);
      resumen.classList.remove('hidden');
      if (banner) banner.classList.toggle('hidden', estado.estado !== 'devuelto');
    } else {
      resumen.innerHTML = '';
      resumen.classList.add('hidden');
      if (banner) banner.classList.add('hidden');
    }
  }

  function etiqueta(clave) {
    if (LABELS[clave]) return LABELS[clave];
    if (clave.indexOf('item_') === 0) {
      const partes = clave.split('_');
      const idx = parseInt(partes[2], 10) + 1;
      if (partes[1] === 'desc') return 'Producto ' + idx + ' (descripción)';
      if (partes[1] === 'cant') return 'Producto ' + idx + ' (cantidad)';
      if (partes[1] === 'pu') return 'Producto ' + idx + ' (precio)';
      if (partes[1] === 'sub') return 'Producto ' + idx + ' (subtotal)';
    }
    return clave;
  }

  function htmlResumen(comp) {
    const corr = comp.correccion || {};
    let html = '<div class="resumen-int"><h3>' + (estadoAprobado(corr.aprobado)) + '</h3>';
    if (corr.nota) html += '<div class="resumen-nota"><strong>Nota:</strong> ' + corr.nota + '</div>';
    if (corr.comentario) html += '<div class="resumen-nota"><strong>Comentario:</strong> ' + corr.comentario + '</div>';
    const errores = corr.errores || {};
    const erroresOn = Object.keys(errores).length;
    if (erroresOn > 0) {
      html += '<div class="resumen-errors"><strong>Casillas marcadas: ' + erroresOn + '</strong><ul>';
      Object.keys(errores).forEach(clave => {
        const comentario = errores[clave] === true || !errores[clave] ? '' : errores[clave];
        html += '<li>' + etiqueta(clave) + (comentario ? ': ' + comentario : '') + '</li>';
      });
      html += '</ul></div>';
    }
    if (comp.estado === 'devuelto') {
      html += '<div class="resumen-devu"><strong>🔁 Devolviste:</strong> corregí lo marcado y volvé a entregar.</div>';
    }
    html += '</div>';
    return html;
  }

  function estadoAprobado(aprobado) {
    if (aprobado === 'aprobado') return '✅ Aprobado';
    if (aprobado === 'desaprobado') return '❌ Desaprobado';
    if (aprobado === 'enproceso') return '🔄 En proceso';
    return '✏️ Corrección de la profesora';
  }

  return {
    cargarTipo, abrir, abrirParaCorregir, pintar,
    getTipoActual, getEstado, getModoCorreccion, esBloqueado,
    setEstado, obtenerComprobante, recopilarEstadoDesdeCarta,
    verAyuda, persistirEstadoActual, obtenerErroresMarcados,
    iniciarEscucha, detenerEscucha, finCorreccion, etiqueta
  };
})();