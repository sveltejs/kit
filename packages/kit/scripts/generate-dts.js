import { createBundle } from 'dts-buddy';

createBundle({
	output: 'types/index.d.ts',
	modules: {
		'@sveltejs/kit': 'src/exports/public.d.ts',
		'@sveltejs/kit/hooks': 'src/exports/hooks/index.js',
		'@sveltejs/kit/node': 'src/exports/node/index.js',
		'@sveltejs/kit/node/polyfills': 'src/exports/node/polyfills.js',
		'@sveltejs/kit/vite': 'src/exports/vite/index.js',
		'$app/environment': 'src/runtime/app/environment.js',
		'$app/forms': 'src/runtime/app/forms.js',
		'$app/navigation': 'src/runtime/app/navigation.js',
		'$app/paths': 'src/runtime/app/paths.js',
		'$app/stores': 'src/runtime/app/stores.js'
	},
	include: ['src']
});
