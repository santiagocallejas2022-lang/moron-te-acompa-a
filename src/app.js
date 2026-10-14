import './style.css';

import { programas, comercios } from './data.js';

import { registrarEvento } from './analytics.js';

const app = document.querySelector('#app');

let programaSeleccionado = localStorage.getItem('mta_programa') || null;

let busqueda = '';

let rubroSeleccionado = '';

let localidadSeleccionada = '';

let ubicacionUsuario = null;

let mapa = null;

let marcadores = [];

let marcadorUsuario = null;

let temporizadorBusqueda = null;

/* =====================================================
   VALIDAR PROGRAMA GUARDADO
===================================================== */

if (
  programaSeleccionado &&
  !programas.some((programa) => programa.id === programaSeleccionado)
) {
  programaSeleccionado = null;

  localStorage.removeItem('mta_programa');
}

/* =====================================================
   LOGO
===================================================== */

function logoMoron(clase = '') {
  return `
    <span class="moron-symbol ${clase}">

      <span
        class="moron-bar moron-bar-left"
      ></span>

      <span
        class="moron-bar moron-bar-center"
      ></span>

      <span
        class="moron-bar moron-bar-right"
      ></span>

    </span>
  `;
}

/* =====================================================
   UTILIDADES
===================================================== */

function programaPorId(id) {
  return programas.find((programa) => programa.id === id);
}

