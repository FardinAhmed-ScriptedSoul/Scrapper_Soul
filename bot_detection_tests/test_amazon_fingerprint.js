const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log("🚀 Initializing Amazon Anti-Bot Profile Judge...");
  
//   // Launch the browser exactly like your local Python script profile (headless: false)
//   const browser = await chromium.launch({ headless: false });

// Launch the browser with the exact same automation override flags as your Python script
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled' // 👈 ADD THIS LINE HERE!
    ]
  });
  
  // Emulate your exact Python script's browser context configurations
  const context = await browser.newContext({
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  // Navigate to an Amazon-specific security check evaluator to observe detection traits
  console.log("🌐 Routing profile through verification engines...");
  await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle' });

  // Let the lazy loaded layout elements populate
  await page.waitForTimeout(2000);

  // Evaluate the environment from inside the page window to extract the verdict
  const auditReport = await page.evaluate(() => {
    return {
      webdriverPassed: navigator.webdriver === false || navigator.webdriver === undefined,
      webdriverValue: navigator.webdriver,
      chromeObjectExists: !!window.chrome,
      pluginsPopulated: navigator.plugins.length > 0,
      pluginsCount: navigator.plugins.length,
      languagesValid: navigator.languages && navigator.languages.length > 0
    };
  });

  // Print a definitive evaluation directly to your console terminal
  console.log("\n" + "=" * 50);
  console.log("📊 LOCAL SCRIPT FINGERPRINT VERDICT:");
  console.log("=" * 50);
  
  if (auditReport.webdriverPassed) {
    console.log("✅ WebDriver Check: Hidden successfully!");
  } else {
    console.log(`❌ WebDriver Check: FAILED (Value leaked as "${auditReport.webdriverValue}")`);
  }

  if (auditReport.chromeObjectExists) {
    console.log("✅ Chrome Object Runtime: Verified (Matches normal desktop browser behavior)");
  } else {
    console.log("❌ Chrome Object Runtime: MISSING (Flags code engine context instantly)");
  }

  if (auditReport.pluginsPopulated) {
    console.log(`✅ Plugins Array: Spoofed successfully (${auditReport.pluginsCount} items)`);
  } else {
    console.log("❌ Plugins Array: EMPTY (Vanilla automation footprint exposed)");
  }
  
  console.log("=" * 50);

  // Take a full page capture metric snapshot
  await page.pdf({
    path: 'AmazonLocalProfileVerdict.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  console.log('📝 Complete diagnostic breakdown compiled into AmazonLocalProfileVerdict.pdf');
  await browser.close();
})();