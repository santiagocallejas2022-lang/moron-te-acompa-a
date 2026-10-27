import './style.css';

import {
  programas,
  comercios,
} from './data.js';

import {
  registrarEvento,
} from './analytics.js';


const app =
  document.querySelector('#app');


/* =====================================================
   ESTADO
===================================================== */

let programaSeleccionado =
  localStorage.getItem('mta_programa') || null;

let busqueda = '';

let rubroSeleccionado = '';

let localidadSeleccionada = '';

let ubicacionUsuario = null;

let mapa = null;

let marcadores = [];

let marcadorUsuario = null;

let contadorMapaControl = null;

let temporizadorBusqueda = null;


/* =====================================================
   VALIDAR PROGRAMA GUARDADO
===================================================== */

if (
  programaSeleccionado &&
  !programas.some(
    programa =>
      programa.id === programaSeleccionado
  )
) {
  programaSeleccionado = null;

  localStorage.removeItem(
    'mta_programa'
  );
}


/* =====================================================
   UTILIDADES
===================================================== */

function escaparHtml(valor = '') {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function normalizar(texto = '') {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );
}


function programaPorId(id) {
  return programas.find(
    programa =>
      programa.id === id
  );
}


function limpiarFiltros() {
  busqueda = '';

  rubroSeleccionado = '';

  localidadSeleccionada = '';

  ubicacionUsuario = null;
}


function beneficiosVisibles(
  comercio
) {
  const beneficios =
    comercio.beneficios || [];

  if (!programaSeleccionado) {
    return beneficios;
  }

  return beneficios.filter(
    beneficio =>
      beneficio.programa ===
      programaSeleccionado
  );
}


/* =====================================================
   VALIDACIÓN DE COORDENADAS
===================================================== */

function tieneCoordenadasValidas(
  comercio
) {
  const lat =
    Number(comercio?.lat);

  const lng =
    Number(comercio?.lng);


  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return false;
  }


  /*
   * Nunca aceptar 0,0.
   */

  if (
    lat === 0 ||
    lng === 0
  ) {
    return false;
  }


  /*
   * Zona amplia alrededor
   * del Partido de Morón.
   *
   * Esto evita que una mala
   * geolocalización mande un
   * comercio al océano,
   * otra provincia, etc.
   */

  const dentroZonaMoron =
    lat >= -34.78 &&
    lat <= -34.52 &&
    lng >= -58.80 &&
    lng <= -58.45;


  return dentroZonaMoron;
}


/* =====================================================
   DISTANCIA
===================================================== */

function distanciaKm(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;


  const a =
    Math.sin(dLat / 2) ** 2 +

    Math.cos(
      (lat1 * Math.PI) / 180
    ) *

    Math.cos(
      (lat2 * Math.PI) / 180
    ) *

    Math.sin(dLon / 2) ** 2;


  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}


/* =====================================================
   LOGO
===================================================== */

function logoMoron(
  clase = ''
) {
  return `
    <span
      class="moron-symbol ${clase}"
    >

      <span
        class="
          moron-bar
          moron-bar-left
        "
      ></span>

      <span
        class="
          moron-bar
          moron-bar-center
        "
      ></span>

      <span
        class="
          moron-bar
          moron-bar-right
        "
      ></span>

    </span>
  `;
}


/* =====================================================
   HOME
===================================================== */

