import { RequestEvent } from '$app/server';

declare const event: RequestEvent;

// @ts-expect-error readonly
event.url = new URL('nope');
