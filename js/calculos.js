/**
 * calculos.js
 * Funciones de cálculo y utilidades de formato.
 * - Conversión de montos a números con dos decimales.
 * - Conversión de número a letras en español (para recibos y cheques).
 */

const Calculos = (function () {

  // Convierte una entrada a número válido, o 0 si no es un número.
  function aNumero(valor) {
    if (typeof valor === 'number') return isFinite(valor) ? valor : 0;
    if (typeof valor === 'string') {
      const limpio = valor.replace(',', '.').replace(/[^0-9.\-]/g, '');
      const n = parseFloat(limpio);
      return isFinite(n) ? n : 0;
    }
    return 0;
  }

  // Redondea a 2 decimales
  function aDos(n) {
    return Math.round(n * 100) / 100;
  }

  // Formatea como moneda (sin símbolo, con coma decimal)
  function formato(n) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- Conversión a letras en español ---
  const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
    'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];

  const DECENAS = ['', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];

  function convertirGrupo(numero) {
    let texto = '';
    if (numero < 100) {
      texto = convertirMenor100(numero);
    } else {
      const centena = Math.floor(numero / 100);
      const resto = numero % 100;
      const centenas = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
        'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
      texto = centenas[centena];
      if (centena === 1 && resto > 0) texto = 'ciento';
      if (resto > 0) texto += ' ' + convertirMenor100(resto);
    }
    return texto;
  }

  function convertirMenor100(numero) {
    if (numero < 30) return UNIDADES[numero];
    const decena = Math.floor(numero / 10);
    const unidad = numero % 10;
    let txt = DECENAS[decena];
    if (unidad > 0) txt += ' y ' + UNIDADES[unidad];
    return txt;
  }

  function numeroALetras(numero) {
    if (numero === 0) return 'cero';
    if (numero > 999999999) return 'numero demasiado grande';

    let texto = '';
    const millones = Math.floor(numero / 1000000);
    const miles = Math.floor((numero % 1000000) / 1000);
    const resto = numero % 1000;

    if (millones > 0) {
      texto += (millones === 1 ? 'un millón' : convertirGrupo(millones) + ' millones');
    }
    if (miles > 0) {
      if (texto) texto += ' ';
      texto += (miles === 1 ? 'mil' : convertirGrupo(miles) + ' mil');
    }
    if (resto > 0) {
      if (texto) texto += ' ';
      texto += convertirGrupo(resto);
    }
    return texto;
  }

  function montoEnLetras(monto) {
    const entero = Math.floor(Math.abs(monto));
    const decimales = Math.round((Math.abs(monto) - entero) * 100);
    let texto = numeroALetras(entero) + ' con ' + String(decimales).padStart(2, '0') + '/100';
    if (monto < 0) texto = 'menos ' + texto;
    return texto;
  }

  // Devuelve el resumen de una lista de campos de items
  // items: array de {cant, pu}
  function totalFactura(items, alicuota, tipo) {
    let sub = 0;
    items.forEach(it => {
      const cant = aNumero(it.cant);
      const pu = aNumero(it.pu);
      // Si hay cantidad se multiplica; si no (ej: Factura C), el monto es pu directo
      sub += aDos(cant > 0 ? cant * pu : pu);
    });
    if (tipo === 'A') {
      const iva = aDos(sub * aNumero(alicuota) / 100);
      const total = aDos(sub + iva);
      return { subtotal: sub, iva: iva, total: total };
    }
    // B (IVA incluido) y C (sin IVA): total = sumatoria de precios
    return { subtotal: sub, iva: 0, total: sub };
  }

  return {
    aNumero,
    aDos,
    formato,
    numeroALetras,
    montoEnLetras,
    totalFactura
  };
})();
