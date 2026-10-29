import { writeFileSync } from 'node:fs';

const datos = `
453|Pompeya Pub Social|Nuestra Señora de Rosario de Pompeya 2413|Castelar
175|Gourmet|Mitre 2460|Castelar
182|OMM|Gdor. Inocencio Arias 2485|Castelar
209|Tienda clothex|Av. Rivadavia 20072|Castelar
228|Almacen Natural Gurmet|Mitre 2460|Castelar
233|Birka|Casacuberta 3601|Castelar
339|Laundry Castelar|Santa Rosa 1037|Castelar
344|Festipromo|Av. Rivadavia 20090|Castelar
348|Wafeland|Av. Rivadavia 20092|Castelar
350|Dietetica Natural Gourmet|Mitre 2460|Castelar
363|Lencería Todo Pasa|Casacuberta 3508|Castelar
449|Ayerza|Sarmiento 2399|Castelar
460|Sucler|Martín Irigoyen 437|Castelar
462|Proar|Rodríguez Peña 901|Castelar
463|Estética Chateu|Gral. Bartolomé Mitre 2271|Castelar
465|Vikami Adultos|Pavón 4006|Castelar
152|Ferrara|Marconi 707|El Palomar
167|Marga|Marconi 1788|El Palomar
260|Elytel|Marconi 596|El Palomar
311|Química Lo de Paolo|Marconi 1734|El Palomar
397|Mercad Barrio Gaona|Curuzu Cuatia 431|El Palomar
442|Casa Elsa|Palacios 1301|El Palomar
120|Mostaza|Dr. Luis Güemes 452|Haedo
301|Minimarket L-P|Dr. Osvaldo Magnasco 907|Haedo
304|Ume Almacén Natural|Presidente Perón 1537|Haedo
435|Ímpetu||Haedo
438|Chabar|Pje. La Porteña 240|Haedo
19|Enza tienda de mates|25 de mayo L28|Morón
27|Nuevas Hogar|República Oriental del Uruguay 118|Morón
37|Estilita La cantina|San Martín 1001|Morón
48|Tiempo grafica|Juan Manuel de Rosas 221|Morón
50|Grido|Machado 1081|Morón
65|Mistral|Juan Manuel de Rosas 658|Morón
85|Barbería Style|República Oriental del Uruguay 112|Morón
88|Pelu Barber|San Martín 186|Morón
242|Dam|Patagones 1198|Morón
272|FyF Ferretería|Machado 684|Morón
281|Market Kiwi II|Juez de la Gándara 998|Morón
285|Óptica Independencia|San Martín 444|Morón
371|Farmacia Bideberry|Patagones 1253|Morón
373|El Tano|Callao 1945|Morón
379|Almacén y Granja Evolución|Patagones 996|Morón
398|Los Reyes del revoledo|Don Bosco 3347|Morón
399|Los Reyes del cerdo|Don Bosco 3901|Morón
404|Todo Limpito|Patagones 1025|Morón
410|Sere Cafe-bar|Machado 861|Morón
`;

const comercios = datos
  .trim()
  .split('\n')
  .map(linea => {
    const [id, nombre, direccion, localidad] = linea.split('|');

    return {
      id: Number(id),
      nombre,
      direccion,
      localidad,
    };
  });

const excluir = new Map([
  [19, 'Dirección sin altura clara'],
  [363, 'Dirección dudosa: Casacuberta 3508 / 2508'],
  [435, 'No tiene dirección'],
]);

const listos = [];
const revisar = [];

async function buscar(c) {
  const params = new URLSearchParams({
    direccion: c.direccion,
    provincia: 'Buenos Aires',
    departamento: 'Morón',
    localidad: c.localidad,
    max: '1',
  });

  const url =
    'https://apis.datos.gob.ar/georef/api/direcciones?' +
    params.toString();

  const r = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`);
  }

  const data = await r.json();

  return data.direcciones?.[0] || null;
}

console.log(`TOTAL: ${comercios.length}`);

for (const c of comercios) {
  if (excluir.has(c.id)) {
    revisar.push({
      ...c,
      motivo: excluir.get(c.id),
    });

    console.log(`${c.id} - ${c.nombre}: REVISAR`);
    continue;
  }

  process.stdout.write(
    `${c.id} - ${c.nombre}: `
  );

  try {
    const resultado = await buscar(c);

    if (!resultado?.ubicacion) {
      console.log('NO ENCONTRADO');

      revisar.push({
        ...c,
        motivo: 'No encontrado en Georef',
      });

      continue;
    }

    const lat = Number(resultado.ubicacion.lat);
    const lng = Number(resultado.ubicacion.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      console.log('SIN COORDENADAS');

      revisar.push({
        ...c,
        motivo: 'Sin coordenadas',
      });

      continue;
    }

    // Seguridad: aproximadamente dentro del Partido de Morón.
    if (
      lat < -34.75 ||
      lat > -34.55 ||
      lng < -58.75 ||
      lng > -58.50
    ) {
      console.log('FUERA DE ZONA');

      revisar.push({
        ...c,
        motivo: 'Coordenadas fuera de Morón',
        lat,
        lng,
      });

      continue;
    }

    listos.push({
      ...c,
      lat,
      lng,
    });

    console.log(`OK ${lat}, ${lng}`);

  } catch (e) {
    console.log(`ERROR ${e.message}`);

    revisar.push({
      ...c,
      motivo: e.message,
    });
  }
}

let sql = `BEGIN;

-- Correcciones de direcciones conocidas
UPDATE public.comercios
SET direccion = 'Nuestra Señora de Rosario de Pompeya 2413',
    localidad = 'Castelar',
    updated_at = now()
WHERE id = 453;

UPDATE public.comercios
SET direccion = 'Pavón 4006',
    localidad = 'Castelar',
    updated_at = now()
WHERE id = 465;

`;

if (listos.length) {
  sql += `
UPDATE public.comercios AS c
SET
  lat = v.lat,
  lng = v.lng,
  updated_at = now()
FROM (
  VALUES
${listos
  .map(x => `    (${x.id}, ${x.lat}, ${x.lng})`)
  .join(',\n')}
) AS v(id, lat, lng)
WHERE c.id = v.id;
`;
}

sql += `

COMMIT;

SELECT
  id,
  nombre,
  direccion,
  localidad,
  lat,
  lng,
  activo
FROM public.comercios
WHERE lat IS NULL
   OR lng IS NULL
ORDER BY localidad, id;
`;

writeFileSync(
  'actualizar-coordenadas.sql',
  sql
);

writeFileSync(
  'coordenadas-revisar.json',
  JSON.stringify(revisar, null, 2)
);

console.log('\n==============================');
console.log(`LISTOS PARA ACTUALIZAR: ${listos.length}`);
console.log(`PARA REVISAR: ${revisar.length}`);
console.log('==============================');
console.log('\n✅ actualizar-coordenadas.sql');
console.log('✅ coordenadas-revisar.json');
console.log('\nNO EJECUTES TODAVÍA EL SQL.');