require('dotenv').config()
const app = require('express')()
const axios = require('axios')
const cheerio = require('cheerio')

// Cache simple para evitar scrappings repetidos
const cache = new Map()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutos
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN

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

  try {
    console.log(`Starting scrape for ${character}`)
    const startTime = Date.now()
    
    const targetUrl = encodeURIComponent(urlCharacter)
    const waitSelector = encodeURIComponent('.item-left div div a')
    const scrapedoUrl = `https://api.scrape.do/?token=${SCRAPEDO_TOKEN}&url=${targetUrl}&render=true&super=true&waitSelector=${waitSelector}`
    
    const response = await axios.get(scrapedoUrl)
    const html = response.data
    
    const $ = cheerio.load(html)
    
    const extractAttributes = (node) => {
      const attrs = {}
      for (const attr of node.attributes) {
        attrs[attr.name] = attr.value
      }
      return attrs
    }
    
    const extractElementsAttributes = (selector) => {
      const elements = []
      $(selector).each((i, ele) => {
        const aAttributes = extractAttributes(ele)
        const imgElement = $(ele).find('img')[0]
        const imgAttributes = imgElement ? extractAttributes(imgElement) : null
        elements.push({ ...aAttributes, ...imgAttributes })
      })
      return elements
    }
    
    const elementos = {
      left: extractElementsAttributes('.item-left div div a'),
      right: extractElementsAttributes('.item-right div div a'),
      bottom: extractElementsAttributes('.item-bottom div div a'),
      scrapedAt: new Date().toISOString()
    }

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

    const duration = Date.now() - startTime
    console.log(`Successfully scraped ${character} in ${duration}ms`)
    res.status(200).send(elementos)
  } catch (err) {
    console.error('Error al resolver page:', err.message)
    res.status(500).send({ error: 'Error interno del servidor' })
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
