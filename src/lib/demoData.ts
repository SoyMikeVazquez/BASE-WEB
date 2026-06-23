// Demo mode mock data
// This provides realistic sample data for the dashboard when in demo mode

export const DEMO_STORAGE_KEY = 'baseweb_demo_mode';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
}

export function enableDemoMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEMO_STORAGE_KEY, 'true');
  }
}

export function disableDemoMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  }
}

// Helper: generate dates relative to today
function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE');
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('sv-SE');
}

function currentMonth(): string {
  return todayStr().substring(0, 7);
}

export function getDemoCitas() {
  const today = todayStr();
  const month = currentMonth();

  return [
    // Today's appointments
    {
      clienteID: 'demo-c1',
      barberoID: 'demo-staff-1',
      servicioID: 'demo-s1',
      fecha: today,
      horaInicio: '09:00:00',
      horaFin: '09:45:00',
      sucursal: 'Sucursal Centro',
      estatus: 'Completada',
      precioFinal: 350,
      NombreCliente: 'María García López',
      sucursal_id: 'demo-branch-1',
    },
    {
      clienteID: 'demo-c2',
      barberoID: 'demo-staff-2',
      servicioID: 'demo-s2',
      fecha: today,
      horaInicio: '10:00:00',
      horaFin: '10:30:00',
      sucursal: 'Sucursal Centro',
      estatus: 'Completada',
      precioFinal: 250,
      NombreCliente: 'Carlos Rodríguez',
      sucursal_id: 'demo-branch-1',
    },
    {
      clienteID: 'demo-c3',
      barberoID: 'demo-staff-3',
      servicioID: 'demo-s1',
      fecha: today,
      horaInicio: '11:00:00',
      horaFin: '11:45:00',
      sucursal: 'Sucursal Norte',
      estatus: 'Activa',
      precioFinal: 450,
      NombreCliente: 'Ana Martínez Ruiz',
      sucursal_id: 'demo-branch-2',
    },
    {
      clienteID: 'demo-c4',
      barberoID: 'demo-staff-1',
      servicioID: 'demo-s3',
      fecha: today,
      horaInicio: '12:00:00',
      horaFin: '13:00:00',
      sucursal: 'Sucursal Centro',
      estatus: 'Activa',
      precioFinal: 600,
      NombreCliente: 'Roberto Sánchez',
      sucursal_id: 'demo-branch-1',
    },
    {
      clienteID: 'demo-c5',
      barberoID: 'demo-staff-4',
      servicioID: 'demo-s2',
      fecha: today,
      horaInicio: '14:00:00',
      horaFin: '14:30:00',
      sucursal: 'Sucursal Norte',
      estatus: 'Activa',
      precioFinal: 280,
      NombreCliente: 'Laura Hernández',
      sucursal_id: 'demo-branch-2',
    },
    // Past days this week
    ...[1, 2, 3, 4, 5, 6].flatMap((daysBack) => [
      {
        clienteID: `demo-past-${daysBack}-1`,
        barberoID: 'demo-staff-1',
        servicioID: 'demo-s1',
        fecha: daysAgo(daysBack),
        horaInicio: '10:00:00',
        horaFin: '10:45:00',
        sucursal: 'Sucursal Centro',
        estatus: 'Completada',
        precioFinal: 300 + daysBack * 50,
        NombreCliente: `Cliente ${daysBack}A`,
        sucursal_id: 'demo-branch-1',
      },
      {
        clienteID: `demo-past-${daysBack}-2`,
        barberoID: 'demo-staff-2',
        servicioID: 'demo-s2',
        fecha: daysAgo(daysBack),
        horaInicio: '11:00:00',
        horaFin: '11:30:00',
        sucursal: 'Sucursal Norte',
        estatus: 'Completada',
        precioFinal: 250 + daysBack * 30,
        NombreCliente: `Cliente ${daysBack}B`,
        sucursal_id: 'demo-branch-2',
      },
      {
        clienteID: `demo-past-${daysBack}-3`,
        barberoID: 'demo-staff-3',
        servicioID: 'demo-s3',
        fecha: daysAgo(daysBack),
        horaInicio: '15:00:00',
        horaFin: '15:45:00',
        sucursal: 'Sucursal Centro',
        estatus: 'Completada',
        precioFinal: 400 + daysBack * 20,
        NombreCliente: `Cliente ${daysBack}C`,
        sucursal_id: 'demo-branch-1',
      },
    ]),
    // Earlier this month (more appointments to flesh out the month)
    ...[8, 10, 12, 15, 18, 20].flatMap((daysBack) => [
      {
        clienteID: `demo-month-${daysBack}`,
        barberoID: 'demo-staff-recep',
        servicioID: 'demo-s1',
        fecha: daysAgo(daysBack),
        horaInicio: '09:30:00',
        horaFin: '10:00:00',
        sucursal: 'Sucursal Centro',
        estatus: 'Completada',
        precioFinal: 200 + daysBack * 15,
        NombreCliente: `Cliente Mes ${daysBack}`,
        sucursal_id: 'demo-branch-1',
      },
    ]),
  ];
}

