import './admin.css';

import {
  programas,
} from './data.js';


const app =
  document.querySelector('#app');


const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL
    ?.replace(/\/$/, '');


const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY;


const STORAGE_KEY =
  'mta_admin_session';


let seccionActiva =
  'resumen';


let filtroComercios =
  '';


let datos = {

  resumen: [],

  diarias: [],

  programasStats: [],

  comerciosStats: [],

  origenes: [],

  busquedas: [],

  comercios: [],

  beneficios: [],

};


/* =========================================================
   UTILIDADES
========================================================= */

function numero(valor) {

  return new Intl.NumberFormat(
    'es-AR'
  ).format(
    Number(valor || 0)
  );

}


function escapar(texto = '') {

  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

}


function programaNombre(id) {

  return (
    programas.find(
      programa =>
        programa.id === id
    )?.nombre ||
    id ||
    'Sin programa'
  );

}


function comercioPorId(id) {

  return datos.comercios.find(
    comercio =>
      Number(comercio.id) ===
      Number(id)
  );

}


function comercioNombre(id) {

  return (
    comercioPorId(id)?.nombre ||
    `Comercio #${id}`
  );

}


function beneficiosComercio(
  comercioId
) {

  return datos.beneficios.filter(
    beneficio =>
      Number(
        beneficio.comercio_id
      ) ===
      Number(
        comercioId
      )
  );

}


/* =========================================================
   SESIÓN
========================================================= */

function obtenerSesion() {

  try {

    return JSON.parse(
      localStorage.getItem(
        STORAGE_KEY
      )
    );

  } catch {

    return null;

  }

}


function guardarSesion(
  sesion
) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      sesion
    )
  );

}


function borrarSesion() {

  localStorage.removeItem(
    STORAGE_KEY
  );

}


/* =========================================================
   LOGIN
========================================================= */

async function iniciarSesion(
  email,
  password
) {

  const respuesta =
    await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',

        headers: {

          apikey:
            SUPABASE_KEY,

          'Content-Type':
            'application/json',

        },

        body:
          JSON.stringify({
            email,
            password,
          }),

      }
    );


  const resultado =
    await respuesta.json();


  if (!respuesta.ok) {

    throw new Error(
      resultado?.msg ||
      resultado?.error_description ||
      'Correo o contraseña incorrectos.'
    );

  }


  const sesion = {

    access_token:
      resultado.access_token,

    refresh_token:
      resultado.refresh_token,

    expires_at:
      Date.now() +
      Number(
        resultado.expires_in || 3600
      ) *
      1000,

    email:
      resultado.user?.email ||
      email,

  };


  guardarSesion(
    sesion
  );


  return sesion;

}


/* =========================================================
   REFRESCAR SESIÓN
========================================================= */

async function refrescarSesion(
  sesion
) {

  if (
    !sesion?.refresh_token
  ) {

    borrarSesion();

    return null;

  }


  const respuesta =
    await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',

        headers: {

          apikey:
            SUPABASE_KEY,

          'Content-Type':
            'application/json',

        },

        body:
          JSON.stringify({
            refresh_token:
              sesion.refresh_token,
          }),

      }
    );


  if (!respuesta.ok) {

    borrarSesion();

    return null;

  }


  const resultado =
    await respuesta.json();


  const nuevaSesion = {

    access_token:
      resultado.access_token,

    refresh_token:
      resultado.refresh_token ||
      sesion.refresh_token,

    expires_at:
      Date.now() +
      Number(
        resultado.expires_in || 3600
      ) *
      1000,

    email:
      resultado.user?.email ||
      sesion.email,

  };


  guardarSesion(
    nuevaSesion
  );


  return nuevaSesion;

}


/* =========================================================
   TOKEN
========================================================= */

async function obtenerToken() {

  let sesion =
    obtenerSesion();


  if (!sesion) {

    return null;

  }


  if (
    !sesion.expires_at ||
    Date.now() >
    sesion.expires_at -
    60000
  ) {

    sesion =
      await refrescarSesion(
        sesion
      );

  }


  return (
    sesion?.access_token ||
    null
  );

}


/* =========================================================
   PETICIONES SUPABASE
========================================================= */

