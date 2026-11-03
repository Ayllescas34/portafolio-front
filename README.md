# Frontend — Angular

Sitio público, hoja de vida imprimible y panel `/admin`. Ver el [README principal](../README.md)
y el [manual](../docs/MANUAL.md).

| Script | Uso |
|---|---|
| `npm start` | http://localhost:4200 (proxy de `/api` hacia http://localhost:3000) |
| `npm test -- --watch=false` | Pruebas unitarias (Chrome sin interfaz) |
| `npm run e2e` | Pruebas end-to-end con Playwright (levanta API :3100 y sitio :4300) |
| `npm run lint` / `npm run build` | Calidad / compilación de producción |
