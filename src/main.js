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
      Primero cargamos el ADMIN.

      Así, aunque el importador tenga
      algún problema, /admin sigue
      funcionando.
    */

    await import(
      './admin.js'
    );


    /*
      Después intentamos cargar
      el importador.

      Si falla, mostramos el error
      en consola pero NO rompemos
      el panel admin.
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