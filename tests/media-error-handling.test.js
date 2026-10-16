import { launch } from 'puppeteer';
import { expect } from 'chai';

const APP_URL = process.env.SDM_TEST_URL || 'http://127.0.0.1:3000';

describe('Media extraction error handling', function () {
  this.timeout(60000);
  let browser;
  let page;

  beforeEach(async () => {
    browser = await launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/media/inspect') {
        void request.respond({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'yt-dlp is not installed. Install it with `python -m pip install -U yt-dlp`, then restart SDM.',
          }),
        });
      } else {
        void request.continue();
      }
    });
  });

  afterEach(async () => {
    if (browser) await browser.close();
  });

  it('shows the explicit install guidance when media inspection reports missing yt-dlp', async () => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')]
        .some(button => button.textContent?.trim() === 'Add URL')
    );
    await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .find(button => button.textContent?.trim() === 'Add URL')
        ?.click()
    );
    await page.waitForSelector('#idm-url-input');
    await page.click('#idm-url-input');
    await page.keyboard.type('https://www.youtube.com/watch?v=test-video');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() =>
      [...document.querySelectorAll('[role="alert"]')]
        .some(element => /yt-dlp/i.test(element.textContent || ''))
    );

    const displayedError = await page.evaluate(() =>
      [...document.querySelectorAll('[role="alert"]')]
        .map(element => element.textContent || '')
        .find(text => /yt-dlp/i.test(text))
    );
    expect(displayedError.toLowerCase()).to.include('yt-dlp');
    expect(displayedError.toLowerCase()).to.include('install');
  });
});
