/** @import {SpanExporter} from '@opentelemetry/sdk-trace-node' */
/** @import {SpanData} from '../../../types' */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
// @ts-expect-error import-in-the-middle does not declare this entry point
import { register, supportsSyncHooks } from 'import-in-the-middle/register-hooks.mjs';
import { createAddHookMessageChannel } from 'import-in-the-middle';
import { register as registerAsync } from 'node:module';
import fs from 'node:fs';

/**
 * @param {string} _url
 * @param {string} specifier
 */
function should_include(_url, specifier) {
	return !specifier.startsWith('.');
}

if (process.env.SVELTE_ASYNC === 'true') {
	if (supportsSyncHooks()) {
		register({ shouldInclude: should_include });
	} else {
		const { registerOptions } = createAddHookMessageChannel();
		registerAsync('import-in-the-middle/hook.mjs', import.meta.url, registerOptions);
	}
}

/** @implements {SpanExporter} */
class FilesystemSpanExporter {
	#path;

	/** @param {string} path */
	constructor(path) {
		fs.rmSync(path, { force: true });
		this.#path = path;
	}

	/** @param {import('@opentelemetry/sdk-trace-node').ReadableSpan[]} spans */
	export(spans) {
		// spans have circular references so they can't be naively json-ified
		const serialized_spans = spans.map((span) => {
			const span_context = span.spanContext();
			/** @type {SpanData} */
			const span_data = {
				name: span.name,
				status: span.status,
				start_time: span.startTime,
				end_time: span.endTime,
				// @ts-ignore we do not care if the attribute value is undefined
				attributes: span.attributes,
				// @ts-ignore we do not care if the attribute value is undefined
				links: span.links,
				trace_id: span_context.traceId,
				span_id: span_context.spanId,
				parent_span_id: span.parentSpanContext?.spanId
			};
			return JSON.stringify(span_data);
		});

		fs.appendFileSync(this.#path, serialized_spans.join('\n') + '\n');
	}
	shutdown() {
		return Promise.resolve();
	}
}

const filesystemSpanExporter = new FilesystemSpanExporter('test/spans.jsonl');
const spanProcessor = new SimpleSpanProcessor(filesystemSpanExporter);
export const sdk = new NodeSDK({
	spanProcessor
});
sdk.start();
