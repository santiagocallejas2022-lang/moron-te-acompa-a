import * as XLSX from 'xlsx';

import './importador.css';


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const PROGRAMAS = [
  {
    id: 'jubilados',
    nombre: 'Jubilados',
    palabras: [
      'jubilado',
      'jubilados',
      'jubilada',
      'jubiladas',
    ],
  },

  {
    id: 'joven',
    nombre: 'Tarjeta Joven',
    palabras: [
      'joven',
      'tarjeta joven',
      'jovenes',
    ],
  },

  {
    id: 'docente',
    nombre: 'Soy Docente',
    palabras: [
      'docente',
      'docentes',
      'soy docente',
    ],
  },

  {
    id: 'municipales',
    nombre: 'Trabajadores Municipales',
    palabras: [
      'municipal',
      'municipales',
      'trabajadores municipales',
      'trabajador municipal',
    ],
  },

  {
    id: 'plataforma',
    nombre: 'Trabajadores/as de Plataforma',
    palabras: [
      'plataforma',
      'plataformas',
      'trabajadores plataforma',
      'trabajadores de plataforma',
      'repartidores',
    ],
  },

  {
    id: 'buen-contribuyente',
    nombre: 'Buen Contribuyente',
    palabras: [
      'buen contribuyente',
      'contribuyente',
      'contribuyentes',
    ],
  },
];


const CAMPOS_BASE = [
  {
    key: 'nombre',
    label: 'Nombre del comercio',
    requerido: true,
    aliases: [
      'nombre',
      'comercio',
      'nombre comercio',
      'nombre del comercio',
      'razon social',
      'razón social',
      'nombre fantasia',
      'nombre fantasía',
      'fantasia',
      'fantasía',
      'establecimiento',
      'local',
    ],
  },

  {
    key: 'rubro',
    label: 'Rubro',
    aliases: [
      'rubro',
      'actividad',
      'actividad comercial',
      'categoria',
      'categoría',
    ],
  },

  {
    key: 'localidad',
    label: 'Localidad',
    aliases: [
      'localidad',
      'ciudad',
      'zona',
      'barrio',
    ],
  },

  {
    key: 'direccion',
    label: 'Dirección',
    aliases: [
      'direccion',
      'dirección',
      'domicilio',
      'direccion comercial',
      'dirección comercial',
      'domicilio comercial',
    ],
  },

  {
    key: 'telefono',
    label: 'Teléfono',
    aliases: [
      'telefono',
      'teléfono',
      'tel',
      'celular',
      'whatsapp',
      'contacto',
    ],
  },

  {
    key: 'horario',
    label: 'Horario',
    aliases: [
      'horario',
      'horarios',
      'dias y horarios',
      'días y horarios',
      'atencion',
      'atención',
    ],
  },

  {
    key: 'lat',
    label: 'Latitud',
    aliases: [
      'latitud',
      'lat',
    ],
  },

  {
    key: 'lng',
    label: 'Longitud',
    aliases: [
      'longitud',
      'lng',
      'lon',
      'long',
    ],
  },
];


let archivoActual = null;

let workbookActual = null;

let hojaActual = null;

let filasCrudas = [];

let cabeceras = [];

let filaCabecera = 0;

let mapeo = {};

let modoBeneficios =
  'filas';

let mapeoProgramas = {};

let ultimoAnalisis = null;


/* =========================================================
   TEXTO
========================================================= */

function normalizar(
  valor = ''
) {

  return String(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[^a-z0-9\s]/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();

}


function normalizarTelefono(
  valor = ''
) {

  return String(valor)
    .replace(
      /\D/g,
      ''
    )
    .replace(
      /^54/,
      ''
    );

}


function limpiarValor(
  valor
) {

  if (
    valor === null ||
    valor === undefined
  ) {

    return '';

  }


  return String(valor)
    .trim();

}


function escapar(
  valor = ''
) {

  return String(valor)
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    );

}


/* =========================================================
   SIMILITUD
========================================================= */

function distanciaLevenshtein(
  a,
  b
) {

  const s =
    normalizar(a);

  const t =
    normalizar(b);


  if (s === t) {
    return 0;
  }


  if (!s.length) {
    return t.length;
  }


  if (!t.length) {
    return s.length;
  }


  const matriz =
    Array.from(
      {
        length:
          s.length + 1,
      },
      () =>
        new Array(
          t.length + 1
        )
    );


  for (
    let i = 0;
    i <= s.length;
    i++
  ) {

    matriz[i][0] =
      i;

  }


  for (
    let j = 0;
    j <= t.length;
    j++
  ) {

    matriz[0][j] =
      j;

  }


  for (
    let i = 1;
    i <= s.length;
    i++
  ) {

    for (
      let j = 1;
      j <= t.length;
      j++
    ) {

      const costo =
        s[i - 1] ===
        t[j - 1]
          ? 0
          : 1;


      matriz[i][j] =
        Math.min(

          matriz[i - 1][j] + 1,

          matriz[i][j - 1] + 1,

          matriz[i - 1][j - 1] +
            costo

        );

    }

  }


  return matriz[
    s.length
  ][
    t.length
  ];

}


function similitudTexto(
  a,
  b
) {

  const x =
    normalizar(a);

  const y =
    normalizar(b);


  if (
    !x ||
    !y
  ) {

    return 0;

  }


  if (x === y) {
    return 1;
  }


  const distancia =
    distanciaLevenshtein(
      x,
      y
    );


  return Math.max(
    0,
    1 -
      distancia /
      Math.max(
        x.length,
        y.length,
        1
      )
  );

}


/* =========================================================
   COINCIDENCIA ENTRE COMERCIOS
========================================================= */