function renderHome() {
  destruirMapa();

  app.innerHTML = `

    <main class="app-shell">

      <section class="hero">

        <header class="brand">

          ${logoMoron(
            'moron-symbol-home'
          )}

          <div class="brand-text">

            <span class="brand-name">
              Morón
            </span>

            <span class="brand-sub">
              te acompaña
            </span>

          </div>

        </header>


        <section class="hero-content">

          <span class="eyebrow">
            BENEFICIOS PARA VOS
          </span>

          <h1>

            Encontrá beneficios

            <span>
              cerca tuyo
            </span>

          </h1>

          <p>
            Consultá comercios adheridos,
            descuentos y servicios disponibles
            según tu programa.
          </p>

        </section>


        <section class="actions">

          <button
            class="action-card primary"
            id="btn-beneficios"
          >

            <span class="action-icon">
              ♥
            </span>

            <span class="action-text">

              <strong>
                Mis beneficios
              </strong>

              <small>
                Elegí tu tarjeta o programa
              </small>

            </span>

            <span class="arrow">
              ›
            </span>

          </button>


          <button
            class="action-card"
            id="btn-cerca"
          >

            <span class="action-icon">
              ◎
            </span>

            <span class="action-text">

              <strong>
                Cerca mío
              </strong>

              <small>
                Beneficios próximos a vos
              </small>

            </span>

            <span class="arrow">
              ›
            </span>

          </button>


          <button
            class="action-card"
            id="btn-mapa"
          >

            <span class="action-icon">
              ◉
            </span>

            <span class="action-text">

              <strong>
                Ver mapa
              </strong>

              <small>
                Explorá todos los comercios
              </small>

            </span>

            <span class="arrow">
              ›
            </span>

          </button>


          <button
            class="action-card"
            id="btn-buscar"
          >

            <span class="action-icon">
              ⌕
            </span>

            <span class="action-text">

              <strong>
                Buscar comercio
              </strong>

              <small>
                Buscá por nombre o rubro
              </small>

            </span>

            <span class="arrow">
              ›
            </span>

          </button>

        </section>


        <footer class="footer-message">

          <span class="dot"></span>

          Beneficios y servicios
          del Municipio de Morón

        </footer>

      </section>

    </main>

  `;


  document
    .querySelector(
      '#btn-beneficios'
    )
    .addEventListener(
      'click',
      () => {
        limpiarFiltros();

        renderProgramas();
      }
    );


  document
    .querySelector(
      '#btn-mapa'
    )
    .addEventListener(
      'click',
      () => {
        programaSeleccionado =
          null;

        limpiarFiltros();

        localStorage.removeItem(
          'mta_programa'
        );

        renderExplorar();
      }
    );


  document
    .querySelector(
      '#btn-buscar'
    )
    .addEventListener(
      'click',
      () => {
        programaSeleccionado =
          null;

        limpiarFiltros();

        localStorage.removeItem(
          'mta_programa'
        );

        renderExplorar(
          true
        );
      }
    );


  document
    .querySelector(
      '#btn-cerca'
    )
    .addEventListener(
      'click',
      () => {
        programaSeleccionado =
          null;

        limpiarFiltros();

        localStorage.removeItem(
          'mta_programa'
        );

        solicitarUbicacion();
      }
    );
}


/* =====================================================
   PROGRAMAS
===================================================== */

function renderProgramas() {
  destruirMapa();

  app.innerHTML = `

    <main class="page">

      <header class="page-header">

        <button
          class="back-button"
          id="volver"
          aria-label="Volver"
        >
          ←
        </button>


        <div class="internal-title">

          <div class="internal-brand">

            ${logoMoron(
              'moron-symbol-small'
            )}

            <span class="mini-brand">
              MORÓN TE ACOMPAÑA
            </span>

          </div>

          <h2>
            Elegí tu beneficio
          </h2>

        </div>

      </header>


      <p class="page-intro">

        Tocá tu tarjeta para consultar
        comercios adheridos, descuentos
        y beneficios disponibles.

      </p>


      <section class="program-grid">

        ${programas
          .map(
            programa => `

              <button
                class="program-image-card"
                data-programa="${
                  programa.id
                }"
              >

                <div
                  class="
                    program-image-container
                  "
                >

                  <img
                    src="${
                      programa.imagen
                    }"
                    alt="${
                      escaparHtml(
                        programa.nombre
                      )
                    }"
                    class="program-image"
                  />

                </div>


                <div
                  class="
                    program-card-footer
                  "
                >

                  <div
                    class="
                      program-card-text
                    "
                  >

                    <strong>
                      ${
                        escaparHtml(
                          programa.nombre
                        )
                      }
                    </strong>

                    <small>
                      Ver comercios adheridos
                    </small>

                  </div>

                  <span
                    class="program-arrow"
                  >
                    ›
                  </span>

                </div>

              </button>

            `
          )
          .join('')}

      </section>


      <button
        class="all-benefits-button"
        id="ver-todos"
      >
        Ver todos los programas
        y comercios
      </button>

    </main>

  `;


  document
    .querySelector(
      '#volver'
    )
    .addEventListener(
      'click',
      renderHome
    );


  document
    .querySelector(
      '#ver-todos'
    )
    .addEventListener(
      'click',
      () => {
        programaSeleccionado =
          null;

        limpiarFiltros();

        localStorage.removeItem(
          'mta_programa'
        );


        registrarEvento(
          'ver_todos_programas'
        );


        renderExplorar();
      }
    );


  document
    .querySelectorAll(
      '[data-programa]'
    )
    .forEach(
      card => {
        card.addEventListener(
          'click',
          () => {
            programaSeleccionado =
              card.dataset.programa;


            /*
             * Evita arrastrar
             * filtros de otro programa.
             */

            limpiarFiltros();


            localStorage.setItem(
              'mta_programa',
              programaSeleccionado
            );


            registrarEvento(
              'programa_seleccionado',
              {
                programa:
                  programaSeleccionado,
              }
            );


            renderExplorar();
          }
        );
      }
    );
}