export function getDemoPersonal() {
  return [
    { userID: 'demo-staff-1', nombre: 'Miguel Vázquez', TipoPersonal: 'Barbero', sucursal: 'Sucursal Centro' },
    { userID: 'demo-staff-2', nombre: 'Sofía Ramírez', TipoPersonal: 'Estilista', sucursal: 'Sucursal Centro' },
    { userID: 'demo-staff-3', nombre: 'Diego Torres', TipoPersonal: 'Barbero', sucursal: 'Sucursal Norte' },
    { userID: 'demo-staff-4', nombre: 'Valentina López', TipoPersonal: 'Estilista', sucursal: 'Sucursal Norte' },
    { userID: 'demo-staff-recep', nombre: 'Andrea Morales', TipoPersonal: 'Recepcionista', sucursal: 'Sucursal Centro' },
  ];
}

export function getDemoProducts() {
  return [
    { id: 'demo-p1', nombre: 'Cera para cabello Premium', stock: 24 },
    { id: 'demo-p2', nombre: 'Shampoo Anti-caspa 500ml', stock: 3 },
    { id: 'demo-p3', nombre: 'Aceite para barba Artesanal', stock: 18 },
    { id: 'demo-p4', nombre: 'Gel fijador Extra Fuerte', stock: 2 },
    { id: 'demo-p5', nombre: 'Loción Aftershave Mentol', stock: 12 },
    { id: 'demo-p6', nombre: 'Tinte capilar Negro Natural', stock: 5 },
    { id: 'demo-p7', nombre: 'Crema para manos Profesional', stock: 1 },
    { id: 'demo-p8', nombre: 'Spray protector térmico', stock: 15 },
    { id: 'demo-p9', nombre: 'Bálsamo acondicionador', stock: 9 },
    { id: 'demo-p10', nombre: 'Tijeras profesionales Inox', stock: 7 },
  ];
}

export function getDemoBranches() {
  return [
    { IDSucursal: 'demo-branch-1', NombreSucursal: 'Sucursal Centro' },
    { IDSucursal: 'demo-branch-2', NombreSucursal: 'Sucursal Norte' },
  ];
}

export function getDemoUsers() {
  return [
    { IDUser: 'demo-u1', isPersonal: true, isAdmin: true, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u2', isPersonal: true, isAdmin: false, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u3', isPersonal: true, isAdmin: false, isRecepcion: true, isGestor: false },
    { IDUser: 'demo-u4', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u5', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u6', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u7', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u8', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u9', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u10', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: true },
    { IDUser: 'demo-u11', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: false },
    { IDUser: 'demo-u12', isPersonal: false, isAdmin: false, isRecepcion: false, isGestor: false },
  ];
}

export function getDemoGeneralConfig() {
  return {
    NombreDeLaEmpresa: 'BASE 2.0 — Demo',
    LogoDeLaEmpresa: null,
    Soporte: 'https://www.totalpro.com/soporte',
    PoliticaDePrivacidad: 'https://www.totalpro.com/privacy',
  };
}