function compararComercios(
  a,
  b
) {

  const nombre =
    similitudTexto(
      a.nombre,
      b.nombre
    );


  const direccion =
    similitudTexto(
      a.direccion,
      b.direccion
    );


  const localidad =
    similitudTexto(
      a.localidad,
      b.localidad
    );


  const telefonoA =
    normalizarTelefono(
      a.telefono
    );


  const telefonoB =
    normalizarTelefono(
      b.telefono
    );


  const mismoTelefono =
    Boolean(
      telefonoA &&
      telefonoB &&
      telefonoA ===
      telefonoB
    );


  const mismaDireccion =
    Boolean(
      normalizar(
        a.direccion
      ) &&
      normalizar(
        b.direccion
      ) &&
      direccion >= 0.96
    );


  const mismaLocalidad =
    Boolean(
      normalizar(
        a.localidad
      ) &&
      normalizar(
        b.localidad
      ) &&
      localidad >= 0.90
    );


  let puntaje =
    nombre * 0.60;


  if (
    a.direccion &&
    b.direccion
  ) {

    puntaje +=
      direccion * 0.20;

  }


  if (
    a.localidad &&
    b.localidad
  ) {

    puntaje +=
      localidad * 0.10;

  }


  if (
    mismoTelefono
  ) {

    puntaje += 0.15;

  }


  if (
    mismaDireccion &&
    mismaLocalidad
  ) {

    puntaje += 0.10;

  }


  puntaje =
    Math.min(
      1,
      puntaje
    );


  let nivel =
    'distinto';


  if (
    mismoTelefono &&
    nombre >= 0.65
  ) {

    nivel =
      'alta';

  } else if (
    mismaDireccion &&
    mismaLocalidad &&
    nombre >= 0.70
  ) {

    nivel =
      'alta';

  } else if (
    puntaje >= 0.82 ||
    (
      nombre >= 0.88 &&
      mismaLocalidad
    )
  ) {

    nivel =
      'posible';

  }


  return {
    puntaje,
    nivel,
    mismoTelefono,
    mismaDireccion,
    mismaLocalidad,
    nombre,
    direccion,
    localidad,
  };

}


/* =========================================================
   PROGRAMA
========================================================= */

function normalizarPrograma(
  valor
) {

  const texto =
    normalizar(valor);


  if (!texto) {
    return null;
  }


  for (
    const programa
    of PROGRAMAS
  ) {

    if (
      programa.id === texto
    ) {

      return programa.id;

    }


    if (
      programa.palabras.some(
        palabra =>
          texto.includes(
            normalizar(
              palabra
            )
          )
      )
    ) {

      return programa.id;

    }

  }


  return null;

}


function nombrePrograma(
  id
) {

  return (
    PROGRAMAS.find(
      programa =>
        programa.id === id
    )?.nombre ||
    id
  );

}


/* =========================================================
   CABECERAS
========================================================= */

function scoreCabecera(
  fila
) {

  if (
    !Array.isArray(
      fila
    )
  ) {

    return 0;

  }


  let score = 0;


  fila.forEach(
    celda => {

      const texto =
        normalizar(
          celda
        );


      if (!texto) {
        return;
      }


      score += 1;


      CAMPOS_BASE.forEach(
        campo => {

          if (
            campo.aliases.some(
              alias =>
                normalizar(alias) ===
                texto
            )
          ) {

            score += 5;

          }

        }
      );


      if (
        texto.includes(
          'programa'
        )
      ) {

        score += 4;

      }


      if (
        texto.includes(
          'beneficio'
        ) ||
        texto.includes(
          'descuento'
        )
      ) {

        score += 4;

      }

    }
  );


  return score;

}


function detectarFilaCabecera(
  filas
) {

  let mejorIndice = 0;

  let mejorScore = -1;


  const limite =
    Math.min(
      filas.length,
      10
    );


  for (
    let i = 0;
    i < limite;
    i++
  ) {

    const score =
      scoreCabecera(
        filas[i]
      );


    if (
      score >
      mejorScore
    ) {

      mejorScore =
        score;

      mejorIndice =
        i;

    }

  }


  return mejorIndice;

}


function prepararCabeceras(
  fila
) {

  const usados =
    new Map();


  return fila.map(
    (valor, index) => {

      let nombre =
        limpiarValor(
          valor
        );


      if (!nombre) {

        nombre =
          `Columna ${index + 1}`;

      }


      const base =
        nombre;


      const cantidad =
        usados.get(
          base
        ) || 0;


      usados.set(
        base,
        cantidad + 1
      );


      if (
        cantidad > 0
      ) {

        nombre =
          `${base} (${cantidad + 1})`;

      }


      return nombre;

    }
  );

}


/* =========================================================
   AUTODETECCIÓN COLUMNAS
========================================================= */

function detectarColumnaPorAlias(
  aliases
) {

  let mejor = '';

  let mejorScore = 0;


  cabeceras.forEach(
    cabecera => {

      const texto =
        normalizar(
          cabecera
        );


      aliases.forEach(
        alias => {

          const aliasNorm =
            normalizar(
              alias
            );


          let score = 0;


          if (
            texto === aliasNorm
          ) {

            score = 1;

          } else if (
            texto.includes(
              aliasNorm
            )
          ) {

            score = 0.85;

          } else if (
            aliasNorm.includes(
              texto
            )
          ) {

            score = 0.70;

          }


          if (
            score >
            mejorScore
          ) {

            mejorScore =
              score;

            mejor =
              cabecera;

          }

        }
      );

    }
  );


  return mejor;

}


