import './stats.css';

import {
  programas,
  comercios,
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


/* =====================================================
   UTILIDADES
===================================================== */

function programaNombre(id) {
  return (
    programas.find(
      programa =>
        programa.id === id
    )?.nombre || id || 'Sin programa'
  );
}


function comercioNombre(id) {
  return (
    comercios.find(
      comercio =>
        Number(comercio.id) ===
        Number(id)
    )?.nombre ||
    `Comercio #${id}`
  );
}


function numero(valor) {
  return new Intl.NumberFormat(
    'es-AR'
  ).format(
    Number(valor || 0)
  );
}


function fechaArgentina(fecha) {
  if (!fecha) {
    return '';
  }

  const partes =
    fecha.split('-');

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


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


function guardarSesion(sesion) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sesion)
  );
}


function cerrarSesionLocal() {
  localStorage.removeItem(
    STORAGE_KEY
  );
}


/* =====================================================
   LOGIN
===================================================== */

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


  const datos =
    await respuesta.json();


  if (!respuesta.ok) {
    throw new Error(
      datos?.msg ||
      datos?.error_description ||
      'No se pudo iniciar sesión.'
    );
  }


  const sesion = {
    access_token:
      datos.access_token,

    refresh_token:
      datos.refresh_token,

    expires_at:
      Date.now() +
      Number(
        datos.expires_in || 3600
      ) *
      1000,

    email:
      datos.user?.email || email,
  };


  guardarSesion(
    sesion
  );


  return sesion;
}


/* =====================================================
   REFRESCAR SESIÓN
===================================================== */

async function refrescarSesion(
  sesion
) {
  if (
    !sesion?.refresh_token
  ) {
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
    cerrarSesionLocal();

    return null;
  }


  const datos =
    await respuesta.json();


  const nuevaSesion = {
    access_token:
      datos.access_token,

    refresh_token:
      datos.refresh_token ||
      sesion.refresh_token,

    expires_at:
      Date.now() +
      Number(
        datos.expires_in || 3600
      ) *
      1000,

    email:
      datos.user?.email ||
      sesion.email,
  };


  guardarSesion(
    nuevaSesion
  );


  return nuevaSesion;
}


/* =====================================================
   OBTENER TOKEN VÁLIDO
===================================================== */

