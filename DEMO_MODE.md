# 📊 Modo Demostración - Documentación

## ¿Qué es el Modo Demostración?

El modo demostración permite a visitantes explorar el dashboard y ver cómo funciona la aplicación **sin necesidad de credenciales de login**. Utiliza datos de ejemplo realistas y está completamente funcional.

## 🎯 Características

### Acceso

- **Botón dedicado:** "📊 Ver Demostración" en la página de login
- **Sin autenticación requerida:** Accede directamente al dashboard
- **Datos completamente realistas:** Información de ejemplo coherente y profesional

### Datos de Demo Incluidos

#### 📅 Citas (15+ ejemplos)
- Citas de hoy completadas y activas
- Citas históricas de los últimos 6 días
- Información de clientes, barberos/estilistas y sucursales
- Precios y estatus variados

#### 👥 Personal (5 miembros)
- Miguel Vázquez - Barbero (Sucursal Centro)
- Sofía Ramírez - Estilista (Sucursal Centro)
- Diego Torres - Barbero (Sucursal Norte)
- Valentina López - Estilista (Sucursal Norte)
- Andrea Morales - Recepcionista (Sucursal Centro)

#### 📦 Productos (10 items)
- Cera para cabello Premium (24 unidades)
- Shampoo Anti-caspa (3 unidades - CRÍTICO)
- Aceite para barba Artesanal (18 unidades)
- Gel fijador Extra Fuerte (2 unidades - CRÍTICO)
- Y más...

#### 🏪 Sucursales (2 ejemplos)
- Sucursal Centro
- Sucursal Norte

#### 🔐 Usuarios Demo (12 roles)
- Admin con acceso total
- Personal con acceso de personal
- Recepcionista con acceso limitado
- Gestor con acceso de gestión

### Dashboard Completo

El modo demo carga **TODAS** las secciones del dashboard:

- ✅ Vista Financiera General (con cajas de recepción y personal)
- ✅ Ingresos del día
- ✅ Citas del día con listado detallado
- ✅ Gráfico de ingresos de la semana (últimos 7 días)
- ✅ Personal activo con citas asignadas
- ✅ Inventario crítico con alertas
- ✅ KPIs por sucursal
- ✅ Estadísticas de visitas de app
- ✅ Selector de mes para ajustar métricas

## 🛠️ Implementación Técnica

### Archivos Modificados

1. **`src/lib/demoData.ts`**
   - Definición de datos de demostración
   - Funciones para activar/desactivar modo demo
   - Helpers para generar datos dinámicos

2. **`src/app/login/page.tsx`**
   - Agregado botón "Ver Demostración"
   - Handler `handleDemoMode()` que activa demo y redirige

3. **`src/app/login/login.module.css`**
   - Estilos para `.demoSection` y `.demoButton`
   - Divisor visual entre login y demostración
   - Estilos responsivos para móvil

4. **`src/app/dashboard/page.tsx`**
   - Detección de modo demo en `loadDashboardData()`
   - Carga de datos demo si está activo, datos reales si no
   - Botón "Salir de Demostración" al final del dashboard

5. **`src/app/dashboard/layout.tsx`**
   - Permiso de acceso sin autenticación en modo demo
   - Saltea la verificación de sesión Supabase

6. **`src/app/dashboard/dashboard.module.css`**
   - Estilos para `.demoExitBtn` (botón de salida)

### Storage Local (localStorage)

```javascript
// Activar modo demo
localStorage.setItem('baseweb_demo_mode', 'true');

// Desactivar modo demo
localStorage.removeItem('baseweb_demo_mode');

// Verificar si está activo
const isDemo = localStorage.getItem('baseweb_demo_mode') === 'true';
```

## 📱 Flujo de Uso

```
Login Page
├── Opción 1: Login Normal
│   └── Ingresa credenciales → Dashboard Real
└── Opción 2: Ver Demostración
    └── Click botón → Activa localStorage → Dashboard Demo
        └── Botón "Salir" → Limpia localStorage → Vuelve a Login
```

