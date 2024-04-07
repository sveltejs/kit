import { env } from '$env/dynamic/public';

console.log('Logging dynamic public env', env.PUBLIC_SHOULD_EXPLODE);
