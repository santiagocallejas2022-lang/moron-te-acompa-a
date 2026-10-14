const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY;


/* =====================================================
   IDENTIFICADORES ANÓNIMOS
===================================================== */

function crearUUID() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (c) {
      const r =
        Math.random() * 16 | 0;

      const v =
        c === 'x'
          ? r
          : (r & 0x3) | 0x8;

      return v.toString(16);
    });
}


function obtenerVisitorId() {
  let id =
    localStorage.getItem(
      'mta_visitor_id'
    );

  if (!id) {
    id = crearUUID();

    localStorage.setItem(
      'mta_visitor_id',
      id
    );
  }

  return id;
}


function obtenerSessionId() {
  let id =
    sessionStorage.getItem(
      'mta_session_id'
    );

  if (!id) {
    id = crearUUID();

    sessionStorage.setItem(
      'mta_session_id',
      id
    );
  }

  return id;
}


/* =====================================================
   ORIGEN DE LA VISITA
===================================================== */

function obtenerOrigen() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get('origen') ||
    params.get('utm_source') ||
    params.get('source') ||
    'directo'
  );
}


/* =====================================================
   TIPO DE DISPOSITIVO
===================================================== */

function obtenerDispositivo() {
  const ancho =
    window.innerWidth;

  if (ancho <= 600) {
    return 'celular';
  }

  if (ancho <= 1000) {
    return 'tablet';
  }

  return 'computadora';
}


/* =====================================================
   LIMPIEZA DE TEXTO
===================================================== */

function limpiarTexto(
  valor,
  max = 100
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const texto =
    String(valor)
      .trim()
      .slice(0, max);

  return texto || null;
}


/* =====================================================
   REGISTRAR EVENTO
===================================================== */

export async function registrarEvento(
  evento,
  datos = {}
) {
  if (
    !SUPABASE_URL ||
    !SUPABASE_KEY
  ) {
    console.warn(
      'Analytics: faltan las variables de Supabase.'
    );

    return;
  }

  const payload = {
    evento:
      limpiarTexto(
        evento,
        50
      ),

    programa:
      limpiarTexto(
        datos.programa,
        50
      ),

    comercio_id:
      datos.comercio_id ??
      datos.comercio ??
      null,

    origen:
      limpiarTexto(
        obtenerOrigen(),
        80
      ),

    busqueda:
      limpiarTexto(
        datos.busqueda,
        80
      ),

    rubro:
      limpiarTexto(
        datos.rubro,
        80
      ),

    localidad:
      limpiarTexto(
        datos.localidad,
        80
      ),

    visitor_id:
      obtenerVisitorId(),

    session_id:
      obtenerSessionId(),

    dispositivo:
      obtenerDispositivo(),
  };


  try {
    const respuesta =
      await fetch(
        `${SUPABASE_URL}/rest/v1/eventos_app`,
        {
          method: 'POST',

          headers: {
            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`,

            'Content-Type':
              'application/json',

            Prefer:
              'return=minimal',
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );


    if (!respuesta.ok) {
      const mensaje =
        await respuesta.text();

      console.error(
        'Analytics:',
        respuesta.status,
        mensaje
      );
    }

  } catch (error) {
    console.error(
      'Analytics:',
      error
    );
  }
}