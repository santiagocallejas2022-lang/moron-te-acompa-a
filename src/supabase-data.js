import {
  comercios,
} from './data.js';


const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL
    ?.replace(/\/$/, '');

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY;


/* =====================================================
   CONSULTA A SUPABASE
===================================================== */

async function consultar(tabla) {

  const respuesta =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${tabla}`,
      {
        headers: {
          apikey:
            SUPABASE_KEY,

          Authorization:
            `Bearer ${SUPABASE_KEY}`,
        },
      }
    );


  if (!respuesta.ok) {

    const mensaje =
      await respuesta.text();

    throw new Error(
      mensaje ||
      `No se pudo consultar ${tabla}`
    );

  }


  return respuesta.json();

}


/* =====================================================
   CARGAR COMERCIOS DESDE SUPABASE
===================================================== */

export async function sincronizarComercios() {

  if (
    !SUPABASE_URL ||
    !SUPABASE_KEY
  ) {

    console.warn(
      'Supabase no está configurado. Se usarán los comercios demo locales.'
    );

    return;

  }


  try {

    const [
      comerciosRemotos,
      beneficiosRemotos,
    ] =
      await Promise.all([

        consultar(
          'comercios?select=id,nombre,rubro,localidad,direccion,telefono,horario,lat,lng,activo&activo=eq.true&order=nombre.asc'
        ),

        consultar(
          'beneficios_comercio?select=id,comercio_id,programa,beneficio,condiciones,activo&activo=eq.true'
        ),

      ]);


    if (
      !Array.isArray(
        comerciosRemotos
      )
    ) {

      throw new Error(
        'Formato de comercios inválido.'
      );

    }


    const beneficiosPorComercio =
      new Map();


    beneficiosRemotos.forEach(
      beneficio => {

        const comercioId =
          Number(
            beneficio.comercio_id
          );


        if (
          !beneficiosPorComercio.has(
            comercioId
          )
        ) {

          beneficiosPorComercio.set(
            comercioId,
            []
          );

        }


        beneficiosPorComercio
          .get(
            comercioId
          )
          .push({

            programa:
              beneficio.programa,

            beneficio:
              beneficio.beneficio,

            condiciones:
              beneficio.condiciones || '',

          });

      }
    );


    const nuevosComercios =
      comerciosRemotos.map(
        comercio => ({

          id:
            Number(
              comercio.id
            ),

          nombre:
            comercio.nombre,

          rubro:
            comercio.rubro,

          localidad:
            comercio.localidad,

          direccion:
            comercio.direccion,

          telefono:
            comercio.telefono || '',

          horario:
            comercio.horario || '',

          lat:
            comercio.lat !== null
              ? Number(comercio.lat)
              : null,

          lng:
            comercio.lng !== null
              ? Number(comercio.lng)
              : null,

          beneficios:
            beneficiosPorComercio.get(
              Number(
                comercio.id
              )
            ) || [],

        })
      );


    /*
      IMPORTANTE:

      No reemplazamos la variable importada.
      Modificamos el contenido del array existente.

      Así app.js y stats.js reciben
      automáticamente los datos de Supabase.
    */

    comercios.splice(
      0,
      comercios.length,
      ...nuevosComercios
    );


    console.log(
      `Morón te acompaña: ${comercios.length} comercios cargados desde Supabase.`
    );

  } catch (error) {

    console.error(
      'No se pudieron cargar los comercios desde Supabase.',
      error
    );


    console.warn(
      'Se mantienen los comercios demo locales como respaldo.'
    );

  }

}