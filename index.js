require('dotenv').config()
const app = require('express')()
const axios = require('axios')
const cheerio = require('cheerio')

const cache = new Map()
const CACHE_DURATION = 15 * 60 * 1000
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN
const SCRAPEDO_TOKEN_TWO = process.env.SCRAPEDO_TOKEN_TWO
const SCRAPEDO_TOKEN_THREE = process.env.SCRAPEDO_TOKEN_THREE

const SCRAPEDO_TOKENS = [
  SCRAPEDO_TOKEN,
  SCRAPEDO_TOKEN_TWO,
  SCRAPEDO_TOKEN_THREE
].filter(Boolean)

function getRandomScrapeDoToken(excludeToken = null) {
  const available = excludeToken
    ? SCRAPEDO_TOKENS.filter(t => t !== excludeToken)
    : SCRAPEDO_TOKENS
  const selected = available[Math.floor(Math.random() * available.length)]
  console.log(`Using ScrapeDo token: ...${selected.slice(-8)}`)
  return selected
}

const SLOT_CATEGORIES = {
  left: ['Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Shirt', 'Tabard', 'Wrist'],
  right: ['Hands', 'Waist', 'Legs', 'Feet', 'Finger', 'Trinket'],
  bottom: {
    mainHand: ['Swords', 'Axes', 'Maces', 'Daggers', 'Fist Weapons', 'Two-Handed Swords', 'Two-Handed Axes', 'Two-Handed Maces', 'Polearms', 'Staves'],
    offHand: ['Warglaives', 'Shields', 'Off-hand'],
    ranged: ['Bows', 'Crossbows', 'Guns', 'Wands', 'Idols', 'Librams', 'Totems', 'Sigils']
  }
}

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

async function getItemType(itemId) {
  try {
    const response = await axios.get(`https://wotlk.cavernoftime.com/item=${itemId}&power=true`)
    const html = response.data

    const iconMatch = html.match(/icon:\s*['"]([^'"]+)['"]/)
    const icon = iconMatch ? iconMatch[1] : ''

    const itemTypes = [
      'Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Shirt', 'Tabard', 'Wrist',
      'Hands', 'Waist', 'Legs', 'Feet', 'Finger', 'Trinket',
      'Swords', 'Axes', 'Maces', 'Daggers', 'Fist Weapons',
      'Two-Handed Swords', 'Two-Handed Axes', 'Two-Handed Maces', 'Polearms', 'Staves',
      'Warglaives', 'Shields', 'Off-hand',
      'Bows', 'Crossbows', 'Guns', 'Wands', 'Idols', 'Librams', 'Totems', 'Sigils'
    ]

    let itemType = ''
    for (const type of itemTypes) {
      if (html.includes(`>${type}<`)) {
        itemType = type
        break
      }
    }

    return { icon, itemType }
  } catch (err) {
    console.error(`Error fetching item type for ${itemId}:`, err.message)
    return { icon: '', itemType: '' }
  }
}

function classifyItem(itemType) {
  if (SLOT_CATEGORIES.left.includes(itemType)) {
    return 'left'
  }
  if (SLOT_CATEGORIES.right.includes(itemType)) {
    return 'right'
  }
  if (SLOT_CATEGORIES.bottom.mainHand.includes(itemType)) {
    return 'bottom'
  }
  if (SLOT_CATEGORIES.bottom.offHand.includes(itemType)) {
    return 'bottom'
  }
  if (SLOT_CATEGORIES.bottom.ranged.includes(itemType)) {
    return 'bottom'
  }
  return null
}

function buildItemObject(item, icon) {
  const iconUrl = icon ? `http://cdn.warmane.com/wotlk/icons/large/${icon}.jpg` : ''

  return {
    target: '_blank',
    href: `http://wotlk.cavernoftime.com/item=${item.item}`,
    rel: `item=${item.item}`,
    src: iconUrl,
    width: '50',
    height: '50'
  }
}

function createEmptySlot() {
  return {
    target: '_blank',
    href: '#self'
  }
}

async function fetchFromWarmaneAPI(character) {
  const url = `https://armory.warmane.com/api/character/${character}/Icecrown/summary`
  const response = await axios.get(url, { timeout: 10000 })
  return response.data
}