function detectarMapeo() {

  const nuevo = {};


  CAMPOS_BASE.forEach(
    campo => {

      nuevo[
        campo.key
      ] =
        detectarColumnaPorAlias(
          campo.aliases
        );

    }
  );


  nuevo.programa =
    detectarColumnaPorAlias([
      'programa',
      'programa beneficio',
      'tarjeta',
      'programa adherido',
    ]);


  nuevo.beneficio =
    detectarColumnaPorAlias([
      'beneficio',
      'descuento',
      'promocion',
      'promoción',
      'beneficio descuento',
    ]);


  nuevo.condiciones =
    detectarColumnaPorAlias([
      'condiciones',
      'detalle',
      'detalles',
      'observaciones',
      'aclaraciones',
      'restricciones',
    ]);


  mapeo =
    nuevo;


  modoBeneficios =
    (
      nuevo.programa &&
      nuevo.beneficio
    )
      ? 'filas'
      : 'columnas';


  detectarColumnasProgramas();

}


/* =========================================================
   DETECTAR PROGRAMAS EN COLUMNAS
========================================================= */

function detectarColumnasProgramas() {

  mapeoProgramas = {};


  PROGRAMAS.forEach(
    programa => {

      let beneficio = '';

      let condiciones = '';


      cabeceras.forEach(
        cabecera => {

          const texto =
            normalizar(
              cabecera
            );


          const coincide =
            programa.palabras.some(
              palabra =>
                texto.includes(
                  normalizar(
                    palabra
                  )
                )
            );


          if (!coincide) {
            return;
          }


          if (
            texto.includes(
              'condicion'
            ) ||
            texto.includes(
              'detalle'
            ) ||
            texto.includes(
              'observacion'
            ) ||
            texto.includes(
              'aclaracion'
            )
          ) {

            if (!condiciones) {

              condiciones =
                cabecera;

            }

          } else {

            if (!beneficio) {

              beneficio =
                cabecera;

            }

          }

        }
      );


      mapeoProgramas[
        programa.id
      ] = {
        beneficio,
        condiciones,
      };

    }
  );

}


/* =========================================================
   VALOR DE FILA
========================================================= */

function valorFila(
  fila,
  cabecera
) {

  if (!cabecera) {
    return '';
  }


  const indice =
    cabeceras.indexOf(
      cabecera
    );


  if (
    indice < 0
  ) {

    return '';

  }


  return limpiarValor(
    fila[indice]
  );

}


/* =========================================================
   SELECT MAPEO
========================================================= */

function selectColumna(
  id,
  valor,
  requerido = false
) {

  return `

    <select
      id="${id}"
      ${
        requerido
          ? 'required'
          : ''
      }
    >

      <option value="">
        ${
          requerido
            ? 'Seleccionar columna...'
            : 'No usar'
        }
      </option>

      ${
        cabeceras
          .map(
            cabecera => `

              <option
                value="${escapar(cabecera)}"
                ${
                  cabecera === valor
                    ? 'selected'
                    : ''
                }
              >
                ${escapar(cabecera)}
              </option>

            `
          )
          .join('')
      }

    </select>

  `;

}


/* =========================================================
   MODAL
========================================================= */

function abrirImportador() {

  cerrarImportador();


  const overlay =
    document.createElement(
      'div'
    );


  overlay.id =
    'importador-overlay';


  overlay.className =
    'imp-overlay';


  document.body.appendChild(
    overlay
  );


  renderInicio();

}


/* =========================================================
   INICIO
========================================================= */

function renderInicio() {

  const overlay =
    document.querySelector(
      '#importador-overlay'
    );


  if (!overlay) {
    return;
  }


  overlay.innerHTML = `

    <section class="imp-modal">

      <header class="imp-header">

        <div>

          <span>
            IMPORTACIÓN MASIVA
          </span>

          <h2>
            Importar base de comercios
          </h2>

          <p>
            Excel o CSV. Primero analizamos
            los datos y los posibles duplicados.
          </p>

        </div>


        <button
          id="imp-cerrar"
          class="imp-close"
        >
          ×
        </button>

      </header>


      <div class="imp-upload">

        <div class="imp-upload-icon">
          ↑
        </div>

        <strong>
          Seleccioná el archivo
        </strong>

        <p>
          Formatos admitidos:
          .xlsx, .xls y .csv
        </p>


        <label class="imp-file-button">

          Elegir archivo

          <input
            id="imp-archivo"
            type="file"
            accept=".xlsx,.xls,.csv"
          />

        </label>

      </div>


      <div class="imp-note">

        <strong>
          En esta etapa no se guarda nada.
        </strong>

        Primero vamos a detectar comercios
        repetidos, errores de tipeo,
        programas y beneficios.

      </div>

    </section>

  `;


  conectarCerrar();


  document
    .querySelector(
      '#imp-archivo'
    )
    .addEventListener(
      'change',
      async event => {

        const archivo =
          event.target.files?.[0];


        if (!archivo) {
          return;
        }


        await leerArchivo(
          archivo
        );

      }
    );

}


/* =========================================================
   LEER ARCHIVO
========================================================= */

async function leerArchivo(
  archivo
) {

  archivoActual =
    archivo;


  const buffer =
    await archivo.arrayBuffer();


  workbookActual =
    XLSX.read(
      buffer,
      {
        type: 'array',
      }
    );


  if (
    !workbookActual
      .SheetNames
      .length
  ) {

    alert(
      'El archivo no contiene hojas.'
    );

    return;

  }


  hojaActual =
    workbookActual
      .SheetNames[0];


  prepararHoja(
    hojaActual
  );


  renderMapeo();

}


/* =========================================================
   PREPARAR HOJA
========================================================= */

