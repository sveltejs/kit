import { expect, test } from 'vitest';

// some users will import these modules to mock them in Vitest so we need to test
// that importing them works
test('$app/navigation exports work', async () => {
	await expect(import('$app/navigation')).resolves.not.toThrow();
});