/* =====================================================
   FILTRAR COMERCIOS
===================================================== */

function obtenerComerciosFiltrados() {
  let resultado = [
    ...comercios,
  ];


  if (
    programaSeleccionado
  ) {
    resultado =
      resultado.filter(
        comercio =>
          (
            comercio.beneficios ||
            []
          ).some(
            beneficio =>
              beneficio.programa ===
              programaSeleccionado
          )
      );
  }


  if (
    rubroSeleccionado
  ) {
    resultado =
      resultado.filter(
        comercio =>
          comercio.rubro ===
          rubroSeleccionado
      );
  }


  if (
    localidadSeleccionada
  ) {
    resultado =
      resultado.filter(
        comercio =>
          comercio.localidad ===
          localidadSeleccionada
      );
  }


  if (
    busqueda.trim()
  ) {
    const texto =
      normalizar(busqueda);


    resultado =
      resultado.filter(
        comercio => {
          const beneficiosTexto =
            (
              comercio.beneficios ||
              []
            )
              .map(
                beneficio => {
                  const programa =
                    programaPorId(
                      beneficio.programa
                    );


                  return `
                    ${
                      programa?.nombre ||
                      ''
                    }

                    ${
                      beneficio.beneficio ||
                      ''
                    }

                    ${
                      beneficio.condiciones ||
                      ''
                    }
                  `;
                }
              )
              .join(' ');


          const contenido =
            normalizar(
              `
                ${comercio.nombre || ''}
                ${comercio.rubro || ''}
                ${comercio.localidad || ''}
                ${comercio.direccion || ''}
                ${beneficiosTexto}
              `
            );


          return (
            contenido.includes(
              texto
            )
          );
        }
      );
  }


  /*
   * CERCA MÍO
   */

  if (
    ubicacionUsuario
  ) {
    resultado =
      resultado.map(
        comercio => {
          if (
            !tieneCoordenadasValidas(
              comercio
            )
          ) {
            return {
              ...comercio,

              distancia:
                null,
            };
          }


          return {
            ...comercio,

            distancia:
              distanciaKm(
                ubicacionUsuario.lat,
                ubicacionUsuario.lng,

                Number(
                  comercio.lat
                ),

                Number(
                  comercio.lng
                )
              ),
          };
        }
      );


    resultado.sort(
      (a, b) => {
        if (
          a.distancia === null &&
          b.distancia === null
        ) {
          return 0;
        }

        if (
          a.distancia === null
        ) {
          return 1;
        }

        if (
          b.distancia === null
        ) {
          return -1;
        }

        return (
          a.distancia -
          b.distancia
        );
      }
    );
  }


  return resultado;
}


/* =====================================================
   EXPLORAR
===================================================== */

