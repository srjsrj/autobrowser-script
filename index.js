const fs = require('fs');

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')

const SoundPlay = require('sound-play');

const useBrowserSound = true;

puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
puppeteer.use(StealthPlugin())

const { installMouseHelper } = require('./mousehelper')
const { installSoundHelper } = require('./soundhelper')

const puppeteerOptions = {
  headless: false,
  ignoreDefaultArgs: ['--mute-audio', '--start-maximized'],
  args: ['--autoplay-policy=no-user-gesture-required'],
}

const sounds = {
  scroll: 'scroll.mp3',
  move: 'move.mp3',
  click: 'click.mp3',
  wait: 'wait.mp3',
};

const sites = fs.readFileSync('sites.txt').toString().split("\n");


const pageActions = {
  move: ({ page, viewport, timeout }) => {
    // Moves to random coordinate in a viewport
    console.info('% calling move')
    const getRandom = (max) => Math.floor(Math.random() * max) + 1
    const x = getRandom(viewport.width / 2)
    const y = getRandom(viewport.height / 2)
    page.mouse.move(x, y)
    if (useBrowserSound) {
      page.evaluate(() => { window.__playSound__('move') });
    } else {
      SoundPlay.play(sounds.move)
    }
    page.waitForTimeout(timeout)
  },
  scroll: ({ page, timeout }) => {
    console.info('% calling scroll')
    page.evaluate(async () => {
      const direction = Math.random() < 0.5 ? -1 : 1;

      window.scrollBy({
        top: direction * (Math.floor((Math.random() * window.innerHeight) / 2) + 50),
        left: 0,
        behavior: 'smooth',
      })
    })
    if (useBrowserSound) {
      page.evaluate(() => { window.__playSound__('scroll') });
    } else {
      SoundPlay.play(sounds.scroll)
    }
    page.waitForTimeout(timeout)
  },
  click: ({ page, timeout }) => {
    console.info('% calling click')
    page.mouse.down()
    page.waitForTimeout(timeout)
    page.mouse.up()
    if (useBrowserSound) {
      page.evaluate(() => { window.__playSound__('click') });
    } else {
      SoundPlay.play(sounds.click)
    }
  },
  wait: ({ page, timeout }) => {
    console.info('% calling wait')
    page.waitForTimeout(timeout * 5)
    if (useBrowserSound) {
      page.evaluate(() => { window.__playSound__('wait') });
    } else {
      SoundPlay.play(sounds.wait)
    }
  },
}

function populateSequence({ page, viewport, timeout, numberOfActions }) {
  const seq = [] // Store actions;
  const randomActions = Array.from(
    { length: numberOfActions },
    () => Math.floor(Math.random() * Object.keys(pageActions).length) + 1,
  )

  randomActions.forEach((val) => {
    if (val === 1) seq.push(() => pageActions.move({ page, viewport, timeout }))
    if (val === 2) seq.push(() => pageActions.scroll({ page, viewport, timeout }))
    if (val === 3) seq.push(() => pageActions.click({ page, viewport, timeout }))
    if (val === 4) seq.push(() => pageActions.wait({ page, viewport, timeout }))
  })

  return seq
}

const sitePool = sites;

async function visitUrl({ url, timeout, numberOfActions }) {
  const viewport = { width: 1000, height: 800 }
  const browser = await puppeteer.launch(puppeteerOptions)
  const page = await browser.newPage()

  await page.setViewport(viewport)
  await installMouseHelper(page)
  await installSoundHelper(page)

  await page.goto(url, { waitUntil: 'networkidle2' })

  const actions = populateSequence({ page, viewport, timeout, numberOfActions })
  console.log('% received a list of actions')
  const timeToExecute = actions.length * timeout * 2;

  // Execute actions
  console.log('% start execution of actions')
  for (let i = 1; i < actions.length; i++) {
      setTimeout(() => {
        actions[i]();
      }, i * timeout * 2)
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('% actions are done. closing')
      browser.close()
      resolve();
    }, timeToExecute);
  });
}

const actionNumbers = [3, 10, 20, 25, 8, 25, 13, 25, 2, 9, 40];
const timeoutNumbers = [500, 700, 600, 550, 1000, 1500, 300, 590];

function run() {
  const url = sitePool[Math.floor(Math.random() * sitePool.length)];
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%')
  console.log('%        contact with a struggling device      %')
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%')
  console.log('% url selected', url);
  const numberOfActions = actionNumbers[Math.floor(Math.random() * actionNumbers.length)];
  const timeout = timeoutNumbers[Math.floor(Math.random() * timeoutNumbers.length)];
  visitUrl({ url, timeout, numberOfActions }).then(() => { run() });
}

console.log(`%%%% ${sitePool.length} sites are loaded. Warming up...`)

run();
