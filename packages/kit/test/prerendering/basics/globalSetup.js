import { execSync } from 'node:child_process';

export default function setup() {
	execSync('svelte-kit sync && pnpm run build');
}
