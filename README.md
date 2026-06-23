# 📊 BASEWEB v0.2.0 - Dashboard Administrativo

Panel administrativo moderno para gestión de barbería/salón con **modo de demostración** y **export estático**.

## 🎯 Características Principales

### ✨ Modo Demostración
- **Botón dedicado** en la página de login: "📊 Ver Demostración"
- **Sin autenticación requerida** - acceso inmediato
- **Datos completamente realistas**:
  - 15+ citas de ejemplo
  - 5 miembros del personal
  - 10 productos en inventario
  - 2 sucursales
  - 12 usuarios con roles variados

### 📈 Dashboard Completo
- **Vista Financiera General** con desglose por mes
- **Cajas separadas** (Recepción vs Personal)
- **4 Métricas principales** (Ingresos, Citas, Personal, Inventario)
- **Gráfico de ingresos semanal** interactivo
- **Administración de secciones**:
  - Citas y Agenda
  - Personal activo
  - Inventario crítico
  - Clientes, Productos, Finanzas
  - Y más...

### 🌐 Web Estática Optimizada
- **Export estático** con Next.js 16
- **Compresión gzip**: 4.1MB → 0.39MB (74.1% de reducción)
- **19 páginas HTML** precompiladas
- **Listo para desplegar** en cualquier servidor

## 🚀 Quick Start

### Desarrollo Local
```bash
npm install
npm run dev
# Visita http://localhost:3000/login
# Haz clic en "📊 Ver Demostración"
```

### Build Estático
```bash
npm run build:prod
# Genera carpeta 'out/' con todo optimizado
```

## 📊 Datos de Demostración

### 👥 Personal (5 miembros)
- Miguel Vázquez - Barbero
- Sofía Ramírez - Estilista
- Diego Torres - Barbero
- Valentina López - Estilista
- Andrea Morales - Recepcionista

### 📦 Productos (10 items)
Productos realistas con stock variado, algunos críticos

### 🏪 Sucursales (2)
- Sucursal Centro
- Sucursal Norte

### 📅 Citas (15+)
Citas distribuidas hoy, últimos 6 días, y mes actual

## 🔧 Scripts

```bash
npm run dev              # Desarrollo
npm run build           # Build estático
npm run build:prod      # Build + compresión gzip
npm run optimize        # Compresión gzip
```

## 📦 Estadísticas

| Métrica | Valor |
|---------|-------|
| Build Time | 2.1s |
| Tamaño Original | 4.1MB |
| Tamaño Comprimido | 0.39MB |
| Compresión | 74.1% |
| Páginas | 19 |
| Archivos .gz | 63 |

## 🌐 Desplegar

### Vercel (Recomendado)
```bash
vercel --prod
```

### Apache
```bash
scp -r out/* user@server:/var/www/html/baseweb/
```

### Netlify
```bash
netlify deploy --prod --dir=out
```

## 📚 Documentación

- [DEMO_MODE.md](./DEMO_MODE.md) - Guía del modo demostración
- [DEPLOY.md](./DEPLOY.md) - Guía de despliegue
- [CHANGES.md](./CHANGES.md) - Resumen de cambios

## 🔐 Seguridad

✅ Modo demo seguro (no accesa datos reales)
✅ Web estática sin servidor dinámico
✅ Ideal para demostración a clientes

## 📞 Contacto

soymikevazquez@gmail.com

---

**Versión:** 0.2.0 | **Fecha:** 2026-06-23
