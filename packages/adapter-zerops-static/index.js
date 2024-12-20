import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @type {import('./index').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-zerops-static',

		async adapt(builder) {
			const { pages, assets } = builder.writeClient();
			const prerendered = builder.writePrerendered();

			// Write static files
			const files = pages.concat(assets).concat(prerendered);
			const staticDir = 'build';

			builder.rimraf(staticDir);
			builder.mkdirp(staticDir);

			for (const file of files) {
				const source = join(builder.getClientDirectory(), file);
				const dest = join(staticDir, file);
				builder.copy(source, dest);
			}

			// Generate zerops.yml for static hosting
			const zeropsConfig = `
zerops:
  - setup: app
    build:
      base: nodejs@20
      buildCommands:
        - pnpm i
        - pnpm build
      deployFiles:
        - build/~
    run:
      base: static`;

			writeFileSync('zerops.yml', zeropsConfig);
		}
	};
} 