export interface SpanData {
	name: string;
	status: {
		code: number;
		message?: string;
	};
	start_time: [number, number]; // HrTime tuple: [seconds, nanoseconds]
	end_time: [number, number]; // HrTime tuple: [seconds, nanoseconds]
	attributes: Record<string, string | number | boolean | Array<string | number | boolean>>;
	links: Array<{
		context: any;
		attributes?: Record<string, string | number | boolean | Array<string | number | boolean>>;
	}>;
	trace_id: string;
	span_id: string;
	parent_span_id: string | undefined;
}

export type SpanTree = Omit<SpanData, 'parent_span_id'> & {
	children: SpanTree[];
};