function renderExplorar(
  enfocarBusqueda = false
) {
  const programa =
    programaPorId(
      programaSeleccionado
    );


  const rubros = [
    ...new Set(
      comercios
        .map(
          comercio =>
            comercio.rubro
        )
        .filter(Boolean)
    ),
  ].sort();


  const localidades = [
    ...new Set(
      comercios
        .map(
          comercio =>
            comercio.localidad
        )
        .filter(Boolean)
    ),
  ].sort();


  app.innerHTML = `

    <main class="explore-page">

      <header
        class="explore-header"
      >

        <div
          class="explore-top"
        >

          <button
            class="back-button"
            id="volver-home"
            aria-label="Volver"
          >
            ←
          </button>


          <div
            class="explore-title"
          >

            <div
              class="internal-brand"
            >

              ${logoMoron(
                'moron-symbol-small'
              )}

              <span
                class="mini-brand"
              >
                MORÓN TE ACOMPAÑA
              </span>

            </div>

            <h2>
              ${
                programa
                  ? escaparHtml(
                      programa.nombre
                    )
                  : 'Todos los beneficios'
              }
            </h2>

          </div>


          <button
            class="change-program"
            id="cambiar-programa"
          >
            Programas
          </button>

        </div>


        <div
          class="search-box"
        >

          <span>
            ⌕
          </span>

          <input
            id="buscador"
            type="search"
            placeholder="Buscar comercio, rubro o beneficio..."
            value="${
              escaparHtml(
                busqueda
              )
            }"
          />

        </div>


        <div class="filters">

          <select
            id="filtro-rubro"
          >

            <option value="">
              Todos los rubros
            </option>

            ${rubros
              .map(
                rubro => `
                  <option
                    value="${
                      escaparHtml(
                        rubro
                      )
                    }"
                    ${
                      rubroSeleccionado ===
                      rubro
                        ? 'selected'
                        : ''
                    }
                  >
                    ${
                      escaparHtml(
                        rubro
                      )
                    }
                  </option>
                `
              )
              .join('')}

          </select>


          <select
            id="filtro-localidad"
          >

            <option value="">
              Todas las localidades
            </option>

            ${localidades
              .map(
                localidad => `
                  <option
                    value="${
                      escaparHtml(
                        localidad
                      )
                    }"
                    ${
                      localidadSeleccionada ===
                      localidad
                        ? 'selected'
                        : ''
                    }
                  >
                    ${
                      escaparHtml(
                        localidad
                      )
                    }
                  </option>
                `
              )
              .join('')}

          </select>


          <button
            class="near-button"
            id="cerca-explorar"
          >
            ◎ Cerca mío
          </button>

        </div>

      </header>


      <section
        class="explore-layout"
      >

        <div
          class="results-column"
        >

          <div
            class="results-header"
          >

            <strong
              id="contador"
            ></strong>

            <span>
              Comercios adheridos
            </span>

          </div>


          <div
            class="business-list"
            id="lista-comercios"
          ></div>

        </div>


        <div
          class="map-column"
        >

          <div
            id="map"
          ></div>

        </div>

      </section>

    </main>


    <div
      class="
        modal-backdrop
        hidden
      "
      id="modal"
    >

      <div
        class="business-modal"
        id="modal-contenido"
      ></div>

    </div>

  `;


  document
    .querySelector(
      '#volver-home'
    )
    .addEventListener(
      'click',
      renderHome
    );


  document
    .querySelector(
      '#cambiar-programa'
    )
    .addEventListener(
      'click',
      renderProgramas
    );


  const buscador =
    document.querySelector(
      '#buscador'
    );


  buscador.addEventListener(
    'input',
    event => {
      busqueda =
        event.target.value;


      actualizarResultados();


      clearTimeout(
        temporizadorBusqueda
      );


      temporizadorBusqueda =
        setTimeout(
          () => {
            if (
              busqueda
                .trim()
                .length >= 2
            ) {
              registrarEvento(
                'busqueda',
                {
                  programa:
                    programaSeleccionado,

                  busqueda:
                    busqueda.trim(),

                  rubro:
                    rubroSeleccionado,

                  localidad:
                    localidadSeleccionada,
                }
              );
            }
          },
          700
        );
    }
  );


  document
    .querySelector(
      '#filtro-rubro'
    )
    .addEventListener(
      'change',
      event => {
        rubroSeleccionado =
          event.target.value;


        registrarEvento(
          'filtro_rubro',
          {
            programa:
              programaSeleccionado,

            rubro:
              rubroSeleccionado ||
              'todos',
          }
        );


        actualizarResultados();
      }
    );


  document
    .querySelector(
      '#filtro-localidad'
    )
    .addEventListener(
      'change',
      event => {
        localidadSeleccionada =
          event.target.value;


        registrarEvento(
          'filtro_localidad',
          {
            programa:
              programaSeleccionado,

            localidad:
              localidadSeleccionada ||
              'todas',
          }
        );


        actualizarResultados();
      }
    );


  document
    .querySelector(
      '#cerca-explorar'
    )
    .addEventListener(
      'click',
      solicitarUbicacion
    );


  crearMapa();

  actualizarResultados();


  if (
    enfocarBusqueda
  ) {
    setTimeout(
      () =>
        buscador.focus(),
      100
    );
  }
}


