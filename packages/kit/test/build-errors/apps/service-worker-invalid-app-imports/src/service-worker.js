import { deserialize } from '$app/forms';
import { page } from '$app/state';
import { goto } from './navigation.js';

console.log(deserialize, page, goto);
