/**
 * aprender.js
 * Sección educativa: explica cada comprobante con información didáctica,
 * un diagrama de sus partes y sus cálculos. Incluye tabla comparativa.
 */

const Aprender = (function () {

  // Contenido didáctico por comprobante
  const CONTENIDO = {
    A: {
      nombre: 'Factura A',
      queEs: 'La Factura A es un comprobante que emite un Responsable Inscripto en IVA cuando le vende a otra empresa o a un profesional también inscripto. Se caracteriza porque el IVA se muestra por separado (discriminado).',
      paraQue: ['Se usa en ventas B2B (empresa a empresa).', 'El comprador puede computar el IVA como crédito fiscal.', 'Exige que tanto emisor como receptor sean responsables inscriptos.'],
      partes: [
        { campo: 'Datos del emisor', detalle: 'Razón social, CUIT, condición frente al IVA y domicilio de quien emite la factura.' },
        { campo: 'Letra "A" y "FACTURA"', detalle: 'El rótulo distingue el tipo de comprobante.' },
        { campo: 'Punto de venta y número', detalle: 'El punto de venta (4 dígitos) y el número consecutivo de comprobante (8 dígitos).' },
        { campo: 'Fecha de emisión', detalle: 'Día, mes y año en que se emite la factura.' },
        { campo: 'Datos del cliente', detalle: 'Razón social, CUIT, condición IVA y domicilio del comprador.' },
        { campo: 'Detalle de ítems', detalle: 'Descripción, cantidad, precio unitario (sin IVA) y subtotal de cada producto o servicio.' },
        { campo: 'Subtotal', detalle: 'Suma de todos los subtotales sin IVA.' },
        { campo: 'IVA', detalle: 'Importe del impuesto, calculado aplicando la alícuota (21%, 10.5% o 27%) sobre el subtotal.' },
        { campo: 'Total', detalle: 'Subtotal + IVA. Es el importe final a pagar.' }
      ],
      calculos: 'En la Factura A el IVA va discriminado. Para calcularlo: IVA = Subtotal × alícuota. Luego Total = Subtotal + IVA. Ejemplo: si el subtotal es $1000 y la alícuota es 21%, el IVA será $210 y el total $1210.'
    },
    B: {
      nombre: 'Factura B',
      queEs: 'La Factura B es la que emite un Responsable Inscripto cuando vende a consumidores finales, monotributistas u otros que no son responsables inscriptos. El IVA va incluido en el precio total.',
      paraQue: ['Se usa en ventas al público o a consumidores finales.', 'El precio ya incluye el IVA (no se muestra por separado).', 'El comprador no puede computar IVA como crédito fiscal.'],
      partes: [
        { campo: 'Datos del emisor', detalle: 'Razón social, CUIT, condición frente al IVA y domicilio.' },
        { campo: 'Letra "B" y "FACTURA"', detalle: 'El rótulo identifica que es una factura tipo B.' },
        { campo: 'Punto de venta y número', detalle: 'Numeración correspondiente al punto de venta.' },
        { campo: 'Fecha de emisión', detalle: 'Día, mes y año de emisión.' },
        { campo: 'Datos del cliente', detalle: 'Suele ser "Consumidor Final". Se anota CUIT o DNI cuando corresponde.' },
        { campo: 'Detalle de ítems', detalle: 'Descripción, cantidad y precio unitario (que ya incluye IVA).' },
        { campo: 'Total', detalle: 'El total ya tiene el IVA incluido en el precio.' }
      ],
      calculos: 'En la Factura B el precio del ítem incluye el IVA. Por eso el Total es simplemente la suma de las cantidades por sus precios unitarios (ya con IVA). No se discrimina el impuesto en el comprobante.'
    },
    C: {
      nombre: 'Factura C',
      queEs: 'La Factura C es emitida por los monotributistas. No tiene IVA discriminado porque el monotributo es un régimen simplificado que reemplaza al impuesto a las ganancias y al IVA.',
      paraQue: ['La emiten monotributistas.', 'No se discrimina el IVA.', 'Se emite por bienes o servicios que venden los monotributistas.'],
      partes: [
        { campo: 'Datos del emisor', detalle: 'Razón social, CUIT y domicilio del monotributista.' },
        { campo: 'Letra "C" y "FACTURA"', detalle: 'Rótulo que identifica el tipo de comprobante.' },
        { campo: 'Punto de venta y número', detalle: 'Numeración del comprobante.' },
        { campo: 'Fecha de emisión', detalle: 'Día, mes y año de emisión.' },
        { campo: 'Datos del cliente', detalle: 'Nombre, CUIT/DNI y domicilio del comprador.' },
        { campo: 'Detalle de ítems', detalle: 'Descripción y monto de cada producto o servicio.' },
        { campo: 'Total', detalle: 'Suma de los montos sin discriminación de IVA.' }
      ],
      calculos: 'En la Factura C no se calcula IVA. El Total es simplemente la suma de todos los importes de los ítems. Es más simple que la A y la B.'
    },
    RECIBO: {
      nombre: 'Recibo',
      queEs: 'El recibo es un comprobante mediante el cual una persona o empresa deja constancia de que recibió un pago. Es la prueba de que se cobró un dinero.',
      paraQue: ['Sirve para dejar constancia de que se recibió un pago.', 'Se usa para cuotas, mensualidades, honorarios, etc.', 'Protege tanto a quien paga como a quien cobra.'],
      partes: [
        { campo: 'Datos del emisor', detalle: 'Nombre de quien recibe el pago (ej: el colegio) y su CUIT.' },
        { campo: 'Número de recibo', detalle: 'Permite identificar cada recibo y llevar el control.' },
        { campo: 'Fecha', detalle: 'Día en que se recibió el pago.' },
        { campo: 'Recibí de', detalle: 'Nombre de la persona que entregó el dinero.' },
        { campo: 'Suma de...', detalle: 'El importe en letras, para evitar errores o adulteraciones.' },
        { campo: 'Monto en números', detalle: 'El importe con números y dos decimales.' },
        { campo: 'En concepto de', detalle: 'El motivo del pago: mensualidad, matrícula, cuota, etc.' },
        { campo: 'Mediante', detalle: 'La forma de pago: efectivo, cheque, transferencia, etc.' },
        { campo: 'Firma y aclaración', detalle: 'Firma de quien recibió el dinero y su DNI.' }
      ],
      calculos: 'El monto en letras se genera automáticamente a partir del número que escribas. Por ejemplo, si escribís 1500.50, aparecerá "mil quinientos con 50/100".'
    },
    CHEQUE: {
      nombre: 'Cheque',
      queEs: 'El cheque es un instrumento de pago mediante el cual el emisor ordena a su banco que pague una suma de dinero a una persona determinada (el beneficiario).',
      paraQue: ['Es una orden de pago al banco.', 'Es un medio de pago muy usado en el comercio.', 'Tiene un beneficiario al que se le paga.'],
      partes: [
        { campo: 'Banco', detalle: 'Nombre del banco que emite el cheque.' },
        { campo: 'CHEQUE', detalle: 'Rótulo que identifica el documento.' },
        { campo: 'Número', detalle: 'Número del cheque para su control.' },
        { campo: 'Localidad y fecha', detalle: 'Lugar donde se emite y la fecha de emisión.' },
        { campo: 'Páguese por este cheque a', detalle: 'Nombre del beneficiario (a quién se le paga).' },
        { campo: 'La cantidad de pesos', detalle: 'El monto en números y en letras para evitar alteraciones.' },
        { campo: 'Monto en números', detalle: 'El importe en números.' },
        { campo: 'Firma y aclaración', detalle: 'Firma del titular de la cuenta y su aclaración.' }
      ],
      calculos: 'Igual que el recibo, el monto en letras se completa automáticamente con el número que escribas.'
    },
    CHEQUE_DIF: {
      nombre: 'Cheque de pago diferido',
      queEs: 'El cheque de pago diferido es igual al cheque común, pero se cobra en una fecha futura. La fecha de pago NO puede superar los 360 días desde su emisión.',
      paraQue: ['Permite diferir el pago: se entrega hoy pero se cobra después.', 'Le da al emisor tiempo para juntar el dinero.', 'Tiene los mismos datos que un cheque común, más la fecha de pago.'],
      partes: [
        { campo: 'Banco', detalle: 'Nombre del banco emisor.' },
        { campo: 'CHEQUE DE PAGO DIFERIDO', detalle: 'Rótulo que identifica el documento y lo diferencia del cheque común.' },
        { campo: 'Número', detalle: 'Número del cheque para su control.' },
        { campo: 'Localidad y fecha', detalle: 'Lugar donde se emite y la fecha de emisión.' },
        { campo: 'Páguese a', detalle: 'Nombre del beneficiario (a quién se le paga).' },
        { campo: 'La suma de', detalle: 'El monto en números y en letras.' },
        { campo: 'Fecha de pago', detalle: 'Fecha en que se podrá cobrar (máx. 360 días desde la emisión).' },
        { campo: 'Firma y aclaración', detalle: 'Firma del titular de la cuenta y su aclaración.' }
      ],
      calculos: 'El monto en letras se completa automáticamente. La fecha de pago va a mano: no puede superar los 360 días desde la fecha de emisión.'
    },
    NOTA: {
      nombre: 'Nota de débito/crédito',
      queEs: 'La Nota de débito/crédito es un comprobante que corrige importes de una factura anterior. La de débito aumenta lo que el comprador debe pagar; la de crédito lo disminuye.',
      paraQue: ['La nota de débito se usa cuando hubo que cobrar más (ej: intereses, ajustes).', 'La nota de crédito se usa cuando hubo que descontar (ej: devoluciones, bonificaciones).', 'Siempre se vincula a una factura o comprobante anterior.'],
      partes: [
        { campo: 'Letra "A" y rótulo', detalle: 'Se emite con la letra según la condición del emisor (A para responsables inscriptos).' },
        { campo: 'Punto de venta y número', detalle: 'Numeración del comprobante.' },
        { campo: 'Fecha de emisión', detalle: 'Día, mes y año en que se emite.' },
        { campo: 'Datos del emisor', detalle: 'CUIT, condición frente al IVA, ingresos brutos e inicio de actividades.' },
        { campo: 'Datos del cliente', detalle: 'Señor(es), domicilio, localidad, condición IVA y CUIT del comprador.' },
        { campo: 'Condiciones de venta y remito', detalle: 'La forma de venta (contado o cuenta corriente) y el remito asociado.' },
        { campo: 'Detalle de ítems', detalle: 'Descripción, cantidad, precio unitario y subtotal de lo que se ajusta.' },
        { campo: 'Totales', detalle: 'Sub-Total, Impuesto, Sub-Total, IVA Insc. y TOTAL.' }
      ],
      calculos: 'El IVA de la nota va discriminado y se calcula igual que en la Factura A. Total = Sub-Total + Impuesto + IVA. Si es nota de crédito, el importe se resta de la factura original.'
    }
  };

  // Tabla comparativa
  const COMPARATIVA = {
    cabeceras: ['Característica', 'Factura A', 'Factura B', 'Factura C'],
    filas: [
      ['Quién la emite', 'Responsable Inscripto', 'Responsable Inscripto', 'Monotributista'],
      ['A quién va dirigida', 'Responsables Inscriptos', 'Consumidor final', 'Cualquier comprador'],
      ['IVA discriminado', 'Sí', 'No (incluido)', 'No'],
      ['Si el comprador puede computar IVA', 'Sí', 'No', 'No'],
      ['Complejidad del cálculo', 'Alta (calcular IVA)', 'Media', 'Baja (sin IVA)']
    ]
  };

  function init() {
    const contenedor = document.querySelector('#contenido-aprender');
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        renderTab(tab.getAttribute('data-tab'), contenedor);
      });
    });

    // Render inicial
    renderTab('A', contenedor);
  }

  function renderTab(tab, contenedor) {
    if (tab === 'GREAT') {
      renderComparativa(contenedor);
      return;
    }
    const c = CONTENIDO[tab];
    if (!c) return;

    let html = '';
    html += '<div class="aprender-bloque"><h4>¿Qué es?</h4><p>' + c.queEs + '</p></div>';

    html += '<div class="aprender-bloque"><h4>¿Para qué sirve?</h4><ul>';
    c.paraQue.forEach(p => { html += '<li>' + p + '</li>'; });
    html += '</ul></div>';

    html += '<div class="aprender-bloque"><h4>Partes del comprobante</h4><div class="diagrama">';
    c.partes.forEach(p => {
      html += '<div class="campo-diagrama"><span class="flecha">→</span> <strong>' + p.campo + ':</strong> <span class="queva">' + p.detalle + '</span></div>';
    });
    html += '</div></div>';

    html += '<div class="aprender-bloque"><h4>¿Cómo se calcula?</h4><p>' + c.calculos + '</p></div>';

    html += '<div class="aprender-bloque btn-practicar"><button data-tipo="' + tab + '">Practicar → Completar ' + c.nombre + '</button></div>';

    contenedor.innerHTML = html;

    const btnPracticar = contenedor.querySelector('.btn-practicar button');
    if (btnPracticar) {
      btnPracticar.addEventListener('click', function () {
        App.practicar(this.getAttribute('data-tipo'));
      });
    }
  }

  function renderComparativa(contenedor) {
    let html = '<div class="aprender-bloque"><h4>Tabla comparativa</h4><p>Compará las diferencias principales entre los tipos de factura:</p>';
    html += '<table class="tabla-comparativa"><thead><tr>';
    COMPARATIVA.cabeceras.forEach(c => { html += '<th>' + c + '</th>'; });
    html += '</tr></thead><tbody>';
    COMPARATIVA.filas.forEach(fila => {
      html += '<tr>';
      fila.forEach(celda => { html += '<td>' + celda + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    contenedor.innerHTML = html;
  }

  return { init };
})();
