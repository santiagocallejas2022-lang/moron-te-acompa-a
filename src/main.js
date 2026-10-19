const ruta =
  window.location.pathname
    .replace(/\/+$/, '') || '/';


async function iniciarAplicacion() {

  /* ==========================================
     ADMIN
  ========================================== */

  if (
    ruta === '/admin' ||
    ruta === '/estadisticas'
  ) {

    if (
      ruta === '/estadisticas'
    ) {

      window.history
        .replaceState(
          {},
          '',
          '/admin'
        );

    }


    /*
      Primero cargamos el admin principal.
    */

    await import(
      './admin.js'
    );


    /*
      Después cargamos módulos opcionales.

      Si alguno falla, el admin principal
      igual sigue funcionando.
    */

    try {

      await import(
        './importador.js'
      );

    } catch (error) {

      console.error(
        'Error al cargar el importador:',
        error
      );

    }


    try {

      await import(
        './geolocalizador-admin.js'
      );

    } catch (error) {

      console.error(
        'Error al cargar el geolocalizador:',
        error
      );

    }


    return;

  }


  /* ==========================================
     APP PÚBLICA
  ========================================== */

  try {

    const {
      sincronizarComercios,
    } =
      await import(
        './supabase-data.js'
      );


    await sincronizarComercios();

  } catch (error) {

    console.error(
      'No se pudieron sincronizar los comercios:',
      error
    );

  }


  await import(
    './app.js'
  );

}


iniciarAplicacion();