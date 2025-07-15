import { createBundle } from 'dts-buddy';
import { readFileSync } from 'node:fs';

await createBundle({
	output: 'types/index.d.ts',
	modules: {
		'@sveltejs/kit': 'src/exports/public.d.ts',
		'@sveltejs/kit/hooks': 'src/exports/hooks/index.js',
		'@sveltejs/kit/node': 'src/exports/node/index.js',
		'@sveltejs/kit/node/polyfills': 'src/exports/node/polyfills.js',
		'@sveltejs/kit/vite': 'src/exports/vite/index.js',
		'$app/environment': 'src/runtime/app/environment/types.d.ts',
		'$app/forms': 'src/runtime/app/forms.js',
		'$app/navigation': 'src/runtime/app/navigation.js',
		'$app/paths': 'src/runtime/app/paths/types.d.ts',
		'$app/server': 'src/runtime/app/server/index.js',
		'$app/state': 'src/runtime/app/state/index.js',
		'$app/stores': 'src/runtime/app/stores.js'
	},
	include: ['src']
});

// dts-buddy doesn't inline imports of module declaration in ambient-private.d.ts but also doesn't include them, resulting in broken types - guard against that
const types = readFileSync('./types/index.d.ts', 'utf-8');
if (types.includes('__sveltekit/')) {
	throw new Error(
		'Found __sveltekit/ in types/index.d.ts - make sure to hide internal modules by not just reexporting them. Contents:\n\n' +
			types
	);
}
