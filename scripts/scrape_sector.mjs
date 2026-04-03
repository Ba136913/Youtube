import { chromium } from 'playwright';
import fs from 'fs';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Sector Scope...');
  await page.goto('https://tradefinder.in/sector-scope', { waitUntil: 'networkidle' });

  // Wait for the data to load
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const sectors = [];
    const sectorElements = document.querySelectorAll('.sector-card, .sector-item, [class*="sector"]'); // Need to find the right selector

    // Let's try to find elements that look like sectors based on the user's description (IT, 5.92x, Adv/Dec)
    // Looking for text like "IT", "METAL", etc.
    const allDivs = [...document.querySelectorAll('div')];
    
    // This is a heuristic extraction since I don't have the exact DOM structure
    const sectorCards = allDivs.filter(d => 
        (d.innerText.includes('IT') || d.innerText.includes('METAL')) && 
        d.innerText.includes('x') && 
        d.innerText.includes('/')
    ).slice(0, 15);

    return sectorCards.map(c => ({
        text: c.innerText,
        html: c.innerHTML
    }));
  });

  fs.writeFileSync('sector_research.json', JSON.stringify(data, null, 2));
  console.log('Done.');
  await browser.close();
}

run();