function normalizar(texto = '') {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;

  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function beneficiosVisibles(comercio) {
  if (!programaSeleccionado) {
    return comercio.beneficios;
  }

  return comercio.beneficios.filter(
    (beneficio) => beneficio.programa === programaSeleccionado
  );
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

          ${logoMoron('moron-symbol-home')}

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
    .querySelector('#btn-beneficios')
    .addEventListener('click', renderProgramas);

  document.querySelector('#btn-mapa').addEventListener('click', () => {
    programaSeleccionado = null;

    localStorage.removeItem('mta_programa');

    renderExplorar();
  });

  document.querySelector('#btn-buscar').addEventListener('click', () => {
    programaSeleccionado = null;

    localStorage.removeItem('mta_programa');

    renderExplorar(true);
  });

  document
    .querySelector('#btn-cerca')
    .addEventListener('click', solicitarUbicacion);
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

            ${logoMoron('moron-symbol-small')}

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
            (programa) => `

                <button
                  class="program-image-card"
                  data-programa="${programa.id}"
                >

                  <div
                    class="program-image-container"
                  >

                    <img
                      src="${programa.imagen}"
                      alt="${programa.nombre}"
                      class="program-image"
                    />

                  </div>


                  <div
                    class="program-card-footer"
                  >

                    <div
                      class="program-card-text"
                    >

                      <strong>
                        ${programa.nombre}
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

  document.querySelector('#volver').addEventListener('click', renderHome);

  document.querySelector('#ver-todos').addEventListener('click', () => {
    programaSeleccionado = null;

    localStorage.removeItem('mta_programa');

    registrarEvento('ver_todos_programas');

    renderExplorar();
  });

  document.querySelectorAll('[data-programa]').forEach((card) => {
    card.addEventListener('click', () => {
      programaSeleccionado = card.dataset.programa;

      localStorage.setItem('mta_programa', programaSeleccionado);

      registrarEvento('programa_seleccionado', {
        programa: programaSeleccionado,
      });

      renderExplorar();
    });
  });
}

/* =====================================================
   FILTROS
===================================================== */

function obtenerComerciosFiltrados() {
  let resultado = [...comercios];

  if (programaSeleccionado) {
    resultado = resultado.filter((comercio) =>
      comercio.beneficios.some(
        (beneficio) => beneficio.programa === programaSeleccionado
      )
    );
  }

  if (rubroSeleccionado) {
    resultado = resultado.filter(
      (comercio) => comercio.rubro === rubroSeleccionado
    );
  }

  if (localidadSeleccionada) {
    resultado = resultado.filter(
      (comercio) => comercio.localidad === localidadSeleccionada
    );
  }

  if (busqueda.trim()) {
    const texto = normalizar(busqueda);

    resultado = resultado.filter((comercio) => {
      const beneficiosTexto = comercio.beneficios
        .map((beneficio) => {
          const programa = programaPorId(beneficio.programa);

          return `
                    ${programa?.nombre || ''}

                    ${beneficio.beneficio}

                    ${beneficio.condiciones}
                  `;
        })
        .join(' ');

      const contenido = normalizar(
        `
                ${comercio.nombre}

                ${comercio.rubro}

                ${comercio.localidad}

                ${comercio.direccion}

                ${beneficiosTexto}
              `
      );

      return contenido.includes(texto);
    });
  }

  if (ubicacionUsuario) {
    resultado = resultado.map((comercio) => ({
      ...comercio,

      distancia: distanciaKm(
        ubicacionUsuario.lat,
        ubicacionUsuario.lng,
        comercio.lat,
        comercio.lng
      ),
    }));

    resultado.sort((a, b) => a.distancia - b.distancia);
  }

  return resultado;
}

/* =====================================================
   EXPLORAR
===================================================== */

function renderExplorar(enfocarBusqueda = false) {
  const programa = programaPorId(programaSeleccionado);

  const rubros = [
    ...new Set(comercios.map((comercio) => comercio.rubro)),
  ].sort();

  const localidades = [
    ...new Set(comercios.map((comercio) => comercio.localidad)),
  ].sort();

  app.innerHTML = `

    <main class="explore-page">

      <header class="explore-header">

        <div class="explore-top">

          <button
            class="back-button"
            id="volver-home"
            aria-label="Volver"
          >
            ←
          </button>


          <div class="explore-title">

            <div class="internal-brand">

              ${logoMoron('moron-symbol-small')}

              <span class="mini-brand">
                MORÓN TE ACOMPAÑA
              </span>

            </div>

            <h2>

              ${programa ? programa.nombre : 'Todos los beneficios'}

            </h2>

          </div>


          <button
            class="change-program"
            id="cambiar-programa"
          >
            Programas
          </button>

        </div>


        <div class="search-box">

          <span>
            ⌕
          </span>

          <input
            id="buscador"
            type="search"
            placeholder="Buscar comercio, rubro o beneficio..."
            value="${busqueda}"
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
                (rubro) => `

                    <option
                      value="${rubro}"
                      ${rubroSeleccionado === rubro ? 'selected' : ''}
                    >
                      ${rubro}
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
                (localidad) => `

                    <option
                      value="${localidad}"
                      ${localidadSeleccionada === localidad ? 'selected' : ''}
                    >
                      ${localidad}
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


      <section class="explore-layout">

        <div class="results-column">

          <div class="results-header">

            <strong id="contador">
            </strong>

            <span>
              Comercios adheridos
            </span>

          </div>


          <div
            class="business-list"
            id="lista-comercios"
          ></div>

        </div>


        <div class="map-column">

          <div id="map"></div>

        </div>

      </section>

    </main>


    <div
      class="modal-backdrop hidden"
      id="modal"
    >

      <div
        class="business-modal"
        id="modal-contenido"
      ></div>

    </div>

  `;

  document.querySelector('#volver-home').addEventListener('click', renderHome);

  document
    .querySelector('#cambiar-programa')
    .addEventListener('click', renderProgramas);

  const buscador = document.querySelector('#buscador');

  buscador.addEventListener('input', (event) => {
    busqueda = event.target.value;

    actualizarResultados();

    clearTimeout(temporizadorBusqueda);

    temporizadorBusqueda = setTimeout(() => {
      if (busqueda.trim().length >= 2) {
        registrarEvento('busqueda', {
          programa: programaSeleccionado,

          busqueda: busqueda.trim(),

          rubro: rubroSeleccionado,

          localidad: localidadSeleccionada,
        });
      }
    }, 700);
  });

  document
    .querySelector('#filtro-rubro')
    .addEventListener('change', (event) => {
      rubroSeleccionado = event.target.value;

      registrarEvento('filtro_rubro', {
        programa: programaSeleccionado,

        rubro: rubroSeleccionado || 'todos',
      });

      actualizarResultados();
    });

  document
    .querySelector('#filtro-localidad')
    .addEventListener('change', (event) => {
      localidadSeleccionada = event.target.value;

      registrarEvento('filtro_localidad', {
        programa: programaSeleccionado,

        localidad: localidadSeleccionada || 'todas',
      });

      actualizarResultados();
    });

  document
    .querySelector('#cerca-explorar')
    .addEventListener('click', solicitarUbicacion);

  crearMapa();

  actualizarResultados();

  if (enfocarBusqueda) {
    setTimeout(() => buscador.focus(), 100);
  }
}

/* =====================================================
   RESULTADOS
===================================================== */

function actualizarResultados() {
  const resultado = obtenerComerciosFiltrados();

  const lista = document.querySelector('#lista-comercios');

  const contador = document.querySelector('#contador');

  if (!lista || !contador) {
    return;
  }

  contador.textContent = `${resultado.length} ${
    resultado.length === 1 ? 'comercio' : 'comercios'
  }`;

  if (!resultado.length) {
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
    lista.innerHTML = resultado
      .map((comercio) => tarjetaComercio(comercio))
      .join('');
  }

  document.querySelectorAll('[data-comercio]').forEach((button) => {
    button.addEventListener('click', () => {
      abrirDetalle(Number(button.dataset.comercio));
    });
  });

  actualizarMapa(resultado);
}

/* =====================================================
   TARJETAS DE COMERCIOS
===================================================== */

function tarjetaComercio(comercio) {
  const beneficios = beneficiosVisibles(comercio);

  return `

    <article class="business-card">

      <div class="business-card-top">

        <span class="category-badge">
          ${comercio.rubro}
        </span>

        ${
          comercio.distancia !== undefined
            ? `

              <span
                class="distance-badge"
              >
                ${comercio.distancia.toFixed(1)} km
              </span>

            `
            : ''
        }

      </div>


      <h3>
        ${comercio.nombre}
      </h3>


      <p class="business-location">
        📍 ${comercio.localidad}
      </p>


      <div class="business-benefits">

        ${beneficios
          .map((beneficio) => {
            const programa = programaPorId(beneficio.programa);

            return `

                  <div
                    class="benefit-box"
                  >

                    <span
                      class="benefit-program"
                    >

                      ${programa ? programa.nombre : 'Beneficio'}

                    </span>

                    <strong>
                      ${beneficio.beneficio}
                    </strong>

                  </div>

                `;
          })
          .join('')}

      </div>


      <button
        class="business-button"
        data-comercio="${comercio.id}"
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

  setTimeout(() => {
    const elemento = document.querySelector('#map');

    if (!elemento || typeof L === 'undefined') {
      return;
    }

    mapa = L.map('map').setView([-34.6495, -58.619], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa);

    actualizarMapa(obtenerComerciosFiltrados());
  }, 50);
}

function destruirMapa() {
  if (mapa) {
    mapa.remove();

    mapa = null;
  }

  marcadores = [];

  marcadorUsuario = null;
}

function actualizarMapa(comerciosMostrar) {
  if (!mapa) {
    return;
  }

  marcadores.forEach((marcador) => marcador.remove());

  marcadores = [];

  if (marcadorUsuario) {
    marcadorUsuario.remove();

    marcadorUsuario = null;
  }

  comerciosMostrar.forEach((comercio) => {
    const beneficios = beneficiosVisibles(comercio);

    const beneficiosPopup = beneficios
      .map((beneficio) => {
        const programa = programaPorId(beneficio.programa);

        return `

                <div
                  style="margin-top:8px"
                >

                  <small>
                    ${programa ? programa.nombre : ''}
                  </small>

                  <br>

                  <b>
                    ${beneficio.beneficio}
                  </b>

                </div>

              `;
      })
      .join('');

    const marcador = L.marker([comercio.lat, comercio.lng])
      .addTo(mapa)
      .bindPopup(
        `

              <strong>
                ${comercio.nombre}
              </strong>

              <br>

              ${comercio.rubro}

              ${beneficiosPopup}

            `
      );

    marcador.on('click', () => {
      registrarEvento('marcador_abierto', {
        programa: programaSeleccionado,

        comercio_id: comercio.id,

        rubro: comercio.rubro,

        localidad: comercio.localidad,
      });
    });

    marcadores.push(marcador);
  });

  if (comerciosMostrar.length && !ubicacionUsuario) {
    const bounds = L.latLngBounds(
      comerciosMostrar.map((comercio) => [comercio.lat, comercio.lng])
    );

    mapa.fitBounds(bounds, {
      padding: [30, 30],

      maxZoom: 14,
    });
  }

  if (ubicacionUsuario) {
    marcadorUsuario = L.circleMarker(
      [ubicacionUsuario.lat, ubicacionUsuario.lng],
      {
        radius: 9,
      }
    )
      .addTo(mapa)
      .bindPopup('Tu ubicación aproximada');

    mapa.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], 14);
  }
}