/* =====================================================
   RESULTADOS
===================================================== */

function actualizarResultados() {
  const resultado =
    obtenerComerciosFiltrados();


  const lista =
    document.querySelector(
      '#lista-comercios'
    );


  const contador =
    document.querySelector(
      '#contador'
    );


  if (
    !lista ||
    !contador
  ) {
    return;
  }


  contador.textContent =
    `${resultado.length} ${
      resultado.length === 1
        ? 'comercio'
        : 'comercios'
    }`;


  if (
    !resultado.length
  ) {
    lista.innerHTML = `

      <div class="empty-state">

        <span>
          ⌕
        </span>

        <strong>
          No encontramos comercios
        </strong>

        <p>
          Probá cambiando los filtros
          o la búsqueda.
        </p>

      </div>

    `;
  } else {
    lista.innerHTML =
      resultado
        .map(
          comercio =>
            tarjetaComercio(
              comercio
            )
        )
        .join('');
  }


  document
    .querySelectorAll(
      '[data-comercio]'
    )
    .forEach(
      button => {
        button.addEventListener(
          'click',
          () => {
            abrirDetalle(
              Number(
                button.dataset
                  .comercio
              )
            );
          }
        );
      }
    );


  actualizarMapa(
    resultado
  );
}


/* =====================================================
   TARJETA COMERCIO
===================================================== */

function tarjetaComercio(
  comercio
) {
  const beneficios =
    beneficiosVisibles(
      comercio
    );


  const distancia =
    typeof comercio.distancia ===
      'number'
      ? `
        <span
          class="distance-badge"
        >
          ${
            comercio.distancia
              .toFixed(1)
          } km
        </span>
      `
      : '';


  return `

    <article
      class="business-card"
    >

      <div
        class="
          business-card-top
        "
      >

        <span
          class="category-badge"
        >
          ${
            escaparHtml(
              comercio.rubro ||
              'Comercio'
            )
          }
        </span>

        ${distancia}

      </div>


      <h3>
        ${
          escaparHtml(
            comercio.nombre
          )
        }
      </h3>


      <p
        class="business-location"
      >
        📍 ${
          escaparHtml(
            comercio.localidad ||
            ''
          )
        }
      </p>


      <div
        class="business-benefits"
      >

        ${beneficios
          .map(
            beneficio => {
              const programa =
                programaPorId(
                  beneficio.programa
                );


              return `

                <div
                  class="benefit-box"
                >

                  <span
                    class="
                      benefit-program
                    "
                  >
                    ${
                      escaparHtml(
                        programa
                          ? programa.nombre
                          : 'Beneficio'
                      )
                    }
                  </span>

                  <strong>
                    ${
                      escaparHtml(
                        beneficio
                          .beneficio ||
                        ''
                      )
                    }
                  </strong>

                </div>

              `;
            }
          )
          .join('')}

      </div>


      <button
        class="business-button"
        data-comercio="${
          comercio.id
        }"
      >

        Ver detalle

        <span>
          ›
        </span>

      </button>

    </article>

  `;
}


/* =====================================================
   MAPA
===================================================== */

function crearMapa() {
  destruirMapa();


  setTimeout(
    () => {
      const elemento =
        document.querySelector(
          '#map'
        );


      if (
        !elemento ||
        typeof L ===
          'undefined'
      ) {
        return;
      }


      mapa =
        L.map(
          'map'
        ).setView(
          [
            -34.6495,
            -58.619,
          ],
          13
        );


      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution:
            '&copy; OpenStreetMap',
        }
      ).addTo(
        mapa
      );


      actualizarMapa(
        obtenerComerciosFiltrados()
      );
    },
    50
  );
}


