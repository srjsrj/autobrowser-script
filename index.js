const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')

const SoundPlay = require('sound-play');

puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
puppeteer.use(StealthPlugin())

const { installMouseHelper } = require('./mousehelper')

const TIMEOUT_BETWEEN_ACTIONS = 500
const ACTIONS_COUNTER = 20

const puppeteerOptions = {
  headless: false,
  ignoreDefaultArgs: ['--mute-audio'],
  args: ['--autoplay-policy=no-user-gesture-required'],
}

const sounds = {
  scroll: 'scroll.mp3',
  move: 'move.mp3',
  click: 'click.mp3',
  wait: 'wait.mp3',
};

const pageActions = {
  move: ({ page, viewport, timeout }) => {
    // Moves to random coordinate in a viewport
    console.info('% calling move')
    const getRandom = (max) => Math.floor(Math.random() * max) + 1
    const x = getRandom(viewport.width / 2)
    const y = getRandom(viewport.height / 2)
    page.mouse.move(x, y)
    SoundPlay.play(sounds.move)
    page.waitForTimeout(timeout)
  },
  scroll: ({ page, viewport, timeout }) => {
    console.info('% calling scroll')
    page.evaluate(async () => {
      const direction = Math.random() < 0.5 ? -1 : 1;

      window.scrollBy({
        top: direction * Math.floor((Math.random() * window.innerHeight) / 2) + 1,
        left: 0,
        behavior: 'smooth',
      })
    })
    SoundPlay.play(sounds.scroll)
    page.waitForTimeout(timeout)
  },
  click: ({ page, viewport, timeout }) => {
    console.info('% calling click')
    page.mouse.down()
    page.waitForTimeout(timeout)
    page.mouse.up()
    SoundPlay.play(sounds.click)
  },
  wait: ({ page, viewport, timeout }) => {
    console.info('% calling wait')
    page.waitForTimeout(timeout * 5)
    SoundPlay.play(sounds.wait)
  },
}

function populateSequence({ page, viewport, timeout, numberOfActions }) {
  const seq = [] // Store actions;
  const randomActions = Array.from(
    { length: ACTIONS_COUNTER },
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

const sitePool = ['https://en.wikipedia.org/wiki/Crematorium', 'https://en.wikipedia.org/wiki/America'];

async function visitUrl({ url, timeout, numberOfActions }) {
  const viewport = { width: 1000, height: 800 }
  const browser = await puppeteer.launch(puppeteerOptions)
  const page = await browser.newPage()

  await page.setViewport(viewport)
  await installMouseHelper(page)

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

function run() {
  const url = sitePool[Math.floor(Math.random() * sitePool.length)];
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%')
  console.log('% url selected', url);
  const numberOfActions = 10;
  visitUrl({ url, timeout: TIMEOUT_BETWEEN_ACTIONS, numberOfActions }).then(() => { run() });
}

run();
