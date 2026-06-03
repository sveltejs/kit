// this module is evaluated when building the server nodes to determine its page options
// Therefore, we need to ensure $env, etc. still works during this process so that it doesn't throw errors
// when it's evaluated as `undefined`

import { PUBLIC_DYNAMIC } from '$app/env/public';

if (!PUBLIC_DYNAMIC) {
	throw Error('this should not happen');
}