function destruirMapa() {
  if (
    mapa
  ) {
    mapa.remove();

    mapa = null;
  }


  marcadores = [];

  marcadorUsuario = null;

  contadorMapaControl =
    null;
}


/* =====================================================
   POPUP MAPA
===================================================== */

function contenidoPopupMapa(
  comercio
) {
  const beneficios =
    beneficiosVisibles(
      comercio
    );


  const beneficiosHtml =
    beneficios
      .map(
        beneficio => {
          const programa =
            programaPorId(
              beneficio.programa
            );


          return `

            <div
              style="
                margin-top:10px;
                padding-top:8px;
                border-top:
                  1px solid #eee;
              "
            >

              <small
                style="
                  display:block;
                  margin-bottom:3px;
                  font-weight:700;
                  color:#777;
                "
              >
                ${
                  escaparHtml(
                    programa
                      ? programa.nombre
                      : 'Beneficio'
                  )
                }
              </small>

              <strong
                style="
                  display:block;
                  line-height:1.3;
                "
              >
                ${
                  escaparHtml(
                    beneficio
                      .beneficio ||
                    ''
                  )
                }
              </strong>

            </div>

          `;
        }
      )
      .join('');


  return `

    <div
      style="
        min-width:190px;
        max-width:240px;
      "
    >

      <strong
        style="
          font-size:15px;
          display:block;
          margin-bottom:3px;
        "
      >
        ${
          escaparHtml(
            comercio.nombre
          )
        }
      </strong>


      <span
        style="
          font-size:12px;
          color:#666;
        "
      >
        ${
          escaparHtml(
            comercio.rubro ||
            ''
          )
        }
      </span>


      <div
        style="
          margin-top:9px;
          line-height:1.35;
          font-size:13px;
        "
      >

        📍
        ${
          escaparHtml(
            comercio.direccion ||
            'Dirección pendiente'
          )
        }

        ${
          comercio.localidad
            ? `
              <br>
              <span
                style="
                  margin-left:18px;
                  color:#666;
                "
              >
                ${
                  escaparHtml(
                    comercio.localidad
                  )
                }
              </span>
            `
            : ''
        }

      </div>


      ${beneficiosHtml}


      <button
        type="button"
        onclick="
          window.mtaAbrirDetalle(
            ${Number(
              comercio.id
            )}
          )
        "
        style="
          width:100%;
          margin-top:12px;
          border:0;
          border-radius:8px;
          padding:9px 10px;
          cursor:pointer;
          font-weight:700;
          background:#d71920;
          color:white;
        "
      >
        Ver detalle
      </button>

    </div>

  `;
}


/* =====================================================
   ACTUALIZAR MAPA
===================================================== */

