const { chromium } = require('playwright');

(async () => {

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://bot.sannysoft.com/');
  
    await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  await page.pdf({
    path: 'StandardPlaywright.pdf',
    format: 'A4',
    printBackground: true, // Captures colors and CSS
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });
  console.log(await page.title());
  console.log('PDF saved as StandardPlaywright.pdf');

  await browser.close();
})();