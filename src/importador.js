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
      'jovenes',
      'tarjeta joven',
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
      'trabajador municipal',
      'trabajadores municipales',
    ],
  },

  {
    id: 'plataforma',
    nombre: 'Trabajadores/as de Plataforma',
    palabras: [
      'plataforma',
      'plataformas',
      'trabajadores de plataforma',
      'trabajadores plataforma',
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


const CAMPOS = [
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


/* =========================================================
   ESTADO
========================================================= */

const estado = {

  archivo: null,

  workbook: null,

  hoja: '',

  filas: [],

  cabeceras: [],

  filaCabecera: 0,

  mapeo: {},

  modo: 'filas',

  mapeoProgramas: {},

  analisis: null,

};


let secuenciaId = 1;


const nuevoId =
  prefijo =>
    `${prefijo}-${Date.now()}-${secuenciaId++}`;


/* =========================================================
   NORMALIZACIÓN
========================================================= */

function norm(
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


function limpiar(
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


function esc(
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
    )

    .replaceAll(
      "'",
      '&#039;'
    );

}


function tel(
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


function numero(
  valor
) {

  if (
    valor === '' ||
    valor === null ||
    valor === undefined
  ) {

    return null;

  }


  const n =
    Number(
      String(valor)
        .replace(
          ',',
          '.'
        )
    );


  return Number.isFinite(n)
    ? n
    : null;

}


function tieneCoordenadas(
  comercio
) {

  const lat =
    numero(
      comercio.lat
    );


  const lng =
    numero(
      comercio.lng
    );


  return (
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );

}


/* =========================================================
   SIMILITUD
========================================================= */

function distancia(
  a,
  b
) {

  const s =
    norm(a);


  const t =
    norm(b);


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
        Array(
          t.length + 1
        ).fill(0)
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

          matriz[i - 1][j] +
            1,

          matriz[i][j - 1] +
            1,

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


function similitud(
  a,
  b
) {

  const x =
    norm(a);


  const y =
    norm(b);


  if (
    !x ||
    !y
  ) {

    return 0;

  }


  if (x === y) {
    return 1;
  }


  return Math.max(
    0,
    1 -
      distancia(
        x,
        y
      ) /
      Math.max(
        x.length,
        y.length,
        1
      )
  );

}


/* =========================================================
   COMPARAR COMERCIOS
========================================================= */

function comparar(
  a,
  b
) {

  const nombre =
    similitud(
      a.nombre,
      b.nombre
    );


  const direccion =
    similitud(
      a.direccion,
      b.direccion
    );


  const localidad =
    similitud(
      a.localidad,
      b.localidad
    );


  const telefonoA =
    tel(
      a.telefono
    );


  const telefonoB =
    tel(
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
      norm(
        a.direccion
      ) &&
      norm(
        b.direccion
      ) &&
      direccion >= 0.96
    );


  const mismaLocalidad =
    Boolean(
      norm(
        a.localidad
      ) &&
      norm(
        b.localidad
      ) &&
      localidad >= 0.90
    );


  let puntaje =
    nombre *
    0.60;


  if (
    a.direccion &&
    b.direccion
  ) {

    puntaje +=
      direccion *
      0.20;

  }


  if (
    a.localidad &&
    b.localidad
  ) {

    puntaje +=
      localidad *
      0.10;

  }


  if (
    mismoTelefono
  ) {

    puntaje +=
      0.15;

  }


  if (
    mismaDireccion &&
    mismaLocalidad
  ) {

    puntaje +=
      0.10;

  }


  puntaje =
    Math.min(
      1,
      puntaje
    );


  let nivel =
    'distinto';


  if (
    (
      mismoTelefono &&
      nombre >= 0.65
    ) ||
    (
      mismaDireccion &&
      mismaLocalidad &&
      nombre >= 0.70
    )
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

    nombre,

    direccion,

    localidad,

    mismoTelefono,

    mismaDireccion,

    mismaLocalidad,

  };

}


/* =========================================================
   PROGRAMAS
========================================================= */

function programaId(
  valor
) {

  const texto =
    norm(valor);


  if (!texto) {
    return null;
  }


  for (
    const programa
    of PROGRAMAS
  ) {

    if (
      norm(
        programa.id
      ) ===
      texto
    ) {

      return programa.id;

    }


    if (
      programa.palabras.some(
        palabra =>
          texto.includes(
            norm(
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


function programaNombre(
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


  for (
    const celda
    of fila
  ) {

    const texto =
      norm(
        celda
      );


    if (!texto) {
      continue;
    }


    score += 1;


    for (
      const campo
      of CAMPOS
    ) {

      if (
        campo.aliases.some(
          alias =>
            norm(alias) ===
            texto
        )
      ) {

        score += 5;

      }

    }


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


  return score;

}


function detectarFilaCabecera(
  filas
) {

  let mejor = 0;

  let mejorScore = -1;


  for (
    let i = 0;
    i <
      Math.min(
        filas.length,
        10
      );
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

      mejor =
        i;

    }

  }


  return mejor;

}


function prepararCabeceras(
  fila
) {

  const usados =
    new Map();


  return fila.map(
    (
      valor,
      index
    ) => {

      const base =
        limpiar(
          valor
        ) ||
        `Columna ${index + 1}`;


      const cantidad =
        usados.get(
          base
        ) || 0;


      usados.set(
        base,
        cantidad + 1
      );


      return cantidad
        ? `${base} (${cantidad + 1})`
        : base;

    }
  );

}


/* =========================================================
   DETECTAR COLUMNAS
========================================================= */

function detectarColumna(
  aliases
) {

  let mejor = '';

  let mejorScore = 0;


  for (
    const cabecera
    of estado.cabeceras
  ) {

    const texto =
      norm(
        cabecera
      );


    for (
      const alias
      of aliases
    ) {

      const normalizado =
        norm(
          alias
        );


      const score =
        texto ===
        normalizado
          ? 1
          : texto.includes(
              normalizado
            )
          ? 0.85
          : normalizado.includes(
              texto
            )
          ? 0.70
          : 0;


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

  }


  return mejor;

}


function detectarMapeo() {

  const nuevo = {};


  for (
    const campo
    of CAMPOS
  ) {

    nuevo[
      campo.key
    ] =
      detectarColumna(
        campo.aliases
      );

  }


  nuevo.programa =
    detectarColumna([
      'programa',
      'programa beneficio',
      'tarjeta',
      'programa adherido',
    ]);


  nuevo.beneficio =
    detectarColumna([
      'beneficio',
      'descuento',
      'promocion',
      'promoción',
      'beneficio descuento',
    ]);


  nuevo.condiciones =
    detectarColumna([
      'condiciones',
      'detalle',
      'detalles',
      'observaciones',
      'aclaraciones',
      'restricciones',
    ]);


  estado.mapeo =
    nuevo;


  estado.modo =
    (
      nuevo.programa &&
      nuevo.beneficio
    )
      ? 'filas'
      : 'columnas';


  detectarMapeoProgramas();

}


function detectarMapeoProgramas() {

  estado.mapeoProgramas = {};


  for (
    const programa
    of PROGRAMAS
  ) {

    let beneficio = '';

    let condiciones = '';


    for (
      const cabecera
      of estado.cabeceras
    ) {

      const texto =
        norm(
          cabecera
        );


      const coincide =
        programa.palabras.some(
          palabra =>
            texto.includes(
              norm(
                palabra
              )
            )
        );


      if (!coincide) {
        continue;
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

      } else if (
        !beneficio
      ) {

        beneficio =
          cabecera;

      }

    }


    estado.mapeoProgramas[
      programa.id
    ] = {

      beneficio,

      condiciones,

    };

  }

}


/* =========================================================
   PREPARAR HOJA
========================================================= */

function prepararHoja(
  nombre
) {

  estado.hoja =
    nombre;


  const hoja =
    estado.workbook
      .Sheets[
        nombre
      ];


  estado.filas =
    XLSX.utils
      .sheet_to_json(
        hoja,
        {
          header: 1,
          defval: '',
          raw: false,
        }
      );


  estado.filaCabecera =
    detectarFilaCabecera(
      estado.filas
    );


  estado.cabeceras =
    prepararCabeceras(
      estado.filas[
        estado.filaCabecera
      ] || []
    );


  detectarMapeo();

}


function valorFila(
  fila,
  cabecera
) {

  if (!cabecera) {
    return '';
  }


  const indice =
    estado.cabeceras
      .indexOf(
        cabecera
      );


  return indice < 0
    ? ''
    : limpiar(
        fila[
          indice
        ]
      );

}


/* =========================================================
   SELECT
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
        estado.cabeceras
          .map(
            cabecera => `

              <option
                value="${esc(cabecera)}"
                ${
                  cabecera === valor
                    ? 'selected'
                    : ''
                }
              >
                ${esc(cabecera)}
              </option>

            `
          )
          .join('')
      }

    </select>

  `;

}


/* =========================================================
   OVERLAY
========================================================= */

function overlay() {

  return document
    .querySelector(
      '#importador-overlay'
    );

}


function cerrarImportador() {

  document
    .querySelector(
      '#importador-overlay'
    )
    ?.remove();


  document
    .querySelector(
      '#imp-editor-layer'
    )
    ?.remove();

}


function conectarCerrar() {

  document
    .querySelector(
      '#imp-cerrar'
    )
    ?.addEventListener(
      'click',
      cerrarImportador
    );


  const contenedor =
    overlay();


  contenedor
    ?.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          contenedor
        ) {

          cerrarImportador();

        }

      }
    );

}


function abrirImportador() {

  cerrarImportador();


  const contenedor =
    document.createElement(
      'div'
    );


  contenedor.id =
    'importador-overlay';


  contenedor.className =
    'imp-overlay';


  document.body
    .appendChild(
      contenedor
    );


  renderInicio();

}


/* =========================================================
   PLANTILLA
========================================================= */

function descargarPlantilla() {

  const contenido = [

    [
      'Comercio',
      'Rubro',
      'Localidad',
      'Dirección',
      'Teléfono',
      'Horario',
      'Programa',
      'Beneficio',
      'Condiciones',
      'Latitud',
      'Longitud',
    ],

    [
      'Comercio ejemplo',
      'Gastronomía',
      'Morón',
      'Brown 123',
      '11 4444-0000',
      'Lun a sáb 9 a 20',
      'Tarjeta Joven',
      '15% de descuento',
      'No acumulable',
      '',
      '',
    ],

  ]
    .map(
      fila =>
        fila
          .map(
            valor =>
              `"${String(valor)
                .replaceAll(
                  '"',
                  '""'
                )}"`
          )
          .join(',')
    )
    .join('\n');


  const blob =
    new Blob(
      [
        '\ufeff' +
        contenido,
      ],
      {
        type:
          'text/csv;charset=utf-8',
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const enlace =
    document.createElement(
      'a'
    );


  enlace.href =
    url;


  enlace.download =
    'plantilla-comercios-moron.csv';


  enlace.click();


  URL.revokeObjectURL(
    url
  );

}


/* =========================================================
   INICIO
========================================================= */

function renderInicio() {

  const contenedor =
    overlay();


  if (!contenedor) {
    return;
  }


  contenedor.innerHTML = `

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
            Excel o CSV. Primero analizamos,
            después revisás y recién al final
            se guarda.
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
          .xlsx, .xls o .csv
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


      <div class="imp-start-actions">

        <button
          id="imp-plantilla"
          class="imp-secondary"
        >
          Descargar plantilla CSV
        </button>

      </div>


      <div class="imp-note">

        <strong>
          No se guarda nada al seleccionar
          el archivo.
        </strong>

        Primero vas a poder revisar
        duplicados, editar los comercios
        y decidir qué hacer con cada
        coincidencia.

      </div>

    </section>

  `;


  conectarCerrar();


  document
    .querySelector(
      '#imp-plantilla'
    )
    ?.addEventListener(
      'click',
      descargarPlantilla
    );


  document
    .querySelector(
      '#imp-archivo'
    )
    ?.addEventListener(
      'change',
      async event => {

        const archivo =
          event.target.files?.[0];


        if (!archivo) {
          return;
        }


        try {

          estado.archivo =
            archivo;


          estado.workbook =
            XLSX.read(
              await archivo.arrayBuffer(),
              {
                type:
                  'array',
              }
            );


          if (
            !estado.workbook
              .SheetNames
              .length
          ) {

            throw new Error(
              'El archivo no contiene hojas.'
            );

          }


          prepararHoja(
            estado.workbook
              .SheetNames[0]
          );


          renderMapeo();

        } catch (error) {

          alert(
            'No se pudo leer el archivo: ' +
            (
              error?.message ||
              error
            )
          );

        }

      }
    );

}


/* =========================================================
   GUARDAR MAPEO
========================================================= */

function guardarMapeoVisual() {

  for (
    const campo
    of CAMPOS
  ) {

    const elemento =
      document.querySelector(
        `#imp-map-${campo.key}`
      );


    if (elemento) {

      estado.mapeo[
        campo.key
      ] =
        elemento.value;

    }

  }


  if (
    estado.modo ===
    'filas'
  ) {

    for (
      const key
      of [
        'programa',
        'beneficio',
        'condiciones',
      ]
    ) {

      const elemento =
        document.querySelector(
          `#imp-map-${key}`
        );


      if (elemento) {

        estado.mapeo[
          key
        ] =
          elemento.value;

      }

    }

  } else {

    for (
      const programa
      of PROGRAMAS
    ) {

      estado.mapeoProgramas[
        programa.id
      ] = {

        beneficio:
          document
            .querySelector(
              `#imp-programa-${programa.id}-beneficio`
            )
            ?.value ||
          '',

        condiciones:
          document
            .querySelector(
              `#imp-programa-${programa.id}-condiciones`
            )
            ?.value ||
          '',

      };

    }

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
    estado.modo ===
    'filas'
  ) {

    contenedor.innerHTML = `

      <div class="imp-map-grid imp-map-benefits">

        <label>

          Programa

          ${
            selectColumna(
              'imp-map-programa',
              estado.mapeo.programa ||
              ''
            )
          }

        </label>


        <label>

          Beneficio / descuento

          ${
            selectColumna(
              'imp-map-beneficio',
              estado.mapeo.beneficio ||
              ''
            )
          }

        </label>


        <label>

          Condiciones / detalle

          ${
            selectColumna(
              'imp-map-condiciones',
              estado.mapeo.condiciones ||
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
                  estado
                    .mapeoProgramas[
                      programa.id
                    ] ||
                  {};


                return `

                  <article>

                    <strong>
                      ${esc(programa.nombre)}
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
   MAPEO PRINCIPAL
========================================================= */

function renderMapeo() {

  const contenedor =
    overlay();


  if (!contenedor) {
    return;
  }


  contenedor.innerHTML = `

    <section class="imp-modal imp-modal-large">

      <header class="imp-header">

        <div>

          <span>
            PASO 1 DE 3
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
            ${
              esc(
                estado.archivo?.name ||
                ''
              )
            }
          </strong>

        </div>


        <div>

          <span>
            HOJA
          </span>

          <select id="imp-hoja">

            ${
              estado.workbook
                .SheetNames
                .map(
                  hoja => `

                    <option
                      value="${esc(hoja)}"
                      ${
                        hoja ===
                        estado.hoja
                          ? 'selected'
                          : ''
                      }
                    >
                      ${esc(hoja)}
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
                estado.filas.length -
                estado.filaCabecera -
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
            La selección inicial es automática,
            pero la podés corregir.
          </p>

        </div>


        <div class="imp-map-grid">

          ${
            CAMPOS
              .map(
                campo => `

                  <label>

                    ${esc(campo.label)}

                    ${
                      campo.requerido
                        ? '<b>*</b>'
                        : ''
                    }

                    ${
                      selectColumna(
                        `imp-map-${campo.key}`,
                        estado.mapeo[
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
            la planilla.
          </p>

        </div>


        <div class="imp-mode-selector">

          <label>

            <input
              type="radio"
              name="imp-modo"
              value="filas"
              ${
                estado.modo ===
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
                El mismo comercio puede
                repetirse.
              </small>

            </div>

          </label>


          <label>

            <input
              type="radio"
              name="imp-modo"
              value="columnas"
              ${
                estado.modo ===
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
    ?.addEventListener(
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


            estado.modo =
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
    ?.addEventListener(
      'click',
      renderInicio
    );


  document
    .querySelector(
      '#imp-analizar'
    )
    ?.addEventListener(
      'click',
      async () => {

        guardarMapeoVisual();


        if (
          !estado.mapeo.nombre
        ) {

          alert(
            'Seleccioná la columna del nombre del comercio.'
          );

          return;

        }


        renderAnalizando();


        await new Promise(
          resolver =>
            setTimeout(
              resolver,
              50
            )
        );


        try {

          estado.analisis =
            await analizarBase();


          renderResultado();

        } catch (error) {

          alert(
            'No se pudo analizar la base: ' +
            (
              error?.message ||
              error
            )
          );


          renderMapeo();

        }

      }
    );


  renderMapeoBeneficios();

}


/* =========================================================
   CONSTRUIR REGISTROS
========================================================= */

function construirRegistros() {

  const registros = [];

  const errores = [];


  const filas =
    estado.filas.slice(
      estado.filaCabecera +
      1
    );


  filas.forEach(
    (
      fila,
      indice
    ) => {

      const numeroFila =
        estado.filaCabecera +
        indice +
        2;


      if (
        fila.every(
          valor =>
            !limpiar(
              valor
            )
        )
      ) {

        return;

      }


      const nombre =
        valorFila(
          fila,
          estado.mapeo.nombre
        );


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
            estado.mapeo.rubro
          ),

        localidad:
          valorFila(
            fila,
            estado.mapeo.localidad
          ),

        direccion:
          valorFila(
            fila,
            estado.mapeo.direccion
          ),

        telefono:
          valorFila(
            fila,
            estado.mapeo.telefono
          ),

        horario:
          valorFila(
            fila,
            estado.mapeo.horario
          ),

        lat:
          valorFila(
            fila,
            estado.mapeo.lat
          ),

        lng:
          valorFila(
            fila,
            estado.mapeo.lng
          ),

        adhesiones: [],

      };


      if (
        estado.modo ===
        'filas'
      ) {

        const programaTexto =
          valorFila(
            fila,
            estado.mapeo.programa
          );


        const beneficio =
          valorFila(
            fila,
            estado.mapeo.beneficio
          );


        const condiciones =
          valorFila(
            fila,
            estado.mapeo.condiciones
          );


        if (
          programaTexto
        ) {

          const programa =
            programaId(
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
            !beneficio
          ) {

            errores.push({

              fila:
                numeroFila,

              tipo:
                'Beneficio faltante',

              detalle:
                `${nombre} / ${programaTexto}`,

            });

          } else {

            registro
              .adhesiones
              .push({

                programa,

                beneficio,

                condiciones,

              });

          }

        }

      } else {

        for (
          const programa
          of PROGRAMAS
        ) {

          const config =
            estado
              .mapeoProgramas[
                programa.id
              ] ||
            {};


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


          if (
            beneficio
          ) {

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
   AGRUPAR BENEFICIOS
========================================================= */

function agregarAdhesion(
  grupo,
  adhesion,
  fila
) {

  const existente =
    grupo.adhesiones
      .find(
        item =>
          item.programa ===
          adhesion.programa
      );


  if (!existente) {

    grupo
      .adhesiones
      .push({
        ...adhesion,
      });


    return;

  }


  if (
    norm(
      existente.beneficio
    ) !==
    norm(
      adhesion.beneficio
    ) ||
    norm(
      existente.condiciones
    ) !==
    norm(
      adhesion.condiciones
    )
  ) {

    grupo
      .conflictos
      .push({

        programa:
          adhesion.programa,

        anterior: {
          ...existente,
        },

        nuevo: {
          ...adhesion,
        },

        fila,

      });

  }

}


function completarPrincipal(
  destino,
  origen
) {

  for (
    const key
    of [
      'rubro',
      'localidad',
      'direccion',
      'telefono',
      'horario',
      'lat',
      'lng',
    ]
  ) {

    if (
      !destino[key] &&
      origen[key]
    ) {

      destino[key] =
        origen[key];

    }

  }

}


/* =========================================================
   AGRUPAR COMERCIOS
========================================================= */

function agrupar(
  registros
) {

  const grupos = [];

  const posibles = [];


  for (
    const registro
    of registros
  ) {

    let mejor = null;


    for (
      const grupo
      of grupos
    ) {

      const comparacion =
        comparar(
          registro,
          grupo.principal
        );


      if (
        !mejor ||
        comparacion.puntaje >
        mejor.comparacion.puntaje
      ) {

        mejor = {

          grupo,

          comparacion,

        };

      }

    }


    if (
      mejor &&
      mejor.comparacion.nivel ===
      'alta'
    ) {

      mejor.grupo
        .variantes
        .push(
          registro
        );


      registro
        .adhesiones
        .forEach(
          adhesion =>
            agregarAdhesion(
              mejor.grupo,
              adhesion,
              registro.fila
            )
        );


      completarPrincipal(
        mejor.grupo.principal,
        registro
      );


      continue;

    }


    const grupo = {

      id:
        nuevoId(
          'grupo'
        ),

      principal: {
        ...registro,
      },

      variantes: [
        registro,
      ],

      adhesiones:
        registro
          .adhesiones
          .map(
            adhesion => ({
              ...adhesion,
            })
          ),

      conflictos: [],

      omitir: false,

      base: null,

      decisionBase:
        'crear',

    };


    if (
      mejor &&
      mejor.comparacion.nivel ===
      'posible'
    ) {

      posibles.push({

        id:
          nuevoId(
            'posible'
          ),

        a:
          mejor.grupo.id,

        b:
          grupo.id,

        comparacion:
          mejor.comparacion,

        resuelto: false,

        decision: null,

      });

    }


    grupos.push(
      grupo
    );

  }


  return {

    grupos,

    posibles,

  };

}


/* =========================================================
   SUPABASE EXISTENTE
========================================================= */

function credenciales() {

  let sesion = null;


  try {

    sesion =
      JSON.parse(
        localStorage.getItem(
          'mta_admin_session'
        ) ||
        'null'
      );

  } catch {

    sesion = null;

  }


  return {

    url:
      import.meta.env
        .VITE_SUPABASE_URL
        ?.replace(
          /\/$/,
          ''
        ),

    key:
      import.meta.env
        .VITE_SUPABASE_KEY,

    token:
      sesion?.access_token ||
      '',

  };

}


async function cargarExistentes() {

  const {
    url,
    key,
    token,
  } =
    credenciales();


  if (
    !url ||
    !key ||
    !token
  ) {

    return [];

  }


  try {

    const respuesta =
      await fetch(

        `${url}/rest/v1/comercios?select=id,nombre,rubro,localidad,direccion,telefono,horario,lat,lng,activo&order=id.asc`,

        {
          headers: {

            apikey:
              key,

            Authorization:
              `Bearer ${token}`,

          },
        }

      );


    if (
      !respuesta.ok
    ) {

      return [];

    }


    return await respuesta.json();

  } catch {

    return [];

  }

}


/* =========================================================
   COINCIDENCIAS CON BASE
========================================================= */

function asignarBaseGrupo(
  grupo,
  existentes
) {

  let mejor = null;


  for (
    const existente
    of existentes
  ) {

    const comparacion =
      comparar(
        grupo.principal,
        existente
      );


    if (
      comparacion.nivel ===
      'distinto'
    ) {

      continue;

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


  if (
    mejor
  ) {

    grupo.base =
      mejor;


    grupo.decisionBase =
      null;

  } else {

    grupo.base =
      null;


    grupo.decisionBase =
      'crear';

  }

}


function recalcularBases(
  analisis
) {

  analisis.grupos
    .forEach(
      grupo =>
        asignarBaseGrupo(
          grupo,
          analisis.existentes
        )
    );

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
    agrupar(
      registros
    );


  const existentes =
    await cargarExistentes();


  const analisis = {

    registros,

    errores,

    grupos,

    posibles,

    existentes,

  };


  recalcularBases(
    analisis
  );


  return analisis;

}


/* =========================================================
   PANTALLA ANALIZANDO
========================================================= */

function renderAnalizando() {

  const contenedor =
    overlay();


  if (!contenedor) {
    return;
  }


  contenedor.innerHTML = `

    <section class="imp-modal imp-loading">

      <div class="imp-spinner">
      </div>

      <strong>
        Analizando la base...
      </strong>

      <p>
        Buscando duplicados,
        errores de tipeo y programas.
      </p>

    </section>

  `;

}


/* =========================================================
   HELPERS ANÁLISIS
========================================================= */

function grupoPorId(
  id
) {

  return estado
    .analisis
    ?.grupos
    .find(
      grupo =>
        grupo.id === id
    );

}


function paresPendientes() {

  const analisis =
    estado.analisis;


  if (!analisis) {
    return [];
  }


  return analisis
    .posibles
    .filter(
      posible => {

        if (
          posible.resuelto
        ) {

          return false;

        }


        const grupoA =
          grupoPorId(
            posible.a
          );


        const grupoB =
          grupoPorId(
            posible.b
          );


        return (
          grupoA &&
          grupoB &&
          !grupoA.omitir &&
          !grupoB.omitir
        );

      }
    );

}


function basesPendientes() {

  return (
    estado
      .analisis
      ?.grupos ||
    []
  )
    .filter(
      grupo =>
        !grupo.omitir &&
        grupo.base &&
        !grupo.decisionBase
    );

}


function conflictosPendientes() {

  return (
    estado
      .analisis
      ?.grupos ||
    []
  )
    .filter(
      grupo =>
        !grupo.omitir &&
        grupo.conflictos.length
    );

}


function cantidadAdhesiones() {

  return (
    estado
      .analisis
      ?.grupos ||
    []
  )

    .filter(
      grupo =>
        !grupo.omitir
    )

    .reduce(
      (
        total,
        grupo
      ) =>
        total +
        grupo.adhesiones.length,
      0
    );

}


function resumenCard(
  titulo,
  valor,
  clase = ''
) {

  return `

    <article class="${clase}">

      <span>
        ${esc(titulo)}
      </span>

      <strong>

        ${
          Number(
            valor ||
            0
          )
            .toLocaleString(
              'es-AR'
            )
        }

      </strong>

    </article>

  `;

}


/* =========================================================
   FUSIONAR GRUPOS
========================================================= */

function fusionarGrupos(
  idA,
  idB
) {

  const analisis =
    estado.analisis;


  const grupoA =
    analisis.grupos
      .find(
        grupo =>
          grupo.id === idA
      );


  const grupoB =
    analisis.grupos
      .find(
        grupo =>
          grupo.id === idB
      );


  if (
    !grupoA ||
    !grupoB ||
    grupoA.id ===
    grupoB.id
  ) {

    return;

  }


  grupoB
    .variantes
    .forEach(
      variante =>
        grupoA
          .variantes
          .push(
            variante
          )
    );


  grupoB
    .adhesiones
    .forEach(
      adhesion =>
        agregarAdhesion(
          grupoA,
          adhesion,
          grupoB.principal.fila
        )
    );


  completarPrincipal(
    grupoA.principal,
    grupoB.principal
  );


  grupoA
    .conflictos
    .push(
      ...grupoB.conflictos
    );


  analisis.grupos =
    analisis.grupos
      .filter(
        grupo =>
          grupo.id !==
          grupoB.id
      );


  for (
    const posible
    of analisis.posibles
  ) {

    if (
      posible.a ===
      grupoB.id
    ) {

      posible.a =
        grupoA.id;

    }


    if (
      posible.b ===
      grupoB.id
    ) {

      posible.b =
        grupoA.id;

    }


    if (
      posible.a ===
      posible.b
    ) {

      posible.resuelto =
        true;


      posible.decision =
        'unidos';

    }

  }


  const vistos =
    new Set();


  for (
    const posible
    of analisis.posibles
  ) {

    if (
      posible.resuelto
    ) {

      continue;

    }


    const clave =
      [
        posible.a,
        posible.b,
      ]
        .sort()
        .join('|');


    if (
      vistos.has(
        clave
      )
    ) {

      posible.resuelto =
        true;


      posible.decision =
        'duplicado';

    } else {

      vistos.add(
        clave
      );

    }

  }


  asignarBaseGrupo(
    grupoA,
    analisis.existentes
  );

}


/* =========================================================
   POSIBLE DUPLICADO ARCHIVO
========================================================= */

function renderPosibleArchivo(
  posible
) {

  const grupoA =
    grupoPorId(
      posible.a
    );


  const grupoB =
    grupoPorId(
      posible.b
    );


  if (
    !grupoA ||
    !grupoB
  ) {

    return '';

  }


  return `

    <article class="imp-detection-card possible">

      <div class="imp-detection-status">

        POSIBLE DUPLICADO ·

        ${
          Math.round(
            posible
              .comparacion
              .puntaje *
            100
          )
        }%

      </div>


      <div class="imp-compare">

        <div>

          <small>
            REGISTRO A
          </small>

          <strong>
            ${
              esc(
                grupoA
                  .principal
                  .nombre
              )
            }
          </strong>

          <span>
            ${
              esc(
                grupoA
                  .principal
                  .direccion ||
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
            ${
              esc(
                grupoB
                  .principal
                  .nombre
              )
            }
          </strong>

          <span>
            ${
              esc(
                grupoB
                  .principal
                  .direccion ||
                ''
              )
            }
          </span>

        </div>

      </div>


      <div class="imp-match-reasons">

        ${
          posible
            .comparacion
            .mismoTelefono
              ? '<span>✓ mismo teléfono</span>'
              : ''
        }

        ${
          posible
            .comparacion
            .mismaDireccion
              ? '<span>✓ misma dirección</span>'
              : ''
        }

        ${
          posible
            .comparacion
            .mismaLocalidad
              ? '<span>✓ misma localidad</span>'
              : ''
        }

      </div>


      <div class="imp-inline-actions">

        <button
          class="imp-success"
          data-act="unir-archivo"
          data-id="${posible.id}"
        >
          Unir
        </button>

        <button
          class="imp-secondary"
          data-act="separar-archivo"
          data-id="${posible.id}"
        >
          Mantener separados
        </button>

      </div>

    </article>

  `;

}


/* =========================================================
   COINCIDENCIA BASE
========================================================= */

function renderCoincidenciaBase(
  grupo
) {

  const existente =
    grupo.base.existente;


  const comparacion =
    grupo.base.comparacion;


  return `

    <article class="imp-detection-card possible">

      <div class="imp-detection-status">

        YA EXISTE EN LA BASE ·

        ${
          Math.round(
            comparacion.puntaje *
            100
          )
        }%

      </div>


      <div class="imp-compare">

        <div>

          <small>
            IMPORTADO
          </small>

          <strong>
            ${
              esc(
                grupo
                  .principal
                  .nombre
              )
            }
          </strong>

          <span>
            ${
              esc(
                grupo
                  .principal
                  .direccion ||
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
            BASE ACTUAL
          </small>

          <strong>
            ${esc(existente.nombre)}
          </strong>

          <span>
            ${
              esc(
                existente.direccion ||
                ''
              )
            }
          </span>

        </div>

      </div>


      <div class="imp-inline-actions">

        <button
          class="imp-success"
          data-act="unir-base"
          data-id="${grupo.id}"
        >
          Unir con existente
        </button>

        <button
          class="imp-secondary"
          data-act="crear-nuevo"
          data-id="${grupo.id}"
        >
          Crear como nuevo
        </button>

        <button
          class="imp-secondary"
          data-act="editar"
          data-id="${grupo.id}"
        >
          Editar antes
        </button>

      </div>

    </article>

  `;

}


/* =========================================================
   FILA COMERCIO
========================================================= */

function renderFilaGrupo(
  grupo
) {

  let estadoTexto =
    'Nuevo';


  if (
    grupo.omitir
  ) {

    estadoTexto =
      'No importar';

  } else if (
    grupo.base &&
    grupo.decisionBase ===
    'unir'
  ) {

    estadoTexto =
      `Unir con #${grupo.base.existente.id}`;

  } else if (
    grupo.base &&
    !grupo.decisionBase
  ) {

    estadoTexto =
      'Revisar coincidencia';

  } else if (
    tieneCoordenadas(
      grupo.principal
    )
  ) {

    estadoTexto =
      'Nuevo · activo';

  } else {

    estadoTexto =
      'Nuevo · sin coordenadas';

  }


  return `

    <tr
      class="${
        grupo.omitir
          ? 'imp-row-omit'
          : ''
      }"
    >

      <td>

        <strong>
          ${
            esc(
              grupo
                .principal
                .nombre
            )
          }
        </strong>

        <small>
          ${
            esc(
              grupo
                .principal
                .rubro ||
              ''
            )
          }
        </small>

      </td>


      <td>
        ${
          esc(
            grupo
              .principal
              .localidad ||
            ''
          )
        }
      </td>


      <td>
        ${
          esc(
            grupo
              .principal
              .direccion ||
            ''
          )
        }
      </td>


      <td>

        <div class="imp-program-tags">

          ${
            grupo.adhesiones.length

              ? grupo
                  .adhesiones
                  .map(
                    adhesion => `

                      <span>
                        ${
                          esc(
                            programaNombre(
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

        <span class="imp-state-pill">
          ${esc(estadoTexto)}
        </span>

      </td>


      <td class="imp-row-actions">

        <button
          data-act="editar"
          data-id="${grupo.id}"
        >
          Editar
        </button>

        <button
          data-act="omitir"
          data-id="${grupo.id}"
        >
          ${
            grupo.omitir
              ? 'Incluir'
              : 'No importar'
          }
        </button>

      </td>

    </tr>

  `;

}


/* =========================================================
   EVENTOS RESULTADO
========================================================= */

function conectarResultado() {

  document
    .querySelector(
      '#imp-cerrar'
    )
    ?.addEventListener(
      'click',
      cerrarImportador
    );


  document
    .querySelector(
      '#imp-volver-mapeo'
    )
    ?.addEventListener(
      'click',
      renderMapeo
    );


  document
    .querySelector(
      '#imp-confirmar'
    )
    ?.addEventListener(
      'click',
      confirmarImportacion
    );


  overlay()
    ?.querySelectorAll(
      '[data-act]'
    )
    .forEach(
      boton => {

        boton.addEventListener(
          'click',
          () => {

            const accion =
              boton.dataset.act;


            const id =
              boton.dataset.id;


            if (
              accion ===
              'unir-archivo'
            ) {

              const posible =
                estado
                  .analisis
                  .posibles
                  .find(
                    item =>
                      item.id === id
                  );


              if (posible) {

                fusionarGrupos(
                  posible.a,
                  posible.b
                );


                posible.resuelto =
                  true;


                posible.decision =
                  'unidos';


                renderResultado();

              }

            }


            if (
              accion ===
              'separar-archivo'
            ) {

              const posible =
                estado
                  .analisis
                  .posibles
                  .find(
                    item =>
                      item.id === id
                  );


              if (posible) {

                posible.resuelto =
                  true;


                posible.decision =
                  'separados';


                renderResultado();

              }

            }


            if (
              accion ===
              'unir-base'
            ) {

              const grupo =
                grupoPorId(
                  id
                );


              if (grupo) {

                grupo.decisionBase =
                  'unir';


                renderResultado();

              }

            }


            if (
              accion ===
              'crear-nuevo'
            ) {

              const grupo =
                grupoPorId(
                  id
                );


              if (grupo) {

                grupo.decisionBase =
                  'crear';


                renderResultado();

              }

            }


            if (
              accion ===
              'editar'
            ) {

              abrirEditor(
                id
              );

            }


            if (
              accion ===
              'omitir'
            ) {

              const grupo =
                grupoPorId(
                  id
                );


              if (grupo) {

                grupo.omitir =
                  !grupo.omitir;


                renderResultado();

              }

            }

          }
        );

      }
    );

}


/* =========================================================
   RESULTADO / REVISIÓN
========================================================= */

function renderResultado() {

  const contenedor =
    overlay();


  const analisis =
    estado.analisis;


  if (
    !contenedor ||
    !analisis
  ) {

    return;

  }


  const pendientesArchivo =
    paresPendientes();


  const pendientesBase =
    basesPendientes();


  const pendientesConflictos =
    conflictosPendientes();


  const sinCoordenadas =
    analisis.grupos
      .filter(
        grupo =>
          !grupo.omitir &&
          grupo.decisionBase !==
          'unir' &&
          !tieneCoordenadas(
            grupo.principal
          )
      )
      .length;


  const pendientes =
    pendientesArchivo.length +
    pendientesBase.length +
    pendientesConflictos.length;


  const omitidos =
    analisis.grupos
      .filter(
        grupo =>
          grupo.omitir
      )
      .length;


  const puedeImportar =
    pendientes === 0 &&
    analisis.grupos.some(
      grupo =>
        !grupo.omitir
    );


  contenedor.innerHTML = `

    <section class="imp-modal imp-modal-large">

      <header class="imp-header">

        <div>

          <span>
            PASO 2 DE 3
          </span>

          <h2>
            Revisar antes de importar
          </h2>

          <p>
            Editá los datos y resolvé
            las coincidencias marcadas.
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

        ${
          resumenCard(
            'Filas válidas',
            analisis.registros.length
          )
        }

        ${
          resumenCard(
            'Comercios',
            analisis.grupos.length
          )
        }

        ${
          resumenCard(
            'Adhesiones',
            cantidadAdhesiones()
          )
        }

        ${
          resumenCard(
            'Pendientes',
            pendientes,
            pendientes
              ? 'warn'
              : ''
          )
        }

        ${
          resumenCard(
            'Sin coordenadas',
            sinCoordenadas,
            sinCoordenadas
              ? 'warn'
              : ''
          )
        }

        ${
          resumenCard(
            'No importar',
            omitidos
          )
        }

      </div>


      ${
        sinCoordenadas
          ? `

            <div class="imp-warning">

              <strong>

                ${sinCoordenadas}
                comercio(s) no tienen
                coordenadas válidas.

              </strong>

              Se pueden importar igual,
              pero los comercios nuevos
              quedarán
              <b>inactivos</b>
              para no romper el mapa público.

              Después los ubicamos y activamos.

            </div>

          `
          : ''
      }


      ${
        pendientesArchivo.length
          ? `

            <div class="imp-result-section">

              <div class="imp-section-title">

                <h3>
                  Duplicados posibles
                  dentro del archivo
                </h3>

                <p>
                  Elegí si son el mismo
                  comercio o si deben
                  quedar separados.
                </p>

              </div>


              <div class="imp-detection-list">

                ${
                  pendientesArchivo
                    .map(
                      renderPosibleArchivo
                    )
                    .join('')
                }

              </div>

            </div>

          `
          : ''
      }


      ${
        pendientesBase.length
          ? `

            <div class="imp-result-section">

              <div class="imp-section-title">

                <h3>
                  Coincidencias con
                  la base actual
                </h3>

                <p>
                  Decidí si actualizamos
                  el comercio existente
                  o creamos uno nuevo.
                </p>

              </div>


              <div class="imp-detection-list">

                ${
                  pendientesBase
                    .map(
                      renderCoincidenciaBase
                    )
                    .join('')
                }

              </div>

            </div>

          `
          : ''
      }


      ${
        pendientesConflictos.length
          ? `

            <div class="imp-result-section">

              <div class="imp-section-title">

                <h3>
                  Beneficios en conflicto
                </h3>

                <p>
                  El mismo comercio tiene
                  dos textos diferentes
                  para un mismo programa.
                  Entrá a Editar y elegí
                  el definitivo.
                </p>

              </div>


              <div class="imp-errors">

                ${
                  pendientesConflictos
                    .map(
                      grupo => `

                        <div>

                          <strong>
                            ${
                              esc(
                                grupo
                                  .principal
                                  .nombre
                              )
                            }
                          </strong>

                          <span>

                            ${
                              grupo
                                .conflictos
                                .map(
                                  conflicto => `

                                    ${
                                      esc(
                                        programaNombre(
                                          conflicto.programa
                                        )
                                      )
                                    }:

                                    “${
                                      esc(
                                        conflicto
                                          .anterior
                                          .beneficio
                                      )
                                    }”

                                    /

                                    “${
                                      esc(
                                        conflicto
                                          .nuevo
                                          .beneficio
                                      )
                                    }”

                                  `
                                )
                                .join('<br>')
                            }

                          </span>

                          <button
                            data-act="editar"
                            data-id="${grupo.id}"
                          >
                            Editar comercio
                          </button>

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


      ${
        analisis.errores.length
          ? `

            <div class="imp-result-section">

              <div class="imp-section-title">

                <h3>
                  Filas que requieren atención
                </h3>

                <p>
                  No bloquean la importación,
                  pero conviene revisarlas.
                </p>

              </div>


              <div class="imp-errors">

                ${
                  analisis
                    .errores
                    .slice(
                      0,
                      80
                    )
                    .map(
                      error => `

                        <div>

                          <strong>
                            Fila ${error.fila}
                            ·
                            ${esc(error.tipo)}
                          </strong>

                          <span>
                            ${esc(error.detalle)}
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
            Comercios a importar
          </h3>

          <p>
            Podés editar cualquier registro
            o excluirlo de esta importación.
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
                  Estado
                </th>

                <th>
                  Acciones
                </th>

              </tr>

            </thead>


            <tbody>

              ${
                analisis.grupos
                  .map(
                    renderFilaGrupo
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
          id="imp-confirmar"
          class="imp-primary"
          ${
            puedeImportar
              ? ''
              : 'disabled'
          }
        >

          ${
            puedeImportar

              ? 'Confirmar importación'

              : `Resolver ${pendientes} pendiente(s)`
          }

        </button>

      </div>


      <p class="imp-next-note">

        Los cambios recién se escriben
        en Supabase cuando confirmás
        el último botón.

      </p>

    </section>

  `;


  conectarResultado();

}


/* =========================================================
   EDITAR COMERCIO
========================================================= */

function abrirEditor(
  id
) {

  const grupo =
    grupoPorId(
      id
    );


  if (!grupo) {
    return;
  }


  document
    .querySelector(
      '#imp-editor-layer'
    )
    ?.remove();


  const layer =
    document.createElement(
      'div'
    );


  layer.id =
    'imp-editor-layer';


  layer.className =
    'imp-editor-layer';


  layer.innerHTML = `

    <section class="imp-editor">

      <header class="imp-header">

        <div>

          <span>
            EDITAR COMERCIO
          </span>

          <h2>
            ${
              esc(
                grupo
                  .principal
                  .nombre
              )
            }
          </h2>

          <p>
            Lo que guardes acá será
            lo que use la importación.
          </p>

        </div>

        <button
          id="imp-editor-cerrar"
          class="imp-close"
        >
          ×
        </button>

      </header>


      <form id="imp-editor-form">

        <div class="imp-map-grid imp-editor-grid">

          ${
            [
              'nombre',
              'rubro',
              'localidad',
              'direccion',
              'telefono',
              'horario',
              'lat',
              'lng',
            ]
              .map(
                key => `

                  <label>

                    ${
                      esc(
                        CAMPOS.find(
                          campo =>
                            campo.key === key
                        )
                        ?.label ||
                        key
                      )
                    }

                    <input
                      id="edit-${key}"
                      value="${
                        esc(
                          grupo
                            .principal[
                              key
                            ] ||
                          ''
                        )
                      }"
                      ${
                        key ===
                        'nombre'
                          ? 'required'
                          : ''
                      }
                    />

                  </label>

                `
              )
              .join('')
          }

        </div>


        <div class="imp-section">

          <div class="imp-section-title">

            <h3>
              Beneficios por programa
            </h3>

            <p>
              Activá solamente los programas
              que correspondan.
            </p>

          </div>


          <div class="imp-benefit-editor">

            ${
              PROGRAMAS
                .map(
                  programa => {

                    const adhesion =
                      grupo
                        .adhesiones
                        .find(
                          item =>
                            item.programa ===
                            programa.id
                        );


                    return `

                      <article>

                        <label class="imp-check">

                          <input
                            type="checkbox"
                            id="edit-act-${programa.id}"
                            ${
                              adhesion
                                ? 'checked'
                                : ''
                            }
                          />

                          <strong>
                            ${esc(programa.nombre)}
                          </strong>

                        </label>


                        <label>

                          Beneficio

                          <input
                            id="edit-ben-${programa.id}"
                            value="${
                              esc(
                                adhesion
                                  ?.beneficio ||
                                ''
                              )
                            }"
                            placeholder="Ej: 15% de descuento"
                          />

                        </label>


                        <label>

                          Condiciones

                          <textarea
                            id="edit-cond-${programa.id}"
                            placeholder="Días, topes, productos, etc."
                          >${
                            esc(
                              adhesion
                                ?.condiciones ||
                              ''
                            )
                          }</textarea>

                        </label>

                      </article>

                    `;

                  }
                )
                .join('')
            }

          </div>

        </div>


        <div class="imp-actions">

          <button
            type="button"
            id="imp-editor-cancelar"
            class="imp-secondary"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="imp-primary"
          >
            Guardar cambios
          </button>

        </div>

      </form>

    </section>

  `;


  document.body
    .appendChild(
      layer
    );


  const cerrar =
    () =>
      layer.remove();


  document
    .querySelector(
      '#imp-editor-cerrar'
    )
    ?.addEventListener(
      'click',
      cerrar
    );


  document
    .querySelector(
      '#imp-editor-cancelar'
    )
    ?.addEventListener(
      'click',
      cerrar
    );


  layer.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        layer
      ) {

        cerrar();

      }

    }
  );


  document
    .querySelector(
      '#imp-editor-form'
    )
    ?.addEventListener(
      'submit',
      event => {

        event.preventDefault();


        const nombre =
          limpiar(
            document
              .querySelector(
                '#edit-nombre'
              )
              ?.value
          );


        if (!nombre) {

          alert(
            'El nombre del comercio es obligatorio.'
          );


          return;

        }


        for (
          const key
          of [
            'nombre',
            'rubro',
            'localidad',
            'direccion',
            'telefono',
            'horario',
            'lat',
            'lng',
          ]
        ) {

          grupo.principal[
            key
          ] =
            limpiar(
              document
                .querySelector(
                  `#edit-${key}`
                )
                ?.value
            );

        }


        const adhesiones = [];


        for (
          const programa
          of PROGRAMAS
        ) {

          const activo =
            document
              .querySelector(
                `#edit-act-${programa.id}`
              )
              ?.checked;


          if (!activo) {
            continue;
          }


          const beneficio =
            limpiar(
              document
                .querySelector(
                  `#edit-ben-${programa.id}`
                )
                ?.value
            );


          const condiciones =
            limpiar(
              document
                .querySelector(
                  `#edit-cond-${programa.id}`
                )
                ?.value
            );


          if (!beneficio) {

            alert(
              `Completá el beneficio de ${programa.nombre} o desmarcá ese programa.`
            );


            return;

          }


          adhesiones.push({

            programa:
              programa.id,

            beneficio,

            condiciones,

          });

        }


        grupo.adhesiones =
          adhesiones;


        grupo.conflictos =
          [];


        asignarBaseGrupo(
          grupo,
          estado
            .analisis
            .existentes
        );


        cerrar();


        renderResultado();

      }
    );

}


/* =========================================================
   API SUPABASE
========================================================= */

async function api(
  path,
  {
    method = 'GET',
    body,
    prefer = '',
  } = {}
) {

  const {
    url,
    key,
    token,
  } =
    credenciales();


  if (
    !url ||
    !key
  ) {

    throw new Error(
      'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_KEY.'
    );

  }


  if (!token) {

    throw new Error(
      'La sesión de administrador venció. Cerrá y volvé a entrar a /admin.'
    );

  }


  const headers = {

    apikey:
      key,

    Authorization:
      `Bearer ${token}`,

  };


  if (
    body !== undefined
  ) {

    headers[
      'Content-Type'
    ] =
      'application/json';

  }


  if (
    prefer
  ) {

    headers.Prefer =
      prefer;

  }


  const respuesta =
    await fetch(

      `${url}${path}`,

      {

        method,

        headers,

        body:
          body === undefined
            ? undefined
            : JSON.stringify(
                body
              ),

      }

    );


  if (
    !respuesta.ok
  ) {

    let detalle = '';


    try {

      const json =
        await respuesta.json();


      detalle =
        json.message ||
        json.details ||
        json.hint ||
        JSON.stringify(
          json
        );

    } catch {

      detalle =
        await respuesta.text();

    }


    if (
      respuesta.status ===
      401
    ) {

      throw new Error(
        'La sesión de administrador venció. Volvé a iniciar sesión.'
      );

    }


    throw new Error(
      detalle ||
      `Error ${respuesta.status}`
    );

  }


  if (
    respuesta.status ===
    204
  ) {

    return null;

  }


  const texto =
    await respuesta.text();


  return texto
    ? JSON.parse(
        texto
      )
    : null;

}


/* =========================================================
   CÓDIGO ESTABLE DE IMPORTACIÓN
========================================================= */

function hashTexto(
  texto
) {

  let hash =
    2166136261;


  for (
    let i = 0;
    i < texto.length;
    i++
  ) {

    hash ^=
      texto.charCodeAt(
        i
      );


    hash =
      Math.imul(
        hash,
        16777619
      );

  }


  return (
    hash >>>
    0
  )
    .toString(16)
    .padStart(
      8,
      '0'
    );

}


function codigoGrupo(
  grupo
) {

  const identidad = [

    norm(
      grupo
        .principal
        .nombre
    ),

    norm(
      grupo
        .principal
        .direccion
    ),

    norm(
      grupo
        .principal
        .localidad
    ),

    tel(
      grupo
        .principal
        .telefono
    ),

    grupo
      .principal
      .fila,

  ]
    .join('|');


  return (
    'MTA-' +
    hashTexto(
      identidad
    )
      .toUpperCase()
  );

}


/* =========================================================
   LOTES
========================================================= */

function chunks(
  lista,
  cantidad
) {

  const resultado = [];


  for (
    let i = 0;
    i < lista.length;
    i += cantidad
  ) {

    resultado.push(
      lista.slice(
        i,
        i +
        cantidad
      )
    );

  }


  return resultado;

}


/* =========================================================
   PAYLOAD COMERCIO
========================================================= */

function payloadNuevo(
  grupo
) {

  const coordenadas =
    tieneCoordenadas(
      grupo.principal
    );


  return {

    codigo:
      codigoGrupo(
        grupo
      ),

    nombre:
      limpiar(
        grupo
          .principal
          .nombre
      ),

    rubro:
      limpiar(
        grupo
          .principal
          .rubro
      ),

    localidad:
      limpiar(
        grupo
          .principal
          .localidad
      ),

    direccion:
      limpiar(
        grupo
          .principal
          .direccion
      ),

    telefono:
      limpiar(
        grupo
          .principal
          .telefono
      ) ||
      null,

    horario:
      limpiar(
        grupo
          .principal
          .horario
      ) ||
      null,

    lat:
      coordenadas
        ? numero(
            grupo
              .principal
              .lat
          )
        : null,

    lng:
      coordenadas
        ? numero(
            grupo
              .principal
              .lng
          )
        : null,

    /*
      Si no tiene ubicación,
      queda inactivo para no romper
      el mapa público.
    */

    activo:
      coordenadas,

    updated_at:
      new Date()
        .toISOString(),

  };

}


/* =========================================================
   CONFIRMAR IMPORTACIÓN
========================================================= */

async function confirmarImportacion() {

  const analisis =
    estado.analisis;


  if (!analisis) {
    return;
  }


  const pendientes =
    paresPendientes().length +
    basesPendientes().length +
    conflictosPendientes().length;


  if (
    pendientes
  ) {

    alert(
      `Todavía hay ${pendientes} pendiente(s) por resolver.`
    );


    return;

  }


  const grupos =
    analisis.grupos
      .filter(
        grupo =>
          !grupo.omitir
      );


  if (
    !grupos.length
  ) {

    alert(
      'No hay comercios seleccionados para importar.'
    );


    return;

  }


  const sinCoordenadas =
    grupos
      .filter(
        grupo =>
          grupo.decisionBase !==
          'unir' &&
          !tieneCoordenadas(
            grupo.principal
          )
      )
      .length;


  const mensaje = `Se van a procesar ${grupos.length} comercios y ${cantidadAdhesiones()} beneficios.${
    sinCoordenadas
      ? `\n\n${sinCoordenadas} comercio(s) nuevos sin coordenadas quedarán inactivos hasta ubicarlos.`
      : ''
  }\n\n¿Confirmás la importación?`;


  if (
    !confirm(
      mensaje
    )
  ) {

    return;

  }


  renderImportando(
    'Preparando comercios...'
  );


  try {

    const ids =
      new Map();


    /*
      Comercios que son nuevos.
    */

    const nuevos =
      grupos
        .filter(
          grupo =>
            grupo.decisionBase !==
            'unir'
        );


    /*
      Comercios que el usuario decidió
      unir con uno existente.
    */

    const unidos =
      grupos
        .filter(
          grupo =>
            grupo.decisionBase ===
            'unir' &&
            grupo.base
              ?.existente
              ?.id
        );


    /* =====================================================
       ACTUALIZAR EXISTENTES
    ===================================================== */

    for (
      const grupo
      of unidos
    ) {

      const existente =
        grupo.base.existente;


      const principal =
        grupo.principal;


      const patch = {

        updated_at:
          new Date()
            .toISOString(),

      };


      for (
        const key
        of [
          'nombre',
          'rubro',
          'localidad',
          'direccion',
          'telefono',
          'horario',
        ]
      ) {

        if (
          limpiar(
            principal[key]
          )
        ) {

          patch[key] =
            limpiar(
              principal[key]
            );

        }

      }


      if (
        tieneCoordenadas(
          principal
        )
      ) {

        patch.lat =
          numero(
            principal.lat
          );


        patch.lng =
          numero(
            principal.lng
          );

      }


      await api(

        `/rest/v1/comercios?id=eq.${encodeURIComponent(existente.id)}`,

        {

          method:
            'PATCH',

          body:
            patch,

          prefer:
            'return=minimal',

        }

      );


      ids.set(
        grupo.id,
        Number(
          existente.id
        )
      );

    }


    /* =====================================================
       CREAR COMERCIOS NUEVOS
    ===================================================== */

    let procesados = 0;


    for (
      const lote
      of chunks(
        nuevos,
        100
      )
    ) {

      renderImportando(

        `Guardando comercios ${
          procesados + 1
        } a ${
          Math.min(
            procesados +
            lote.length,
            nuevos.length
          )
        } de ${nuevos.length}...`

      );


      const payload =
        lote.map(
          payloadNuevo
        );


      const respuesta =
        await api(

          '/rest/v1/comercios?on_conflict=codigo&select=id,codigo,nombre',

          {

            method:
              'POST',

            body:
              payload,

            prefer:
              'resolution=merge-duplicates,return=representation',

          }

        );


      const porCodigo =
        new Map(

          (
            respuesta ||
            []
          )
            .map(
              comercio => [

                comercio.codigo,

                Number(
                  comercio.id
                ),

              ]
            )

        );


      for (
        const grupo
        of lote
      ) {

        const comercioId =
          porCodigo.get(
            codigoGrupo(
              grupo
            )
          );


        if (
          !comercioId
        ) {

          throw new Error(
            `No se obtuvo el ID de ${grupo.principal.nombre}.`
          );

        }


        ids.set(
          grupo.id,
          comercioId
        );

      }


      procesados +=
        lote.length;

    }


    /* =====================================================
       ARMAR BENEFICIOS
    ===================================================== */

    const beneficiosMap =
      new Map();


    for (
      const grupo
      of grupos
    ) {

      const comercioId =
        ids.get(
          grupo.id
        );


      if (
        !comercioId
      ) {

        continue;

      }


      for (
        const beneficio
        of grupo.adhesiones
      ) {

        if (
          !limpiar(
            beneficio.beneficio
          )
        ) {

          continue;

        }


        beneficiosMap.set(

          `${comercioId}|${beneficio.programa}`,

          {

            comercio_id:
              comercioId,

            programa:
              beneficio.programa,

            beneficio:
              limpiar(
                beneficio.beneficio
              ),

            condiciones:
              limpiar(
                beneficio.condiciones
              ) ||
              null,

            activo:
              true,

            updated_at:
              new Date()
                .toISOString(),

          }

        );

      }

    }


    const beneficios =
      [
        ...beneficiosMap
          .values(),
      ];


    /* =====================================================
       GUARDAR BENEFICIOS POR LOTES
    ===================================================== */

    let hechos = 0;


    for (
      const lote
      of chunks(
        beneficios,
        200
      )
    ) {

      renderImportando(

        `Guardando beneficios ${
          hechos + 1
        } a ${
          Math.min(
            hechos +
            lote.length,
            beneficios.length
          )
        } de ${beneficios.length}...`

      );


      await api(

        '/rest/v1/beneficios_comercio?on_conflict=comercio_id,programa',

        {

          method:
            'POST',

          body:
            lote,

          prefer:
            'resolution=merge-duplicates,return=minimal',

        }

      );


      hechos +=
        lote.length;

    }


    /* =====================================================
       TERMINADO
    ===================================================== */

    renderExito({

      nuevos:
        nuevos.length,

      unidos:
        unidos.length,

      beneficios:
        beneficios.length,

      omitidos:
        analisis.grupos
          .filter(
            grupo =>
              grupo.omitir
          )
          .length,

      sinCoordenadas,

    });

  } catch (error) {

    alert(

      'La importación se detuvo: ' +

      (
        error?.message ||
        error
      ) +

      '\n\nPodés volver a intentar. Los códigos estables evitan duplicar los comercios que ya alcanzó a guardar.'

    );


    renderResultado();

  }

}


/* =========================================================
   IMPORTANDO
========================================================= */

function renderImportando(
  texto
) {

  const contenedor =
    overlay();


  if (!contenedor) {
    return;
  }


  contenedor.innerHTML = `

    <section class="imp-modal imp-loading">

      <div class="imp-spinner">
      </div>

      <strong>
        Importando...
      </strong>

      <p>
        ${esc(texto)}
      </p>

      <small>
        No cierres esta ventana
        hasta que termine.
      </small>

    </section>

  `;

}


/* =========================================================
   RESULTADO FINAL
========================================================= */

function renderExito(
  resultado
) {

  const contenedor =
    overlay();


  if (!contenedor) {
    return;
  }


  contenedor.innerHTML = `

    <section class="imp-modal imp-success-screen">

      <div class="imp-success-icon">
        ✓
      </div>

      <h2>
        Importación terminada
      </h2>


      <div class="imp-summary-grid">

        ${
          resumenCard(
            'Comercios nuevos',
            resultado.nuevos
          )
        }

        ${
          resumenCard(
            'Unidos a existentes',
            resultado.unidos
          )
        }

        ${
          resumenCard(
            'Beneficios guardados',
            resultado.beneficios
          )
        }

        ${
          resumenCard(
            'No importados',
            resultado.omitidos
          )
        }

        ${
          resumenCard(
            'Nuevos inactivos',
            resultado.sinCoordenadas
          )
        }

      </div>


      ${
        resultado.sinCoordenadas
          ? `

            <div class="imp-warning">

              <strong>
                Falta ubicar comercios.
              </strong>

              Los nuevos sin
              latitud/longitud quedaron
              inactivos.

              No aparecerán en la app
              pública hasta que les
              carguemos coordenadas
              y los activemos.

            </div>

          `
          : ''
      }


      <div class="imp-actions">

        <button
          id="imp-finalizar"
          class="imp-primary"
        >
          Cerrar y actualizar Admin
        </button>

      </div>

    </section>

  `;


  document
    .querySelector(
      '#imp-finalizar'
    )
    ?.addEventListener(
      'click',
      () => {

        window.location.reload();

      }
    );

}


/* =========================================================
   BOTÓN EN ADMIN
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
    agregarBotonImportar
  );


observer.observe(
  document.body,
  {
    childList:
      true,
    subtree:
      true,
  }
);


agregarBotonImportar();