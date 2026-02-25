# Warmane Character Scraper API

API REST que obtiene el equipamiento de personajes de World of Warcraft
del servidor **Warmane Icecrown**, haciendo scraping del armory oficial
mediante un navegador headless (Puppeteer).

---

## ¿Cómo funciona?

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Estado de la API y tamaño del caché |
| GET | `/api/:character` | Equipamiento del personaje indicado |

### Flujo de una petición

1. Se recibe `GET /api/:character`.
2. Se busca el personaje en el **caché en memoria** (TTL: 5 minutos, máx. 50 entradas).
3. Si hay caché válido → se devuelve directamente.
4. Si no → se lanza un navegador Chromium headless con Puppeteer, se navega a
   `https://armory.warmane.com/character/{character}/Icecrown/summary`
   y se extraen los elementos de equipo del DOM (`.item-left`, `.item-right`, `.item-bottom`).
5. El resultado se guarda en caché y se devuelve como JSON.

### Respuesta de ejemplo

```json
{
  "left": [ { "href": "...", "rel": "...", "src": "...", "alt": "..." } ],
  "right": [ ... ],
  "bottom": [ ... ],
  "scrapedAt": "2026-02-25T10:00:00.000Z"
}
```

---

## Requisitos

- Node.js >= 18.0.0
- Las dependencias se instalan con `npm install`:
  - `express` ^5.1.0
  - `puppeteer` ^24.22.0

---

## Instalación y uso local

```bash
git clone https://github.com/cterryc/scraping.git
cd scraping
npm install
npm run dev      # desarrollo (hot-reload)
npm start        # producción
```

La API escucha en el puerto definido por la variable de entorno `PORT` (por defecto `3000`).

---

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |

---

## Despliegue

El proyecto está optimizado para plataformas serverless con recursos limitados
(Railway, Vercel). Los flags de Chromium reducen el uso de memoria a ~256 MB de heap.

---

## ¿Cómo adaptarlo a otro proyecto?

### 1. Cambiar el sitio objetivo

En `index.js`, modifica la URL de destino:

```js
// línea 29 — cambia esto por la URL del sitio que quieres scrapear
const urlCharacter = `https://armory.warmane.com/character/${character}/Icecrown/summary`
```

### 2. Cambiar los selectores CSS

La extracción de datos usa selectores específicos del armory de Warmane.
Reemplázalos por los del sitio que necesites:

```js
// líneas 107-109
const left   = document.querySelectorAll('.item-left div div a')
const right  = document.querySelectorAll('.item-right div div a')
const bottom = document.querySelectorAll('.item-bottom div div a')
```

### 3. Cambiar el parámetro de ruta

Si tu entidad no es un "personaje", renombra el parámetro:

```js
// línea 27
app.get('/api/:character', ...)
// → por ejemplo:
app.get('/api/:product', ...)
```

### 4. Ajustar el selector de espera

Cambia el selector que Puppeteer espera antes de extraer datos:

```js
// línea 99
await page.waitForSelector('.item-left div div a', { timeout: 15000 })
```

### 5. Ajustar la detección de anti-bot

Si el nuevo sitio usa Cloudflare u otro sistema, adapta la detección:

```js
// líneas 96-98
if (titleText.includes('Verificar que usted es un ser humano')) {
  throw new Error('Cloudflare challenge detected');
}
```

### 6. Ajustar el caché

- TTL: modifica `CACHE_DURATION` (línea 6, actualmente 5 minutos).
- Tamaño máximo: modifica el límite de 50 entradas (línea 145).
