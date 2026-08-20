import { execSync } from 'node:child_process';
import path from 'node:path';

// builds the app once for server.spec.js, which calls the built server directly
export default function setup() {
	execSync('node test/setup.js && pnpm svelte-kit sync && pnpm run build', {
		cwd: path.resolve(import.meta.dirname, '..'),
		stdio: 'inherit'
	});
}
