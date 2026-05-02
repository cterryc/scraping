#Scrapedo

## Example to Scrap

```javascript
const axios = require('axios')
const token = 'YOUR_TOKEN'
const targetUrl = encodeURIComponent('https://httpbin.co/anything')
const config = {
  method: 'GET',
  url: `https://api.scrape.do/?token=${token}&url=${targetUrl}`,
  headers: {}
}
axios(config)
  .then(function (response) {
    console.log(response.data)
  })
  .catch(function (error) {
    console.log(error)
  })
```