async function api(
  recurso,
  opciones = {}
) {

  const token =
    await obtenerToken();


  if (!token) {

    throw new Error(
      'SESION_INVALIDA'
    );

  }


  const headers = {

    apikey:
      SUPABASE_KEY,

    Authorization:
      `Bearer ${token}`,

    'Content-Type':
      'application/json',

    ...(opciones.headers || {}),

  };


  const respuesta =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${recurso}`,
      {

        method:
          opciones.method ||
          'GET',

        headers,

        body:
          opciones.body !== undefined
            ? JSON.stringify(
                opciones.body
              )
            : undefined,

      }
    );


  if (
    respuesta.status === 401 ||
    respuesta.status === 403
  ) {

    throw new Error(
      'SESION_INVALIDA'
    );

  }


  if (!respuesta.ok) {

    const mensaje =
      await respuesta.text();

    throw new Error(
      mensaje ||
      'Error consultando Supabase.'
    );

  }


  if (
    respuesta.status === 204
  ) {

    return null;

  }


  const texto =
    await respuesta.text();


  if (!texto) {

    return null;

  }


  return JSON.parse(
    texto
  );

}


/* =========================================================
   CARGAR DATOS
========================================================= */

async function cargarDatos() {

  const resultados =
    await Promise.all([

      api(
        'estadisticas_resumen?select=*'
      ),

      api(
        'estadisticas_diarias?select=*&order=fecha.desc'
      ),

      api(
        'estadisticas_programas?select=*'
      ),

      api(
        'estadisticas_comercios?select=*'
      ),

      api(
        'estadisticas_origenes?select=*'
      ),

      api(
        'estadisticas_busquedas?select=*'
      ),

      api(
        'comercios?select=*&order=nombre.asc'
      ),

      api(
        'beneficios_comercio?select=*&order=comercio_id.asc'
      ),

    ]);


  datos = {

    resumen:
      resultados[0] || [],

    diarias:
      resultados[1] || [],

    programasStats:
      resultados[2] || [],

    comerciosStats:
      resultados[3] || [],

    origenes:
      resultados[4] || [],

    busquedas:
      resultados[5] || [],

    comercios:
      resultados[6] || [],

    beneficios:
      resultados[7] || [],

  };

}


/* =========================================================
   LOGIN VISUAL
========================================================= */

function renderLogin(
  mensaje = ''
) {

  app.innerHTML = `

    <main class="admin-login-page">

      <section class="admin-login-card">

        <a
          href="/"
          class="admin-back-link"
        >
          ← Volver a Morón te acompaña
        </a>


        <div class="admin-login-brand">

          <div class="admin-logo">

            <span></span>
            <span></span>
            <span></span>

          </div>


          <div>

            <strong>
              Morón te acompaña
            </strong>

            <small>
              Administración
            </small>

          </div>

        </div>


        <div class="admin-login-copy">

          <span>
            ACCESO PRIVADO
          </span>

          <h1>
            Panel administrativo
          </h1>

          <p>
            Ingresá con tu cuenta autorizada.
          </p>

        </div>


        ${
          mensaje
            ? `

              <div class="admin-error">
                ${escapar(mensaje)}
              </div>

            `
            : ''
        }


        <form
          id="admin-login-form"
          class="admin-login-form"
        >

          <label>

            Correo electrónico

            <input
              id="admin-email"
              type="email"
              required
              autocomplete="email"
            />

          </label>


          <label>

            Contraseña

            <input
              id="admin-password"
              type="password"
              required
              autocomplete="current-password"
            />

          </label>


          <button
            id="admin-login-button"
            type="submit"
          >
            Ingresar
          </button>

        </form>

      </section>

    </main>

  `;


  document
    .querySelector(
      '#admin-login-form'
    )
    .addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        const boton =
          document.querySelector(
            '#admin-login-button'
          );


        boton.disabled =
          true;

        boton.textContent =
          'Ingresando...';


        try {

          await iniciarSesion(

            document
              .querySelector(
                '#admin-email'
              )
              .value
              .trim(),

            document
              .querySelector(
                '#admin-password'
              )
              .value

          );


          await iniciarAdmin();


        } catch (error) {

          renderLogin(
            error.message
          );

        }

      }
    );

}


/* =========================================================
   TARJETA INDICADOR
========================================================= */

function indicador(
  titulo,
  valor,
  detalle = ''
) {

  return `

    <article class="admin-metric">

      <span>
        ${titulo}
      </span>

      <strong>
        ${numero(valor)}
      </strong>

      ${
        detalle
          ? `
            <small>
              ${detalle}
            </small>
          `
          : ''
      }

    </article>

  `;

}


/* =========================================================
   BARRAS
========================================================= */

function barras(
  filas,
  etiqueta,
  valor
) {

  if (!filas.length) {

    return `

      <div class="admin-empty">
        Todavía no hay datos.
      </div>

    `;

  }


  const maximo =
    Math.max(
      ...filas.map(
        fila =>
          Number(
            valor(fila) || 0
          )
      ),
      1
    );


  return filas
    .map(
      fila => {

        const cantidad =
          Number(
            valor(fila) || 0
          );


        const porcentaje =
          Math.max(
            3,
            Math.round(
              cantidad /
              maximo *
              100
            )
          );


        return `

          <div class="admin-bar-row">

            <div class="admin-bar-title">

              <span>
                ${escapar(
                  etiqueta(fila)
                )}
              </span>

              <strong>
                ${numero(cantidad)}
              </strong>

            </div>


            <div class="admin-bar-track">

              <div
                class="admin-bar-fill"
                style="width:${porcentaje}%"
              ></div>

            </div>

          </div>

        `;

      }
    )
    .join('');

}


/* =========================================================
   RESUMEN
========================================================= */

function renderResumen() {

  const resumen =
    datos.resumen[0] ||
    {};


  const programasOrdenados =
    [...datos.programasStats]
      .sort(
        (a, b) =>
          Number(
            b.selecciones || 0
          ) -
          Number(
            a.selecciones || 0
          )
      )
      .slice(
        0,
        6
      );


  const comerciosOrdenados =
    [...datos.comerciosStats]
      .sort(
        (a, b) =>
          Number(
            b.detalles_abiertos || 0
          ) -
          Number(
            a.detalles_abiertos || 0
          )
      )
      .slice(
        0,
        5
      );


  return `

    <section>

      <div class="admin-section-title">

        <div>

          <span>
            PANEL GENERAL
          </span>

          <h2>
            Resumen
          </h2>

          <p>
            Vista rápida del uso de
            Morón te acompaña.
          </p>

        </div>

      </div>


      <div class="admin-metrics-grid">

        ${indicador(
          'Visitas',
          resumen.visitas_totales,
          'Sesiones registradas'
        )}

        ${indicador(
          'Usuarios',
          resumen.usuarios_unicos,
          'Usuarios aproximados'
        )}

        ${indicador(
          'Programas consultados',
          resumen.selecciones_programa
        )}

        ${indicador(
          'Detalles abiertos',
          resumen.detalles_abiertos
        )}

        ${indicador(
          'Cómo llegar',
          resumen.clics_como_llegar
        )}

        ${indicador(
          'Cerca mío',
          resumen.usos_cerca_mio
        )}

        ${indicador(
          'Búsquedas',
          resumen.busquedas_realizadas
        )}

        ${indicador(
          'Comercios cargados',
          datos.comercios.length
        )}

      </div>


      <div class="admin-two-columns">

        <article class="admin-panel">

          <div class="admin-panel-heading">

            <span>
              PROGRAMAS
            </span>

            <h3>
              Más consultados
            </h3>

          </div>


          ${barras(

            programasOrdenados,

            fila =>
              programaNombre(
                fila.programa
              ),

            fila =>
              fila.selecciones

          )}

        </article>


        <article class="admin-panel">

          <div class="admin-panel-heading">

            <span>
              COMERCIOS
            </span>

            <h3>
              Más vistos
            </h3>

          </div>


          <div class="admin-ranking">

            ${
              comerciosOrdenados.length
                ? comerciosOrdenados
                    .map(
                      (fila, index) => `

                        <div class="admin-ranking-row">

                          <span class="admin-ranking-number">
                            ${index + 1}
                          </span>

                          <div>

                            <strong>
                              ${
                                escapar(
                                  comercioNombre(
                                    fila.comercio_id
                                  )
                                )
                              }
                            </strong>

                            <small>

                              ${
                                numero(
                                  fila.detalles_abiertos
                                )
                              }
                              detalles

                              ·

                              ${
                                numero(
                                  fila.clics_como_llegar
                                )
                              }
                              cómo llegar

                            </small>

                          </div>

                        </div>

                      `
                    )
                    .join('')
                : `

                  <div class="admin-empty">
                    Todavía no hay consultas.
                  </div>

                `
            }

          </div>

        </article>

      </div>

    </section>

  `;

}


/* =========================================================
   ESTADÍSTICAS
========================================================= */

function renderEstadisticas() {

  const diarias =
    [...datos.diarias]
      .slice(
        0,
        14
      )
      .reverse();


  const origenes =
    [...datos.origenes]
      .sort(
        (a, b) =>
          Number(
            b.visitas || 0
          ) -
          Number(
            a.visitas || 0
          )
      );


  const busquedas =
    [...datos.busquedas]
      .sort(
        (a, b) =>
          Number(
            b.cantidad || 0
          ) -
          Number(
            a.cantidad || 0
          )
      )
      .slice(
        0,
        10
      );


  return `

    <section>

      <div class="admin-section-title">

        <div>

          <span>
            INFORMACIÓN DE USO
          </span>

          <h2>
            Estadísticas
          </h2>

          <p>
            Consultas y comportamiento
            dentro de la plataforma.
          </p>

        </div>

      </div>


      <div class="admin-panel">

        <div class="admin-panel-heading">

          <span>
            ACTIVIDAD
          </span>

          <h3>
            Visitas por día
          </h3>

        </div>


        <div class="admin-days">

          ${
            diarias.length
              ? diarias
                  .map(
                    fila => `

                      <div class="admin-day-row">

                        <span>
                          ${escapar(
                            fila.fecha
                          )}
                        </span>

                        <strong>
                          ${
                            numero(
                              fila.visitas
                            )
                          }
                          visitas
                        </strong>

                        <small>
                          ${
                            numero(
                              fila.usuarios
                            )
                          }
                          usuarios
                        </small>

                      </div>

                    `
                  )
                  .join('')
              : `

                <div class="admin-empty">
                  Todavía no hay actividad.
                </div>

              `
          }

        </div>

      </div>


      <div class="admin-two-columns">

        <article class="admin-panel">

          <div class="admin-panel-heading">

            <span>
              ORIGEN
            </span>

            <h3>
              Cómo llegan
            </h3>

          </div>


          ${barras(

            origenes,

            fila =>
              fila.origen ===
              'directo'
                ? 'Acceso directo'
                : fila.origen,

            fila =>
              fila.visitas

          )}

        </article>


        <article class="admin-panel">

          <div class="admin-panel-heading">

            <span>
              BÚSQUEDAS
            </span>

            <h3>
              Más frecuentes
            </h3>

          </div>


          <div class="admin-ranking">

            ${
              busquedas.length
                ? busquedas
                    .map(
                      (fila, index) => `

                        <div class="admin-ranking-row">

                          <span class="admin-ranking-number">
                            ${index + 1}
                          </span>

                          <div>

                            <strong>
                              ${
                                escapar(
                                  fila.busqueda
                                )
                              }
                            </strong>

                            <small>

                              ${
                                numero(
                                  fila.cantidad
                                )
                              }

                              búsquedas

                            </small>

                          </div>

                        </div>

                      `
                    )
                    .join('')
                : `

                  <div class="admin-empty">
                    Todavía no hay búsquedas.
                  </div>

                `
            }

          </div>

        </article>

      </div>

    </section>

  `;

}


/* =========================================================
   LISTA COMERCIOS
========================================================= */

function listaComerciosHTML() {

  const filtro =
    filtroComercios
      .trim()
      .toLowerCase();


  const lista =
    datos.comercios.filter(
      comercio => {

        if (!filtro) {

          return true;

        }


        const texto =
          `
            ${comercio.nombre}
            ${comercio.rubro}
            ${comercio.localidad}
            ${comercio.direccion}
          `
            .toLowerCase();


        return texto.includes(
          filtro
        );

      }
    );


  if (!lista.length) {

    return `

      <div class="admin-empty">
        No encontramos comercios.
      </div>

    `;

  }


  return lista
    .map(
      comercio => {

        const beneficios =
          beneficiosComercio(
            comercio.id
          )
            .filter(
              beneficio =>
                beneficio.activo
            );


        return `

          <article class="admin-business-card">

            <div class="admin-business-info">

              <div class="admin-business-top">

                <span
                  class="
                    admin-status
                    ${
                      comercio.activo
                        ? 'active'
                        : 'inactive'
                    }
                  "
                >

                  ${
                    comercio.activo
                      ? 'Activo'
                      : 'Inactivo'
                  }

                </span>

                <span class="admin-business-category">
                  ${escapar(comercio.rubro)}
                </span>

              </div>


              <h3>
                ${escapar(comercio.nombre)}
              </h3>


              <p>

                ${escapar(comercio.localidad)}

                ·

                ${escapar(comercio.direccion)}

              </p>


              <div class="admin-program-tags">

                ${
                  beneficios.length
                    ? beneficios
                        .map(
                          beneficio => `

                            <span>
                              ${
                                escapar(
                                  programaNombre(
                                    beneficio.programa
                                  )
                                )
                              }
                            </span>

                          `
                        )
                        .join('')
                    : `

                      <span class="muted">
                        Sin beneficios activos
                      </span>

                    `
                }

              </div>

            </div>


            <div class="admin-business-actions">

              <button
                class="admin-edit-button"
                data-edit="${comercio.id}"
              >
                Editar
              </button>


              <button
                class="admin-toggle-button"
                data-toggle="${comercio.id}"
              >

                ${
                  comercio.activo
                    ? 'Desactivar'
                    : 'Activar'
                }

              </button>


              <button
                class="admin-delete-button"
                data-delete="${comercio.id}"
              >
                Eliminar
              </button>

            </div>

          </article>

        `;

      }
    )
    .join('');

}


/* =========================================================
   SECCIÓN COMERCIOS
========================================================= */

function renderComercios() {

  return `

    <section>

      <div class="admin-section-title admin-business-header">

        <div>

          <span>
            BASE DE DATOS
          </span>

          <h2>
            Comercios
          </h2>

          <p>
            Administrá comercios,
            programas y beneficios.
          </p>

        </div>


        <button
          class="admin-primary-button"
          id="nuevo-comercio"
        >
          + Nuevo comercio
        </button>

      </div>


      <div class="admin-business-tools">

        <input
          id="buscar-comercio-admin"
          type="search"
          placeholder="Buscar comercio, rubro o localidad..."
          value="${escapar(filtroComercios)}"
        />


        <span>

          ${
            datos.comercios.length
          }

          comercios

        </span>

      </div>


      <div
        class="admin-business-list"
        id="admin-business-list"
      >

        ${listaComerciosHTML()}

      </div>

    </section>

  `;

}


/* =========================================================
   CONTENIDO SEGÚN SECCIÓN
========================================================= */

function contenidoActual() {

  if (
    seccionActiva ===
    'estadisticas'
  ) {

    return renderEstadisticas();

  }


  if (
    seccionActiva ===
    'comercios'
  ) {

    return renderComercios();

  }


  return renderResumen();

}


/* =========================================================
   PANEL GENERAL
========================================================= */

function renderAdmin() {

  const sesion =
    obtenerSesion();


  app.innerHTML = `

    <main class="admin-page">

      <aside class="admin-sidebar">

        <div>

          <a
            class="admin-brand"
            href="/"
          >

            <div class="admin-logo">

              <span></span>
              <span></span>
              <span></span>

            </div>


            <div>

              <strong>
                Morón te acompaña
              </strong>

              <small>
                Administración
              </small>

            </div>

          </a>


          <nav class="admin-menu">

            <button
              data-section="resumen"
              class="${
                seccionActiva ===
                'resumen'
                  ? 'selected'
                  : ''
              }"
            >
              Resumen
            </button>


            <button
              data-section="estadisticas"
              class="${
                seccionActiva ===
                'estadisticas'
                  ? 'selected'
                  : ''
              }"
            >
              Estadísticas
            </button>


            <button
              data-section="comercios"
              class="${
                seccionActiva ===
                'comercios'
                  ? 'selected'
                  : ''
              }"
            >
              Comercios
            </button>

          </nav>

        </div>


        <div class="admin-sidebar-footer">

          <small>
            ${
              escapar(
                sesion?.email || ''
              )
            }
          </small>

          <button
            id="admin-logout"
          >
            Cerrar sesión
          </button>

        </div>

      </aside>


      <section class="admin-content">

        <header class="admin-topbar">

          <div>

            <span>
              Panel administrativo
            </span>

          </div>


          <div class="admin-topbar-actions">

            <a href="/">
              Ver página pública
            </a>


            <button
              id="actualizar-admin"
            >
              Actualizar
            </button>

          </div>

        </header>


        <div class="admin-content-body">

          ${contenidoActual()}

        </div>

      </section>

    </main>


    <div
      id="admin-modal"
      class="admin-modal-backdrop hidden"
    ></div>

  `;


  conectarEventosGenerales();


  if (
    seccionActiva ===
    'comercios'
  ) {

    conectarEventosComercios();

  }

}


/* =========================================================
   EVENTOS GENERALES
========================================================= */

function conectarEventosGenerales() {

  document
    .querySelectorAll(
      '[data-section]'
    )
    .forEach(
      boton => {

        boton.addEventListener(
          'click',
          () => {

            seccionActiva =
              boton.dataset.section;

            renderAdmin();

          }
        );

      }
    );


  document
    .querySelector(
      '#admin-logout'
    )
    .addEventListener(
      'click',
      () => {

        borrarSesion();

        renderLogin();

      }
    );


  document
    .querySelector(
      '#actualizar-admin'
    )
    .addEventListener(
      'click',
      async () => {

        await mostrarCarga();

        await cargarDatos();

        renderAdmin();

      }
    );

}


/* =========================================================
   EVENTOS COMERCIOS
========================================================= */

function conectarEventosComercios() {

  const buscador =
    document.querySelector(
      '#buscar-comercio-admin'
    );


  buscador.addEventListener(
    'input',
    event => {

      filtroComercios =
        event.target.value;


      document
        .querySelector(
          '#admin-business-list'
        )
        .innerHTML =
          listaComerciosHTML();


      conectarBotonesLista();

    }
  );


  document
    .querySelector(
      '#nuevo-comercio'
    )
    .addEventListener(
      'click',
      () => {

        abrirEditorComercio();

      }
    );


  conectarBotonesLista();

}


/* =========================================================
   BOTONES LISTA COMERCIOS
========================================================= */

function conectarBotonesLista() {

  document
    .querySelectorAll(
      '[data-edit]'
    )
    .forEach(
      boton => {

        boton.addEventListener(
          'click',
          () => {

            abrirEditorComercio(
              Number(
                boton.dataset.edit
              )
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      '[data-toggle]'
    )
    .forEach(
      boton => {

        boton.addEventListener(
          'click',
          async () => {

            const id =
              Number(
                boton.dataset.toggle
              );


            const comercio =
              comercioPorId(
                id
              );


            if (!comercio) {

              return;

            }


            await api(
              `comercios?id=eq.${id}`,
              {

                method:
                  'PATCH',

                body: {

                  activo:
                    !comercio.activo,

                  updated_at:
                    new Date()
                      .toISOString(),

                },

              }
            );


            await cargarDatos();

            renderAdmin();

          }
        );

      }
    );


  document
    .querySelectorAll(
      '[data-delete]'
    )
    .forEach(
      boton => {

        boton.addEventListener(
          'click',
          async () => {

            const id =
              Number(
                boton.dataset.delete
              );


            const comercio =
              comercioPorId(
                id
              );


            if (!comercio) {

              return;

            }


            const confirmar =
              confirm(
                `¿Eliminar "${comercio.nombre}"?\n\nTambién se eliminarán sus beneficios.`
              );


            if (!confirmar) {

              return;

            }


            await api(
              `comercios?id=eq.${id}`,
              {
                method:
                  'DELETE',
              }
            );


            await cargarDatos();

            renderAdmin();

          }
        );

      }
    );

}


/* =========================================================
   EDITOR DE COMERCIO
========================================================= */

function abrirEditorComercio(
  comercioId = null
) {

  const comercio =
    comercioId
      ? comercioPorId(
          comercioId
        )
      : null;


  const beneficios =
    comercioId
      ? beneficiosComercio(
          comercioId
        )
      : [];


  const modal =
    document.querySelector(
      '#admin-modal'
    );


  modal.classList.remove(
    'hidden'
  );


  modal.innerHTML = `

    <section class="admin-editor">

      <div class="admin-editor-header">

        <div>

          <span>
            ${
              comercio
                ? 'EDITAR'
                : 'NUEVO'
            }
          </span>

          <h2>

            ${
              comercio
                ? escapar(
                    comercio.nombre
                  )
                : 'Nuevo comercio'
            }

          </h2>

        </div>


        <button
          id="cerrar-editor"
          class="admin-editor-close"
        >
          ×
        </button>

      </div>


      <form id="form-comercio">

        <div class="admin-form-grid">

          <label>

            Nombre *

            <input
              id="comercio-nombre"
              required
              value="${
                escapar(
                  comercio?.nombre ||
                  ''
                )
              }"
            />

          </label>


          <label>

            Rubro *

            <input
              id="comercio-rubro"
              required
              value="${
                escapar(
                  comercio?.rubro ||
                  ''
                )
              }"
            />

          </label>


          <label>

            Localidad *

            <input
              id="comercio-localidad"
              required
              value="${
                escapar(
                  comercio?.localidad ||
                  ''
                )
              }"
            />

          </label>


          <label>

            Dirección *

            <input
              id="comercio-direccion"
              required
              value="${
                escapar(
                  comercio?.direccion ||
                  ''
                )
              }"
            />

          </label>


          <label>

            Teléfono

            <input
              id="comercio-telefono"
              value="${
                escapar(
                  comercio?.telefono ||
                  ''
                )
              }"
            />

          </label>


          <label>

            Horario

            <input
              id="comercio-horario"
              value="${
                escapar(
                  comercio?.horario ||
                  ''
                )
              }"
            />

          </label>


          <label>

            Latitud

            <input
              id="comercio-lat"
              type="number"
              step="any"
              value="${
                comercio?.lat ??
                ''
              }"
            />

          </label>


          <label>

            Longitud

            <input
              id="comercio-lng"
              type="number"
              step="any"
              value="${
                comercio?.lng ??
                ''
              }"
            />

          </label>

        </div>


        <label class="admin-checkbox">

          <input
            id="comercio-activo"
            type="checkbox"
            ${
              comercio
                ? (
                    comercio.activo
                      ? 'checked'
                      : ''
                  )
                : 'checked'
            }
          />

          Comercio activo

        </label>


        <div class="admin-benefits-title">

          <span>
            PROGRAMAS Y BENEFICIOS
          </span>

          <h3>
            Beneficios del comercio
          </h3>

          <p>
            Activá los programas
            correspondientes y cargá
            el descuento.
          </p>

        </div>


        <div class="admin-benefits-editor">

          ${
            programas
              .map(
                programa => {

                  const beneficio =
                    beneficios.find(
                      item =>
                        item.programa ===
                        programa.id
                    );


                  return `

                    <article class="admin-benefit-editor">

                      <label class="admin-benefit-toggle">

                        <input
                          type="checkbox"
                          id="beneficio-${programa.id}-activo"
                          ${
                            beneficio?.activo
                              ? 'checked'
                              : ''
                          }
                        />

                        <strong>
                          ${
                            escapar(
                              programa.nombre
                            )
                          }
                        </strong>

                      </label>


                      <label>

                        Beneficio

                        <input
                          id="beneficio-${programa.id}-texto"
                          placeholder="Ej: 15% de descuento"
                          value="${
                            escapar(
                              beneficio?.beneficio ||
                              ''
                            )
                          }"
                        />

                      </label>


                      <label>

                        Condiciones

                        <textarea
                          id="beneficio-${programa.id}-condiciones"
                          placeholder="Ej: Presentando la tarjeta."
                        >${
                          escapar(
                            beneficio?.condiciones ||
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


        <div class="admin-editor-actions">

          <button
            type="button"
            class="admin-secondary-button"
            id="cancelar-editor"
          >
            Cancelar
          </button>


          <button
            type="submit"
            class="admin-primary-button"
            id="guardar-comercio"
          >

            Guardar comercio

          </button>

        </div>

      </form>

    </section>

  `;


  document
    .querySelector(
      '#cerrar-editor'
    )
    .addEventListener(
      'click',
      cerrarEditor
    );


  document
    .querySelector(
      '#cancelar-editor'
    )
    .addEventListener(
      'click',
      cerrarEditor
    );


  modal.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        modal
      ) {

        cerrarEditor();

      }

    }
  );


  document
    .querySelector(
      '#form-comercio'
    )
    .addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        const boton =
          document.querySelector(
            '#guardar-comercio'
          );


        boton.disabled =
          true;

        boton.textContent =
          'Guardando...';


        try {

          await guardarComercio(
            comercioId
          );


          cerrarEditor();


          await cargarDatos();


          renderAdmin();


        } catch (error) {

          alert(
            `No se pudo guardar:\n${error.message}`
          );


          boton.disabled =
            false;

          boton.textContent =
            'Guardar comercio';

        }

      }
    );

}


