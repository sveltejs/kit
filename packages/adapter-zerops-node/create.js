import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} dir */
export function create(dir) {
	// Create svelte.config.js
	writeFileSync(
		join(dir, 'svelte.config.js'),
		`import adapter from '@sveltejs/adapter-zerops';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
`
	);

	// Create package.json if it doesn't exist
	try {
		readFileSync(join(dir, 'package.json'));
	} catch {
		writeFileSync(
			join(dir, 'package.json'),
			JSON.stringify(
				{
					name: 'my-zerops-app',
					version: '0.0.1',
					private: true,
					scripts: {
						dev: 'vite dev',
						build: 'vite build',
						preview: 'vite preview',
						start: 'node build/index.js'
					},
					type: 'module',
					dependencies: {},
					devDependencies: {
						'@sveltejs/adapter-zerops': 'next',
						'@sveltejs/kit': 'next',
						svelte: '^4.0.0',
						vite: '^5.0.0'
					}
				},
				null,
				'\t'
			)
		);
	}

	// Create .gitignore if it doesn't exist
	try {
		readFileSync(join(dir, '.gitignore'));
	} catch {
		writeFileSync(
			join(dir, '.gitignore'),
			`/build
/node_modules
/.svelte-kit
/package
.env
.env.*
!.env.example
.vercel
.output
vite.config.js.timestamp-*
vite.config.ts.timestamp-*`
		);
	}
} 