## 🔄 Datos Dinámicos en Demo

Algunos datos se generan dinámicamente para parecer realistas:

### Citas
- **Hoy:** 5 citas ejemplo completadas/activas
- **Últimos 6 días:** 18 citas más (3 por día)
- **Mes actual:** 6 citas adicionales en fechas específicas
- **Fechas:** Se calculan relativamente a la fecha actual del sistema

### Métricas Calculadas Automáticamente
- Ingresos del día (suma de citas de hoy)
- Ingresos de la semana (últimos 7 días)
- Total de personal
- Porcentaje de inventario saludable
- Desglose por sucursal (recepción vs personal)

## 🎨 Apariencia

### Botón de Demostración (Login)
- Color verde con estilo secondary
- Emoji 📊 para identificación rápida
- Responsive: funciona en móvil y desktop
- Mismo diseño que botón de login principal

### Botón de Salida (Dashboard)
- Color naranja/ámbar para diferenciarse
- Texto: "← Salir de Demostración"
- Ubicado al final del dashboard con otros botones de acción
- Visible solo si está en modo demo

## ⚙️ Configuración

### Variables de Entorno (No requeridas para demo)
El modo demo funciona **sin variables de entorno**. No necesita:
- Claves API de OpenAI (para IA)
- Credenciales de Supabase
- Configuración de email

### Storage Key
La clave de almacenamiento es: `baseweb_demo_mode`

Puedes cambiarla en `src/lib/demoData.ts`:
```typescript
export const DEMO_STORAGE_KEY = 'baseweb_demo_mode';
```

## 🚀 Deployment

El modo demo funciona **automáticamente** en:
- ✅ Desarrollo local (`npm run dev`)
- ✅ Build estático (`npm run build`)
- ✅ Producción (cualquier servidor)

No requiere compilación especial ni variables de entorno.

## 📊 Datos de Demostración Realistas

### Citas Realistas
- Horarios en intervalos de 30-60 minutos
- Duraciones variables según servicio
- Precios entre $200-$600 (pesos)
- Mix de estatus: Completada, Activa, etc.

### Personal Realista
- Nombres españoles/hispanohablantes
- Roles variados: Barbero, Estilista, Recepcionista
- Distribuidos entre sucursales

### Inventario Realista
- Productos típicos de barbería/salón
- Stock variado (desde 1 hasta 24 unidades)
- Algunos items críticos (< 5 unidades)

### Sucursales
- Nombres descriptivos (Centro, Norte)
- Distribución de personal coherente

## 🔐 Consideraciones de Seguridad

- ✅ No accesa datos reales de producción
- ✅ Funciona 100% con datos locales (no hace requests a API)
- ✅ No requiere credenciales
- ✅ Seguro de mostrar a clientes/visitantes

## 🐛 Troubleshooting

### "El modo demo no funciona"
1. Verifica que `isDemoMode()` retorna `true`
2. Comprueba que localStorage está habilitado
3. Limpia cache del navegador y recarga

### "Los datos demo no aparecen"
1. Verifica la consola del navegador (F12)
2. Comprueba que `loadDashboardData()` entra en rama de demo
3. Abre DevTools → Application → LocalStorage y busca `baseweb_demo_mode`

### "El botón de demostración no funciona"
1. Verifica que `handleDemoMode()` se ejecuta
2. Comprueba que no hay error en la consola
3. Intenta en otro navegador

## 📝 Próximas Mejoras Posibles

- [ ] Más variedad en datos demo (más citas, productos)
- [ ] Simulación de cambios en tiempo real
- [ ] Diferentes perfiles de demo (admin, personal, recepcionista)
- [ ] Datos demo con información de empresa personalizable
- [ ] Tours guiados en modo demo

## 📞 Contacto

Para preguntas sobre el modo demo: soymikevazquez@gmail.com
