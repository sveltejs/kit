import { env } from 'cloudflare:workers';
import { command } from '$app/server';

const foo = env.FOO;

export const get_foo = command(() => foo);