/* =========================================================
   CERRAR EDITOR
========================================================= */

function cerrarEditor() {

  const modal =
    document.querySelector(
      '#admin-modal'
    );


  if (!modal) {

    return;

  }


  modal.classList.add(
    'hidden'
  );


  modal.innerHTML =
    '';

}


/* =========================================================
   GUARDAR COMERCIO
========================================================= */

async function guardarComercio(
  comercioId
) {

  const latTexto =
    document
      .querySelector(
        '#comercio-lat'
      )
      .value
      .trim();


  const lngTexto =
    document
      .querySelector(
        '#comercio-lng'
      )
      .value
      .trim();


  const payload = {

    nombre:
      document
        .querySelector(
          '#comercio-nombre'
        )
        .value
        .trim(),

    rubro:
      document
        .querySelector(
          '#comercio-rubro'
        )
        .value
        .trim(),

    localidad:
      document
        .querySelector(
          '#comercio-localidad'
        )
        .value
        .trim(),

    direccion:
      document
        .querySelector(
          '#comercio-direccion'
        )
        .value
        .trim(),

    telefono:
      document
        .querySelector(
          '#comercio-telefono'
        )
        .value
        .trim() ||
      null,

    horario:
      document
        .querySelector(
          '#comercio-horario'
        )
        .value
        .trim() ||
      null,

    lat:
      latTexto
        ? Number(latTexto)
        : null,

    lng:
      lngTexto
        ? Number(lngTexto)
        : null,

    activo:
      document
        .querySelector(
          '#comercio-activo'
        )
        .checked,

    updated_at:
      new Date()
        .toISOString(),

  };


  let id =
    comercioId;


  if (comercioId) {

    await api(
      `comercios?id=eq.${comercioId}`,
      {

        method:
          'PATCH',

        body:
          payload,

      }
    );

  } else {

    const creados =
      await api(
        'comercios?select=*',
        {

          method:
            'POST',

          headers: {

            Prefer:
              'return=representation',

          },

          body: {

            ...payload,

            codigo:
              `admin-${Date.now()}`,

          },

        }
      );


    id =
      creados?.[0]?.id;


    if (!id) {

      throw new Error(
        'No pudimos obtener el ID del comercio.'
      );

    }

  }


  for (
    const programa
    of programas
  ) {

    const activo =
      document
        .querySelector(
          `#beneficio-${programa.id}-activo`
        )
        .checked;


    const beneficio =
      document
        .querySelector(
          `#beneficio-${programa.id}-texto`
        )
        .value
        .trim();


    const condiciones =
      document
        .querySelector(
          `#beneficio-${programa.id}-condiciones`
        )
        .value
        .trim();


    if (activo) {

      if (!beneficio) {

        throw new Error(
          `Falta cargar el beneficio de ${programa.nombre}.`
        );

      }


      await api(
        `beneficios_comercio?on_conflict=comercio_id,programa`,
        {

          method:
            'POST',

          headers: {

            Prefer:
              'resolution=merge-duplicates,return=minimal',

          },

          body: {

            comercio_id:
              id,

            programa:
              programa.id,

            beneficio,

            condiciones:
              condiciones ||
              null,

            activo:
              true,

            updated_at:
              new Date()
                .toISOString(),

          },

        }
      );

    } else {

      await api(
        `beneficios_comercio?comercio_id=eq.${id}&programa=eq.${programa.id}`,
        {

          method:
            'PATCH',

          body: {

            activo:
              false,

            updated_at:
              new Date()
                .toISOString(),

          },

        }
      );

    }

  }

}


