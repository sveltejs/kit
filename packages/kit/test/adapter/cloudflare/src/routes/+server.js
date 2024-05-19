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
// console.log("env static public",env["PUBLIC_MY_FIRST"],env["PUBLIC_MY_LAST"]);
// console.log("env dynamic public",env2.env["PUBLIC_MY_FIRST"],env2.env["PUBLIC_MY_LAST"]);
// console.log("env static private",env3["PRIVATE_MY_KEY"],env3["PRIVATE_MY_PASS"]);
// console.log("env2 dynamic private",env4.env["PRIVATE_MY_KEY"],env4.env["PRIVATE_MY_PASS"]);