function actualizarMapa(
  comerciosMostrar
) {
  if (
    !mapa
  ) {
    return;
  }


  marcadores.forEach(
    marcador =>
      marcador.remove()
  );


  marcadores = [];


  if (
    marcadorUsuario
  ) {
    marcadorUsuario.remove();

    marcadorUsuario = null;
  }


  if (
    contadorMapaControl
  ) {
    contadorMapaControl.remove();

    contadorMapaControl =
      null;
  }


  /*
   * Solo pasan al mapa
   * coordenadas reales y
   * ubicadas dentro de una
   * zona razonable de Morón.
   */

  const comerciosUbicables =
    comerciosMostrar.filter(
      tieneCoordenadasValidas
    );


  const noUbicables =
    comerciosMostrar.length -
    comerciosUbicables.length;


  comerciosUbicables
    .forEach(
      comercio => {
        const marcador =
          L.marker(
            [
              Number(
                comercio.lat
              ),

              Number(
                comercio.lng
              ),
            ]
          )
            .addTo(
              mapa
            )
            .bindPopup(
              contenidoPopupMapa(
                comercio
              )
            );


        marcador.on(
          'click',
          () => {
            registrarEvento(
              'marcador_abierto',
              {
                programa:
                  programaSeleccionado,

                comercio_id:
                  comercio.id,

                rubro:
                  comercio.rubro,

                localidad:
                  comercio.localidad,
              }
            );
          }
        );


        marcadores.push(
          marcador
        );
      }
    );


  /* ===================================================
     CONTADOR DEL MAPA
  =================================================== */

  contadorMapaControl =
    L.control({
      position:
        'topright',
    });


  contadorMapaControl.onAdd =
    function () {
      const div =
        L.DomUtil.create(
          'div'
        );


      div.style.background =
        'rgba(255,255,255,.96)';

      div.style.padding =
        '7px 10px';

      div.style.borderRadius =
        '8px';

      div.style.boxShadow =
        '0 1px 5px rgba(0,0,0,.25)';

      div.style.fontSize =
        '12px';

      div.style.fontWeight =
        '700';

      div.style.lineHeight =
        '1.35';

      div.style.color =
        '#333';


      div.innerHTML = `

        📍
        ${
          comerciosUbicables.length
        }
        ${
          comerciosUbicables.length ===
          1
            ? 'comercio'
            : 'comercios'
        }

        ${
          noUbicables > 0
            ? `
              <br>

              <span
                style="
                  font-weight:400;
                  font-size:11px;
                  color:#666;
                "
              >
                ${noUbicables}
                sin ubicación válida
              </span>
            `
            : ''
        }

      `;


      return div;
    };


  contadorMapaControl.addTo(
    mapa
  );


  /* ===================================================
     ENCUADRAR MARCADORES
  =================================================== */

  if (
    comerciosUbicables.length &&
    !ubicacionUsuario
  ) {
    const bounds =
      L.latLngBounds(
        comerciosUbicables
          .map(
            comercio => [
              Number(
                comercio.lat
              ),

              Number(
                comercio.lng
              ),
            ]
          )
      );


    mapa.fitBounds(
      bounds,
      {
        padding: [
          30,
          30,
        ],

        maxZoom: 14,
      }
    );
  }


  /* ===================================================
     UBICACIÓN DEL USUARIO
  =================================================== */

  if (
    ubicacionUsuario
  ) {
    marcadorUsuario =
      L.circleMarker(
        [
          ubicacionUsuario.lat,
          ubicacionUsuario.lng,
        ],
        {
          radius: 9,
        }
      )
        .addTo(
          mapa
        )
        .bindPopup(
          'Tu ubicación aproximada'
        );


    mapa.setView(
      [
        ubicacionUsuario.lat,
        ubicacionUsuario.lng,
      ],
      14
    );
  }


  console.log(
    'Mapa Morón te acompaña',
    {
      resultados:
        comerciosMostrar.length,

      marcadores:
        comerciosUbicables.length,

      sinUbicacionValida:
        noUbicables,
    }
  );
}


/* =====================================================
   DETALLE
===================================================== */

