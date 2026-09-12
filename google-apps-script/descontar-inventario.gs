/**
 * YEI · Descuento de inventario en la hoja
 * ---------------------------------------------------------------------
 * Este archivo NO se ejecuta en la tienda: se pega dentro de la propia
 * hoja de Google, en Extensiones > Apps Script. Corre con la cuenta de
 * quien lo publica, y por eso puede escribir en una hoja que para el
 * resto del mundo es de solo lectura.
 *
 * Qué hace: cuando una compra queda pagada, la tienda le manda qué se
 * vendió y este script resta las unidades en la celda correspondiente y
 * apunta el movimiento en la pestaña "Movimientos".
 *
 * CÓMO INSTALARLO (cinco minutos, una sola vez)
 *
 *  1. Abre la hoja del inventario.
 *  2. Extensiones > Apps Script. Borra lo que haya y pega TODO esto.
 *  3. Cambia la línea de TOKEN por el token que te dio la tienda
 *     (está en el archivo .env, como GOOGLE_SHEET_WRITE_TOKEN).
 *  4. Guarda (el icono del disquete).
 *  5. Implementar > Nueva implementación > tipo "Aplicación web":
 *        - Ejecutar como: Yo
 *        - Quién tiene acceso: Cualquier usuario
 *     Dale a Implementar y autoriza cuando Google lo pida.
 *  6. Copia la URL que te da (termina en /exec) y pásasela a la tienda
 *     como GOOGLE_SHEET_WRITE_URL.
 *
 * "Cualquier usuario" suena a mucho, pero sin el token esta dirección no
 * hace nada: toda petición sin el token correcto se rechaza. Es lo mismo
 * que una cerradura en una puerta que está a la vista.
 *
 * Si algún día cambias el token, cámbialo en los dos sitios y vuelve a
 * implementar (Implementar > Gestionar implementaciones > editar).
 */

// ---------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------

/** El mismo valor que GOOGLE_SHEET_WRITE_TOKEN en la tienda. */
var TOKEN = "PEGA_AQUI_EL_TOKEN";

/** Pestaña del inventario. Vacío = la primera de la hoja. */
var HOJA_INVENTARIO = "";

/** Pestaña donde queda el rastro. Se crea sola si no existe. */
var HOJA_MOVIMIENTOS = "Movimientos";

/** Cómo se puede llamar cada columna, sin tildes y en minúsculas. */
var COLUMNAS_PRODUCTO = [
  "slug",
  "producto",
  "prenda",
  "id",
  "codigo",
  "referencia",
  "nombre",
];
var COLUMNAS_STOCK = [
  "stock",
  "inventario",
  "cantidad",
  "unidades",
  "existencias",
  "disponibles",
];

// ---------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------

function doGet() {
  // Abrir la dirección en el navegador no debe parecer un error.
  return responder({ ok: false, error: "esta dirección solo acepta POST" });
}