function prepararHoja(
  nombreHoja
) {

  hojaActual =
    nombreHoja;


  const hoja =
    workbookActual
      .Sheets[
        hojaActual
      ];


  filasCrudas =
    XLSX.utils
      .sheet_to_json(
        hoja,
        {
          header: 1,
          defval: '',
          raw: false,
        }
      );


  filaCabecera =
    detectarFilaCabecera(
      filasCrudas
    );


  cabeceras =
    prepararCabeceras(
      filasCrudas[
        filaCabecera
      ] || []
    );


  detectarMapeo();

}


/* =========================================================
   MAPEO VISUAL
========================================================= */

function renderMapeo() {

  const overlay =
    document.querySelector(
      '#importador-overlay'
    );


  if (!overlay) {
    return;
  }


  overlay.innerHTML = `

    <section class="imp-modal imp-modal-large">

      <header class="imp-header">

        <div>

          <span>
            PASO 1 DE 2
          </span>

          <h2>
            Revisar columnas
          </h2>

          <p>
            Confirmá qué columna corresponde
            a cada dato.
          </p>

        </div>


        <button
          id="imp-cerrar"
          class="imp-close"
        >
          ×
        </button>

      </header>


      <div class="imp-file-summary">

        <div>

          <span>
            ARCHIVO
          </span>

          <strong>
            ${escapar(
              archivoActual?.name ||
              ''
            )}
          </strong>

        </div>


        <div>

          <span>
            HOJA
          </span>

          <select id="imp-hoja">

            ${
              workbookActual
                .SheetNames
                .map(
                  hoja => `

                    <option
                      value="${escapar(hoja)}"
                      ${
                        hoja === hojaActual
                          ? 'selected'
                          : ''
                      }
                    >
                      ${escapar(hoja)}
                    </option>

                  `
                )
                .join('')
            }

          </select>

        </div>


        <div>

          <span>
            FILAS
          </span>

          <strong>
            ${
              Math.max(
                0,
                filasCrudas.length -
                filaCabecera -
                1
              )
            }
          </strong>

        </div>

      </div>


      <div class="imp-section">

        <div class="imp-section-title">

          <h3>
            Datos del comercio
          </h3>

          <p>
            Detectamos automáticamente
            las columnas más probables.
          </p>

        </div>


        <div class="imp-map-grid">

          ${
            CAMPOS_BASE
              .map(
                campo => `

                  <label>

                    ${
                      campo.label
                    }

                    ${
                      campo.requerido
                        ? '<b>*</b>'
                        : ''
                    }

                    ${
                      selectColumna(
                        `imp-map-${campo.key}`,
                        mapeo[
                          campo.key
                        ],
                        campo.requerido
                      )
                    }

                  </label>

                `
              )
              .join('')
          }

        </div>

      </div>


      <div class="imp-section">

        <div class="imp-section-title">

          <h3>
            Programas y beneficios
          </h3>

          <p>
            Elegí cómo está organizada
            tu planilla.
          </p>

        </div>


        <div class="imp-mode-selector">

          <label>

            <input
              type="radio"
              name="imp-modo"
              value="filas"
              ${
                modoBeneficios ===
                'filas'
                  ? 'checked'
                  : ''
              }
            />

            <div>

              <strong>
                Una fila por programa
              </strong>

              <small>
                El comercio puede aparecer
                varias veces.
              </small>

            </div>

          </label>


          <label>

            <input
              type="radio"
              name="imp-modo"
              value="columnas"
              ${
                modoBeneficios ===
                'columnas'
                  ? 'checked'
                  : ''
              }
            />

            <div>

              <strong>
                Una columna por programa
              </strong>

              <small>
                Una fila por comercio.
              </small>

            </div>

          </label>

        </div>


        <div id="imp-beneficios-mapeo">
        </div>

      </div>


      <div class="imp-actions">

        <button
          id="imp-volver"
          class="imp-secondary"
        >
          Volver
        </button>


        <button
          id="imp-analizar"
          class="imp-primary"
        >
          Analizar base
        </button>

      </div>

    </section>

  `;


  conectarCerrar();


  document
    .querySelector(
      '#imp-hoja'
    )
    .addEventListener(
      'change',
      event => {

        prepararHoja(
          event.target.value
        );

        renderMapeo();

      }
    );


  document
    .querySelectorAll(
      '[name="imp-modo"]'
    )
    .forEach(
      radio => {

        radio.addEventListener(
          'change',
          event => {

            guardarMapeoVisual();

            modoBeneficios =
              event.target.value;

            renderMapeoBeneficios();

          }
        );

      }
    );


  document
    .querySelector(
      '#imp-volver'
    )
    .addEventListener(
      'click',
      renderInicio
    );


  document
    .querySelector(
      '#imp-analizar'
    )
    .addEventListener(
      'click',
      async () => {

        guardarMapeoVisual();


        if (
          !mapeo.nombre
        ) {

          alert(
            'Tenés que seleccionar la columna del nombre del comercio.'
          );

          return;

        }


        if (
          modoBeneficios ===
          'filas' &&
          (
            !mapeo.programa ||
            !mapeo.beneficio
          )
        ) {

          const continuar =
            confirm(
              'No seleccionaste Programa y Beneficio.\n\nSe analizarán los comercios, pero sin adhesiones a programas.\n\n¿Continuar?'
            );


          if (!continuar) {
            return;
          }

        }


        renderAnalizando();


        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              100
            )
        );


        ultimoAnalisis =
          await analizarBase();


        renderResultado();

      }
    );


  renderMapeoBeneficios();

}


/* =========================================================
   GUARDAR MAPEO
========================================================= */

