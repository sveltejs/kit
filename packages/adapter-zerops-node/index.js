import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as esbuild from 'esbuild';

/** @type {import('./index').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-zerops-node',

		async adapt(builder) {
			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const serverDirectory = builder.getBuildDirectory('zerops-node');

			builder.rimraf(serverDirectory);
			builder.mkdirp(serverDirectory);

			builder.writeClient();
			builder.writePrerendered();

			const relativePath = builder.getServerDirectory();

			// Write server manifest
			writeFileSync(
				`${serverDirectory}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath })};\n`
			);

			// Bundle server
			await esbuild.build({
				entryPoints: [`${files}/index.js`],
				outfile: `${serverDirectory}/index.js`,
				bundle: true,
				platform: 'node',
				target: 'node16',
				format: 'esm'
			});

			// Generate zerops.yml configuration  
			const zeropsConfig = `
service:
  - name: node
    type: nodejs@18
    buildFromGit: false
    ports:
      - port: 3000
        httpSupport: true
    env:
      - key: PORT
        value: 3000
`;

			writeFileSync('zerops.yml', zeropsConfig);
		}
	};
} 