import jubiladosImg from './jubilados.webp';
import jovenImg from './joven.webp';
import docenteImg from './docente.webp';
import municipalesImg from './municipales.webp';
import plataformaImg from './plataforma.webp';
import buenContribuyenteImg from './buen-contribuyente.webp';

/* =====================================================
   PROGRAMAS
===================================================== */

export const programas = [
  {
    id: 'jubilados',
    nombre: 'Jubilados',
    descripcion: 'Beneficios para personas jubiladas',
    imagen: jubiladosImg,
  },

  {
    id: 'joven',
    nombre: 'Tarjeta Joven',
    descripcion: 'Beneficios para jóvenes',
    imagen: jovenImg,
  },

  {
    id: 'docente',
    nombre: 'Soy Docente',
    descripcion: 'Beneficios para trabajadoras y trabajadores docentes',
    imagen: docenteImg,
  },

  {
    id: 'municipales',
    nombre: 'Trabajadores Municipales',
    descripcion: 'Beneficios para trabajadoras y trabajadores municipales',
    imagen: municipalesImg,
  },

  {
    id: 'plataforma',
    nombre: 'Trabajadores/as de Plataforma',
    descripcion: 'Beneficios para trabajadores y trabajadoras de plataformas',
    imagen: plataformaImg,
  },

  {
    id: 'buen-contribuyente',
    nombre: 'Buen Contribuyente',
    descripcion: 'Beneficios para vecinos y vecinas',
    imagen: buenContribuyenteImg,
  },
];

/* =====================================================
   COMERCIOS DE PRUEBA
   Después reemplazamos estos datos por los reales.
===================================================== */

