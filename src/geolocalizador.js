/* =========================================================
   GEOLOCALIZADOR - MORÓN TE ACOMPAÑA

   Fuente:
   Servicio Georef - Argentina.gob.ar

   Todas las direcciones se buscan dentro de:
   Provincia de Buenos Aires
   Departamento / Partido de Morón
========================================================= */

const GEOREF_URL =
  'https://apis.datos.gob.ar/georef/api/v2.0/direcciones';


const TAMANO_LOTE = 100;


/* =========================================================
   UTILIDADES
========================================================= */

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


function normalizarTexto(
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


function esNumeroValido(
  valor
) {

  const numero =
    Number(valor);


  return Number.isFinite(
    numero
  );

}


/* =========================================================
   VALIDAR QUE EL RESULTADO SEA MORÓN
========================================================= */

function esMoron(
  direccion
) {

  const departamento =
    direccion
      ?.departamento
      ?.nombre ||
    '';


  return (
    normalizarTexto(
      departamento
    ) ===
    'moron'
  );

}


/* =========================================================
   INTERPRETAR RESPUESTA DE GEOREF
========================================================= */

function interpretarResultado(
  comercio,
  resultado
) {

  const direccion =
    resultado
      ?.direcciones
      ?.[0];


  if (!direccion) {

    return {

      id:
        comercio.id,

      comercio,

      estado:
        'no_encontrado',

      mensaje:
        'Georef no encontró la dirección.',

      lat:
        null,

      lng:
        null,

      nomenclatura:
        '',

    };

  }


  const lat =
    direccion
      ?.ubicacion
      ?.lat;


  const lng =
    direccion
      ?.ubicacion
      ?.lon;


  if (
    !esMoron(
      direccion
    )
  ) {

    return {

      id:
        comercio.id,

      comercio,

      estado:
        'revisar',

      mensaje:
        'La dirección encontrada no fue validada dentro del partido de Morón.',

      lat:
        null,

      lng:
        null,

      nomenclatura:
        direccion
          ?.nomenclatura ||
        '',

      respuesta:
        direccion,

    };

  }


  if (
    !esNumeroValido(
      lat
    ) ||
    !esNumeroValido(
      lng
    )
  ) {

    return {

      id:
        comercio.id,

      comercio,

      estado:
        'sin_coordenadas',

      mensaje:
        'La dirección fue reconocida pero Georef no devolvió coordenadas.',

      lat:
        null,

      lng:
        null,

      nomenclatura:
        direccion
          ?.nomenclatura ||
        '',

      respuesta:
        direccion,

    };

  }


  return {

    id:
      comercio.id,

    comercio,

    estado:
      'ubicado',

    mensaje:
      'Dirección ubicada correctamente.',

    lat:
      Number(lat),

    lng:
      Number(lng),

    nomenclatura:
      direccion
        ?.nomenclatura ||
      '',

    calle:
      direccion
        ?.calle
        ?.nombre ||
      '',

    altura:
      direccion
        ?.altura
        ?.valor ??
      '',

    localidad:
      direccion
        ?.localidad
        ?.nombre ||
      '',

    departamento:
      direccion
        ?.departamento
        ?.nombre ||
      '',

    provincia:
      direccion
        ?.provincia
        ?.nombre ||
      '',

    respuesta:
      direccion,

  };

}


/* =========================================================
   CONSULTAR UN LOTE
========================================================= */

async function consultarLote(
  comercios
) {

  const consultas =
    comercios.map(
      comercio => ({

        /*
          IMPORTANTE:

          No dependemos de que la planilla
          diga Morón, Haedo, Castelar, etc.

          Forzamos siempre el Partido de Morón.
        */

        direccion:
          limpiar(
            comercio.direccion
          ),

        provincia:
          'Buenos Aires',

        departamento:
          'Morón',

        max:
          1,

        campos:
          'completo',

      })
    );


  const respuesta =
    await fetch(
      GEOREF_URL,
      {

        method:
          'POST',

        headers: {

          'Content-Type':
            'application/json',

        },

        body:
          JSON.stringify({

            direcciones:
              consultas,

          }),

      }
    );


  if (
    !respuesta.ok
  ) {

    throw new Error(
      `Georef respondió con error ${respuesta.status}.`
    );

  }


  const data =
    await respuesta.json();


  const resultados =
    Array.isArray(
      data?.resultados
    )
      ? data.resultados
      : [];


  return comercios.map(
    (
      comercio,
      indice
    ) =>
      interpretarResultado(

        comercio,

        resultados[
          indice
        ]

      )
  );

}


/* =========================================================
   GEOLOCALIZAR MUCHOS COMERCIOS
========================================================= */

export async function geolocalizarComerciosMoron(
  comercios,
  onProgreso = null
) {

  const lista =
    Array.isArray(
      comercios
    )
      ? comercios
      : [];


  const resultados = [];


  /*
    Los que directamente no tienen dirección
    no se mandan a Georef.
  */

  const sinDireccion =
    lista.filter(
      comercio =>
        !limpiar(
          comercio.direccion
        )
    );


  sinDireccion.forEach(
    comercio => {

      resultados.push({

        id:
          comercio.id,

        comercio,

        estado:
          'sin_direccion',

        mensaje:
          'El comercio no tiene dirección cargada.',

        lat:
          null,

        lng:
          null,

        nomenclatura:
          '',

      });

    }
  );


  const conDireccion =
    lista.filter(
      comercio =>
        Boolean(
          limpiar(
            comercio.direccion
          )
        )
    );


  let procesados = 0;


  for (
    let i = 0;
    i < conDireccion.length;
    i += TAMANO_LOTE
  ) {

    const lote =
      conDireccion.slice(
        i,
        i +
        TAMANO_LOTE
      );


    const resultadoLote =
      await consultarLote(
        lote
      );


    resultados.push(
      ...resultadoLote
    );


    procesados +=
      lote.length;


    if (
      typeof onProgreso ===
      'function'
    ) {

      onProgreso({

        procesados,

        total:
          conDireccion.length,

        porcentaje:
          conDireccion.length
            ? Math.round(
                (
                  procesados /
                  conDireccion.length
                ) *
                100
              )
            : 100,

      });

    }

  }


  /*
    Devolvemos también un resumen,
    que después usaremos en el Admin.
  */

  const resumen = {

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


  return {

    resultados,

    resumen,

  };

}


/* =========================================================
   GEOLOCALIZAR UNO SOLO
========================================================= */

export async function geolocalizarComercioMoron(
  comercio
) {

  const resultado =
    await geolocalizarComerciosMoron(
      [
        comercio,
      ]
    );


  return (
    resultado
      .resultados
      ?.[0] ||
    null
  );

}