async function obtenerToken() {
  let sesion =
    obtenerSesion();


  if (!sesion) {
    return null;
  }


  const margen =
    60 * 1000;


  if (
    !sesion.expires_at ||
    Date.now() >
    sesion.expires_at - margen
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


/* =====================================================
   CONSULTAR SUPABASE
===================================================== */

async function consultarVista(
  vista,
  token
) {
  const respuesta =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${vista}?select=*`,
      {
        headers: {
          apikey:
            SUPABASE_KEY,

          Authorization:
            `Bearer ${token}`,
        },
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
      `Error consultando ${vista}`
    );
  }


  return respuesta.json();
}


/* =====================================================
   LOGIN VISUAL
===================================================== */

function renderLogin(
  mensaje = ''
) {
  app.innerHTML = `

    <main class="stats-login-page">

      <section class="stats-login-card">

        <a
          class="stats-back-link"
          href="/"
        >
          ← Volver a Morón te acompaña
        </a>


        <div class="stats-brand">

          <div class="stats-logo">

            <span></span>
            <span></span>
            <span></span>

          </div>


          <div>

            <strong>
              Morón te acompaña
            </strong>

            <small>
              Panel de administración
            </small>

          </div>

        </div>


        <div class="stats-login-copy">

          <span>
            ACCESO PRIVADO
          </span>

          <h1>
            Estadísticas
          </h1>

          <p>
            Ingresá con tu cuenta
            de administración.
          </p>

        </div>


        ${
          mensaje
            ? `
              <div class="stats-error">
                ${mensaje}
              </div>
            `
            : ''
        }


        <form
          id="login-form"
          class="stats-form"
        >

          <label>

            Correo electrónico

            <input
              id="login-email"
              type="email"
              autocomplete="email"
              required
            />

          </label>


          <label>

            Contraseña

            <input
              id="login-password"
              type="password"
              autocomplete="current-password"
              required
            />

          </label>


          <button
            id="login-button"
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
      '#login-form'
    )
    .addEventListener(
      'submit',
      async event => {
        event.preventDefault();


        const email =
          document
            .querySelector(
              '#login-email'
            )
            .value
            .trim();


        const password =
          document
            .querySelector(
              '#login-password'
            )
            .value;


        const boton =
          document.querySelector(
            '#login-button'
          );


        boton.disabled =
          true;

        boton.textContent =
          'Ingresando...';


        try {
          await iniciarSesion(
            email,
            password
          );

          await cargarPanel();

        } catch (error) {
          renderLogin(
            error.message ||
            'No se pudo iniciar sesión.'
          );
        }
      }
    );
}


/* =====================================================
   COMPONENTES DEL PANEL
===================================================== */

function tarjetaIndicador(
  titulo,
  valor,
  descripcion = ''
) {
  return `

    <article class="metric-card">

      <span>
        ${titulo}
      </span>

      <strong>
        ${numero(valor)}
      </strong>

      ${
        descripcion
          ? `
            <small>
              ${descripcion}
            </small>
          `
          : ''
      }

    </article>

  `;
}


function barras(
  filas,
  etiquetaFn,
  valorFn
) {
  if (!filas.length) {
    return `
      <div class="stats-empty">
        Todavía no hay datos.
      </div>
    `;
  }


  const maximo =
    Math.max(
      ...filas.map(
        fila =>
          Number(
            valorFn(fila) || 0
          )
      ),
      1
    );


  return filas
    .map(
      fila => {
        const valor =
          Number(
            valorFn(fila) || 0
          );

        const ancho =
          Math.max(
            3,
            Math.round(
              valor /
              maximo *
              100
            )
          );


        return `

          <div class="bar-row">

            <div class="bar-row-top">

              <span>
                ${etiquetaFn(fila)}
              </span>

              <strong>
                ${numero(valor)}
              </strong>

            </div>

            <div class="bar-track">

              <div
                class="bar-fill"
                style="width:${ancho}%"
              ></div>

            </div>

          </div>

        `;
      }
    )
    .join('');
}


/* =====================================================
   PANEL
===================================================== */

function renderPanel({
  resumen,
  diarias,
  programasData,
  comerciosData,
  origenes,
  busquedas,
}) {
  const sesion =
    obtenerSesion();


  const r =
    resumen?.[0] || {};


  const dias =
    [...diarias]
      .sort(
        (a, b) =>
          String(a.fecha)
            .localeCompare(
              String(b.fecha)
            )
      )
      .slice(-14);


  const programasOrdenados =
    [...programasData]
      .sort(
        (a, b) =>
          Number(
            b.selecciones || 0
          ) -
          Number(
            a.selecciones || 0
          )
      );


  const comerciosOrdenados =
    [...comerciosData]
      .sort(
        (a, b) =>
          Number(
            b.detalles_abiertos || 0
          ) -
          Number(
            a.detalles_abiertos || 0
          )
      )
      .slice(0, 10);


  const busquedasOrdenadas =
    [...busquedas]
      .sort(
        (a, b) =>
          Number(
            b.cantidad || 0
          ) -
          Number(
            a.cantidad || 0
          )
      )
      .slice(0, 10);


  app.innerHTML = `

    <main class="stats-page">

      <header class="stats-header">

        <div>

          <a
            class="stats-home-link"
            href="/"
          >
            ← Volver a la app
          </a>

          <span class="stats-kicker">
            MORÓN TE ACOMPAÑA
          </span>

          <h1>
            Estadísticas
          </h1>

          <p>
            Uso general de la plataforma
            y consultas de beneficios.
          </p>

        </div>


        <div class="stats-user">

          <small>
            Sesión iniciada como
          </small>

          <strong>
            ${sesion?.email || ''}
          </strong>

          <button
            id="logout"
          >
            Cerrar sesión
          </button>

        </div>

      </header>


      <section class="metrics-grid">

        ${tarjetaIndicador(
          'Visitas',
          r.visitas_totales,
          'Sesiones registradas'
        )}

        ${tarjetaIndicador(
          'Usuarios',
          r.usuarios_unicos,
          'Usuarios aproximados'
        )}

        ${tarjetaIndicador(
          'Programas consultados',
          r.selecciones_programa
        )}

        ${tarjetaIndicador(
          'Detalles abiertos',
          r.detalles_abiertos
        )}

        ${tarjetaIndicador(
          'Cómo llegar',
          r.clics_como_llegar,
          'Clics hacia Maps'
        )}

        ${tarjetaIndicador(
          'Cerca mío',
          r.usos_cerca_mio
        )}

        ${tarjetaIndicador(
          'Búsquedas',
          r.busquedas_realizadas
        )}

        ${tarjetaIndicador(
          'Marcadores abiertos',
          r.marcadores_abiertos
        )}

      </section>


      <section class="stats-main-grid">

        <article class="stats-panel stats-panel-wide">

          <div class="panel-heading">

            <div>

              <span>
                ACTIVIDAD
              </span>

              <h2>
                Visitas por día
              </h2>

            </div>

            <small>
              Últimos 14 días con actividad
            </small>

          </div>


          <div class="daily-chart">

            ${
              dias.length
                ? dias
                    .map(
                      fila => {

                        const maximo =
                          Math.max(
                            ...dias.map(
                              d =>
                                Number(
                                  d.visitas || 0
                                )
                            ),
                            1
                          );

                        const altura =
                          Math.max(
                            8,
                            Math.round(
                              Number(
                                fila.visitas || 0
                              ) /
                              maximo *
                              100
                            )
                          );

                        return `

                          <div class="daily-column">

                            <strong>
                              ${numero(
                                fila.visitas
                              )}
                            </strong>

                            <div
                              class="daily-bar"
                              style="height:${altura}%"
                            ></div>

                            <small>
                              ${
                                fechaArgentina(
                                  fila.fecha
                                )
                                  .slice(
                                    0,
                                    5
                                  )
                              }
                            </small>

                          </div>

                        `;
                      }
                    )
                    .join('')
                : `
                  <div class="stats-empty">
                    Todavía no hay actividad diaria.
                  </div>
                `
            }

          </div>

        </article>


        <article class="stats-panel">

          <div class="panel-heading">

            <div>

              <span>
                PROGRAMAS
              </span>

              <h2>
                Más consultados
              </h2>

            </div>

          </div>


          <div class="bar-list">

            ${
              barras(
                programasOrdenados,
                fila =>
                  programaNombre(
                    fila.programa
                  ),
                fila =>
                  fila.selecciones
              )
            }

          </div>

        </article>


        <article class="stats-panel">

          <div class="panel-heading">

            <div>

              <span>
                COMERCIOS
              </span>

              <h2>
                Más vistos
              </h2>

            </div>

          </div>


          <div class="ranking-list">

            ${
              comerciosOrdenados.length
                ? comerciosOrdenados
                    .map(
                      (fila, index) => `

                        <div class="ranking-row">

                          <span class="ranking-number">
                            ${index + 1}
                          </span>

                          <div>

                            <strong>
                              ${
                                comercioNombre(
                                  fila.comercio_id
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
                  <div class="stats-empty">
                    Todavía no hay comercios consultados.
                  </div>
                `
            }

          </div>

        </article>


        <article class="stats-panel">

          <div class="panel-heading">

            <div>

              <span>
                ORIGEN
              </span>

              <h2>
                Cómo llegan
              </h2>

            </div>

          </div>


          <div class="bar-list">

            ${
              barras(
                origenes,
                fila =>
                  fila.origen ===
                  'directo'
                    ? 'Acceso directo'
                    : fila.origen,
                fila =>
                  fila.visitas
              )
            }

          </div>

        </article>


        <article class="stats-panel">

          <div class="panel-heading">

            <div>

              <span>
                BUSCADOR
              </span>

              <h2>
                Búsquedas frecuentes
              </h2>

            </div>

          </div>


          <div class="ranking-list">

            ${
              busquedasOrdenadas.length
                ? busquedasOrdenadas
                    .map(
                      (fila, index) => `

                        <div class="ranking-row">

                          <span class="ranking-number">
                            ${index + 1}
                          </span>

                          <div>

                            <strong>
                              ${fila.busqueda}
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
                  <div class="stats-empty">
                    Todavía no hay búsquedas registradas.
                  </div>
                `
            }

          </div>

        </article>

      </section>

    </main>

  `;


  document
    .querySelector(
      '#logout'
    )
    .addEventListener(
      'click',
      () => {
        cerrarSesionLocal();

        renderLogin();
      }
    );
}


/* =====================================================
   CARGAR DATOS
===================================================== */

async function cargarPanel() {
  app.innerHTML = `

    <main class="stats-loading">

      <div class="loading-circle">
      </div>

      <strong>
        Cargando estadísticas...
      </strong>

    </main>

  `;


  const token =
    await obtenerToken();


  if (!token) {
    renderLogin();

    return;
  }


  try {
    const [
      resumen,
      diarias,
      programasData,
      comerciosData,
      origenes,
      busquedas,
    ] =
      await Promise.all([

        consultarVista(
          'estadisticas_resumen',
          token
        ),

        consultarVista(
          'estadisticas_diarias',
          token
        ),

        consultarVista(
          'estadisticas_programas',
          token
        ),

        consultarVista(
          'estadisticas_comercios',
          token
        ),

        consultarVista(
          'estadisticas_origenes',
          token
        ),

        consultarVista(
          'estadisticas_busquedas',
          token
        ),

      ]);


    renderPanel({
      resumen,
      diarias,
      programasData,
      comerciosData,
      origenes,
      busquedas,
    });

  } catch (error) {
    if (
      error.message ===
      'SESION_INVALIDA'
    ) {
      cerrarSesionLocal();

      renderLogin(
        'Tu sesión venció. Volvé a ingresar.'
      );

      return;
    }


    app.innerHTML = `

      <main class="stats-login-page">

        <section class="stats-login-card">

          <h2>
            No pudimos cargar las estadísticas
          </h2>

          <p>
            ${error.message}
          </p>

          <button
            class="retry-button"
            id="retry"
          >
            Reintentar
          </button>

        </section>

      </main>

    `;


    document
      .querySelector(
        '#retry'
      )
      .addEventListener(
        'click',
        cargarPanel
      );
  }
}


/* =====================================================
   INICIO
===================================================== */

if (
  !SUPABASE_URL ||
  !SUPABASE_KEY
) {
  app.innerHTML = `

    <main class="stats-login-page">

      <section class="stats-login-card">

        <h2>
          Falta configurar Supabase
        </h2>

        <p>
          Revisá las variables
          VITE_SUPABASE_URL y
          VITE_SUPABASE_KEY.
        </p>

      </section>

    </main>

  `;
} else {
  cargarPanel();
}