function guardarMapeoVisual() {

  CAMPOS_BASE.forEach(
    campo => {

      const elemento =
        document.querySelector(
          `#imp-map-${campo.key}`
        );


      if (elemento) {

        mapeo[
          campo.key
        ] =
          elemento.value;

      }

    }
  );


  if (
    modoBeneficios ===
    'filas'
  ) {

    [
      'programa',
      'beneficio',
      'condiciones',
    ].forEach(
      key => {

        const elemento =
          document.querySelector(
            `#imp-map-${key}`
          );


        if (elemento) {

          mapeo[key] =
            elemento.value;

        }

      }
    );

  } else {

    PROGRAMAS.forEach(
      programa => {

        const beneficio =
          document.querySelector(
            `#imp-programa-${programa.id}-beneficio`
          );


        const condiciones =
          document.querySelector(
            `#imp-programa-${programa.id}-condiciones`
          );


        mapeoProgramas[
          programa.id
        ] = {

          beneficio:
            beneficio?.value ||
            '',

          condiciones:
            condiciones?.value ||
            '',

        };

      }
    );

  }

}


/* =========================================================
   MAPEO BENEFICIOS
========================================================= */

function renderMapeoBeneficios() {

  const contenedor =
    document.querySelector(
      '#imp-beneficios-mapeo'
    );


  if (!contenedor) {
    return;
  }


  if (
    modoBeneficios ===
    'filas'
  ) {

    contenedor.innerHTML = `

      <div class="imp-map-grid imp-map-benefits">

        <label>

          Programa

          ${
            selectColumna(
              'imp-map-programa',
              mapeo.programa ||
              ''
            )
          }

        </label>


        <label>

          Beneficio / descuento

          ${
            selectColumna(
              'imp-map-beneficio',
              mapeo.beneficio ||
              ''
            )
          }

        </label>


        <label>

          Condiciones / detalle

          ${
            selectColumna(
              'imp-map-condiciones',
              mapeo.condiciones ||
              ''
            )
          }

        </label>

      </div>

    `;

  } else {

    contenedor.innerHTML = `

      <div class="imp-program-map">

        ${
          PROGRAMAS
            .map(
              programa => {

                const actual =
                  mapeoProgramas[
                    programa.id
                  ] || {};


                return `

                  <article>

                    <strong>
                      ${programa.nombre}
                    </strong>


                    <label>

                      Columna del beneficio

                      ${
                        selectColumna(
                          `imp-programa-${programa.id}-beneficio`,
                          actual.beneficio ||
                          ''
                        )
                      }

                    </label>


                    <label>

                      Columna de condiciones

                      ${
                        selectColumna(
                          `imp-programa-${programa.id}-condiciones`,
                          actual.condiciones ||
                          ''
                        )
                      }

                    </label>

                  </article>

                `;

              }
            )
            .join('')
        }

      </div>

    `;

  }

}


/* =========================================================
   FILAS A REGISTROS
========================================================= */

function construirRegistros() {

  const registros = [];

  const errores = [];


  const filasDatos =
    filasCrudas.slice(
      filaCabecera + 1
    );


  filasDatos.forEach(
    (
      fila,
      indice
    ) => {

      const numeroFila =
        filaCabecera +
        indice +
        2;


      const nombre =
        valorFila(
          fila,
          mapeo.nombre
        );


      const filaVacia =
        fila.every(
          celda =>
            !limpiarValor(
              celda
            )
        );


      if (filaVacia) {
        return;
      }


      if (!nombre) {

        errores.push({
          fila:
            numeroFila,
          tipo:
            'Nombre faltante',
          detalle:
            'La fila no tiene nombre de comercio.',
        });

        return;

      }


      const registro = {

        fila:
          numeroFila,

        nombre,

        rubro:
          valorFila(
            fila,
            mapeo.rubro
          ),

        localidad:
          valorFila(
            fila,
            mapeo.localidad
          ),

        direccion:
          valorFila(
            fila,
            mapeo.direccion
          ),

        telefono:
          valorFila(
            fila,
            mapeo.telefono
          ),

        horario:
          valorFila(
            fila,
            mapeo.horario
          ),

        lat:
          valorFila(
            fila,
            mapeo.lat
          ),

        lng:
          valorFila(
            fila,
            mapeo.lng
          ),

        adhesiones: [],

      };


      if (
        modoBeneficios ===
        'filas'
      ) {

        const programaTexto =
          valorFila(
            fila,
            mapeo.programa
          );


        const beneficio =
          valorFila(
            fila,
            mapeo.beneficio
          );


        const condiciones =
          valorFila(
            fila,
            mapeo.condiciones
          );


        if (
          programaTexto
        ) {

          const programa =
            normalizarPrograma(
              programaTexto
            );


          if (!programa) {

            errores.push({
              fila:
                numeroFila,
              tipo:
                'Programa no reconocido',
              detalle:
                programaTexto,
            });

          } else if (
            beneficio
          ) {

            registro
              .adhesiones
              .push({
                programa,
                beneficio,
                condiciones,
              });

          } else {

            errores.push({
              fila:
                numeroFila,
              tipo:
                'Beneficio faltante',
              detalle:
                `${nombre} / ${programaTexto}`,
            });

          }

        }

      } else {

        PROGRAMAS.forEach(
          programa => {

            const config =
              mapeoProgramas[
                programa.id
              ] || {};


            const beneficio =
              valorFila(
                fila,
                config.beneficio
              );


            const condiciones =
              valorFila(
                fila,
                config.condiciones
              );


            if (beneficio) {

              registro
                .adhesiones
                .push({
                  programa:
                    programa.id,
                  beneficio,
                  condiciones,
                });

            }

          }
        );

      }


      registros.push(
        registro
      );

    }
  );


  return {
    registros,
    errores,
  };

}