/* =========================================================
   CARGA VISUAL
========================================================= */

async function mostrarCarga() {

  app.innerHTML = `

    <main class="admin-loading">

      <div class="admin-spinner">
      </div>

      <strong>
        Cargando administración...
      </strong>

    </main>

  `;

}


/* =========================================================
   INICIAR ADMIN
========================================================= */

async function iniciarAdmin() {

  const token =
    await obtenerToken();


  if (!token) {

    renderLogin();

    return;

  }


  await mostrarCarga();


  try {

    await cargarDatos();

    renderAdmin();

  } catch (error) {

    if (
      error.message ===
      'SESION_INVALIDA'
    ) {

      borrarSesion();

      renderLogin(
        'Tu sesión venció. Volvé a ingresar.'
      );

      return;

    }


    app.innerHTML = `

      <main class="admin-login-page">

        <section class="admin-login-card">

          <h2>
            No pudimos cargar el panel
          </h2>

          <p>
            ${escapar(error.message)}
          </p>


          <button
            id="reintentar-admin"
            class="admin-primary-button"
          >
            Reintentar
          </button>

        </section>

      </main>

    `;


    document
      .querySelector(
        '#reintentar-admin'
      )
      .addEventListener(
        'click',
        iniciarAdmin
      );

  }

}


/* =========================================================
   INICIO
========================================================= */

if (
  !SUPABASE_URL ||
  !SUPABASE_KEY
) {

  app.innerHTML = `

    <main class="admin-login-page">

      <section class="admin-login-card">

        <h2>
          Falta configurar Supabase
        </h2>

        <p>
          Revisá las variables del archivo .env.
        </p>

      </section>

    </main>

  `;

} else {

  iniciarAdmin();

}