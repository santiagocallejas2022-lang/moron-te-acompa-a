const GEOREF_URL =
  'https://apis.datos.gob.ar/georef/api/v2.0/direcciones';


/* =========================================================
   PROGRAMAS
========================================================= */

const NOMBRES_PROGRAMAS = {
  jubilados: 'Jubilados',
  joven: 'Tarjeta Joven',
  docente: 'Soy Docente',
  municipales: 'Trabajadores Municipales',
  plataforma: 'Trabajadores/as de Plataforma',
  'buen-contribuyente': 'Buen Contribuyente',
};


/* =========================================================
   ESTADO
========================================================= */

let estadoGeo = {
  comercios: [],
  buscando: false,
  guardando: false,
};


/* =========================================================
   UTILIDADES
========================================================= */

function esc(valor = '') {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function normalizar(valor = '') {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}


function numero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null;
  }

  const n = Number(valor);

  return Number.isFinite(n)
    ? n
    : null;
}


/* =========================================================
   VALIDACIÓN GEOGRÁFICA
========================================================= */

function coordenadasBasicasValidas(
  lat,
  lng
) {
  const latitud =
    numero(lat);

  const longitud =
    numero(lng);

  if (
    latitud === null ||
    longitud === null
  ) {
    return false;
  }

  if (
    latitud === 0 ||
    longitud === 0
  ) {
    return false;
  }

  /*
   * Margen amplio.
   *
   * Este control NO determina
   * si pertenece a Morón.
   *
   * La validación principal
   * es departamento = Morón.
   */
  return (
    latitud >= -34.80 &&
    latitud <= -34.50 &&
    longitud >= -58.85 &&
    longitud <= -58.40
  );
}


function esDepartamentoMoron(
  resultado
) {
  const departamento =
    normalizar(
      resultado
        ?.departamento
        ?.nombre ||
      ''
    );

  return (
    departamento === 'moron'
  );
}


function esProvinciaBuenosAires(
  resultado
) {
  const provincia =
    normalizar(
      resultado
        ?.provincia
        ?.nombre ||
      ''
    );

  return (
    provincia ===
      'buenos aires'
  );
}


/* =========================================================
   DIRECCIONES
========================================================= */