/* =====================================================
   DETALLE COMERCIO
===================================================== */

function abrirDetalle(id) {
  const comercio = comercios.find((comercio) => comercio.id === id);

  if (!comercio) {
    return;
  }

  registrarEvento('detalle_comercio', {
    programa: programaSeleccionado,

    comercio_id: comercio.id,

    rubro: comercio.rubro,

    localidad: comercio.localidad,
  });

  const beneficios = beneficiosVisibles(comercio);

  const modal = document.querySelector('#modal');

  const contenido = document.querySelector('#modal-contenido');

  contenido.innerHTML = `

    <button
      class="modal-close"
      id="cerrar-modal"
      aria-label="Cerrar"
    >
      ×
    </button>


    <span class="category-badge">
      ${comercio.rubro}
    </span>


    <h2>
      ${comercio.nombre}
    </h2>


    <p class="modal-address">
      📍 ${comercio.direccion}
    </p>


    <div class="modal-section">

      <span class="modal-label">
        BENEFICIOS DISPONIBLES
      </span>


      ${beneficios
        .map((beneficio) => {
          const programa = programaPorId(beneficio.programa);

          return `

                <div
                  class="modal-benefit"
                >

                  <small>
                    ${programa ? programa.nombre : ''}
                  </small>

                  <strong>
                    ${beneficio.beneficio}
                  </strong>

                  <p>
                    ${beneficio.condiciones}
                  </p>

                </div>

              `;
        })
        .join('')}

    </div>


    <div class="business-data">

      <div>

        <span>
          Horarios
        </span>

        <strong>
          ${comercio.horario}
        </strong>

      </div>


      <div>

        <span>
          Teléfono
        </span>

        <strong>
          ${comercio.telefono}
        </strong>

      </div>

    </div>


    <a
      class="route-button"
      target="_blank"
      rel="noopener"
      href="https://www.google.com/maps/dir/?api=1&destination=${
        comercio.lat
      },${comercio.lng}"
      id="como-llegar"
    >

      Cómo llegar

      <span>
        →
      </span>

    </a>

  `;

  modal.classList.remove('hidden');

  document
    .querySelector('#cerrar-modal')
    .addEventListener('click', cerrarModal);

  modal.onclick = (event) => {
    if (event.target === modal) {
      cerrarModal();
    }
  };

  document.querySelector('#como-llegar').addEventListener('click', () => {
    registrarEvento('como_llegar', {
      programa: programaSeleccionado,

      comercio_id: comercio.id,

      rubro: comercio.rubro,

      localidad: comercio.localidad,
    });
  });
}

