const app = require('express')()
const puppeteer = require('puppeteer')
const pLimit = require('p-limit')

// Control de concurrencia - máximo 2 scrapers simultáneos
const limit = pLimit(2)

// Cache para evitar scrappings repetidos
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Pool de browser reutilizable
let browserInstance = null
let browserStartTime = null
const BROWSER_RESTART_INTERVAL = 30 * 60 * 1000 // Reiniciar browser cada 30 minutos

// Función para obtener o crear browser
async function getBrowser() {
  try {
    // Reiniciar browser si es muy viejo o está desconectado
    if (
      !browserInstance ||
      !browserInstance.isConnected() ||
      (browserStartTime &&
        Date.now() - browserStartTime > BROWSER_RESTART_INTERVAL)
    ) {
      console.log('Iniciando nuevo browser...')

      // Cerrar browser anterior si existe
      if (browserInstance) {
        try {
          await browserInstance.close()
        } catch (err) {
          console.log('Error cerrando browser anterior:', err.message)
        }
      }

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
          '--memory-pressure-off',
          '--max_old_space_size=256',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-component-extensions-with-background-pages',
          '--disable-extensions',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-renderer-backgrounding'
        ],
        ignoreHTTPSErrors: true,
        timeout: 13000
      }

      browserInstance = await puppeteer.launch(options)
      browserStartTime = Date.now()
      console.log('Browser iniciado exitosamente')
    }

    return browserInstance
  } catch (error) {
    console.error('Error al obtener browser:', error.message)
    browserInstance = null
    browserStartTime = null
    throw error
  }
}

// Middlewares de CORS
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

// Timeout global para requests
app.use((req, res, next) => {
  req.setTimeout(35000) // 35 segundos (mayor que los 15s internos + buffer)
  next()
})

// Health check para Railway
app.get('/health', (req, res) => {
  const mem = process.memoryUsage()
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB'
    },
    cache: cache.size,
    browserActive: browserInstance ? browserInstance.isConnected() : false
  })
})

// Root endpoint
app.get('/', async (req, res) => {
  const mem = process.memoryUsage()
  res.status(200).send({
    message: 'Warmane Character Scraper API',
    usage: 'GET /api/{character}',
    endpoints: {
      scrape: '/api/{character}',
      health: '/health',
      clearCache: '/cache/clear'
    },
    stats: {
      cache: `${cache.size} characters cached`,
      memory: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      browserActive: browserInstance ? browserInstance.isConnected() : false
    }
  })
})

// Endpoint para limpiar cache manualmente
app.get('/cache/clear', (req, res) => {
  const oldSize = cache.size
  cache.clear()
  res.status(200).json({
    message: 'Cache cleared',
    removedEntries: oldSize
  })
})

// Endpoint principal de scraping
app.get('/api/:character', async (req, res) => {
  const startTime = Date.now()
  const { character } = req.params
  const urlCharacter = `https://armory.warmane.com/character/${character}/Icecrown/summary`

  console.log(`[REQUEST #${new Date().getTime()}] GET /api/${character}`)

  // Validar nombre del personaje
  if (!character || character.length < 2) {
    return res.status(400).send({ error: 'Nombre de personaje inválido' })
  }

  // Verificar cache primero
  const cacheKey = character.toLowerCase()
  const cachedData = cache.get(cacheKey)

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    const elapsed = Date.now() - startTime
    console.log(`✓ Cache hit for ${character} (${elapsed}ms)`)
    return res.status(200).send(cachedData.data)
  }

  // Control de concurrencia con p-limit
  try {
    const resultado = await limit(async () => {
      let page = null

      try {
        console.log(`→ Starting scrape for ${character}`)
        const browser = await getBrowser()
        page = await browser.newPage()

        // Reducir memoria bloqueando recursos innecesarios
        await page.setRequestInterception(true)
        page.on('request', (request) => {
          const resourceType = request.resourceType()
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            request.abort()
          } else {
            request.continue()
          }
        })

        // Configurar viewport pequeño
        await page.setViewport({ width: 800, height: 600 })
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36'
        )
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'es-ES,es;q=0.9',
          Referer: 'https://warmane.com/'
        })

        // Navegar a la página
        try {
          await page.goto(urlCharacter, {
            waitUntil: 'networkidle0',
            timeout: 13000
          })

          // Detectar Cloudflare challenge
          const isCloudflareChallenge = await page.$('title')
          if (isCloudflareChallenge) {
            const titleText = await page.evaluate(
              (el) => el.textContent,
              isCloudflareChallenge
            )
            if (titleText.includes('Verificar que usted es un ser humano')) {
              throw new Error('Cloudflare challenge detectado')
            }
          }

          await page.waitForSelector('.item-left div div a', { timeout: 13000 })
        } catch (error) {
          console.error(`✗ Error loading page for ${character}:`, error.message)
          throw new Error(`No se pudo cargar la página para ${character}`)
        }

        // Extraer datos
        const elementos = await page.evaluate(() => {
          // eslint-disable-next-line no-undef
          const left = document.querySelectorAll('.item-left div div a')
          // eslint-disable-next-line no-undef
          const right = document.querySelectorAll('.item-right div div a')
          // eslint-disable-next-line no-undef
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
          console.log(`Cache limpiado: eliminado ${firstKey}`)
        }

        console.log(`✓ Successfully scraped ${character}`)
        return elementos
      } finally {
        // IMPORTANTE: Cerrar solo la página, NO el browser
        if (page) {
          try {
            await page.close()
          } catch (err) {
            console.log('Error cerrando página:', err.message)
          }
        }
      }
    })

    const elapsed = Date.now() - startTime
    console.log(`✓ Completed scrape for ${character} in ${elapsed}ms`)
    res.status(200).send(resultado)
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(
      `✗ Error scraping ${character} after ${elapsed}ms:`,
      err.message
    )

    if (err.message.includes('Cloudflare')) {
      res.status(503).send({
        error:
          'Cloudflare bloqueó el acceso. Intenta nuevamente en unos segundos.'
      })
    } else if (err.message.includes('No se pudo cargar')) {
      res.status(404).send({
        error: `Personaje "${character}" no encontrado o no disponible`
      })
    } else {
      res.status(500).send({
        error: 'Error interno del servidor',
        detail: err.message
      })
    }
  }
})

// Limpiar cache periódicamente (cada minuto)
setInterval(() => {
  const now = Date.now()
  let cleaned = 0

  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`Cache cleanup: ${cleaned} entries removed`)
  }
}, 60000)

// Monitoreo de memoria (cada 5 minutos)
setInterval(
  () => {
    const mem = process.memoryUsage()
    console.log(
      `Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB heap, ${Math.round(mem.rss / 1024 / 1024)}MB RSS`
    )
  },
  5 * 60 * 1000
)

// Cleanup graceful al cerrar servidor
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor gracefully...`)

  try {
    if (browserInstance) {
      console.log('Cerrando browser...')
      await browserInstance.close()
    }
    console.log('Servidor cerrado exitosamente')
    process.exit(0)
  } catch (err) {
    console.error('Error durante shutdown:', err.message)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // No cerrar el proceso, solo loggear
})

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`🚀 Server started on port: ${port}`)
  console.log(
    `💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
  )
  console.log(`📦 Node version: ${process.version}`)
})

module.exports = app
