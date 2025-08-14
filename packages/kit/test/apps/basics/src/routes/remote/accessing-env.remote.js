import { env } from '$env/dynamic/private';
import { env as public_env } from '$env/dynamic/public';

if (!env.PRIVATE_DYNAMIC || !public_env.PUBLIC_DYNAMIC) {
	throw new Error('Dynamic environment variables are not set up correctly');
}
