/** @import { Span, SpanContext, SpanStatus, Attributes, AttributeValue } from '@opentelemetry/api' */
/** @import { AsyncLocalStorage } from 'node:async_hooks' */
/** @import { DevtoolsChannel, DevtoolsSpan } from 'types' */

/**
 * @typedef {{
 *   id: string;
 *   spans: DevtoolsSpan[];
 *   sent: boolean;
 * }} DevRequest
 */

/**
 * @typedef {{ request: DevRequest; span: DevSpan | null }} DevStore
 */

/** @type {AsyncLocalStorage<DevStore> | null} */
let als = null;

import('node:async_hooks')
	.then((hooks) => (als = new hooks.AsyncLocalStorage()))
	.catch(() => {
		// webcontainers have no AsyncLocalStorage so nothing is recorded
	});

let next_span_id = 0;

/**
 * the devtools channel, or null when no client has subscribed
 * @returns {DevtoolsChannel | null}
 */
export function get_devtools() {
	// cast since this module is also type checked without the private globals
	const channel = /** @type {{ __SVELTEKIT_DEVTOOLS_CHANNEL__?: DevtoolsChannel }} */ (globalThis)
		.__SVELTEKIT_DEVTOOLS_CHANNEL__;
	return channel?.active ? channel : null;
}

function now() {
	return performance.timeOrigin + performance.now();
}

/**
 * runs fn as a request whose spans are sent to devtools, or returns null when no client has subscribed
 * @param {Request} request
 * @param {(id: string) => Promise<Response>} fn
 * @returns {Promise<Response> | null}
 */
export function with_devtools_request(request, fn) {
	if (!als || !get_devtools()) return null;

	/** @type {DevRequest} */
	const dev_request = { id: crypto.randomUUID(), spans: [], sent: false };
	const start = now();
	let status = 0;

	const store = /** @type {AsyncLocalStorage<DevStore>} */ (als);

	return store.run({ request: dev_request, span: null }, async () => {
		try {
			const response = await fn(dev_request.id);
			status = response.status;
			return response;
		} catch (error) {
			status = 500;
			throw error;
		} finally {
			const end = now();
			dev_request.sent = true;
			get_devtools()?.send({
				type: 'request:completed',
				time: end,
				request_id: dev_request.id,
				method: request.method,
				url: request.url,
				status,
				start,
				end,
				spans: dev_request.spans
			});
		}
	});
}

/**
 * @param {{ issues: any[]; remote?: { name?: string; file?: string }; remote_id?: string }} details
 */
export function send_devtools_validation({ issues, remote, remote_id }) {
	const store = als?.getStore();
	const channel = get_devtools();
	if (!store || !channel) return;

	channel.send({
		type: 'validation:failed',
		time: now(),
		request_id: store.request.id,
		id: remote_id ?? null,
		name: remote?.name ?? null,
		file: remote?.file ?? null,
		issues: issues.map((issue) => ({
			message: issue.message,
			path: issue.path?.map((/** @type {any} */ segment) =>
				typeof segment === 'object' ? segment.key : segment
			)
		}))
	});
}

/**
 * @param {string} level
 * @param {unknown[]} args
 */
export function send_devtools_log(level, args) {
	const store = als?.getStore();
	const channel = get_devtools();
	if (!store || !channel) return;

	channel.send({
		type: 'log:written',
		time: now(),
		request_id: store.request.id,
		level,
		message: channel.format(args)
	});
}

/**
 * returns null when no client has subscribed or the span is outside a request
 * @param {string} name
 * @param {Attributes} attributes
 * @returns {DevSpan | null}
 */
export function start_devtools_span(name, attributes) {
	if (!als || !get_devtools()) return null;

	const store = als.getStore();
	if (!store) return null;

	return new DevSpan(store.request, store.span?.data.id ?? null, name, attributes);
}

/**
 * without opentelemetry this is event.tracing.current, with it this shadows the real span
 * @implements {Span}
 */
export class DevSpan {
	/** @type {DevtoolsSpan} */
	data;

	/** @type {DevRequest} */
	#request;

	/**
	 * @param {DevRequest} request
	 * @param {string | null} parent_id
	 * @param {string} name
	 * @param {Attributes} attributes
	 */
	constructor(request, parent_id, name, attributes) {
		this.#request = request;
		this.data = {
			id: String(++next_span_id),
			parent_id,
			request_id: request.id,
			name,
			attributes: { ...attributes },
			start: now(),
			end: 0,
			status: 'ok',
			error: null
		};
	}

	/**
	 * @template T
	 * @param {() => T} fn
	 * @returns {T}
	 */
	run(fn) {
		return /** @type {AsyncLocalStorage<DevStore>} */ (als).run(
			{ request: this.#request, span: this },
			fn
		);
	}

	/** @returns {SpanContext} */
	spanContext() {
		return { traceId: this.data.request_id, spanId: this.data.id, traceFlags: 0 };
	}

	/**
	 * @param {string} key
	 * @param {AttributeValue} value
	 */
	setAttribute(key, value) {
		this.data.attributes[key] = value;
		return this;
	}

	/** @param {Attributes} attributes */
	setAttributes(attributes) {
		Object.assign(this.data.attributes, attributes);
		return this;
	}

	/** @param {SpanStatus} status */
	setStatus(status) {
		// 2 is SpanStatusCode.ERROR
		if (status.code === 2) {
			this.data.status = 'error';
			if (status.message) this.data.error ??= { name: 'Error', message: status.message };
		}
		return this;
	}

	/** @param {import('@opentelemetry/api').Exception} exception */
	recordException(exception) {
		if (typeof exception === 'string') {
			this.data.error = { name: 'Error', message: exception };
		} else {
			this.data.error = {
				name: exception.name ?? 'Error',
				message: exception.message ?? '',
				...(exception.stack !== undefined && { stack: exception.stack })
			};
		}
		return this;
	}

	/** @param {string} name */
	updateName(name) {
		this.data.name = name;
		return this;
	}

	addEvent() {
		return this;
	}

	addLink() {
		return this;
	}

	addLinks() {
		return this;
	}

	isRecording() {
		return this.data.end === 0;
	}

	end() {
		if (this.data.end !== 0) return;
		this.data.end = now();

		if (this.#request.sent) {
			// the request event already went out, like while the body streams
			get_devtools()?.send({ type: 'span:ended', time: this.data.end, span: this.data });
		} else {
			this.#request.spans.push(this.data);
		}
	}
}
