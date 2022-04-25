const { homedir, platform, EOL } = require('os');
const { join } = require('path');

const WINDOWS_CACHE_PATH = 'D:\\.pnpm-store\\v3';
const NIX_CACHE_PATH = '~/.pnpm-store/v3';
const WINDOWS_BROWSER_PATH = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const LINUX_BROWSER_PATH = '~/.cache/ms-playwright';
const MACOS_BROWSER_PATH = '~/Library/Caches/ms-playwright';

const paths = {
	win32: {
		browser: WINDOWS_BROWSER_PATH,
		cache: WINDOWS_CACHE_PATH
	},
	linux: {
		browser: LINUX_BROWSER_PATH,
		cache: NIX_CACHE_PATH
	},
	darwin: {
		browser: MACOS_BROWSER_PATH,
		cache: NIX_CACHE_PATH
	}
};

const os = platform();

process.stdout.write(EOL + '::set-output name=pnpm_cache_path::' + paths[os].cache + EOL);
process.stdout.write(EOL + '::set-output name=browser_cache_path::' + paths[os].browser + EOL);
