# Portafolio profesional: sitio web

[![CI](https://github.com/Ayllescas34/portafolio-front/actions/workflows/ci.yml/badge.svg)](https://github.com/Ayllescas34/portafolio-front/actions/workflows/ci.yml)

Sitio público, hoja de vida imprimible y panel administrativo del portafolio de Alejandro Flores
Yllescas.

La API, la base de datos y la documentación técnica están en
[portafolio-backend](https://github.com/Ayllescas34/portafolio-backend).

> **Estado:** publicado en https://d2nzry7t82pbvf.cloudfront.net

## Stack

| Área | Tecnología |
|---|---|
| Aplicación | Angular 20 (componentes standalone y signals), TypeScript, SCSS |
| 3D | Three.js con carga diferida, pausa fuera de pantalla, respeto de `prefers-reduced-motion` y alternativa SVG sin WebGL |
| Panel | Recursos declarativos sobre páginas genéricas de listado y formulario |
| Pruebas | Jasmine y Karma, Playwright (E2E) |

## Estructura

```
├── src/app/core/     servicios, modelos, tema, SEO y textos
├── src/app/shared/   componentes reutilizables
├── src/app/public/   sitio público y hoja de vida
├── src/app/admin/    panel administrativo
└── e2e/              pruebas end-to-end y herramientas de captura
```

## Instalación

Requisitos: Node.js 22, npm 10 y Google Chrome (para las pruebas).

Clona este repositorio junto a la API, en la misma carpeta:

```
portafolio/
├── backend/    portafolio-backend
└── frontend/   portafolio-front
```

```bash
npm install
```

Sigue la [guía de la API](https://github.com/Ayllescas34/portafolio-backend#instalación) para dejarla
funcionando en http://localhost:3000.

## Comandos

| Comando | Uso |
|---|---|
| `npm start` | Sitio en http://localhost:4200 y panel en http://localhost:4200/admin |
| `npm run test:ci` | Pruebas unitarias en Chrome sin interfaz |
| `npm run e2e` | Pruebas E2E: levantan su propia API (3100) y su propio sitio (4300) |
| `npm run lint` | Calidad de código |
| `npm run build` | Compilación de producción |

`ng serve` redirige `/api` y `/uploads` hacia la API (`proxy.conf.json`), así que el navegador solo
habla con un origen.

Las pruebas E2E buscan la API en `../backend`. Si está en otra carpeta, indícala en `BACKEND_DIR`.
Incluyen una revisión de accesibilidad con axe sobre el sitio y el panel, en ambos temas.

## Publicación

`deploy/publish.sh` compila el sitio y lo publica en S3 y CloudFront. La guía completa está en la
[documentación de despliegue](https://github.com/Ayllescas34/portafolio-backend/blob/main/docs/despliegue.md).

La política de seguridad de producción bloquea los scripts en línea: el código que debe correr antes
de Angular va en `public/boot.js`.

## Flujo de trabajo

- `main` siempre debe estar estable.
- Cada cambio se trabaja en una rama `feat/...` o `fix/...` y entra por pull request.
- La integración continua ejecuta lint, pruebas unitarias, compilación y pruebas E2E en cada push a
  `main` y en cada pull request.
