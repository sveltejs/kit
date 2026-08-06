import { RequestEvent } from '@sveltejs/kit';

declare const event: RequestEvent;

// @ts-expect-error readonly
event.url = new URL('nope');