function limpiarDireccion(
  valor = ''
) {
  return String(valor || '')
    .replace(
      /^[\s–—-]+/,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


function quitarComplementos(
  valor = ''
) {
  return limpiarDireccion(
    valor
  )
    .replace(
      /\([^)]*\)/g,
      ' '
    )
    .replace(
      /\b(?:local|loc\.?|l)\s*\d+[a-z]?\b/gi,
      ' '
    )
    .replace(
      /\b(?:piso|dto|dpto|depto)\.?\s*[a-z0-9-]+\b/gi,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


function expandirAbreviaturas(
  valor = ''
) {
  return String(valor || '')

    .replace(
      /\bav\.?\s*/gi,
      'Avenida '
    )

    .replace(
      /\bj\.?\s*m\.?\s*de\s*rosas\b/gi,
      'Juan Manuel de Rosas'
    )

    .replace(
      /\bpte\.?\s*per[oó]n\b/gi,
      'Presidente Perón'
    )

    .replace(
      /\bgral\.?\s*/gi,
      'General '
    )

    .replace(
      /\s+/g,
      ' '
    )

    .trim();
}


function variantesDireccion(
  comercio
) {
  const original =
    limpiarDireccion(
      comercio.direccionBusqueda ||
      comercio.direccion
    );

  const simple =
    quitarComplementos(
      original
    );

  const expandida =
    expandirAbreviaturas(
      simple
    );

  return [
    ...new Set(
      [
        original,
        simple,
        expandida,
      ].filter(Boolean)
    ),
  ];
}


/* =========================================================
   CREDENCIALES ADMIN
========================================================= */

function credenciales() {
  let sesion =
    null;

  try {
    sesion =
      JSON.parse(
        localStorage.getItem(
          'mta_admin_session'
        ) ||
        'null'
      );
  } catch {
    sesion =
      null;
  }

  return {
    url:
      import.meta.env
        .VITE_SUPABASE_URL
        ?.replace(
          /\/$/,
          ''
        ) || '',

    key:
      import.meta.env
        .VITE_SUPABASE_KEY ||
      '',

    token:
      sesion
        ?.access_token ||
      '',
  };
}


/* =========================================================
   API SUPABASE
========================================================= */

async function apiSupabase(
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
      'Faltan las variables de Supabase.'
    );
  }

  if (
    !token
  ) {
    throw new Error(
      'La sesión de administrador venció. Volvé a entrar a /admin.'
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
    const detalle =
      await respuesta.text();

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
    ? JSON.parse(texto)
    : null;
}


/* =========================================================
   CONSULTAR GEOREF
========================================================= */

async function consultarGeoref(
  direccion
) {
  /*
   * ACÁ ESTÁ LA DIFERENCIA
   * IMPORTANTE.
   *
   * SIEMPRE:
   *
   * Provincia Buenos Aires
   * Departamento Morón
   *
   * Nunca hacemos una búsqueda
   * sin departamento.
   */

  const params =
    new URLSearchParams({
      direccion,
      provincia:
        'Buenos Aires',
      departamento:
        'Morón',
      max:
        '1',
    });


  const respuesta =
    await fetch(
      `${GEOREF_URL}?${params.toString()}`
    );


  if (
    !respuesta.ok
  ) {
    const detalle =
      await respuesta.text();

    throw new Error(
      `Georef respondió ${respuesta.status}: ${detalle}`
    );
  }


  const json =
    await respuesta.json();


  const resultado =
    Array.isArray(
      json?.direcciones
    )
      ? json.direcciones[0]
      : null;


  if (
    !resultado
  ) {
    return null;
  }


  /*
   * CONTROL 1:
   * Tiene que ser Buenos Aires.
   */

  if (
    !esProvinciaBuenosAires(
      resultado
    )
  ) {
    console.warn(
      'Resultado rechazado por provincia:',
      resultado
    );

    return null;
  }


  /*
   * CONTROL 2:
   * OBLIGATORIAMENTE
   * departamento Morón.
   */

  if (
    !esDepartamentoMoron(
      resultado
    )
  ) {
    console.warn(
      'Resultado rechazado. No pertenece al Partido de Morón:',
      resultado
    );

    return null;
  }


  const lat =
    numero(
      resultado
        ?.ubicacion
        ?.lat
    );

  const lng =
    numero(
      resultado
        ?.ubicacion
        ?.lon
    );


  /*
   * CONTROL 3:
   * coordenadas reales.
   */

  if (
    !coordenadasBasicasValidas(
      lat,
      lng
    )
  ) {
    return null;
  }


  return {
    lat,

    lng,

    nomenclatura:
      resultado
        ?.nomenclatura ||
      '',

    departamento:
      resultado
        ?.departamento
        ?.nombre ||
      '',

    provincia:
      resultado
        ?.provincia
        ?.nombre ||
      '',
  };
}


/* =========================================================
   BUSCAR CANDIDATO
========================================================= */

async function buscarCandidato(
  comercio
) {
  const variantes =
    variantesDireccion(
      comercio
    );


  for (
    const direccion
    of variantes
  ) {
    try {
      const candidato =
        await consultarGeoref(
          direccion
        );


      if (
        candidato
      ) {
        return {
          ...candidato,

          direccionUsada:
            direccion,
        };
      }

    } catch (
      error
    ) {
      /*
       * Esta vez NO escondemos
       * errores de la API.
       */

      throw error;
    }
  }


  return null;
}


/* =========================================================
   CARGAR TODOS LOS PENDIENTES
========================================================= */

async function cargarPendientes() {
  const [
    beneficios,
    comercios,
  ] =
    await Promise.all([
      apiSupabase(
        '/rest/v1/beneficios_comercio?select=comercio_id,programa&activo=eq.true'
      ),

      apiSupabase(
        '/rest/v1/comercios?select=id,nombre,rubro,localidad,direccion,lat,lng,activo&activo=eq.true&order=localidad.asc,nombre.asc'
      ),
    ]);


  const programasPorComercio =
    new Map();


  for (
    const beneficio
    of beneficios || []
  ) {
    const id =
      Number(
        beneficio.comercio_id
      );


    if (
      !programasPorComercio.has(
        id
      )
    ) {
      programasPorComercio.set(
        id,
        new Set()
      );
    }


    programasPorComercio
      .get(id)
      .add(
        beneficio.programa
      );
  }


  return (
    comercios ||
    []
  )
    .filter(
      comercio => {
        const id =
          Number(
            comercio.id
          );


        const tieneBeneficio =
          programasPorComercio.has(
            id
          );


        const sinCoordenadas =
          !coordenadasBasicasValidas(
            comercio.lat,
            comercio.lng
          );


        return (
          tieneBeneficio &&
          sinCoordenadas
        );
      }
    )

    .map(
      comercio => {
        const id =
          Number(
            comercio.id
          );


        return {
          ...comercio,

          id,

          programas: [
            ...programasPorComercio
              .get(id),
          ],

          direccionBusqueda:
            limpiarDireccion(
              comercio.direccion
            ),

          candidato:
            null,

          estado:
            'pendiente',

          seleccionado:
            false,

          detalle:
            '',
        };
      }
    );
}


/* =========================================================
   ESTILOS
========================================================= */

function inyectarEstilos() {
  if (
    document.querySelector(
      '#mta-geo-styles'
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      'style'
    );


  style.id =
    'mta-geo-styles';


  style.textContent = `

    .mta-geo-backdrop{
      position:fixed;
      inset:0;
      z-index:99999;
      background:rgba(15,23,42,.68);
      display:flex;
      justify-content:center;
      align-items:flex-start;
      padding:20px 10px;
      overflow:auto
    }

    .mta-geo-modal{
      width:min(1180px,100%);
      background:#fff;
      border-radius:18px;
      overflow:hidden;
      box-shadow:
        0 24px 70px
        rgba(0,0,0,.28)
    }

    .mta-geo-header{
      display:flex;
      justify-content:space-between;
      gap:16px;
      padding:20px 22px;
      border-bottom:
        1px solid #e5e7eb
    }

    .mta-geo-header h2{
      margin:0 0 6px;
      font-size:23px
    }

    .mta-geo-header p{
      margin:0;
      color:#64748b;
      line-height:1.45
    }

    .mta-geo-close{
      border:0;
      width:38px;
      height:38px;
      border-radius:999px;
      background:#f1f5f9;
      cursor:pointer;
      font-size:22px
    }

    .mta-geo-body{
      padding:18px 22px 24px
    }

    .mta-geo-summary{
      display:grid;
      grid-template-columns:
        repeat(4,minmax(0,1fr));
      gap:10px;
      margin-bottom:16px
    }

    .mta-geo-card{
      padding:13px;
      border-radius:12px;
      background:#f8fafc;
      border:
        1px solid #e2e8f0
    }

    .mta-geo-card strong{
      display:block;
      font-size:20px
    }

    .mta-geo-card span{
      font-size:12px;
      color:#64748b
    }

    .mta-geo-notice{
      padding:12px 14px;
      border-radius:10px;
      margin-bottom:14px;
      background:#ecfdf5;
      border:
        1px solid #a7f3d0;
      color:#166534;
      line-height:1.45;
      font-size:13px
    }

    .mta-geo-actions{
      display:flex;
      flex-wrap:wrap;
      gap:9px;
      margin-bottom:14px
    }

    .mta-geo-button{
      border:0;
      border-radius:10px;
      padding:10px 14px;
      font-weight:700;
      cursor:pointer
    }

    .mta-geo-primary{
      background:#d71920;
      color:#fff
    }

    .mta-geo-secondary{
      background:#eef2f7;
      color:#0f172a
    }

    .mta-geo-button:disabled,
    .mta-geo-small:disabled{
      opacity:.45;
      cursor:not-allowed
    }

    .mta-geo-progress{
      font-size:13px;
      color:#475569;
      margin-bottom:12px
    }

    .mta-geo-table-wrap{
      overflow:auto;
      max-height:62vh;
      border:
        1px solid #e2e8f0;
      border-radius:12px
    }

    .mta-geo-table{
      width:100%;
      border-collapse:collapse;
      min-width:1050px;
      font-size:13px
    }

    .mta-geo-table th,
    .mta-geo-table td{
      padding:9px;
      border-bottom:
        1px solid #edf2f7;
      vertical-align:top;
      text-align:left
    }

    .mta-geo-table th{
      position:sticky;
      top:0;
      z-index:2;
      background:#f8fafc;
      color:#475569;
      font-size:12px
    }

    .mta-geo-programas{
      display:flex;
      flex-wrap:wrap;
      gap:4px;
      margin-top:5px
    }

    .mta-geo-chip{
      padding:3px 7px;
      border-radius:999px;
      background:#f1f5f9;
      font-size:10px
    }

    .mta-geo-input{
      width:100%;
      min-width:190px;
      padding:8px;
      border:
        1px solid #cbd5e1;
      border-radius:8px
    }

    .mta-geo-status{
      font-size:12px;
      font-weight:700
    }

    .mta-geo-ok{
      color:#15803d
    }

    .mta-geo-warn{
      color:#b45309
    }

    .mta-geo-error{
      color:#b91c1c
    }

    .mta-geo-result{
      margin-top:5px;
      font-size:11px;
      line-height:1.35;
      color:#64748b
    }

    .mta-geo-row-actions{
      display:flex;
      flex-direction:column;
      gap:6px;
      min-width:110px
    }

    .mta-geo-small{
      border:0;
      padding:7px 9px;
      border-radius:8px;
      background:#eef2f7;
      font-size:11px;
      font-weight:700;
      cursor:pointer
    }

    @media(max-width:760px){

      .mta-geo-summary{
        grid-template-columns:
          repeat(2,minmax(0,1fr))
      }

      .mta-geo-header,
      .mta-geo-body{
        padding:15px
      }

    }

  `;


  document.head
    .appendChild(
      style
    );
}


/* =========================================================
   MODAL
========================================================= */

function modal() {
  inyectarEstilos();


  let elemento =
    document.querySelector(
      '#mta-geo-backdrop'
    );


  if (
    !elemento
  ) {
    elemento =
      document.createElement(
        'div'
      );


    elemento.id =
      'mta-geo-backdrop';


    elemento.className =
      'mta-geo-backdrop';


    document.body
      .appendChild(
        elemento
      );
  }


  return elemento;
}


function cerrarModal() {
  document
    .querySelector(
      '#mta-geo-backdrop'
    )
    ?.remove();
}


/* =========================================================
   RESUMEN
========================================================= */

function resumen() {
  return {
    total:
      estadoGeo
        .comercios
        .length,

    encontrados:
      estadoGeo
        .comercios
        .filter(
          item =>
            item.estado ===
            'encontrado'
        )
        .length,

    noEncontrados:
      estadoGeo
        .comercios
        .filter(
          item =>
            item.estado ===
            'no-encontrado'
        )
        .length,

    seleccionados:
      estadoGeo
        .comercios
        .filter(
          item =>
            item.seleccionado &&
            item.candidato
        )
        .length,
  };
}


/* =========================================================
   PROGRAMAS
========================================================= */

function programasHtml(
  programas = []
) {
  return programas
    .map(
      programa => `

        <span
          class="mta-geo-chip"
        >
          ${
            esc(
              NOMBRES_PROGRAMAS[
                programa
              ] ||
              programa
            )
          }
        </span>

      `
    )
    .join('');
}


/* =========================================================
   ESTADO FILA
========================================================= */

function estadoHtml(
  item
) {
  const estados = {
    pendiente: [
      'Pendiente',
      'mta-geo-warn',
    ],

    buscando: [
      'Buscando…',
      'mta-geo-warn',
    ],

    encontrado: [
      'Encontrado en Morón',
      'mta-geo-ok',
    ],

    'no-encontrado': [
      'No encontrado',
      'mta-geo-error',
    ],

    error: [
      'Error',
      'mta-geo-error',
    ],
  };


  const [
    texto,
    clase,
  ] =
    estados[
      item.estado
    ] ||
    estados.pendiente;


  return `
    <span
      class="
        mta-geo-status
        ${clase}
      "
    >
      ${texto}
    </span>
  `;
}


/* =========================================================
   FILA
========================================================= */

function filaHtml(
  item
) {
  return `

    <tr>

      <td>

        <strong>
          ${esc(item.nombre)}
        </strong>

        <div
          class="mta-geo-programas"
        >
          ${
            programasHtml(
              item.programas
            )
          }
        </div>

      </td>


      <td>

        <input
          class="mta-geo-input"
          data-geo-direccion="${item.id}"
          value="${
            esc(
              item.direccionBusqueda ||
              item.direccion ||
              ''
            )
          }"
          ${
            estadoGeo.buscando ||
            estadoGeo.guardando
              ? 'disabled'
              : ''
          }
        />

      </td>


      <td>
        ${esc(item.localidad)}
      </td>


      <td>

        ${estadoHtml(item)}

        ${
          item.candidato
            ? `
              <div
                class="mta-geo-result"
              >
                ${
                  esc(
                    item.candidato
                      .nomenclatura
                  )
                }

                <br>

                Partido:
                <strong>
                  ${
                    esc(
                      item.candidato
                        .departamento
                    )
                  }
                </strong>

              </div>
            `
            : ''
        }

        ${
          item.detalle
            ? `
              <div
                class="mta-geo-result"
              >
                ${esc(item.detalle)}
              </div>
            `
            : ''
        }

      </td>


      <td>

        ${
          item.candidato
            ? `
              ${item.candidato.lat}
              <br>
              ${item.candidato.lng}
            `
            : '—'
        }

      </td>


      <td>

        <label>

          <input
            type="checkbox"
            data-geo-check="${item.id}"
            ${
              item.seleccionado
                ? 'checked'
                : ''
            }
            ${
              !item.candidato ||
              estadoGeo.guardando
                ? 'disabled'
                : ''
            }
          />

          Guardar

        </label>

      </td>


      <td>

        <div
          class="mta-geo-row-actions"
        >

          <button
            type="button"
            class="mta-geo-small"
            data-geo-rebuscar="${item.id}"
            ${
              estadoGeo.buscando ||
              estadoGeo.guardando
                ? 'disabled'
                : ''
            }
          >
            Rebuscar
          </button>


          <button
            type="button"
            class="mta-geo-small"
            data-geo-mapa="${item.id}"
            ${
              !item.candidato
                ? 'disabled'
                : ''
            }
          >
            Ver mapa
          </button>

        </div>

      </td>

    </tr>

  `;
}


/* =========================================================
   RENDER
========================================================= */

function renderModal(
  mensaje = ''
) {
  const datos =
    resumen();


  const elemento =
    modal();


  elemento.innerHTML = `

    <section
      class="mta-geo-modal"
    >

      <header
        class="mta-geo-header"
      >

        <div>

          <h2>
            Ubicar comercios
          </h2>

          <p>
            Geolocalización segura
            de todos los programas.
          </p>

        </div>


        <button
          id="mta-geo-cerrar"
          class="mta-geo-close"
          type="button"
        >
          ×
        </button>

      </header>


      <div
        class="mta-geo-body"
      >

        <div
          class="mta-geo-summary"
        >

          <div
            class="mta-geo-card"
          >
            <strong>
              ${datos.total}
            </strong>

            <span>
              Pendientes
            </span>
          </div>


          <div
            class="mta-geo-card"
          >
            <strong>
              ${datos.encontrados}
            </strong>

            <span>
              Encontrados en Morón
            </span>
          </div>


          <div
            class="mta-geo-card"
          >
            <strong>
              ${datos.noEncontrados}
            </strong>

            <span>
              Sin resultado
            </span>
          </div>


          <div
            class="mta-geo-card"
          >
            <strong>
              ${datos.seleccionados}
            </strong>

            <span>
              Listos para guardar
            </span>
          </div>

        </div>


        <div
          class="mta-geo-notice"
        >

          🔒 Modo seguro:

          <strong>
            solamente se aceptan
            direcciones cuyo resultado
            oficial indique
            Departamento Morón.
          </strong>

          Merlo, La Matanza,
          La Tablada o cualquier
          otro partido son rechazados.

        </div>


        ${
          mensaje
            ? `
              <div
                class="mta-geo-progress"
              >
                ${esc(mensaje)}
              </div>
            `
            : ''
        }


        <div
          class="mta-geo-actions"
        >

          <button
            id="mta-geo-buscar-todos"
            class="
              mta-geo-button
              mta-geo-primary
            "
            ${
              estadoGeo.buscando ||
              estadoGeo.guardando
                ? 'disabled'
                : ''
            }
          >
            Buscar ubicaciones
          </button>


          <button
            id="mta-geo-seleccionar"
            class="
              mta-geo-button
              mta-geo-secondary
            "
          >
            Seleccionar encontrados
          </button>


          <button
            id="mta-geo-guardar"
            class="
              mta-geo-button
              mta-geo-primary
            "
            ${
              !datos.seleccionados ||
              estadoGeo.guardando
                ? 'disabled'
                : ''
            }
          >
            Guardar ubicaciones válidas
          </button>

        </div>


        <div
          class="mta-geo-table-wrap"
        >

          <table
            class="mta-geo-table"
          >

            <thead>

              <tr>

                <th>
                  Comercio / programas
                </th>

                <th>
                  Dirección
                </th>

                <th>
                  Localidad
                </th>

                <th>
                  Resultado
                </th>

                <th>
                  Coordenadas
                </th>

                <th>
                  Usar
                </th>

                <th>
                  Acciones
                </th>

              </tr>

            </thead>


            <tbody>

              ${
                estadoGeo
                  .comercios
                  .map(filaHtml)
                  .join('')
              }

            </tbody>

          </table>

        </div>

      </div>

    </section>

  `;


  conectarEventos();
}


/* =========================================================
   DIRECCIÓN EDITADA
========================================================= */

function tomarDireccion(
  id
) {
  const item =
    estadoGeo
      .comercios
      .find(
        comercio =>
          comercio.id ===
          Number(id)
      );


  if (
    !item
  ) {
    return null;
  }


  const input =
    document.querySelector(
      `[data-geo-direccion="${id}"]`
    );


  if (
    input
  ) {
    item.direccionBusqueda =
      limpiarDireccion(
        input.value
      );
  }


  return item;
}


/* =========================================================
   BUSCAR UNO
========================================================= */

async function buscarUno(
  item
) {
  item.estado =
    'buscando';

  item.candidato =
    null;

  item.seleccionado =
    false;

  item.detalle =
    '';


  try {
    const candidato =
      await buscarCandidato(
        item
      );


    if (
      candidato
    ) {
      item.candidato =
        candidato;

      item.estado =
        'encontrado';

      item.seleccionado =
        true;

      item.detalle =
        `Dirección usada: ${candidato.direccionUsada}`;

    } else {
      item.estado =
        'no-encontrado';

      item.detalle =
        'No encontramos una coincidencia segura dentro del Partido de Morón.';
    }

  } catch (
    error
  ) {
    item.estado =
      'error';

    item.detalle =
      error?.message ||
      String(error);
  }
}


/* =========================================================
   CONCURRENCIA
========================================================= */

async function ejecutarConcurrencia(
  items,
  limite,
  tarea,
  progreso
) {
  let indice =
    0;

  let hechos =
    0;


  async function trabajador() {
    while (
      true
    ) {
      const actual =
        indice++;


      if (
        actual >=
        items.length
      ) {
        return;
      }


      await tarea(
        items[actual]
      );


      hechos +=
        1;


      progreso?.(
        hechos,
        items.length
      );
    }
  }


  await Promise.all(
    Array.from(
      {
        length:
          Math.min(
            limite,
            items.length
          ),
      },

      () =>
        trabajador()
    )
  );
}


/* =========================================================
   BUSCAR TODOS
========================================================= */

async function buscarTodos() {
  if (
    estadoGeo.buscando ||
    estadoGeo.guardando
  ) {
    return;
  }


  for (
    const item
    of estadoGeo.comercios
  ) {
    tomarDireccion(
      item.id
    );
  }


  estadoGeo.buscando =
    true;


  renderModal(
    'Iniciando búsqueda segura dentro del Partido de Morón…'
  );


  try {
    await ejecutarConcurrencia(
      estadoGeo.comercios,
      4,
      buscarUno,

      (
        hechos,
        total
      ) => {
        renderModal(
          `Buscando ${hechos} de ${total}…`
        );
      }
    );

  } finally {
    estadoGeo.buscando =
      false;


    renderModal(
      'Búsqueda terminada. Revisá los resultados antes de guardar.'
    );
  }
}


/* =========================================================
   REBUSCAR
========================================================= */

async function rebuscar(
  id
) {
  if (
    estadoGeo.buscando ||
    estadoGeo.guardando
  ) {
    return;
  }


  const item =
    tomarDireccion(
      id
    );


  if (
    !item
  ) {
    return;
  }


  estadoGeo.buscando =
    true;


  renderModal(
    `Rebuscando ${item.nombre}…`
  );


  await buscarUno(
    item
  );


  estadoGeo.buscando =
    false;


  renderModal();
}


/* =========================================================
   SELECCIONAR
========================================================= */

function seleccionarEncontrados() {
  for (
    const item
    of estadoGeo.comercios
  ) {
    item.seleccionado =
      Boolean(
        item.candidato &&
        esDepartamentoMoron(
          {
            departamento: {
              nombre:
                item.candidato
                  .departamento,
            },
          }
        )
      );
  }


  renderModal();
}


/* =========================================================
   GUARDAR
========================================================= */

async function guardarUbicaciones() {
  if (
    estadoGeo.guardando ||
    estadoGeo.buscando
  ) {
    return;
  }


  const seleccionados =
    estadoGeo
      .comercios
      .filter(
        item =>
          item.seleccionado &&
          item.candidato &&
          normalizar(
            item.candidato
              .departamento
          ) ===
            'moron'
      );


  if (
    !seleccionados.length
  ) {
    alert(
      'No hay ubicaciones seguras seleccionadas.'
    );

    return;
  }


  if (
    !confirm(
      `Se van a guardar ${seleccionados.length} ubicaciones confirmadas dentro del Partido de Morón. ¿Confirmás?`
    )
  ) {
    return;
  }


  estadoGeo.guardando =
    true;


  let guardados =
    0;


  try {
    for (
      const item
      of seleccionados
    ) {
      /*
       * ÚLTIMO FILTRO
       * antes de Supabase.
       */

      if (
        normalizar(
          item.candidato
            .departamento
        ) !==
        'moron'
      ) {
        console.error(
          'Intento de guardar ubicación fuera de Morón bloqueado:',
          item
        );

        continue;
      }


      if (
        !coordenadasBasicasValidas(
          item.candidato.lat,
          item.candidato.lng
        )
      ) {
        continue;
      }


      await apiSupabase(
        `/rest/v1/comercios?id=eq.${encodeURIComponent(
          item.id
        )}`,

        {
          method:
            'PATCH',

          body: {
            lat:
              Number(
                item.candidato.lat
              ),

            lng:
              Number(
                item.candidato.lng
              ),

            activo:
              true,

            updated_at:
              new Date()
                .toISOString(),
          },

          prefer:
            'return=minimal',
        }
      );


      item.estado =
        'guardado';


      guardados +=
        1;
    }


    estadoGeo.comercios =
      estadoGeo
        .comercios
        .filter(
          item =>
            item.estado !==
            'guardado'
        );


    alert(
      `Listo. Se guardaron ${guardados} comercios ubicados dentro del Partido de Morón.`
    );

  } catch (
    error
  ) {
    alert(
      'Error al guardar: ' +
      (
        error?.message ||
        String(error)
      )
    );

  } finally {
    estadoGeo.guardando =
      false;

    renderModal();
  }
}


/* =========================================================
   VER MAPA
========================================================= */

function verMapa(
  id
) {
  const item =
    estadoGeo
      .comercios
      .find(
        comercio =>
          comercio.id ===
          Number(id)
      );


  if (
    !item?.candidato
  ) {
    return;
  }


  window.open(
    `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      item.candidato.lat
    )}&mlon=${encodeURIComponent(
      item.candidato.lng
    )}#map=18/${encodeURIComponent(
      item.candidato.lat
    )}/${encodeURIComponent(
      item.candidato.lng
    )}`,

    '_blank',

    'noopener'
  );
}


/* =========================================================
   EVENTOS
========================================================= */

function conectarEventos() {
  document
    .querySelector(
      '#mta-geo-cerrar'
    )
    ?.addEventListener(
      'click',
      cerrarModal
    );


  document
    .querySelector(
      '#mta-geo-buscar-todos'
    )
    ?.addEventListener(
      'click',
      buscarTodos
    );


  document
    .querySelector(
      '#mta-geo-seleccionar'
    )
    ?.addEventListener(
      'click',
      seleccionarEncontrados
    );


  document
    .querySelector(
      '#mta-geo-guardar'
    )
    ?.addEventListener(
      'click',
      guardarUbicaciones
    );


  document
    .querySelectorAll(
      '[data-geo-rebuscar]'
    )
    .forEach(
      boton => {
        boton.addEventListener(
          'click',
          () => {
            rebuscar(
              Number(
                boton.dataset
                  .geoRebuscar
              )
            );
          }
        );
      }
    );


  document
    .querySelectorAll(
      '[data-geo-mapa]'
    )
    .forEach(
      boton => {
        boton.addEventListener(
          'click',
          () => {
            verMapa(
              Number(
                boton.dataset
                  .geoMapa
              )
            );
          }
        );
      }
    );


  document
    .querySelectorAll(
      '[data-geo-check]'
    )
    .forEach(
      check => {
        check.addEventListener(
          'change',
          () => {
            const item =
              estadoGeo
                .comercios
                .find(
                  comercio =>
                    comercio.id ===
                    Number(
                      check.dataset
                        .geoCheck
                    )
                );


            if (
              item
            ) {
              item.seleccionado =
                Boolean(
                  check.checked &&
                  item.candidato &&
                  normalizar(
                    item.candidato
                      .departamento
                  ) ===
                    'moron'
                );
            }
          }
        );
      }
    );
}


/* =========================================================
   ABRIR
========================================================= */

async function abrirGeolocalizador() {
  estadoGeo = {
    comercios: [],
    buscando: false,
    guardando: false,
  };


  modal().innerHTML = `

    <section
      class="mta-geo-modal"
    >

      <header
        class="mta-geo-header"
      >

        <div>

          <h2>
            Ubicar comercios
          </h2>

          <p>
            Cargando pendientes…
          </p>

        </div>

      </header>

    </section>

  `;


  try {
    estadoGeo.comercios =
      await cargarPendientes();


    renderModal(
      `Se encontraron ${estadoGeo.comercios.length} comercios pendientes.`
    );

  } catch (
    error
  ) {
    alert(
      error?.message ||
      String(error)
    );

    cerrarModal();
  }
}


/* =========================================================
   BOTÓN ADMIN
========================================================= */

function agregarBotonGeolocalizar() {
  if (
    document.querySelector(
      '#mta-ubicar-comercios'
    )
  ) {
    return;
  }


  const botonNuevo =
    document.querySelector(
      '#nuevo-comercio'
    );


  if (
    !botonNuevo
  ) {
    return;
  }


  const boton =
    document.createElement(
      'button'
    );


  boton.id =
    'mta-ubicar-comercios';


  boton.type =
    'button';


  boton.className =
    'admin-secondary-button';


  boton.textContent =
    'Ubicar comercios';


  boton.addEventListener(
    'click',
    abrirGeolocalizador
  );


  const importar =
    document.querySelector(
      '#importar-base'
    );


  if (
    importar
  ) {
    importar.insertAdjacentElement(
      'afterend',
      boton
    );

  } else {
    botonNuevo.insertAdjacentElement(
      'afterend',
      boton
    );
  }
}


/* =========================================================
   OBSERVER
========================================================= */

const observer =
  new MutationObserver(
    agregarBotonGeolocalizar
  );


observer.observe(
  document.body,
  {
    childList: true,
    subtree: true,
  }
);


/* =========================================================
   INICIO
========================================================= */

inyectarEstilos();

agregarBotonGeolocalizar();