/* =========================================================
   AGRUPAR COINCIDENCIAS MUY ALTAS
========================================================= */

function agruparRegistros(
  registros
) {

  const grupos = [];

  const posibles = [];


  registros.forEach(
    registro => {

      let mejorGrupo =
        null;

      let mejorComparacion =
        null;


      grupos.forEach(
        grupo => {

          const comparacion =
            compararComercios(
              registro,
              grupo.principal
            );


          if (
            !mejorComparacion ||
            comparacion.puntaje >
            mejorComparacion.puntaje
          ) {

            mejorComparacion =
              comparacion;

            mejorGrupo =
              grupo;

          }

        }
      );


      if (
        mejorGrupo &&
        mejorComparacion?.nivel ===
        'alta'
      ) {

        mejorGrupo
          .variantes
          .push(
            registro
          );


        registro.adhesiones
          .forEach(
            adhesion => {

              const existente =
                mejorGrupo
                  .adhesiones
                  .find(
                    item =>
                      item.programa ===
                      adhesion.programa
                  );


              if (!existente) {

                mejorGrupo
                  .adhesiones
                  .push(
                    adhesion
                  );

              } else if (
                normalizar(
                  existente.beneficio
                ) !==
                normalizar(
                  adhesion.beneficio
                ) ||
                normalizar(
                  existente.condiciones
                ) !==
                normalizar(
                  adhesion.condiciones
                )
              ) {

                mejorGrupo
                  .conflictos
                  .push({
                    programa:
                      adhesion.programa,
                    anterior:
                      existente,
                    nuevo:
                      adhesion,
                    fila:
                      registro.fila,
                  });

              }

            }
          );


        [
          'rubro',
          'localidad',
          'direccion',
          'telefono',
          'horario',
          'lat',
          'lng',
        ].forEach(
          campo => {

            if (
              !mejorGrupo
                .principal[
                  campo
                ] &&
              registro[
                campo
              ]
            ) {

              mejorGrupo
                .principal[
                  campo
                ] =
                  registro[
                    campo
                  ];

            }

          }
        );

      } else {

        if (
          mejorGrupo &&
          mejorComparacion?.nivel ===
          'posible'
        ) {

          posibles.push({

            a:
              mejorGrupo
                .principal,

            b:
              registro,

            comparacion:
              mejorComparacion,

            origen:
              'archivo',

          });

        }


        grupos.push({

          principal: {
            ...registro,
          },

          variantes: [
            registro,
          ],

          adhesiones: [
            ...registro.adhesiones,
          ],

          conflictos: [],

        });

      }

    }
  );


  return {
    grupos,
    posibles,
  };

}


/* =========================================================
   COMERCIOS EXISTENTES EN SUPABASE
========================================================= */

async function cargarComerciosExistentes() {

  try {

    const sesion =
      JSON.parse(
        localStorage.getItem(
          'mta_admin_session'
        ) ||
        'null'
      );


    if (
      !sesion?.access_token
    ) {

      return [];

    }


    const url =
      import.meta.env
        .VITE_SUPABASE_URL
        ?.replace(
          /\/$/,
          ''
        );


    const key =
      import.meta.env
        .VITE_SUPABASE_KEY;


    if (
      !url ||
      !key
    ) {

      return [];

    }


    const respuesta =
      await fetch(
        `${url}/rest/v1/comercios?select=id,nombre,rubro,localidad,direccion,telefono,horario,lat,lng,activo`,
        {
          headers: {
            apikey:
              key,

            Authorization:
              `Bearer ${sesion.access_token}`,
          },
        }
      );


    if (!respuesta.ok) {

      return [];

    }


    return await respuesta.json();

  } catch {

    return [];

  }

}


/* =========================================================
   COMPARAR CONTRA BASE ACTUAL
========================================================= */

function compararConExistentes(
  grupos,
  existentes
) {

  const coincidencias = [];


  grupos.forEach(
    grupo => {

      let mejor =
        null;


      existentes.forEach(
        existente => {

          const comparacion =
            compararComercios(
              grupo.principal,
              existente
            );


          if (
            comparacion.nivel ===
            'distinto'
          ) {

            return;

          }


          if (
            !mejor ||
            comparacion.puntaje >
            mejor.comparacion.puntaje
          ) {

            mejor = {
              existente,
              comparacion,
            };

          }

        }
      );


      if (mejor) {

        coincidencias.push({
          importado:
            grupo.principal,
          existente:
            mejor.existente,
          comparacion:
            mejor.comparacion,
        });

      }

    }
  );


  return coincidencias;

}


/* =========================================================
   ANALIZAR
========================================================= */

async function analizarBase() {

  const {
    registros,
    errores,
  } =
    construirRegistros();


  const {
    grupos,
    posibles,
  } =
    agruparRegistros(
      registros
    );


  const existentes =
    await cargarComerciosExistentes();


  const coincidenciasBase =
    compararConExistentes(
      grupos,
      existentes
    );


  const adhesiones =
    grupos.reduce(
      (
        total,
        grupo
      ) =>
        total +
        grupo.adhesiones.length,
      0
    );


  const conflictos =
    grupos.flatMap(
      grupo =>
        grupo.conflictos
    );


  return {
    registros,
    errores,
    grupos,
    posibles,
    existentes,
    coincidenciasBase,
    adhesiones,
    conflictos,
  };

}


/* =========================================================
   ANALIZANDO
========================================================= */

function renderAnalizando() {

  const overlay =
    document.querySelector(
      '#importador-overlay'
    );


  if (!overlay) {
    return;
  }


  overlay.innerHTML = `

    <section class="imp-modal imp-loading">

      <div class="imp-spinner">
      </div>

      <strong>
        Analizando la base...
      </strong>

      <p>
        Estamos buscando duplicados,
        errores de tipeo y programas.
      </p>

    </section>

  `;

}


