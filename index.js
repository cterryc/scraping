const app = require('express')()
const puppeteer = require('puppeteer')

// Cache simple para evitar scrappings repetidos
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning'
  )
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE')
  next()
})

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Warmane Character Scraper API',
    usage: 'GET /api/{character}',
    cache: `${cache.size} characters cached`
  })
})

app.get('/api/:character', async (req, res) => {
  const { character } = req.params
  const urlCharacter = `https://armory.warmane.com/character/${character}/Icecrown/summary`

  // Verificar cache primero
  const cacheKey = character.toLowerCase()
  const cachedData = cache.get(cacheKey)

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log(`Cache hit for ${character}`)
    return res.status(200).send(cachedData.data)
  }

  // Configuración optimizada para Railway gratuito
  const options = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--hide-scrollbars',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--memory-pressure-off', // Reducir presión de memoria
      '--max_old_space_size=256' // Limitar uso de heap
    ],
    ignoreHTTPSErrors: true,
    timeout: 30000
  }

  let browser
  try {
    console.log(`Starting scrape for ${character}`)
    browser = await puppeteer.launch(options)

    const page = await browser.newPage()

    // Reducir memoria bloqueando más recursos
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      const resourceType = request.resourceType()
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort()
      } else {
        request.continue()
      }
    })

    // Configurar viewport pequeño para ahorrar memoria
    await page.setViewport({ width: 800, height: 600 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9',
      'Referer': 'https://warmane.com/'
    });


    try {
      await page.goto(urlCharacter, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      const isCloudflareChallenge = await page.$('title');
      const titleText = await page.evaluate(el => el.textContent, isCloudflareChallenge);
      if (titleText.includes('Verificar que usted es un ser humano')) {
      throw new Error('Cloudflare challenge detected');
    }
      await page.waitForSelector('.item-left div div a', { timeout: 15000 })
    } catch (error) {
      console.log('error ==>',error)
      throw new Error(`No se pudo cargar la página para ${character}`)
    }

    try {
      const elementos = await page.evaluate(() => {
        const left = document.querySelectorAll('.item-left div div a')
        const right = document.querySelectorAll('.item-right div div a')
        const bottom = document.querySelectorAll('.item-bottom div div a')

        const extractAttributes = (node) => {
          const attrs = {}
          for (const attr of node.attributes) {
            attrs[attr.name] = attr.value
          }
          return attrs
        }

        const extractElementsAttributes = (elements) => {
          return Array.from(elements).map((ele) => {
            const aAttributes = extractAttributes(ele)
            const imgElement = ele.querySelector('img')
            const imgAttributes = imgElement
              ? extractAttributes(imgElement)
              : null
            return { ...aAttributes, ...imgAttributes }
          })
        }

        return {
          left: extractElementsAttributes(left),
          right: extractElementsAttributes(right),
          bottom: extractElementsAttributes(bottom),
          scrapedAt: new Date().toISOString()
        }
      })

      // Guardar en cache
      cache.set(cacheKey, {
        data: elementos,
        timestamp: Date.now()
      })

      // Limpiar cache si es muy grande (máximo 50 personajes)
      if (cache.size > 50) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
      }

      console.log(`Successfully scraped ${character}`)
      res.status(200).send(elementos)
    } catch (error) {
      console.error('Error al extraer elementos:', error.message)
      res
        .status(400)
        .send({ error: `Error al cargar elementos para ${character}` })
    }
  } catch (err) {
    console.error('Error al resolver page:', err.message)
    res.status(500).send({ error: 'Error interno del servidor' })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})

// Limpiar cache periódicamente
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key)
    }
  }
}, 60000) // Cada minuto

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`Server started on port: ${port}`)
  console.log(
    `Memory usage: ${Math.round(
      process.memoryUsage().heapUsed / 1024 / 1024
    )}MB`
  )
})

module.exports = app
