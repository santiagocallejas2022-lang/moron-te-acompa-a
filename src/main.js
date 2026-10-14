const ruta = window.location.pathname.replace(/\/+$/, '') || '/';

async function iniciarAplicacion() {
  /* ==========================================
     ADMIN
  ========================================== */

  if (ruta === '/admin' || ruta === '/estadisticas') {
    if (ruta === '/estadisticas') {
      window.history.replaceState({}, '', '/admin');
    }

    /*
      Importador masivo.

      Se carga antes del admin y automáticamente
      agrega el botón "Importar base" cuando
      entramos a la sección Comercios.
    */

    await import('./importador.js');

    await import('./admin.js');

    return;
  }

  /* ==========================================
     APP PÚBLICA
  ========================================== */

  const { sincronizarComercios } = await import('./supabase-data.js');

  await sincronizarComercios();

  await import('./app.js');
}

iniciarAplicacion();
