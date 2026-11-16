import { EventEmitter } from 'node:events';
import { expect, test } from 'vitest';
import { create_devtools_channel } from './devtools.js';

/**
 * @param {string} remote_address
 */
function subscribe_from(remote_address) {
	const ws = new EventEmitter();
	const hot = new EventEmitter();
	const channel = create_devtools_channel(/** @type {any} */ (hot), /** @type {any} */ (ws));

	const socket = {};
	/** @type {string[]} */
	const received = [];
	const client = { socket, send: (/** @type {string} */ event) => received.push(event) };

	ws.emit('connection', socket, { socket: { remoteAddress: remote_address } });
	hot.emit('sveltekit:devtools:subscribe', {}, client);

	return { channel, received };
}

test('refuses subscriptions from other machines', () => {
	const { channel, received } = subscribe_from('192.168.1.20');
	expect(received).toEqual(['sveltekit:devtools:refused']);
	expect(channel.active).toBe(false);
});

test('accepts subscriptions from this machine', () => {
	for (const address of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
		const { channel, received } = subscribe_from(address);
		expect(received).toEqual(['sveltekit:devtools:subscribed']);
		expect(channel.active).toBe(true);
	}
});
