import { query, prerender, command, form } from '$app/server';
import { StandardSchemaV1 } from '@standard-schema/spec';
import { RemotePrerenderFunction, RemoteQueryFunction } from '@sveltejs/kit';

const schema: StandardSchemaV1<string> = null as any;
const schema2: StandardSchemaV1<string, number> = null as any;

function query_tests() {
	const no_args: RemoteQueryFunction<void, string> = query(() => 'Hello world');
	void no_args();
	// @ts-expect-error
	void no_args('');

	const one_arg: RemoteQueryFunction<number, string> = query('unchecked', (a: number) =>
		a.toString()
	);
	void one_arg(1);
	// @ts-expect-error
	void one_arg('1');
	// @ts-expect-error
	void one_arg();

	async function query_without_args() {
		const q = query(() => 'Hello world');
		const result: string = await q();
		result;
		// @ts-expect-error
		const wrong: number = await q();
		wrong;
		// @ts-expect-error
		void q(1);
		// @ts-expect-error
		query((_: string) => 'hi');
	}
	void query_without_args();

	async function query_unsafe() {
		const q = query('unchecked', (a: number) => a);
		const result: number = await q(1);
		result;
		// @ts-expect-error
		void q(1, 2, 3);
		// @ts-expect-error
		void q('1', '2');
	}
	void query_unsafe();

	async function query_schema_input_only() {
		const q = query(schema, (a) => a);
		const result: string = await q('1');
		result;
	}
	void query_schema_input_only();

	async function query_schema_input_and_output() {
		const q = query(schema2, (a) => a);
		const result: number = await q('1');
		result;
	}
	void query_schema_input_and_output();
}
query_tests();

function prerender_tests() {
	const no_args: RemotePrerenderFunction<void, string> = prerender(() => 'Hello world');
	void no_args();
	// @ts-expect-error
	void no_args('');
	const one_arg: RemotePrerenderFunction<number, string> = prerender('unchecked', (a: number) =>
		a.toString()
	);
	void one_arg(1);
	// @ts-expect-error
	void one_arg('1');
	// @ts-expect-error
	void one_arg();

	async function prerender_without_args() {
		const q = prerender(() => 'Hello world');
		const result: string = await q();
		result;
		// @ts-expect-error
		const wrong: number = await q();
		wrong;
		// @ts-expect-error
		void q(1);
		// @ts-expect-error
		query((_: string) => 'hi');
	}
	void prerender_without_args();

	async function prerender_unsafe() {
		const q = prerender('unchecked', (a: number) => a);
		const result: number = await q(1);
		result;
		// @ts-expect-error
		void q(1, 2, 3);
		// @ts-expect-error
		void q('1', '2');
	}
	void prerender_unsafe();

	async function prerender_schema() {
		const q = prerender(schema, (a) => a);
		const result: string = await q('1');
		result;
	}
	void prerender_schema();

	function prerender_schema_entries() {
		const q = prerender(schema, (a) => a, { inputs: () => ['1'] });
		q;
		// @ts-expect-error
		const q2 = prerender(schema, (a) => a, { inputs: () => [1] });
		q2;
	}
	prerender_schema_entries();
}
prerender_tests();

function command_tests() {
	async function command_without_args() {
		const q = query(() => '');
		const cmd = command(() => 'Hello world');
		const result: string = await cmd();
		result;
		const result2: string = await cmd().updates(
			q(),
			q().withOverride(() => '')
		);
		result2;
		// @ts-expect-error
		const wrong: number = await cmd();
		wrong;
	}
	void command_without_args();

	async function command_unsafe() {
		const cmd = command('unchecked', (a: string) => a);
		const result: string = await cmd('test');
		result;
		// @ts-expect-error
		void cmd(1);
		// @ts-expect-error
		void cmd('1', 2);
	}
	void command_unsafe();

	async function command_schema() {
		const cmd = command(schema, (a) => a);
		const result: string = await cmd('foo');
		result;
		// @ts-expect-error
		void cmd(123);
	}
	void command_schema();
}
command_tests();

function form_tests() {
	const q = query(() => '');
	const f = form((f) => {
		f.get('');
		return { success: true };
	});

	f.result?.success === true;

	f.enhance(async ({ submit }) => {
		const x: void = await submit();
		x;
		const y: void = await submit().updates(
			q(),
			q().withOverride(() => '')
		);
		y;
	});
}
form_tests();

function boolean_tests() {
	const q = query(() => 'Hello world');
	const result = q();

	if (!result.ready) {
		result.current === undefined;
		// @ts-expect-error
		result.current.length;
		// @ts-expect-error
		result.current?.length;
	} else {
		result.current === 'a';
		result.current.length;
		// @ts-expect-error
		result.current === true;
	}

	if (result.loading) {
		result.current === undefined;
		result.current?.length;
		// @ts-expect-error
		result.current.length;
		// @ts-expect-error
		result.current === true;
	}

	if (result.error) {
		result.current === 'a';
		result.current?.length;
		// @ts-expect-error
		result.current.length;
		// @ts-expect-error
		result.current === true;
	}
}
boolean_tests();