export const comercios = [
  {
    id: 1,
    nombre: 'Comercio Demo Centro',
    rubro: 'Gastronomía',
    localidad: 'Morón',
    direccion: '25 de Mayo 210, Morón',
    lat: -34.6499,
    lng: -58.6196,
    horario: 'Lunes a sábado de 9 a 20 hs',
    telefono: '11 4000-1001',

    beneficios: [
      {
        programa: 'joven',
        beneficio: '15% de descuento',
        condiciones: 'Presentando Tarjeta Joven.',
      },

      {
        programa: 'municipales',
        beneficio: '10% de descuento',
        condiciones: 'Presentando acreditación correspondiente.',
      },
    ],
  },

  {
    id: 2,
    nombre: 'Farmacia Demo Haedo',
    rubro: 'Salud',
    localidad: 'Haedo',
    direccion: 'Rivadavia 16120, Haedo',
    lat: -34.6454,
    lng: -58.5948,
    horario: 'Todos los días de 8 a 22 hs',
    telefono: '11 4000-1002',

    beneficios: [
      {
        programa: 'jubilados',
        beneficio: '20% de descuento',
        condiciones: 'En productos seleccionados.',
      },

      {
        programa: 'buen-contribuyente',
        beneficio: '10% de descuento',
        condiciones: 'No acumulable con otras promociones.',
      },
    ],
  },

  {
    id: 3,
    nombre: 'Bicicletería Demo Oeste',
    rubro: 'Movilidad',
    localidad: 'Castelar',
    direccion: 'Arias 2350, Castelar',
    lat: -34.6518,
    lng: -58.6423,
    horario: 'Lunes a viernes de 9 a 19 hs',
    telefono: '11 4000-1003',

    beneficios: [
      {
        programa: 'plataforma',
        beneficio: '15% en service',
        condiciones: 'Presentando acreditación del programa.',
      },

      {
        programa: 'joven',
        beneficio: '10% de descuento',
        condiciones: 'En accesorios seleccionados.',
      },
    ],
  },

  {
    id: 4,
    nombre: 'Librería Demo Norte',
    rubro: 'Librería',
    localidad: 'El Palomar',
    direccion: 'Marconi 900, El Palomar',
    lat: -34.6149,
    lng: -58.5952,
    horario: 'Lunes a sábado de 9 a 19 hs',
    telefono: '11 4000-1004',

    beneficios: [
      {
        programa: 'joven',
        beneficio: '20% de descuento',
        condiciones: 'En útiles escolares.',
      },

      {
        programa: 'docente',
        beneficio: '15% de descuento',
        condiciones: 'Presentando acreditación docente.',
      },
    ],
  },

  {
    id: 5,
    nombre: 'Indumentaria Demo Plaza',
    rubro: 'Indumentaria',
    localidad: 'Morón',
    direccion: 'Belgrano 180, Morón',
    lat: -34.6512,
    lng: -58.6218,
    horario: 'Lunes a sábado de 10 a 20 hs',
    telefono: '11 4000-1005',

    beneficios: [
      {
        programa: 'buen-contribuyente',
        beneficio: '15% de descuento',
        condiciones: 'Pago en efectivo o transferencia.',
      },

      {
        programa: 'joven',
        beneficio: '10% de descuento',
        condiciones: 'No acumulable.',
      },
    ],
  },

  {
    id: 6,
    nombre: 'Café Demo Estación',
    rubro: 'Gastronomía',
    localidad: 'Haedo',
    direccion: 'Rivadavia 16200, Haedo',
    lat: -34.645,
    lng: -58.596,
    horario: 'Lunes a domingo de 7 a 21 hs',
    telefono: '11 4000-1006',

    beneficios: [
      {
        programa: 'plataforma',
        beneficio: '20% de descuento',
        condiciones: 'En consumos dentro del local.',
      },

      {
        programa: 'municipales',
        beneficio: '10% de descuento',
        condiciones: 'Todos los días.',
      },
    ],
  },

  {
    id: 7,
    nombre: 'Óptica Demo Castelar',
    rubro: 'Salud',
    localidad: 'Castelar',
    direccion: 'Montes de Oca 2200, Castelar',
    lat: -34.654,
    lng: -58.6429,
    horario: 'Lunes a viernes de 9 a 19 hs',
    telefono: '11 4000-1007',

    beneficios: [
      {
        programa: 'jubilados',
        beneficio: '15% de descuento',
        condiciones: 'En cristales seleccionados.',
      },

      {
        programa: 'municipales',
        beneficio: '15% de descuento',
        condiciones: 'Presentando identificación.',
      },
    ],
  },

  {
    id: 8,
    nombre: 'Mercado Demo Sarmiento',
    rubro: 'Alimentos',
    localidad: 'Villa Sarmiento',
    direccion: 'Tres de Febrero 400, Villa Sarmiento',
    lat: -34.6292,
    lng: -58.5708,
    horario: 'Lunes a sábado de 8 a 20 hs',
    telefono: '11 4000-1008',

    beneficios: [
      {
        programa: 'jubilados',
        beneficio: '10% de descuento',
        condiciones: 'Martes y jueves.',
      },

      {
        programa: 'buen-contribuyente',
        beneficio: '10% de descuento',
        condiciones: 'Compra mínima de $15.000.',
      },
    ],
  },

  {
    id: 9,
    nombre: 'Gomería Demo Oeste',
    rubro: 'Movilidad',
    localidad: 'Morón',
    direccion: 'Don Bosco 2800, Morón',
    lat: -34.6633,
    lng: -58.6209,
    horario: 'Lunes a sábado de 8 a 18 hs',
    telefono: '11 4000-1009',

    beneficios: [
      {
        programa: 'plataforma',
        beneficio: '10% de descuento',
        condiciones: 'En mano de obra.',
      },
    ],
  },

  {
    id: 10,
    nombre: 'Perfumería Demo Centro',
    rubro: 'Perfumería',
    localidad: 'Morón',
    direccion: 'Nuestra Señora del Buen Viaje 700, Morón',
    lat: -34.6485,
    lng: -58.617,
    horario: 'Lunes a sábado de 9 a 20 hs',
    telefono: '11 4000-1010',

    beneficios: [
      {
        programa: 'municipales',
        beneficio: '15% de descuento',
        condiciones: 'Productos seleccionados.',
      },

      {
        programa: 'jubilados',
        beneficio: '10% de descuento',
        condiciones: 'Presentando acreditación.',
      },
    ],
  },

  {
    id: 11,
    nombre: 'Heladería Demo Sur',
    rubro: 'Gastronomía',
    localidad: 'Castelar',
    direccion: 'Santa Rosa 950, Castelar',
    lat: -34.6579,
    lng: -58.647,
    horario: 'Todos los días de 12 a 00 hs',
    telefono: '11 4000-1011',

    beneficios: [
      {
        programa: 'joven',
        beneficio: '2x1',
        condiciones: 'De lunes a jueves.',
      },

      {
        programa: 'docente',
        beneficio: '15% de descuento',
        condiciones: 'De lunes a viernes.',
      },
    ],
  },

  {
    id: 12,
    nombre: 'Veterinaria Demo Palomar',
    rubro: 'Servicios',
    localidad: 'El Palomar',
    direccion: 'Rosales 1200, El Palomar',
    lat: -34.616,
    lng: -58.594,
    horario: 'Lunes a sábado de 9 a 19 hs',
    telefono: '11 4000-1012',

    beneficios: [
      {
        programa: 'buen-contribuyente',
        beneficio: '10% de descuento',
        condiciones: 'En consultas veterinarias.',
      },

      {
        programa: 'docente',
        beneficio: '10% de descuento',
        condiciones: 'Presentando acreditación.',
      },
    ],
  },
];
