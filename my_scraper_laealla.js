const puppeteer = require('puppeteer');
const fs = require('fs'); // Import file system module

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Target URL (SMBC)
  const baseUrl = "https://www.smbc-comics.com/";  
  const startingUrl = "https://www.smbc-comics.com/comic/algorithm"; 

  // Mitu koomiksit skräppib ühe runniga
  const maxComics = 8;

  // kaust, kuhu allaletud koomiksid lähevad
  const downloadFolder = './koomiksid';

  async function scrapeCurrentPage(url) {
    await page.goto(url);

    //selle id järgi leiab lehelt üles.
    await page.waitForSelector("#cc-comicbody", {
      timeout: 40000
    }); // Increased timeout to 40 seconds


    console.log("Content loaded for:", url);
    const comicsData = await page.evaluate(async () => {
      const comics = document.querySelectorAll("#cc-comicbody img");
      const comicData = [];
      for (const comic of comics) {
        const imageUrl = comic.src;
        comicData.push({
          imageUrl
        });
      }
      return comicData;
    });
    return comicsData;
  }

  async function downloadComic(imageUrl, filename) {
    const response = await page.goto(imageUrl); // Fetch the image

    if (response.ok()) {
      const buffer = await response.buffer(); // pilt buffrisse
      fs.writeFileSync(`${downloadFolder}/${filename}`, buffer); // Salvestab kausta
      console.log(`Downloaded comic: ${filename}`);
    } else {
      console.error(`Failed to download image: ${imageUrl}`);
    }
  }

  async function scrapeMultiplePages(baseUrl, startingUrl, maxComics) {
    let currentPageUrl = startingUrl;
    const allComicData = [];
    let scrapedComics = 0; 

    while (currentPageUrl && scrapedComics < maxComics) {
      const pageData = await scrapeCurrentPage(currentPageUrl);
      allComicData.push(...pageData);
      scrapedComics += pageData.length;

      // Annab teada, mitu koomiksit skräptud.. Et näha kas asi töötab üldse.. Algselt oli probleeme, et üle 1 koomiksi ei õnnestunud skräppida
      console.log(`Scraped ${scrapedComics} comics so far`);

      const previousPageUrl = await getPreviousPageUrl(currentPageUrl, page);


      console.log("Attempting navigation to:", previousPageUrl);

      currentPageUrl = previousPageUrl;

      await page.goto(currentPageUrl);
    }

    // allalaadimine pärast skärppimist
    for (const comicData of allComicData) {
      const filename = comicData.imageUrl.split('/').pop();
      await downloadComic(comicData.imageUrl, filename);
    }

    return allComicData;
  }

  // Oli probleeme, et pärast esimese koomiksi skräppimist ei tahtnud leida järgmist koomiksiga lehte üles. Leidsin googlist abi.
  async function getPreviousPageUrl(currentPageUrl, page) {
    return await page.evaluate(async () => {
      const previousButton = document.querySelector(".cc-prev");
      if (previousButton) {
        const previousPageUrl = previousButton.href;
        return previousPageUrl;
      }
      return null;
    });
  }


  const allComics = await scrapeMultiplePages(baseUrl, startingUrl, maxComics);

  console.log(allComics);

  await browser.close();
})();