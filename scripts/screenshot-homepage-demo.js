const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Lancement de Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 2400, height: 1600 },
    deviceScaleFactor: 2, // Retina
  });
  const page = await context.newPage();

  console.log('Ouverture de la page de démonstration...');
  // Adjust URL if needed (port 3000 is default for Next.js)
  await page.goto('http://localhost:3000/home-showcase', { waitUntil: 'networkidle' });

  console.log('Attente des animations (1s)...');
  await page.waitForTimeout(1000);

  const outputPath = path.join(__dirname, '..', 'homepage-hero.png');
  console.log('Génération de la capture d\'écran...');
  await page.screenshot({ path: outputPath, fullPage: false });

  console.log('Capture d\'écran générée avec succès à :', outputPath);

  await browser.close();
})();
