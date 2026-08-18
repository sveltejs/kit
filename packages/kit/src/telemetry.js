/** @import { Span, SpanContext } from '@opentelemetry/api' */

/**
 * @type {Span}
 */
export const noop_span = {
	spanContext() {
		return noop_span_context;
	},
	setAttribute() {
		return this;
	},
	setAttributes() {
		return this;
	},
	addEvent() {
		return this;
	},
	setStatus() {
		return this;
	},
	updateName() {
		return this;
	},
	end() {
		return this;
	},
	isRecording() {
		return false;
	},
	recordException() {
		return this;
	},
	addLink() {
		return this;
	},
	addLinks() {
		return this;
	}
};

/**
 * @type {SpanContext}
 */
const noop_span_context = {
	traceId: '',
	spanId: '',
	traceFlags: 0
};
