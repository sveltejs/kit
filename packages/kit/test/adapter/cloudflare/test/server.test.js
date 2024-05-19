import { expect, test } from 'vitest';
import {
	getDynamicPrivateEnv,
	getDynamicPublicEnv,
	getStaticPrivateEnv,
	getStaticPublicEnv
} from '../src/routes/+server';

test('Environment variable test', () => {
	const env_static_public = getStaticPublicEnv();
	const env_dynamic_public = getDynamicPublicEnv();
	const env_static_private = getStaticPrivateEnv();
	const env_dynamic_private = getDynamicPrivateEnv();

	expect(env_static_public).toHaveProperty('PUBLIC_MY_FIRST');
	expect(env_static_public).toHaveProperty('PUBLIC_MY_LAST');

	expect(env_dynamic_public).toHaveProperty('PUBLIC_MY_FIRST');

	expect(env_static_private).toHaveProperty('PRIVATE_MY_PASS');
	expect(env_static_private).toHaveProperty('PRIVATE_MY_KEY');

	expect(env_dynamic_private).toHaveProperty('PRIVATE_MY_PASS');
});