async function scrapeFromWeb(character) {
  const urlCharacter = `https://armory.warmane.com/character/${character}/Icecrown/summary`
  const targetUrl = encodeURIComponent(urlCharacter)
  const waitSelector = encodeURIComponent('.item-left div div a')

  let lastError = null
  let usedToken = null

  for (let attempt = 0; attempt < SCRAPEDO_TOKENS.length; attempt++) {
    usedToken = getRandomScrapeDoToken(usedToken)
    const scrapedoUrl = `https://api.scrape.do/?token=${usedToken}&url=${targetUrl}&render=true&super=true&waitSelector=${waitSelector}`

    try {
      const response = await axios.get(scrapedoUrl, { timeout: 30000 })
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

      return {
        left: extractElementsAttributes('.item-left div div a'),
        right: extractElementsAttributes('.item-right div div a'),
        bottom: extractElementsAttributes('.item-bottom div div a'),
        scrapedAt: new Date().toISOString()
      }
    } catch (err) {
      lastError = err
      console.error(`Token ...${usedToken.slice(-8)} failed (${err.response?.status || err.message}), trying another...`)
    }
  }

  throw new Error(`All ScrapeDo tokens exhausted: ${lastError?.message}`)
}

async function getCharacterData(character) {
  try {
    const apiData = await fetchFromWarmaneAPI(character)

    if (!apiData.equipment || !Array.isArray(apiData.equipment)) {
      throw new Error('Invalid API response - no equipment array')
    }

    const itemTypes = {}
    for (const item of apiData.equipment) {
      const result = await getItemType(item.item)
      itemTypes[item.item] = result
    }

    const leftSlots = []
    const rightSlots = []
    const bottomSlots = []

    const slotOrder = {
      left: ['Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Shirt', 'Tabard', 'Wrist'],
      right: ['Hands', 'Waist', 'Legs', 'Feet', 'Finger', 'Finger', 'Trinket', 'Trinket'],
      bottom: ['mainHand', 'offHand', 'ranged']
    }

    for (const item of apiData.equipment) {
      const typeInfo = itemTypes[item.item]
      const section = classifyItem(typeInfo.itemType)

      if (section === 'left') {
        const slotIndex = slotOrder.left.indexOf(typeInfo.itemType)
        if (slotIndex !== -1) {
          leftSlots[slotIndex] = buildItemObject(item, typeInfo.icon)
        }
      } else if (section === 'right') {
        if (typeInfo.itemType === 'Finger') {
          const idx = rightSlots[4] && rightSlots[5] ? 5 : 4
          rightSlots[idx] = buildItemObject(item, typeInfo.icon)
        } else if (typeInfo.itemType === 'Trinket') {
          const idx = rightSlots[6] && rightSlots[7] ? 7 : 6
          rightSlots[idx] = buildItemObject(item, typeInfo.icon)
        } else {
          const slotIndex = slotOrder.right.indexOf(typeInfo.itemType)
          if (slotIndex !== -1) {
            rightSlots[slotIndex] = buildItemObject(item, typeInfo.icon)
          }
        }
      } else if (section === 'bottom') {
        if (SLOT_CATEGORIES.bottom.mainHand.includes(typeInfo.itemType)) {
          bottomSlots[0] = buildItemObject(item, typeInfo.icon)
        } else if (SLOT_CATEGORIES.bottom.offHand.includes(typeInfo.itemType)) {
          bottomSlots[1] = buildItemObject(item, typeInfo.icon)
        } else if (SLOT_CATEGORIES.bottom.ranged.includes(typeInfo.itemType)) {
          bottomSlots[2] = buildItemObject(item, typeInfo.icon)
        }
      }
    }

    while (leftSlots.length < 8) {
      const emptyIndex = leftSlots.findIndex((s) => !s)
      if (emptyIndex !== -1) leftSlots[emptyIndex] = createEmptySlot()
      else break
    }

    while (rightSlots.length < 8) {
      const emptyIndex = rightSlots.findIndex((s) => !s)
      if (emptyIndex !== -1) rightSlots[emptyIndex] = createEmptySlot()
      else break
    }

    while (bottomSlots.length < 3) {
      const emptyIndex = bottomSlots.findIndex((s) => !s)
      if (emptyIndex !== -1) bottomSlots[emptyIndex] = createEmptySlot()
      else break
    }

    return {
      left: leftSlots.slice(0, 8),
      right: rightSlots.slice(0, 8),
      bottom: bottomSlots.slice(0, 3),
      scrapedAt: new Date().toISOString()
    }
  } catch (err) {
    console.error('API failed, falling back to scraping:', err.message)
    return await scrapeFromWeb(character)
  }
}

app.get('/api/:character', async (req, res) => {
  const { character } = req.params

  const cacheKey = character.toLowerCase()
  const cachedData = cache.get(cacheKey)

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log(`Cache hit for ${character}`)
    return res.status(200).send(cachedData.data)
  }

  try {
    console.log(`Fetching data for ${character}`)
    const startTime = Date.now()

    const data = await getCharacterData(character)

    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })

    if (cache.size > 50) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }

    const duration = Date.now() - startTime
    console.log(`Successfully fetched ${character} in ${duration}ms`)
    res.status(200).send(data)
  } catch (err) {
    console.error('Error al resolver page:', err.message)
    res.status(500).send({ error: 'Error interno del servidor' })
  }
})

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key)
    }
  }
}, 60000)

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