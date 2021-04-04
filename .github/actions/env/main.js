import core from '@actions/core';
import { platform } from 'os';

const WINDOWS_CACHE_PATH = 'D:\\.pnpm-store\\v3';
const NIX_CACHE_PATH = '~/.pnpm-store/v3';
const WINDOWS_BROWSER_PATH = '%USERPROFILE%\\AppData\\Local\\ms-playwright';
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

function run() {
	const os = platform();

	core.setOutput('pnpm_cache_path', paths[os].cache);
	core.setOutput('browser_cache_path', paths[os].browser);
}

run();
