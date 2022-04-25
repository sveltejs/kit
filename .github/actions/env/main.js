console.log(
	'::set-output name=pnpm_cache_path::' +
		(process.platform === 'win32' ? 'D:\\.pnpm-store\\v3' : '~/.pnpm-store/v3')
);
console.log(
	'::set-output name=browser_cache_path::' +
		(process.platform === 'win32'
			? require('path').join(require('os').homedir(), 'AppData', 'Local', 'ms-playwright')
			: process.platform === 'linux'
			? '~/.cache/ms-playwright'
			: '~/Library/Caches/ms-playwright')
);
