const app = require("express")();

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get("/", async (req, res) => {
  res.status(200).send({ message: "ok" });
});

app.get("/api/:character", async (req, res) => {
  const { character } = req.params;
  const urlCharacter = `https://armory.warmane.com/character/${character}/Icecrown/summary`;
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    let browser = await puppeteer.launch(options);

    let page = await browser.newPage();
    await page.goto(urlCharacter, { timeout: 18000 });
    await page.waitForSelector(".item-left div div a", { timeout: 18000 });
    const elementos = await page.evaluate(() => {
      const left = document.querySelectorAll(".item-left div div a");
      const right = document.querySelectorAll(".item-right div div a");
      const bottom = document.querySelectorAll(".item-bottom div div a");

      // Función para extraer atributos de un nodo
      const extractAttributes = (node) => {
        const attrs = {};
        for (const attr of node.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      };

      // Extrae atributos de <a> y <img> (si existe) en los elementos
      const extractElementsAttributes = (elements) => {
        return Array.from(elements).map((ele) => {
          const aAttributes = extractAttributes(ele);
          const imgElement = ele.querySelector("img");
          const imgAttributes = imgElement
            ? extractAttributes(imgElement)
            : null;

          return { ...aAttributes, ...imgAttributes };
        });
      };

      const leftAttributes = extractElementsAttributes(left);
      const rightAttributes = extractElementsAttributes(right);
      const bottomAttributes = extractElementsAttributes(bottom);

      return {
        left: leftAttributes,
        right: rightAttributes,
        bottom: bottomAttributes,
      };
    });

    console.log("Scrap here");
    res.status(200).send(elementos);
  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
