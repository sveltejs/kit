import { writeFileSync } from 'node:fs';
import static_adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: {
			name: 'test',
			async adapt(builder) {
				// capture what adapters actually receive for prerendered paths, so
				// tests can assert on it directly instead of inferring it from output
				writeFileSync('./prerendered-paths.json', JSON.stringify(builder.prerendered.paths));
				await static_adapter().adapt(builder);
			}
		},

		paths: {
			base: '/path-base',
			relative: false
		}
	}
};

export default config;
