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
	const f = form('unchecked', (data: { input: string }) => {
		data.input;
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

	const f2 = form(
		null as any as StandardSchemaV1<{ a: string; nested: { prop: string } }>,
		(data) => {
			data.a === '';
			data.nested.prop === '';
			// @ts-expect-error
			data.nested.nonexistent;
			// @ts-expect-error
			data.nonexistent;
			// @ts-expect-error
			data.a === 123;
			return { success: true };
		}
	);
	f2.field('a');
	f2.field('nested.prop');
	// @ts-expect-error
	f2.field('nonexistent');
	f2.issues!.a;
	f2.issues!['nested.prop'];
	// @ts-expect-error
	f2.issues!.nonexistent;
	f2.input!.a = '';
	f2.input!['nested.prop'] = '';
	// @ts-expect-error
	f2.input!.nonexistent = '';
	// @ts-expect-error
	f2.input!.a = 123;

	// all schema properties optional
	const f3 = form(
		null as any as StandardSchemaV1<{ a?: string; nested?: { prop?: string } }>,
		(data) => {
			data.a === '';
			data.nested?.prop === '';
			// @ts-expect-error
			data.nested.prop === '';
			// @ts-expect-error
			data.nested.nonexistent;
			// @ts-expect-error
			data.nonexistent;
			// @ts-expect-error
			data.a === 123;
			return { success: true };
		}
	);
	f3.field('a');
	f3.field('nested.prop');
	// @ts-expect-error
	f3.field('nonexistent');
	f3.issues!.a;
	f3.issues!['nested.prop'];
	// @ts-expect-error
	f3.issues!.nonexistent;
	f3.input!.a = '';
	f3.input!['nested.prop'] = '';
	// @ts-expect-error
	f3.input!.nonexistent = '';
	// @ts-expect-error
	f3.input!.a = 123;

	// index signature schema
	const f4 = form(null as any as StandardSchemaV1<Record<string, any>>, (data) => {
		data.a === '';
		data.nested?.prop === '';
		return { success: true };
	});
	f4.field('a');
	f4.field('nested.prop');
	f4.issues!.a;
	f4.issues!['nested.prop'];
	f4.input!.a = '';
	f4.input!['nested.prop'] = '';
	// @ts-expect-error
	f4.input!.a = 123;

	// schema with union types
	const f5 = form(null as any as StandardSchemaV1<{ foo: 'a' | 'b'; bar: 'c' | 'd' }>, (data) => {
		data.foo === 'a';
		data.bar === 'c';
		// @ts-expect-error
		data.foo === 'e';
		return { success: true };
	});
	f5.field('foo');
	// @ts-expect-error
	f5.field('nonexistent');
	f5.issues!.foo;
	f5.issues!.bar;
	// @ts-expect-error
	f5.issues!.nonexistent;
	f5.input!.foo = 'a';
	// @ts-expect-error
	f5.input!.foo = 123;

	// schema with arrays
	const f6 = form(
		null as any as StandardSchemaV1<{ array: Array<{ array: string[]; prop: string }> }>,
		(data) => {
			data.array[0].prop === 'a';
			data.array[0].array[0] === 'a';
			// @ts-expect-error
			data.array[0].array[0] === 1;
			return { success: true };
		}
	);
	f6.field('array[0].prop');
	f6.field('array[0].array[]');
	// @ts-expect-error
	f6.field('array[0].array');
	f6.issues!.array;
	f6.issues!['array[0].prop'];
	f6.issues!['array[0].array'];
	// @ts-expect-error
	f6.issues!['array[0].array[]'];
	// @ts-expect-error
	f6.issues!.nonexistent;
	f6.input!['array[0].prop'] = '';
	f6.input!['array[0].array'] = [''];
	// @ts-expect-error
	f6.input!['array[0].array'] = '';
	// @ts-expect-error
	f6.input!['array[0].array[]'] = [''];
	// @ts-expect-error
	f6.input!['array[0].prop'] = 123;
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
