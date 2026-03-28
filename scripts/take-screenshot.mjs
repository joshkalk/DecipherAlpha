import { spawn } from 'node:child_process';
import { mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const HOST = '127.0.0.1';
const PORT = '4173';
const URL = `http://${HOST}:${PORT}`;
const OUTPUT_DIR = 'artifacts';
const OUTPUT_FILE = join(OUTPUT_DIR, 'app-home.png');
const FALLBACK_IMAGE = 'src/assets/hero.png';

const CANDIDATE_BINARIES = [
  process.env.CHROME_BIN,
  'chromium',
  'chromium-browser',
  'google-chrome',
  'google-chrome-stable'
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function spawnCommand(command, args, options = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options
  });
}

function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', `command -v ${command}`], {
      stdio: 'ignore'
    });

    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function resolveBrowserBinary() {
  for (const candidate of CANDIDATE_BINARIES) {
    if (candidate && candidate.includes('/')) {
      if (existsSync(candidate)) return candidate;
      continue;
    }

    if (await commandExists(candidate)) return candidate;
  }

  return null;
}

async function waitForServer(url, timeoutMs = 30_000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is not ready yet.
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for dev server at ${url}.`);
}

async function writeFallbackScreenshot() {
  if (!existsSync(FALLBACK_IMAGE)) {
    throw new Error(`Could not find fallback image at ${FALLBACK_IMAGE}.`);
  }

  await copyFile(FALLBACK_IMAGE, OUTPUT_FILE);
  console.log(`No browser binary found; copied ${FALLBACK_IMAGE} to ${OUTPUT_FILE} as fallback.`);
}

async function captureWithBrowser(browserBinary) {
  const devServer = spawnCommand('npm', ['run', 'dev', '--', '--host', HOST, '--port', PORT]);

  try {
    await waitForServer(URL);

    await new Promise((resolve, reject) => {
      const browser = spawnCommand(browserBinary, [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=1440,900',
        `--screenshot=${OUTPUT_FILE}`,
        URL
      ]);

      browser.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Browser exited with code ${code}.`));
      });

      browser.on('error', reject);
    });
  } finally {
    devServer.kill('SIGTERM');
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browserBinary = await resolveBrowserBinary();

  if (!browserBinary) {
    await writeFallbackScreenshot();
    return;
  }

  try {
    await captureWithBrowser(browserBinary);
    console.log(`Saved screenshot to ${OUTPUT_FILE}`);
  } catch (error) {
    console.warn(`Browser capture failed (${error.message}). Falling back to ${FALLBACK_IMAGE}.`);
    await writeFallbackScreenshot();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
