import { execSync } from 'node:child_process';

export default function setup() {
	execSync('pnpm prepare && pnpm run build', { cwd: import.meta.dirname });
}
