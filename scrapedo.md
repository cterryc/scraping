#Scrapedo

## Example to Scrap

```javascript
const axios = require('axios')
const fs = require('fs')

// Tu token de Scrape.do
const token = '<tu-token-aqui>' // Reemplaza con tu token de Scrape.do

// URL objetivo
const targetUrl = encodeURIComponent(
  'https://scrapingtest.com/cloudflare-challenge'
)

// Configuración de la solicitud
const config = {
  method: 'GET',
  url: `https://api.scrape.do/?token=${token}&url=${targetUrl}&render=true&keep_headers=true`,
  headers: {
    // Puedes agregar encabezados personalizados si es necesario
  }
}

// Función para guardar cookies en un archivo
function saveCookies(response) {
  const cookies = response.headers['set-cookie']
  if (cookies) {
    fs.writeFileSync('cookies.txt', cookies.join('; '), 'utf8')
    console.log('Cookies guardadas en cookies.txt')
  } else {
    console.log('No se encontraron cookies en la respuesta.')
  }
}

// Realizar la solicitud
axios(config)
  .then(function (response) {
    console.log('Código de estado:', response.status)
    console.log('Contenido de la página:', response.data)

    // Guardar cookies
    saveCookies(response)
  })
  .catch(function (error) {
    console.error('Error al realizar la solicitud:', error.message)
  })
```

Explicación:
Evitar bloqueo de Cloudflare: Se utiliza el parámetro render=true en la URL de la API de Scrape.do para habilitar el renderizado de JavaScript, lo que permite superar los desafíos de Cloudflare.
Guardado de cookies: Se extraen las cookies de la respuesta HTTP (response.headers['set-cookie']) y se guardan en un archivo llamado cookies.txt.

Notas:
- Asegúrate de reemplazar <tu-token-aqui> con tu token de API de Scrape.do.
- El archivo cookies.txt se generará en el mismo directorio donde se ejecuta el script.
- Si necesitas enviar cookies en solicitudes posteriores, puedes leerlas desde el archivo cookies.txt y agregarlas al encabezado Cookie en la configuración de la solicitud.

Si necesitas más ayuda, no dudes en preguntar. 😊