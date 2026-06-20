import process from 'node:process';
import { execSync } from 'node:child_process';
import { beforeAll, expect, test } from 'vitest';

beforeAll(() => {
	execSync('pnpm build && pnpm preview', {
		stdio: 'inherit',
		env: {
			...process.env,
			MY_CUSTOM_FOO: 'bar'
		}
	});
});

test('server starts', async () => {
	const response = await fetch('http://localhost:3000');
	expect(response.ok).toBe(true);
});