function cerrarModal() {
  const modal = document.querySelector('#modal');

  if (modal) {
    modal.classList.add('hidden');
  }
}

/* =====================================================
   CERCA MÍO
===================================================== */

function solicitarUbicacion() {
  if (!navigator.geolocation) {
    alert('Tu dispositivo no permite utilizar ubicación.');

    return;
  }

  navigator.geolocation.getCurrentPosition(
    (posicion) => {
      ubicacionUsuario = {
        lat: posicion.coords.latitude,

        lng: posicion.coords.longitude,
      };

      registrarEvento('cerca_mio', {
        programa: programaSeleccionado,

        rubro: rubroSeleccionado,

        localidad: localidadSeleccionada,
      });

      renderExplorar();
    },

    () => {
      registrarEvento('ubicacion_rechazada', {
        programa: programaSeleccionado,
      });

      alert(
        'No pudimos acceder a tu ubicación. Podés seguir buscando manualmente.'
      );
    },

    {
      enableHighAccuracy: false,

      timeout: 10000,
    }
  );
}

/* =====================================================
   INICIO
===================================================== */

registrarEvento('app_abierta', {
  programa: programaSeleccionado,
});

renderHome();

/* =====================================================
   PWA
===================================================== */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.log('Service Worker:', error);
    });
  });
}
