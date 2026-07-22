import { createBundle } from 'dts-buddy';
import { readFileSync, writeFileSync } from 'node:fs';

await createBundle({
	output: 'types/index.d.ts',
	modules: {
		'@sveltejs/kit': 'src/exports/public.d.ts',
		'@sveltejs/kit/env': 'src/exports/env/index.js',
		'@sveltejs/kit/hooks': 'src/exports/hooks/index.js',
		'@sveltejs/kit/node': 'src/exports/node/index.js',
		'@sveltejs/kit/vite': 'src/exports/vite/index.js',
		'$app/env': 'src/runtime/app/env/types.d.ts',
		'$app/forms': 'src/runtime/app/forms.js',
		'$app/navigation': 'src/runtime/app/navigation.js',
		'$app/paths': 'src/runtime/app/paths/public.d.ts',
		'$app/server': 'src/runtime/app/server/index.js',
		'$app/service-worker': 'src/runtime/app/service-worker/index.js',
		'$app/state': 'src/runtime/app/state/index.js'
	},
	include: ['src'],
	exclude: ['**/test/**', '**/fixtures/**', '**/*.spec.js'],
	compilerOptions: {
		stripInternal: true
	}
});

// dts-buddy doesn't inline imports of module declaration in ambient-private.d.ts but also doesn't include them, resulting in broken types - guard against that
let types = readFileSync('types/index.d.ts', 'utf-8');

if (types.includes('__sveltekit/')) {
	throw new Error(
		'Found __sveltekit/ in types/index.d.ts - make sure to hide internal modules by not just reexporting them. Contents:\n\n' +
			types
	);
}

// this line causes type-checking to fail — simplest fix is to ignore it
types = types.replace(
	'export const self: ServiceWorkerGlobalScope;',
	'// @ts-ignore\n\texport const self: ServiceWorkerGlobalScope;'
);

writeFileSync('types/index.d.ts', types);
