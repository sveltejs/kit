import { expect, test } from 'vitest';

// some users will import these modules to mock them in Vitest so we need to test
// that importing them from outside the Vite module loader still works
test('$app/navigation exports work', async () => {
	await expect(import('$app/navigation')).resolves.not.toThrow();
});
