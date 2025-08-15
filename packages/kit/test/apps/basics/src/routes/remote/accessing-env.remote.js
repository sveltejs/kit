import { env } from '$env/dynamic/private';
import { env as public_env } from '$env/dynamic/public';

if (!env.PRIVATE_DYNAMIC || !public_env.PUBLIC_DYNAMIC) {
	// This checks that dynamic env vars are available when prerendering remote functions
	// https://github.com/sveltejs/kit/pull/14219
	throw new Error('Dynamic environment variables are not set up correctly');
}
