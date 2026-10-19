import {
    geolocalizarComerciosMoron,
    geolocalizarComercioMoron,
  } from './geolocalizador.js';
  
  
  let comerciosPendientes = [];
  
  let ultimoResultado = null;
  
  
  /* =========================================================
     SUPABASE
  ========================================================= */
  
  function obtenerCredenciales() {
  
    let sesion = null;
  
  
    try {
  
      sesion =
        JSON.parse(
          localStorage.getItem(
            'mta_admin_session'
          ) || 'null'
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
  
  
  async function supabaseFetch(
    ruta,
    opciones = {}
  ) {
  
    const {
      url,
      key,
      token,
    } =
      obtenerCredenciales();
  
  
    if (
      !url ||
      !key
    ) {
  
      throw new Error(
        'Falta configurar Supabase.'
      );
  
    }
  
  
    if (!token) {
  
      throw new Error(
        'La sesión del administrador venció.'
      );
  
    }
  
  
    const headers = {
  
      apikey:
        key,
  
      Authorization:
        `Bearer ${token}`,
  
      ...(
        opciones.headers ||
        {}
      ),
  
    };
  
  
    if (
      opciones.body
    ) {
  
      headers[
        'Content-Type'
      ] =
        'application/json';
  
    }
  
  
    const respuesta =
      await fetch(
        `${url}${ruta}`,
        {
          ...opciones,
          headers,
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
          JSON.stringify(
            json
          );
  
      } catch {
  
        detalle =
          await respuesta.text();
  
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
     UTILIDADES
  ========================================================= */
  
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
      );
  
  }
  
  
  function coordenadaValida(
    valor
  ) {
  
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
  
      return false;
  
    }
  
  
    return Number.isFinite(
      Number(valor)
    );
  
  }
  
  
  function tieneCoordenadas(
    comercio
  ) {
  
    return (
      coordenadaValida(
        comercio.lat
      ) &&
      coordenadaValida(
        comercio.lng
      )
    );
  
  }
  
  
  function cerrarModal() {
  
    document
      .querySelector(
        '#geo-admin-overlay'
      )
      ?.remove();
  
  }
  
  
  /* =========================================================
     CARGAR PENDIENTES
  ========================================================= */
  
  async function cargarPendientes() {
  
    const comercios =
      await supabaseFetch(
  
        '/rest/v1/comercios?select=id,nombre,rubro,localidad,direccion,telefono,horario,lat,lng,activo&order=nombre.asc'
  
      );
  
  
    comerciosPendientes =
      (
        comercios ||
        []
      )
        .filter(
          comercio =>
            !tieneCoordenadas(
              comercio
            )
        );
  
  
    return comerciosPendientes;
  
  }
  
  
  /* =========================================================
     BOTÓN ADMIN
  ========================================================= */
  
  function agregarBoton() {
  
    if (
      document.querySelector(
        '#ubicar-comercios'
      )
    ) {
  
      return;
  
    }
  
  
    const importar =
      document.querySelector(
        '#importar-base'
      );
  
  
    const nuevo =
      document.querySelector(
        '#nuevo-comercio'
      );
  
  
    const referencia =
      importar ||
      nuevo;
  
  
    if (!referencia) {
      return;
    }
  
  
    const boton =
      document.createElement(
        'button'
      );
  
  
    boton.id =
      'ubicar-comercios';
  
  
    boton.className =
      'admin-secondary-button';
  
  
    boton.textContent =
      'Ubicar comercios';
  
  
    boton.style.marginLeft =
      '8px';
  
  
    boton.addEventListener(
      'click',
      abrirPanel
    );
  
  
    referencia
      .insertAdjacentElement(
        'afterend',
        boton
      );
  
  }
  
  
  /* =========================================================
     ABRIR PANEL
  ========================================================= */
  
  async function abrirPanel() {
  
    cerrarModal();
  
  
    const overlay =
      document.createElement(
        'div'
      );
  
  
    overlay.id =
      'geo-admin-overlay';
  
  
    overlay.style.cssText = `
  
      position: fixed;
      inset: 0;
      z-index: 40000;
  
      display: flex;
      align-items: center;
      justify-content: center;
  
      padding: 20px;
  
      background:
        rgba(40, 0, 4, 0.74);
  
      backdrop-filter:
        blur(7px);
  
    `;
  
  
    overlay.innerHTML = `
  
      <section style="
        width: min(1050px, 100%);
        max-height: 94vh;
        overflow-y: auto;
  
        box-sizing: border-box;
  
        padding: 25px;
  
        border-radius: 22px;
  
        background: white;
  
        box-shadow:
          0 30px 100px
          rgba(0,0,0,.35);
      ">
  
        <div style="
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        ">
  
          <div>
  
            <div style="
              color: #df1921;
              font-size: 9px;
              font-weight: 900;
              letter-spacing: 1px;
            ">
              GEOLOCALIZACIÓN
            </div>
  
            <h2 style="
              margin: 5px 0;
              font-size: 26px;
            ">
              Ubicar comercios
            </h2>
  
            <p style="
              margin: 0;
              color: #777;
              font-size: 11px;
            ">
              Podés corregir las direcciones
              que no fueron reconocidas.
            </p>
  
          </div>
  
  
          <button
            id="geo-cerrar"
            style="
              width: 38px;
              height: 38px;
  
              border: 0;
              border-radius: 50%;
  
              background: #fff0f1;
  
              color: #df1921;
  
              font-size: 22px;
              cursor: pointer;
            "
          >
            ×
          </button>
  
        </div>
  
  
        <div
          id="geo-contenido"
          style="
            margin-top: 25px;
            text-align: center;
            padding: 35px;
          "
        >
  
          Cargando comercios...
  
        </div>
  
      </section>
  
    `;
  
  
    document.body
      .appendChild(
        overlay
      );
  
  
    document
      .querySelector(
        '#geo-cerrar'
      )
      ?.addEventListener(
        'click',
        cerrarModal
      );
  
  
    overlay.addEventListener(
      'click',
      event => {
  
        if (
          event.target ===
          overlay
        ) {
  
          cerrarModal();
  
        }
  
      }
    );
  
  
    try {
  
      await cargarPendientes();
  
  
      renderInicio();
  
    } catch (error) {
  
      document
        .querySelector(
          '#geo-contenido'
        )
        .innerHTML = `
  
          <strong style="color:#b4141b">
            No se pudieron cargar los comercios.
          </strong>
  
          <p>
            ${esc(
              error?.message ||
              error
            )}
          </p>
  
        `;
  
    }
  
  }
  
  
  /* =========================================================
     TARJETA
  ========================================================= */
  
  function tarjeta(
    titulo,
    numero
  ) {
  
    return `
  
      <article style="
        padding: 15px;
  
        border: 1px solid #e5e5e8;
        border-radius: 13px;
  
        background: #fafafa;
      ">
  
        <span style="
          display: block;
  
          color: #777;
  
          font-size: 9px;
          font-weight: 800;
        ">
          ${esc(titulo)}
        </span>
  
        <strong style="
          display: block;
  
          margin-top: 5px;
  
          color: #df1921;
  
          font-size: 26px;
        ">
          ${
            Number(
              numero ||
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
     INICIO
  ========================================================= */
  
  function renderInicio() {
  
    const contenido =
      document.querySelector(
        '#geo-contenido'
      );
  
  
    if (!contenido) {
      return;
    }
  
  
    const conDireccion =
      comerciosPendientes
        .filter(
          comercio =>
            String(
              comercio.direccion ||
              ''
            ).trim()
        );
  
  
    const sinDireccion =
      comerciosPendientes.length -
      conDireccion.length;
  
  
    contenido.innerHTML = `
  
      <div style="
        display: grid;
        grid-template-columns:
          repeat(3, 1fr);
  
        gap: 10px;
  
        text-align: left;
      ">
  
        ${tarjeta(
          'Sin coordenadas',
          comerciosPendientes.length
        )}
  
        ${tarjeta(
          'Con dirección',
          conDireccion.length
        )}
  
        ${tarjeta(
          'Sin dirección',
          sinDireccion
        )}
  
      </div>
  
  
      ${
        comerciosPendientes.length
          ? `
  
            <div style="
              margin-top: 22px;
  
              padding: 17px;
  
              border-radius: 14px;
  
              background: #fff8e9;
  
              color: #755d22;
  
              text-align: left;
  
              font-size: 11px;
              line-height: 1.6;
            ">
  
              Todas las búsquedas se realizan
              dentro del
              <strong>
                Partido de Morón,
                Provincia de Buenos Aires
              </strong>.
  
              <br><br>
  
              Si alguna dirección no se encuentra,
              después del análisis vas a poder
              <strong>editarla y volver a buscarla</strong>.
  
            </div>
  
  
            <button
              id="geo-analizar"
              style="
                margin-top: 22px;
  
                min-height: 45px;
  
                padding: 0 18px;
  
                border: 0;
                border-radius: 11px;
  
                background:
                  linear-gradient(
                    135deg,
                    #ef3037,
                    #a80c14
                  );
  
                color: white;
  
                font-size: 11px;
                font-weight: 900;
  
                cursor: pointer;
              "
            >
              Ubicar todos los pendientes
            </button>
  
          `
          : `
  
            <div style="
              margin-top: 30px;
              padding: 25px;
  
              border-radius: 15px;
  
              background: #eef9f1;
  
              color: #237140;
            ">
  
              ✓ Todos los comercios
              tienen coordenadas.
  
            </div>
  
          `
      }
  
    `;
  
  
    document
      .querySelector(
        '#geo-analizar'
      )
      ?.addEventListener(
        'click',
        analizar
      );
  
  }
  
  
  /* =========================================================
     ANALIZAR TODOS
  ========================================================= */
  
  async function analizar() {
  
    const contenido =
      document.querySelector(
        '#geo-contenido'
      );
  
  
    if (!contenido) {
      return;
    }
  
  
    contenido.innerHTML = `
  
      <div style="
        padding: 40px 10px;
      ">
  
        <strong>
          Geolocalizando comercios...
        </strong>
  
        <p
          id="geo-progreso"
          style="
            color: #777;
            font-size: 11px;
          "
        >
          Preparando...
        </p>
  
      </div>
  
    `;
  
  
    try {
  
      ultimoResultado =
        await geolocalizarComerciosMoron(
  
          comerciosPendientes,
  
          progreso => {
  
            const elemento =
              document.querySelector(
                '#geo-progreso'
              );
  
  
            if (elemento) {
  
              elemento.textContent =
                `${progreso.procesados} de ${progreso.total} · ${progreso.porcentaje}%`;
  
            }
  
          }
  
        );
  
  
      renderResultado();
  
    } catch (error) {
  
      contenido.innerHTML = `
  
        <div style="
          padding: 25px;
  
          border-radius: 14px;
  
          background: #fff1f1;
  
          color: #9f181e;
        ">
  
          <strong>
            No se pudo completar
            la geolocalización.
          </strong>
  
          <p>
            ${esc(
              error?.message ||
              error
            )}
          </p>
  
        </div>
  
      `;
  
    }
  
  }
  
  
  /* =========================================================
     RECALCULAR RESUMEN
  ========================================================= */
  
  function recalcularResumen() {
  
    if (
      !ultimoResultado
    ) {
  
      return;
  
    }
  
  
    const resultados =
      ultimoResultado.resultados;
  
  
    ultimoResultado.resumen = {
  
      total:
        resultados.length,
  
      ubicados:
        resultados.filter(
          item =>
            item.estado ===
            'ubicado'
        ).length,
  
      revisar:
        resultados.filter(
          item =>
            item.estado ===
            'revisar'
        ).length,
  
      noEncontrados:
        resultados.filter(
          item =>
            item.estado ===
            'no_encontrado'
        ).length,
  
      sinCoordenadas:
        resultados.filter(
          item =>
            item.estado ===
            'sin_coordenadas'
        ).length,
  
      sinDireccion:
        resultados.filter(
          item =>
            item.estado ===
            'sin_direccion'
        ).length,
  
    };
  
  }
  
  
  /* =========================================================
     REINTENTAR UNO
  ========================================================= */
  
  async function reintentarUno(
    id
  ) {
  
    if (
      !ultimoResultado
    ) {
  
      return;
  
    }
  
  
    const resultado =
      ultimoResultado
        .resultados
        .find(
          item =>
            String(
              item.id
            ) ===
            String(
              id
            )
        );
  
  
    if (!resultado) {
      return;
    }
  
  
    const input =
      document.querySelector(
        `#geo-direccion-${id}`
      );
  
  
    const nuevaDireccion =
      String(
        input?.value ||
        ''
      )
        .trim();
  
  
    if (!nuevaDireccion) {
  
      alert(
        'Ingresá una dirección.'
      );
  
  
      return;
  
    }
  
  
    resultado
      .comercio
      .direccion =
        nuevaDireccion;
  
  
    const boton =
      document.querySelector(
        `[data-geo-reintentar="${id}"]`
      );
  
  
    if (boton) {
  
      boton.disabled =
        true;
  
  
      boton.textContent =
        'Buscando...';
  
    }
  
  
    try {
  
      const nuevo =
        await geolocalizarComercioMoron(
          resultado.comercio
        );
  
  
      if (!nuevo) {
  
        throw new Error(
          'No se recibió respuesta.'
        );
  
      }
  
  
      const indice =
        ultimoResultado
          .resultados
          .findIndex(
            item =>
              String(
                item.id
              ) ===
              String(
                id
              )
          );
  
  
      if (
        indice >= 0
      ) {
  
        ultimoResultado
          .resultados[
            indice
          ] =
            nuevo;
  
      }
  
  
      recalcularResumen();
  
  
      renderResultado();
  
    } catch (error) {
  
      alert(
        'No se pudo volver a buscar la dirección: ' +
        (
          error?.message ||
          error
        )
      );
  
  
      if (boton) {
  
        boton.disabled =
          false;
  
  
        boton.textContent =
          'Buscar nuevamente';
  
      }
  
    }
  
  }
  
  
  /* =========================================================
     GUARDAR SOLO DIRECCIÓN
  ========================================================= */
  
  async function guardarSoloDireccion(
    id
  ) {
  
    const resultado =
      ultimoResultado
        ?.resultados
        ?.find(
          item =>
            String(
              item.id
            ) ===
            String(
              id
            )
        );
  
  
    if (!resultado) {
      return;
    }
  
  
    const input =
      document.querySelector(
        `#geo-direccion-${id}`
      );
  
  
    const direccion =
      String(
        input?.value ||
        ''
      )
        .trim();
  
  
    if (!direccion) {
  
      alert(
        'Ingresá una dirección.'
      );
  
  
      return;
  
    }
  
  
    try {
  
      await supabaseFetch(
  
        `/rest/v1/comercios?id=eq.${encodeURIComponent(
          id
        )}`,
  
        {
  
          method:
            'PATCH',
  
          headers: {
  
            Prefer:
              'return=minimal',
  
          },
  
          body:
            JSON.stringify({
  
              direccion,
  
              updated_at:
                new Date()
                  .toISOString(),
  
            }),
  
        }
  
      );
  
  
      resultado
        .comercio
        .direccion =
          direccion;
  
  
      alert(
        'Dirección corregida y guardada.'
      );
  
    } catch (error) {
  
      alert(
        'No se pudo guardar la dirección: ' +
        (
          error?.message ||
          error
        )
      );
  
    }
  
  }
  
  
  /* =========================================================
     FILA RESULTADO
  ========================================================= */
  
  function renderFilaResultado(
    resultado
  ) {
  
    const ubicado =
      resultado.estado ===
      'ubicado';
  
  
    const colores = {
  
      ubicado: {
        fondo:
          '#eff9f2',
        texto:
          '#227242',
        titulo:
          '✓ Ubicado',
      },
  
      revisar: {
        fondo:
          '#fff9eb',
        texto:
          '#8a651a',
        titulo:
          '⚠ Revisar',
      },
  
      no_encontrado: {
        fondo:
          '#fff2f2',
        texto:
          '#a42127',
        titulo:
          '✕ No encontrado',
      },
  
      sin_coordenadas: {
        fondo:
          '#fff2f2',
        texto:
          '#a42127',
        titulo:
          '✕ Sin coordenadas',
      },
  
      sin_direccion: {
        fondo:
          '#f2f2f4',
        texto:
          '#707178',
        titulo:
          'Sin dirección',
      },
  
    };
  
  
    const estilo =
      colores[
        resultado.estado
      ] ||
      colores.no_encontrado;
  
  
    return `
  
      <article style="
        padding: 14px;
  
        border-bottom:
          1px solid #eeeeef;
  
        background:
          ${estilo.fondo};
      ">
  
        <div style="
          display: grid;
  
          grid-template-columns:
            1fr
            2fr
            .7fr;
  
          gap: 14px;
  
          align-items: start;
        ">
  
          <div>
  
            <strong style="
              display: block;
              font-size: 11px;
            ">
              ${
                esc(
                  resultado
                    .comercio
                    ?.nombre ||
                  ''
                )
              }
            </strong>
  
            <span style="
              display: block;
  
              margin-top: 3px;
  
              color: #777;
  
              font-size: 9px;
            ">
              ${
                esc(
                  resultado
                    .comercio
                    ?.localidad ||
                  'Morón'
                )
              }
            </span>
  
          </div>
  
  
          <div>
  
            ${
              ubicado
                ? `
  
                  <div style="
                    font-size: 10px;
                    color: #555;
                  ">
  
                    ${
                      esc(
                        resultado.nomenclatura ||
                        resultado
                          .comercio
                          ?.direccion ||
                        ''
                      )
                    }
  
                  </div>
  
                `
                : `
  
                  <label style="
                    display: block;
  
                    color: #666;
  
                    font-size: 8px;
                    font-weight: 800;
                  ">
  
                    CORREGIR DIRECCIÓN
  
                    <input
                      id="geo-direccion-${resultado.id}"
                      value="${
                        esc(
                          resultado
                            .comercio
                            ?.direccion ||
                          ''
                        )
                      }"
                      placeholder="Ej: Av. Rivadavia 18200"
                      style="
                        width: 100%;
  
                        box-sizing: border-box;
  
                        min-height: 38px;
  
                        margin-top: 5px;
  
                        padding: 0 9px;
  
                        border:
                          1px solid #d7d7dc;
  
                        border-radius: 9px;
  
                        background: white;
                      "
                    />
  
                  </label>
  
  
                  <div style="
                    display: flex;
  
                    flex-wrap: wrap;
  
                    gap: 6px;
  
                    margin-top: 7px;
                  ">
  
                    <button
                      data-geo-reintentar="${resultado.id}"
                      style="
                        min-height: 33px;
  
                        padding: 0 9px;
  
                        border: 0;
                        border-radius: 8px;
  
                        background: #df1921;
  
                        color: white;
  
                        font-size: 8px;
                        font-weight: 900;
  
                        cursor: pointer;
                      "
                    >
                      Buscar nuevamente
                    </button>
  
  
                    <button
                      data-geo-guardar-direccion="${resultado.id}"
                      style="
                        min-height: 33px;
  
                        padding: 0 9px;
  
                        border:
                          1px solid #d5d5d9;
  
                        border-radius: 8px;
  
                        background: white;
  
                        color: #555;
  
                        font-size: 8px;
                        font-weight: 900;
  
                        cursor: pointer;
                      "
                    >
                      Guardar dirección
                    </button>
  
                  </div>
  
                `
            }
  
          </div>
  
  
          <div>
  
            <strong style="
              color: ${estilo.texto};
              font-size: 9px;
            ">
              ${estilo.titulo}
            </strong>
  
            ${
              ubicado
                ? `
  
                  <small style="
                    display: block;
  
                    margin-top: 4px;
  
                    color: #777;
  
                    font-size: 8px;
                  ">
  
                    ${
                      Number(
                        resultado.lat
                      )
                        .toFixed(
                          5
                        )
                    },
  
                    ${
                      Number(
                        resultado.lng
                      )
                        .toFixed(
                          5
                        )
                    }
  
                  </small>
  
                `
                : `
  
                  <small style="
                    display: block;
  
                    margin-top: 4px;
  
                    color: #777;
  
                    font-size: 8px;
                  ">
                    ${
                      esc(
                        resultado.mensaje ||
                        ''
                      )
                    }
                  </small>
  
                `
            }
  
          </div>
  
        </div>
  
      </article>
  
    `;
  
  }
  
  
  /* =========================================================
     RESULTADO
  ========================================================= */
  
  function renderResultado() {
  
    const contenido =
      document.querySelector(
        '#geo-contenido'
      );
  
  
    if (
      !contenido ||
      !ultimoResultado
    ) {
  
      return;
  
    }
  
  
    recalcularResumen();
  
  
    const {
      resultados,
      resumen,
    } =
      ultimoResultado;
  
  
    const faltantes =
      resumen.revisar +
      resumen.noEncontrados +
      resumen.sinCoordenadas +
      resumen.sinDireccion;
  
  
    contenido.innerHTML = `
  
      <div style="
        display: grid;
  
        grid-template-columns:
          repeat(3, 1fr);
  
        gap: 10px;
  
        text-align: left;
      ">
  
        ${tarjeta(
          'Ubicados',
          resumen.ubicados
        )}
  
        ${tarjeta(
          'Falta revisar',
          faltantes
        )}
  
        ${tarjeta(
          'Total analizados',
          resumen.total
        )}
  
      </div>
  
  
      ${
        faltantes
          ? `
  
            <div style="
              margin-top: 18px;
  
              padding: 14px;
  
              border-radius: 13px;
  
              background: #fff8e9;
  
              color: #735a1e;
  
              text-align: left;
  
              font-size: 10px;
              line-height: 1.6;
            ">
  
              Para los que faltan,
              corregí la dirección y tocá
  
              <strong>
                Buscar nuevamente
              </strong>.
  
              <br>
  
              Ejemplo:
  
              <strong>
                Av. Rivadavia 18200
              </strong>
  
              No hace falta escribir
              “Buenos Aires” ni “Argentina”:
              el sistema ya busca dentro
              del Partido de Morón.
  
            </div>
  
          `
          : ''
      }
  
  
      <div style="
        margin-top: 20px;
  
        max-height: 500px;
  
        overflow-y: auto;
  
        border:
          1px solid #e6e6e9;
  
        border-radius: 14px;
  
        text-align: left;
      ">
  
        ${
          resultados
            .sort(
              (
                a,
                b
              ) => {
  
                if (
                  a.estado ===
                  'ubicado' &&
                  b.estado !==
                  'ubicado'
                ) {
  
                  return 1;
  
                }
  
  
                if (
                  a.estado !==
                  'ubicado' &&
                  b.estado ===
                  'ubicado'
                ) {
  
                  return -1;
  
                }
  
  
                return String(
                  a.comercio?.nombre ||
                  ''
                )
                  .localeCompare(
                    String(
                      b.comercio?.nombre ||
                      ''
                    ),
                    'es'
                  );
  
              }
            )
            .map(
              renderFilaResultado
            )
            .join('')
        }
  
      </div>
  
  
      <div style="
        display: flex;
  
        justify-content: flex-end;
  
        gap: 8px;
  
        margin-top: 20px;
      ">
  
        <button
          id="geo-volver"
          style="
            min-height: 43px;
            padding: 0 15px;
  
            border:
              1px solid #ddd;
  
            border-radius: 10px;
  
            background: white;
  
            font-weight: 800;
  
            cursor: pointer;
          "
        >
          Volver
        </button>
  
  
        <button
          id="geo-guardar"
          ${
            resumen.ubicados
              ? ''
              : 'disabled'
          }
          style="
            min-height: 43px;
            padding: 0 16px;
  
            border: 0;
            border-radius: 10px;
  
            background:
              linear-gradient(
                135deg,
                #ef3037,
                #a80c14
              );
  
            color: white;
  
            font-weight: 900;
  
            cursor: pointer;
          "
        >
  
          Guardar y activar
          ${resumen.ubicados}
          ubicado(s)
  
        </button>
  
      </div>
  
    `;
  
  
    document
      .querySelector(
        '#geo-volver'
      )
      ?.addEventListener(
        'click',
        renderInicio
      );
  
  
    document
      .querySelector(
        '#geo-guardar'
      )
      ?.addEventListener(
        'click',
        guardarUbicados
      );
  
  
    document
      .querySelectorAll(
        '[data-geo-reintentar]'
      )
      .forEach(
        boton => {
  
          boton.addEventListener(
            'click',
            () => {
  
              reintentarUno(
                boton.dataset
                  .geoReintentar
              );
  
            }
          );
  
        }
      );
  
  
    document
      .querySelectorAll(
        '[data-geo-guardar-direccion]'
      )
      .forEach(
        boton => {
  
          boton.addEventListener(
            'click',
            () => {
  
              guardarSoloDireccion(
                boton.dataset
                  .geoGuardarDireccion
              );
  
            }
          );
  
        }
      );
  
  }
  
  
  /* =========================================================
     GUARDAR UBICADOS
  ========================================================= */
  
  async function guardarUbicados() {
  
    if (
      !ultimoResultado
    ) {
  
      return;
  
    }
  
  
    const ubicados =
      ultimoResultado
        .resultados
        .filter(
          resultado =>
            resultado.estado ===
            'ubicado'
        );
  
  
    if (
      !ubicados.length
    ) {
  
      return;
  
    }
  
  
    if (
      !confirm(
        `Se guardarán las coordenadas de ${ubicados.length} comercio(s) y quedarán activos en la aplicación.\n\n¿Continuar?`
      )
    ) {
  
      return;
  
    }
  
  
    const contenido =
      document.querySelector(
        '#geo-contenido'
      );
  
  
    contenido.innerHTML = `
  
      <div style="
        padding: 40px;
        text-align: center;
      ">
  
        <strong>
          Guardando coordenadas...
        </strong>
  
        <p
          id="geo-guardando"
          style="
            color: #777;
            font-size: 11px;
          "
        >
          0 de ${ubicados.length}
        </p>
  
      </div>
  
    `;
  
  
    try {
  
      let guardados = 0;
  
  
      for (
        let i = 0;
        i < ubicados.length;
        i += 10
      ) {
  
        const lote =
          ubicados.slice(
            i,
            i + 10
          );
  
  
        await Promise.all(
  
          lote.map(
            resultado =>
              supabaseFetch(
  
                `/rest/v1/comercios?id=eq.${encodeURIComponent(
                  resultado.id
                )}`,
  
                {
  
                  method:
                    'PATCH',
  
                  headers: {
  
                    Prefer:
                      'return=minimal',
  
                  },
  
                  body:
                    JSON.stringify({
  
                      direccion:
                        resultado
                          .comercio
                          ?.direccion ||
                        null,
  
                      lat:
                        resultado.lat,
  
                      lng:
                        resultado.lng,
  
                      activo:
                        true,
  
                      updated_at:
                        new Date()
                          .toISOString(),
  
                    }),
  
                }
  
              )
          )
  
        );
  
  
        guardados +=
          lote.length;
  
  
        const progreso =
          document.querySelector(
            '#geo-guardando'
          );
  
  
        if (progreso) {
  
          progreso.textContent =
            `${guardados} de ${ubicados.length}`;
  
        }
  
      }
  
  
      contenido.innerHTML = `
  
        <div style="
          padding: 30px;
  
          border-radius: 15px;
  
          background: #eff9f2;
  
          color: #237140;
  
          text-align: center;
        ">
  
          <div style="
            font-size: 35px;
            font-weight: 900;
          ">
            ✓
          </div>
  
          <h3>
            Ubicaciones guardadas
          </h3>
  
          <p>
            ${guardados}
            comercio(s) ya tienen
            coordenadas y quedaron activos.
          </p>
  
        </div>
  
  
        <button
          id="geo-finalizar"
          style="
            margin-top: 20px;
  
            min-height: 43px;
  
            padding: 0 16px;
  
            border: 0;
            border-radius: 10px;
  
            background: #df1921;
  
            color: white;
  
            font-weight: 900;
  
            cursor: pointer;
          "
        >
          Actualizar Admin
        </button>
  
      `;
  
  
      document
        .querySelector(
          '#geo-finalizar'
        )
        ?.addEventListener(
          'click',
          () => {
  
            window.location.reload();
  
          }
        );
  
    } catch (error) {
  
      alert(
        'No se pudieron guardar todas las ubicaciones: ' +
        (
          error?.message ||
          error
        )
      );
  
  
      renderResultado();
  
    }
  
  }
  
  
  /* =========================================================
     OBSERVAR ADMIN
  ========================================================= */
  
  const observer =
    new MutationObserver(
      agregarBoton
    );
  
  
  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
    }
  );
  
  
  agregarBoton();