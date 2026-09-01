const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.createContext();
  
  // Listen to console messages
  const messages = [];
  context.on('page', page => {
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
      messages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      console.log(`[ERROR] ${err.message}`);
      console.log(err.stack);
      messages.push({ type: 'error', text: err.message, stack: err.stack });
    });
  });

  const page = await context.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
    messages.push({ type: msg.type(), text: msg.text() });
  });
  
  page.on('pageerror', err => {
    console.log(`[PAGE_ERROR] ${err.message}`);
    console.log(err.stack);
    messages.push({ type: 'pageerror', text: err.message, stack: err.stack });
  });

  try {
    console.log('Navigating to http://localhost:5174/...');
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 10000 });
    console.log('Page loaded successfully');
  } catch (err) {
    console.log(`[NAVIGATION_ERROR] ${err.message}`);
  }

  // Wait a bit to see errors
  await page.waitForTimeout(3000);
  
  console.log('\n=== Messages captured ===');
  console.log(JSON.stringify(messages, null, 2));
  
  await browser.close();
})();
