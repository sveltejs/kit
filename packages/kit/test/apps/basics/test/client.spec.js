import { expect, test } from 'vitest';

// some users will import these to mock them in Vitest so we test that importing
// them outside of Vite still works
test('$app/navigation exports work', async () => {
	await expect( import('$app/navigation')).resolves.not.toThrow()
});
