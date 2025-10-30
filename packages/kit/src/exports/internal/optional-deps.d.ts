/* Users may not have these packages installed, this prevents errors when using `tsc` without them. */
/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module '@opentelemetry/api' {
	type _ = any;

	export interface Span extends _ {}
	export interface Tracer extends _ {}
	export interface SpanContext extends _ {}
	export enum SpanStatusCode {
		ERROR = 2
	}
	export interface PropagationAPI extends _ {}
	export interface ContextAPI extends _ {}
	export const trace: Tracer;
	export const propagation: PropagationAPI;
	export const context: ContextAPI;
}