function abrirDetalle(id) {
  const comercio =
    comercios.find(
      comercio =>
        Number(
          comercio.id
        ) === Number(id)
    );


  if (
    !comercio
  ) {
    return;
  }


  registrarEvento(
    'detalle_comercio',
    {
      programa:
        programaSeleccionado,

      comercio_id:
        comercio.id,

      rubro:
        comercio.rubro,

      localidad:
        comercio.localidad,
    }
  );


  const beneficios =
    beneficiosVisibles(
      comercio
    );


  const modal =
    document.querySelector(
      '#modal'
    );


  const contenido =
    document.querySelector(
      '#modal-contenido'
    );


  if (
    !modal ||
    !contenido
  ) {
    return;
  }


  const beneficiosHtml =
    beneficios
      .map(
        beneficio => {
          const programa =
            programaPorId(
              beneficio.programa
            );


          return `

            <div
              class="modal-benefit"
            >

              <small>
                ${
                  escaparHtml(
                    programa
                      ? programa.nombre
                      : 'Beneficio'
                  )
                }
              </small>

              <strong>
                ${
                  escaparHtml(
                    beneficio
                      .beneficio ||
                    ''
                  )
                }
              </strong>

              ${
                beneficio.condiciones
                  ? `
                    <p>
                      ${
                        escaparHtml(
                          beneficio
                            .condiciones
                        )
                      }
                    </p>
                  `
                  : ''
              }

            </div>

          `;
        }
      )
      .join('');


  const ubicacionValida =
    tieneCoordenadasValidas(
      comercio
    );


  const rutaHtml =
    ubicacionValida
      ? `

        <a
          class="route-button"
          target="_blank"
          rel="noopener"
          href="https://www.google.com/maps/dir/?api=1&destination=${
            Number(
              comercio.lat
            )
          },${
            Number(
              comercio.lng
            )
          }"
          id="como-llegar"
        >

          Cómo llegar

          <span>
            →
          </span>

        </a>

      `
      : `

        <div
          class="route-button"
          style="
            opacity:.55;
            pointer-events:none;
          "
        >
          Ubicación pendiente
        </div>

      `;


  contenido.innerHTML = `

    <button
      class="modal-close"
      id="cerrar-modal"
      aria-label="Cerrar"
    >
      ×
    </button>


    <span
      class="category-badge"
    >
      ${
        escaparHtml(
          comercio.rubro ||
          'Comercio'
        )
      }
    </span>


    <h2>
      ${
        escaparHtml(
          comercio.nombre
        )
      }
    </h2>


    <p
      class="modal-address"
    >

      📍
      ${
        escaparHtml(
          comercio.direccion ||
          'Dirección pendiente'
        )
      }

      ${
        comercio.localidad
          ? `
            <br>
            ${
              escaparHtml(
                comercio.localidad
              )
            }
          `
          : ''
      }

    </p>


    <div
      class="modal-section"
    >

      <span
        class="modal-label"
      >
        BENEFICIOS DISPONIBLES
      </span>

      ${beneficiosHtml}

    </div>


    ${rutaHtml}

  `;


  modal.classList.remove(
    'hidden'
  );


  document
    .querySelector(
      '#cerrar-modal'
    )
    .addEventListener(
      'click',
      cerrarModal
    );


  modal.onclick =
    event => {
      if (
        event.target === modal
      ) {
        cerrarModal();
      }
    };


  if (
    ubicacionValida
  ) {
    const botonRuta =
      document.querySelector(
        '#como-llegar'
      );


    botonRuta?.addEventListener(
      'click',
      () => {
        registrarEvento(
          'como_llegar',
          {
            programa:
              programaSeleccionado,

            comercio_id:
              comercio.id,

            rubro:
              comercio.rubro,

            localidad:
              comercio.localidad,
          }
        );
      }
    );
  }
}


/*
 * Permite que el botón
 * del popup de Leaflet
 * abra el mismo detalle.
 */

window.mtaAbrirDetalle =
  abrirDetalle;


/* =====================================================
   CERRAR MODAL
===================================================== */

function cerrarModal() {
  const modal =
    document.querySelector(
      '#modal'
    );


  if (
    modal
  ) {
    modal.classList.add(
      'hidden'
    );
  }
}


/* =====================================================
   CERCA MÍO
===================================================== */

function solicitarUbicacion() {
  if (
    !navigator.geolocation
  ) {
    alert(
      'Tu dispositivo no permite utilizar ubicación.'
    );

    return;
  }


  navigator.geolocation
    .getCurrentPosition(

      posicion => {
        ubicacionUsuario = {
          lat:
            posicion.coords
              .latitude,

          lng:
            posicion.coords
              .longitude,
        };


        registrarEvento(
          'cerca_mio',
          {
            programa:
              programaSeleccionado,

            rubro:
              rubroSeleccionado,

            localidad:
              localidadSeleccionada,
          }
        );


        renderExplorar();
      },


      () => {
        registrarEvento(
          'ubicacion_rechazada',
          {
            programa:
              programaSeleccionado,
          }
        );


        alert(
          'No pudimos acceder a tu ubicación. Podés seguir buscando manualmente.'
        );
      },


      {
        enableHighAccuracy:
          false,

        timeout:
          10000,
      }

    );
}


/* =====================================================
   INICIO
===================================================== */

registrarEvento(
  'app_abierta',
  {
    programa:
      programaSeleccionado,
  }
);


renderHome();


/* =====================================================
   PWA
===================================================== */

if (
  'serviceWorker' in navigator
) {
  window.addEventListener(
    'load',
    () => {
      navigator
        .serviceWorker
        .register(
          '/sw.js'
        )
        .catch(
          error => {
            console.log(
              'Service Worker:',
              error
            );
          }
        );
    }
  );
}