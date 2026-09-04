/** @import { SpanData, SpanTree } from './types.js' */
import fs from 'node:fs';

/**
 * The most recent error a test app's `handleError` hook appended for `path`
 * @param {string} file the app's errors.jsonl
 * @param {string} path
 */
export function read_errors(file, path) {
	if (!fs.existsSync(file)) return;

	const records = fs.readFileSync(file, 'utf8').split('\n');
	records.pop(); // ignore a trailing partial record if this races an append

	const match = records.map((line) => JSON.parse(line)).findLast((error) => error.path === path);

	if (match) {
		const { path: _, ...error } = match;
		return error;
	}
}

/**
 * The span trees a test app's instrumentation exported for `test_id`
 * @param {string} file the app's spans.jsonl
 * @param {string} test_id
 */
export function read_traces(file, test_id) {
	const raw = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
	const traces = /** @type {SpanData[]} */ (raw.map((line) => JSON.parse(line)));

	return traces
		.filter((t) => t.parent_span_id === undefined && t.attributes.test_id === test_id)
		.map((root_trace) => {
			const child_traces = traces.filter((span) => span.trace_id === root_trace.trace_id);
			return build_span_tree(root_trace, child_traces);
		});
}

/**
 * @param {SpanData} current_span
 * @param {SpanData[]} child_spans
 * @returns {SpanTree}
 */
function build_span_tree(current_span, child_spans) {
	const children = child_spans.filter((span) => span.parent_span_id === current_span.span_id);
	return {
		...current_span,
		children: children.map((child) => build_span_tree(child, child_spans))
	};
}