/* =========================================================
   RESULTADO
========================================================= */

function renderResultado() {

  const overlay =
    document.querySelector(
      '#importador-overlay'
    );


  if (
    !overlay ||
    !ultimoAnalisis
  ) {

    return;

  }


  const {
    registros,
    grupos,
    posibles,
    errores,
    coincidenciasBase,
    adhesiones,
    conflictos,
  } =
    ultimoAnalisis;


  const duplicadosAgrupados =
    grupos.filter(
      grupo =>
        grupo.variantes.length >
        1
    );


  overlay.innerHTML = `

    <section class="imp-modal imp-modal-large">

      <header class="imp-header">

        <div>

          <span>
            PASO 2 DE 2
          </span>

          <h2>
            Resultado del análisis
          </h2>

          <p>
            Todavía no se modificó
            la base de Supabase.
          </p>

        </div>


        <button
          id="imp-cerrar"
          class="imp-close"
        >
          ×
        </button>

      </header>


      <div class="imp-summary-grid">

        ${resumenCard(
          'Filas válidas',
          registros.length
        )}

        ${resumenCard(
          'Comercios detectados',
          grupos.length
        )}

        ${resumenCard(
          'Adhesiones',
          adhesiones
        )}

        ${resumenCard(
          'Agrupados automáticamente',
          duplicadosAgrupados.length
        )}

        ${resumenCard(
          'Posibles duplicados',
          posibles.length +
          coincidenciasBase.length
        )}

        ${resumenCard(
          'Errores a revisar',
          errores.length +
          conflictos.length
        )}

      </div>


      ${
        duplicadosAgrupados.length
          ? `

            <div class="imp-result-section">

              <div class="imp-section-title">

                <h3>
                  Coincidencias de alta confianza
                </h3>

                <p>
                  Estos registros parecen ser
                  el mismo comercio y fueron
                  agrupados en la vista previa.
                </p>

              </div>


              <div class="imp-detection-list">

                ${
                  duplicadosAgrupados
                    .slice(
                      0,
                      30
                    )
                    .map(
                      grupo =>
                        renderGrupo(
                          grupo
                        )
                    )
                    .join('')
                }

              </div>

            </div>

          `
          : ''
      }


      ${
        (
          posibles.length ||
          coincidenciasBase.length
        )
          ? `

            <div class="imp-result-section">

              <div class="imp-section-title">

                <h3>
                  Posibles duplicados para revisar
                </h3>

                <p>
                  No los unimos automáticamente
                  porque necesitamos confirmación.
                </p>

              </div>


              <div class="imp-detection-list">

                ${
                  posibles
                    .slice(
                      0,
                      20
                    )
                    .map(
                      item =>
                        renderPosible(
                          item.a,
                          item.b,
                          item.comparacion,
                          'Dentro del archivo'
                        )
                    )
                    .join('')
                }


                ${
                  coincidenciasBase
                    .slice(
                      0,
                      20
                    )
                    .map(
                      item =>
                        renderPosible(
                          item.importado,
                          item.existente,
                          item.comparacion,
                          'Ya existe en la base'
                        )
                    )
                    .join('')
                }

              </div>

            </div>

          `
          : ''
      }


      ${
        (
          errores.length ||
          conflictos.length
        )
          ? `

            <div class="imp-result-section">

              <div class="imp-section-title">

                <h3>
                  Datos que requieren revisión
                </h3>

              </div>


              <div class="imp-errors">

                ${
                  errores
                    .slice(
                      0,
                      40
                    )
                    .map(
                      error => `

                        <div>

                          <strong>
                            Fila ${error.fila}
                            ·
                            ${escapar(error.tipo)}
                          </strong>

                          <span>
                            ${escapar(error.detalle)}
                          </span>

                        </div>

                      `
                    )
                    .join('')
                }


                ${
                  conflictos
                    .slice(
                      0,
                      40
                    )
                    .map(
                      conflicto => `

                        <div>

                          <strong>
                            Fila ${conflicto.fila}
                            · Beneficios diferentes
                          </strong>

                          <span>

                            ${
                              escapar(
                                nombrePrograma(
                                  conflicto.programa
                                )
                              )
                            }:

                            ${
                              escapar(
                                conflicto.anterior.beneficio
                              )
                            }

                            /

                            ${
                              escapar(
                                conflicto.nuevo.beneficio
                              )
                            }

                          </span>

                        </div>

                      `
                    )
                    .join('')
                }

              </div>

            </div>

          `
          : ''
      }


      <div class="imp-result-section">

        <div class="imp-section-title">

          <h3>
            Vista previa de comercios
          </h3>

          <p>
            Primeros 100 registros agrupados.
          </p>

        </div>


        <div class="imp-table-wrap">

          <table class="imp-table">

            <thead>

              <tr>

                <th>
                  Comercio
                </th>

                <th>
                  Localidad
                </th>

                <th>
                  Dirección
                </th>

                <th>
                  Programas
                </th>

                <th>
                  Registros
                </th>

              </tr>

            </thead>


            <tbody>

              ${
                grupos
                  .slice(
                    0,
                    100
                  )
                  .map(
                    grupo => `

                      <tr>

                        <td>

                          <strong>
                            ${
                              escapar(
                                grupo.principal.nombre
                              )
                            }
                          </strong>

                          <small>
                            ${
                              escapar(
                                grupo.principal.rubro ||
                                ''
                              )
                            }
                          </small>

                        </td>

                        <td>
                          ${
                            escapar(
                              grupo.principal.localidad ||
                              ''
                            )
                          }
                        </td>

                        <td>
                          ${
                            escapar(
                              grupo.principal.direccion ||
                              ''
                            )
                          }
                        </td>

                        <td>

                          <div class="imp-program-tags">

                            ${
                              grupo.adhesiones.length
                                ? grupo.adhesiones
                                    .map(
                                      adhesion => `

                                        <span>
                                          ${
                                            escapar(
                                              nombrePrograma(
                                                adhesion.programa
                                              )
                                            )
                                          }
                                        </span>

                                      `
                                    )
                                    .join('')
                                : '<span class="empty">Sin programa</span>'
                            }

                          </div>

                        </td>

                        <td>
                          ${
                            grupo.variantes.length
                          }
                        </td>

                      </tr>

                    `
                  )
                  .join('')
              }

            </tbody>

          </table>

        </div>

      </div>


      <div class="imp-actions">

        <button
          id="imp-volver-mapeo"
          class="imp-secondary"
        >
          Volver al mapeo
        </button>


        <button
          class="imp-primary"
          disabled
          title="Primero vamos a validar el análisis."
        >
          Confirmar importación
        </button>

      </div>


      <p class="imp-next-note">

        El botón de importar está deshabilitado
        a propósito. Primero comprobamos que
        la detección funcione correctamente
        con tus listados.

      </p>

    </section>

  `;


  conectarCerrar();


  document
    .querySelector(
      '#imp-volver-mapeo'
    )
    .addEventListener(
      'click',
      renderMapeo
    );

}