function doPost(e) {
  var cuerpo;
  try {
    cuerpo = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: "cuerpo ilegible" });
  }

  if (!tokenValido(String(cuerpo.token || ""))) {
    // Sin detalles: a quien no tiene el token no se le explica por qué.
    return responder({ ok: false, error: "no autorizado" });
  }

  var referencia = String(cuerpo.reference || "").trim();
  var piezas = cuerpo.items;
  if (!referencia || !piezas || !piezas.length) {
    return responder({ ok: false, error: "faltan referencia o piezas" });
  }

  // Bloqueo: dos compras a la vez de la misma pieza se atienden en fila.
  // Sin esto, las dos leerían el mismo número y una de las restas se
  // perdería.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    return responder({ ok: false, error: "otra venta en curso, reintenta" });
  }

  try {
    return responder(descontar(referencia, piezas));
  } catch (err) {
    return responder({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------
// Trabajo
// ---------------------------------------------------------------------

function descontar(referencia, piezas) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var inventario = HOJA_INVENTARIO
    ? libro.getSheetByName(HOJA_INVENTARIO)
    : libro.getSheets()[0];

  if (!inventario) {
    return { ok: false, error: "no encuentro la pestaña del inventario" };
  }

  var movimientos = obtenerMovimientos(libro);

  // Idempotencia: si este pedido ya se descontó, no se vuelve a hacer.
  // La tienda ya evita repetir, pero un descuento de inventario aplicado
  // dos veces no se nota hasta que falta mercancía.
  if (yaAplicado(movimientos, referencia)) {
    return { ok: true, applied: [], skipped: "ya estaba descontado" };
  }

  var datos = inventario.getDataRange().getValues();
  if (!datos.length) return { ok: false, error: "la hoja está vacía" };

  var cols = localizarColumnas(datos[0]);
  var aplicados = [];
  var noEncontrados = [];
  var filasMovimiento = [];
  var ahora = new Date();

  for (var i = 0; i < piezas.length; i++) {
    var pieza = piezas[i];
    var cantidad = Math.floor(Number(pieza.qty || 0));
    if (!(cantidad > 0)) continue;

    var fila = buscarFila(
      datos,
      cols.producto,
      [pieza.slug, pieza.name],
      cols.hayCabecera
    );
    if (fila < 0) {
      noEncontrados.push(String(pieza.slug || pieza.name || ""));
      continue;
    }

    var antes = Math.floor(Number(datos[fila][cols.stock] || 0));
    if (!isFinite(antes)) antes = 0;
    var despues = Math.max(0, antes - cantidad);

    // +1 porque las filas de la hoja empiezan en 1 y el array en 0.
    inventario.getRange(fila + 1, cols.stock + 1).setValue(despues);

    aplicados.push({ slug: pieza.slug, antes: antes, despues: despues });
    filasMovimiento.push([
      referencia,
      ahora,
      String(pieza.slug || ""),
      String(pieza.name || ""),
      cantidad,
      antes,
      despues,
    ]);
  }

  if (filasMovimiento.length) {
    movimientos
      .getRange(
        movimientos.getLastRow() + 1,
        1,
        filasMovimiento.length,
        filasMovimiento[0].length
      )
      .setValues(filasMovimiento);
  }

  // Que los cambios queden escritos antes de contestar: si la tienda
  // vuelve a leer la hoja enseguida, tiene que ver ya el número nuevo.
  SpreadsheetApp.flush();

  return { ok: true, applied: aplicados, notFound: noEncontrados };
}

function obtenerMovimientos(libro) {
  var hoja = libro.getSheetByName(HOJA_MOVIMIENTOS);
  if (hoja) return hoja;

  hoja = libro.insertSheet(HOJA_MOVIMIENTOS);
  hoja
    .getRange(1, 1, 1, 7)
    .setValues([
      ["referencia", "fecha", "slug", "producto", "vendidas", "antes", "despues"],
    ]);
  hoja.setFrozenRows(1);
  return hoja;
}

function yaAplicado(movimientos, referencia) {
  if (movimientos.getLastRow() < 2) return false;
  var encontrado = movimientos
    .getRange(2, 1, movimientos.getLastRow() - 1, 1)
    .createTextFinder(referencia)
    .matchEntireCell(true)
    .findNext();
  return encontrado !== null;
}

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

/** Minúsculas y sin tildes, igual que hace la tienda al leer. */
function normalizar(valor) {
  return String(valor === null || valor === undefined ? "" : valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function localizarColumnas(cabecera) {
  var producto = -1;
  var stock = -1;

  for (var i = 0; i < cabecera.length; i++) {
    var nombre = normalizar(cabecera[i]);
    if (producto < 0 && COLUMNAS_PRODUCTO.indexOf(nombre) >= 0) producto = i;
    if (stock < 0 && COLUMNAS_STOCK.indexOf(nombre) >= 0) stock = i;
  }

  // Sin cabecera reconocible, el orden natural: producto y cantidad, y
  // la primera fila cuenta como dato. Es la misma regla que aplica la
  // tienda al leer; si las dos no coincidieran, una hoja sin cabecera se
  // leeria bien y no se descontaria nunca.
  if (producto < 0 || stock < 0) {
    return { producto: 0, stock: 1, hayCabecera: false };
  }
  return { producto: producto, stock: stock, hayCabecera: true };
}

function buscarFila(datos, columna, claves, hayCabecera) {
  var buscadas = [];
  for (var i = 0; i < claves.length; i++) {
    var clave = normalizar(claves[i]);
    if (clave) buscadas.push(clave);
  }
  if (!buscadas.length) return -1;

  for (var fila = hayCabecera ? 1 : 0; fila < datos.length; fila++) {
    var celda = normalizar(datos[fila][columna]);
    if (celda && buscadas.indexOf(celda) >= 0) return fila;
  }
  return -1;
}

/**
 * Compara el token sin delatar en cuánto se parece.
 *
 * Un `==` corriente se detiene en la primera letra distinta, y ese
 * tiempo distinto es medible: sirve para adivinar el token letra a
 * letra. Esta versión mira siempre todas las letras.
 */
function tokenValido(recibido) {
  var esperado =
    PropertiesService.getScriptProperties().getProperty("TOKEN") || TOKEN;

  if (!esperado || esperado === "PEGA_AQUI_EL_TOKEN") return false;

  // No cortamos por diferencia de longitud: eso también se puede medir
  // por tiempo. Recorremos siempre el mismo número de posiciones (la
  // mayor de las dos cadenas) y acumulamos la diferencia de longitud
  // en el resultado.
  var largoMax = Math.max(recibido.length, esperado.length);
  var diferencia = recibido.length ^ esperado.length;
  for (var i = 0; i < largoMax; i++) {
    var codigoRecibido = i < recibido.length ? recibido.charCodeAt(i) : 0;
    var codigoEsperado = i < esperado.length ? esperado.charCodeAt(i) : 0;
    diferencia |= codigoRecibido ^ codigoEsperado;
  }
  return diferencia === 0;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON
  );
}
