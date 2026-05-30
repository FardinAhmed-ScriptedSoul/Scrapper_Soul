
const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config(); // Loads environment variables from a .env file into process.env.


(async () => {
  const browser = await chromium.connectOverCDP(
    'wss://browser.evomi.com?key=' + process.env.API_KEY_BROWSER
  );

  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle' });

  // 1. "Prime" the page by scrolling to the bottom
  // This ensures all images/content are actually loaded before we print
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

  // 2. Generate the PDF
  // format: 'A4' creates standard pages automatically
  await page.pdf({
    path: 'EvomiBrowser.pdf',
    format: 'A4',
    printBackground: true, // Captures colors and CSS
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  console.log('PDF saved as EvomiBrowser.pdf');
  await browser.close();
})();

//Getting Setup
//npm init -y - initializes a new Node.js project with default settings, creating a package.json file
//npm install dotenv - for reading environment variables from a .env file
//install vscode-pdf extension for VSCode to view the PDF
//install playwright - npm init playwright@latest