# 📦 Guía de Deployment - Sitio Estático

## Resumen

Esta aplicación está configurada como **web estática** (Static Site Generation) usando Next.js 16 con `output: export`. Todos los archivos están pre-compilados en la carpeta `out/`.

## 📊 Estadísticas de Build

- **Tamaño total original:** 4.1MB
- **Tamaño comprimido (gzip):** 0.39MB
- **Reducción:** 74.1%
- **Archivos estáticos:** 19 páginas HTML + assets
- **Rutas dinámicas:** API routes (ask-ai, send-ticket) están excluidas del build estático

## 🚀 Build del Proyecto

### Generar el build estático:
```bash
npm run build
```

Esto genera la carpeta `out/` con todos los archivos optimizados.

### Optimizar archivos comprimidos (gzip):
```bash
node scripts/optimize-static-build.js
```

Genera archivos `.gz` para que el servidor web los sirva con mejor compresión.

## 📁 Estructura de la Carpeta `out/`

```
out/
├── index.html                    # Página de inicio (redirige a /login)
├── login/index.html             # Página de login con botón "Ver Demostración"
├── dashboard/
│   ├── index.html               # Dashboard principal
│   ├── clientes/index.html
│   ├── productos/index.html
│   ├── finanzas/index.html
│   ├── ... (más rutas)
├── _next/
│   ├── static/
│   │   ├── chunks/              # JavaScript y CSS compilados
│   │   └── *.*.js/css           # Assets versionados
├── public/                       # Imágenes estáticas
│   ├── para-fondo-blanco.gif
│   ├── para-fondo-negro.gif
├── favicon.ico
└── .htaccess                    # Configuración Apache (opcional)
```

## 🌐 Opciones de Deployment

### Opción 1: Apache (con .htaccess)

1. Copia el contenido de la carpeta `out/` a tu servidor Apache
2. Asegúrate de que `mod_rewrite` esté habilitado
3. El archivo `.htaccess` incluido maneja:
   - Reescritura de URLs (trailing slashes)
   - GZIP compression
   - Cache headers optimizados

```bash
# Copiar archivos
scp -r out/* user@server:/var/www/html/baseweb/
```

### Opción 2: Nginx

Crea una configuración similar a esta:

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/html/baseweb/out;

    # Habilitar gzip
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;

    # Cache para assets versionados
    location ~* ^/_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cachear HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Reescribir URLs (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Opción 3: Vercel (Recomendado)

```bash
npm install -g vercel
vercel --prod
```

Vercel detectará automáticamente que es un proyecto Next.js estático.

### Opción 4: Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=out
```

O conecta tu repo de Git y Netlify deployará automáticamente en cada push.

### Opción 5: GitHub Pages

Requiere algunas configuraciones adicionales, pero puedes servir la carpeta `out/` desde GitHub Pages.

## 🔧 Modo Demostración

### Acceder al modo demo:

1. Ve a `/login`
2. Haz clic en el botón **"📊 Ver Demostración"**
3. Se abre automáticamente con datos de ejemplo sin necesidad de autenticación

### Datos de Demo:

- **Citas:** 15+ citas de ejemplo con datos realistas
- **Personal:** 5 miembros del equipo
- **Productos:** 10 productos con inventario
- **Sucursales:** 2 sucursales de demostración
- **Usuarios:** Usuarios de ejemplo con diferentes roles

### Salir del modo demo:

Haz scroll al final del dashboard y presiona el botón **"← Salir de Demostración"** para volver al login.

## 🔐 Rutas Protegidas

Las rutas dinámicas (API) están excluidas del build estático:

- `/api/ask-ai` - IA Assistant (requiere servidor runtime)
- `/api/send-ticket` - Envío de tickets (requiere servidor runtime)

Para usar estas funciones en producción, necesitarás un servidor Node.js además del sitio estático.

## 📈 Optimizaciones Aplicadas

1. **Compresión gzip:** 74.1% de reducción de tamaño
2. **CSS/JS minificado:** Next.js lo hace automáticamente
3. **Imágenes optimizadas:** `unoptimized: true` para export estático
4. **Cache headers:** Archivos versionados cacheados por 1 año
5. **HTML no cacheado:** Control de actualizaciones

## 🐛 Troubleshooting

### "Blank page al visitar el sitio"
- Verifica que el servidor esté sirviendo `index.html` por defecto
- Asegúrate de que las URLs reescritas funcionen correctamente

### "Los estilos CSS no se cargan"
- Verifica que MIME types estén configurados: `text/css` para `.css`
- Comprueba que los assets en `_next/static/` se sirven correctamente

### "Modo demo no funciona"
- Limpia el localStorage del navegador y recarga
- Verifica que `localStorage` esté habilitado en el navegador

## 📝 Archivo .htaccess

Incluye configuraciones para:
- GZIP compression
- Cache headers por tipo de archivo
- Reescritura de URLs (SPA routing)
- MIME types correctos

## 🚀 Checklist de Deployment

- [ ] Ejecutar `npm run build`
- [ ] Ejecutar `node scripts/optimize-static-build.js`
- [ ] Verificar que la carpeta `out/` tiene todos los archivos
- [ ] Copiar `out/` al servidor web
- [ ] Configurar GZIP compression en el servidor
- [ ] Configurar cache headers
- [ ] Reescribir URLs (SPA routing)
- [ ] Probar login normal
- [ ] Probar modo demostración
- [ ] Probar en diferentes navegadores

## 📞 Soporte

Para reportar problemas o sugerencias, contacta a: soymikevazquez@gmail.com