/* =========================================================
   TARJETA RESUMEN
========================================================= */

function resumenCard(
  titulo,
  valor
) {

  return `

    <article>

      <span>
        ${titulo}
      </span>

      <strong>
        ${Number(valor || 0)
          .toLocaleString(
            'es-AR'
          )}
      </strong>

    </article>

  `;

}


/* =========================================================
   GRUPO AGRUPADO
========================================================= */

function renderGrupo(
  grupo
) {

  return `

    <article class="imp-detection-card high">

      <div class="imp-detection-status">
        ALTA CONFIANZA
      </div>


      <strong>
        ${
          escapar(
            grupo.principal.nombre
          )
        }
      </strong>


      <p>

        ${
          grupo.variantes.length
        }

        registros detectados
        como un mismo comercio.

      </p>


      <div class="imp-variants">

        ${
          grupo.variantes
            .map(
              variante => `

                <span>

                  Fila ${variante.fila}
                  ·

                  ${
                    escapar(
                      variante.nombre
                    )
                  }

                </span>

              `
            )
            .join('')
        }

      </div>

    </article>

  `;

}


/* =========================================================
   POSIBLE DUPLICADO
========================================================= */

function renderPosible(
  a,
  b,
  comparacion,
  origen
) {

  const porcentaje =
    Math.round(
      comparacion.puntaje *
      100
    );


  return `

    <article class="imp-detection-card possible">

      <div class="imp-detection-status">
        ${escapar(origen)}
        ·
        ${porcentaje}%
      </div>


      <div class="imp-compare">

        <div>

          <small>
            REGISTRO A
          </small>

          <strong>
            ${escapar(a.nombre)}
          </strong>

          <span>
            ${
              escapar(
                a.direccion ||
                ''
              )
            }
          </span>

        </div>


        <div class="imp-vs">
          ≈
        </div>


        <div>

          <small>
            REGISTRO B
          </small>

          <strong>
            ${escapar(b.nombre)}
          </strong>

          <span>
            ${
              escapar(
                b.direccion ||
                ''
              )
            }
          </span>

        </div>

      </div>


      <div class="imp-match-reasons">

        ${
          comparacion.mismoTelefono
            ? '<span>✓ mismo teléfono</span>'
            : ''
        }

        ${
          comparacion.mismaDireccion
            ? '<span>✓ misma dirección</span>'
            : ''
        }

        ${
          comparacion.mismaLocalidad
            ? '<span>✓ misma localidad</span>'
            : ''
        }

      </div>

    </article>

  `;

}


/* =========================================================
   CERRAR
========================================================= */

function conectarCerrar() {

  const boton =
    document.querySelector(
      '#imp-cerrar'
    );


  if (boton) {

    boton.addEventListener(
      'click',
      cerrarImportador
    );

  }


  const overlay =
    document.querySelector(
      '#importador-overlay'
    );


  if (overlay) {

    overlay.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          overlay
        ) {

          cerrarImportador();

        }

      }
    );

  }

}


function cerrarImportador() {

  const existente =
    document.querySelector(
      '#importador-overlay'
    );


  if (existente) {

    existente.remove();

  }

}


/* =========================================================
   INSERTAR BOTÓN EN ADMIN
========================================================= */

function agregarBotonImportar() {

  const botonNuevo =
    document.querySelector(
      '#nuevo-comercio'
    );


  if (
    !botonNuevo ||
    document.querySelector(
      '#importar-base'
    )
  ) {

    return;

  }


  const boton =
    document.createElement(
      'button'
    );


  boton.id =
    'importar-base';


  boton.className =
    'admin-secondary-button imp-admin-button';


  boton.textContent =
    'Importar base';


  boton.addEventListener(
    'click',
    abrirImportador
  );


  botonNuevo
    .insertAdjacentElement(
      'afterend',
      boton
    );

}


/* =========================================================
   OBSERVAR ADMIN
========================================================= */

const observer =
  new MutationObserver(
    () => {

      agregarBotonImportar();

    }
  );


observer.observe(
  document.body,
  {
    childList: true,
    subtree: true,
  }
);


agregarBotonImportar();