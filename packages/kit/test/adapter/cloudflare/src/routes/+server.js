import * as env from '$env/static/public';
import * as env2 from '$env/dynamic/public';
import * as env3 from '$env/static/private';
import * as env4 from '$env/dynamic/private';

export function getStaticPublicEnv() {
	return env;
}
export function getStaticPrivateEnv() {
	return env3;
}
export function getDynamicPublicEnv() {
	return env2.env;
}
export function getDynamicPrivateEnv() {
	return env4.env;
}
