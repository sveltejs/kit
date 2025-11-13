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
	const f = form('unchecked', (data: { input: string }, invalid) => {
		data.input;
		invalid(
			'foo',
			invalid.input('bar'),
			// @ts-expect-error
			invalid.nonexistent.prop('baz')
		);
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
		(data, invalid) => {
			data.a === '';
			data.nested.prop === '';
			// @ts-expect-error
			data.nested.nonexistent;
			// @ts-expect-error
			data.nonexistent;
			// @ts-expect-error
			data.a === 123;
			invalid(
				'foo',
				invalid.nested.prop('bar'),
				// @ts-expect-error
				invalid.nonexistent.prop('baz')
			);
			return { success: true };
		}
	);
	// @ts-expect-error
	f2.fields.name();
	f2.fields.a.issues();
	f2.fields.nested.prop.issues();
	// @ts-expect-error
	f2.fields.nonexistent.issues();
	f2.fields.a.value();
	f2.fields.nested.prop.value();
	// @ts-expect-error
	f2.fields.nonexistent.value();
	// @ts-expect-error
	f2.fields.array[0].array.name();

	// all schema properties optional
	const f3 = form(
		null as any as StandardSchemaV1<{ a?: string; nested?: { prop?: string } }>,
		(data, invalid) => {
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
			invalid(
				'foo',
				invalid.nested.prop('bar'),
				// @ts-expect-error
				invalid.nonexistent.prop('baz')
			);
			return { success: true };
		}
	);
	// @ts-expect-error
	f3.fields.name();
	f3.fields.a.issues();
	f3.fields.a.value();
	f3.fields.nested.prop.issues();
	f3.fields.nested.prop.value();
	// @ts-expect-error
	f3.fields.nonexistent.name();

	// index signature schema
	const f4 = form(null as any as StandardSchemaV1<Record<string, any>>, (data) => {
		data.a === '';
		data.nested?.prop === '';
		return { success: true };
	});
	// @ts-expect-error
	f4.fields.name();
	f4.fields.a.issues();
	f4.fields.a.value();
	f4.fields.nested.prop.issues();
	f4.fields.nested.prop.value();

	// schema with union types
	const f5 = form(
		null as any as StandardSchemaV1<{ foo: 'a' | 'b'; bar: 'c' | 'd' }>,
		(data, invalid) => {
			data.foo === 'a';
			data.bar === 'c';
			// @ts-expect-error
			data.foo === 'e';
			invalid(
				'foo',
				invalid.bar('bar'),
				// @ts-expect-error
				invalid.nonexistent.prop('baz')
			);
			return { success: true };
		}
	);
	// @ts-expect-error
	f5.fields.name();
	f5.fields.foo.issues();
	f5.fields.bar.issues();
	f5.fields.foo.value();
	f5.fields.bar.value() === 'c';
	// @ts-expect-error
	f5.fields.foo.value() === 'e';
	// @ts-expect-error
	f5.fields.nonexistent.name();

	// schema with arrays
	const f6 = form(
		null as any as StandardSchemaV1<{ array: Array<{ array: string[]; prop: string }> }>,
		(data, invalid) => {
			data.array[0].prop === 'a';
			data.array[0].array[0] === 'a';
			// @ts-expect-error
			data.array[0].array[0] === 1;
			invalid(
				'foo',
				invalid.array[0].prop('bar'),
				// @ts-expect-error
				invalid.nonexistent.prop('baz')
			);
			return { success: true };
		}
	);
	// @ts-expect-error
	f6.fields.name();
	// @ts-expect-error
	f6.field('array[0].array');
	f6.fields.array.issues();
	f6.fields.array[0].prop.issues();
	f6.fields.array[0].array.issues();
	// @ts-expect-error
	f6.fields.nonexistent.issues();
	f6.fields.array[0].prop.value();
	f6.fields.array[0].array.value();
	// @ts-expect-error
	f6.fields.array[0].array.name();

	// any
	const f7 = form(null as any, (data, invalid) => {
		data.a === '';
		data.nested?.prop === '';
		invalid('foo', invalid.nested.prop('bar'));
		return { success: true };
	});
	// @ts-expect-error
	f7.fields.name();
	f7.fields.a.issues();
	f7.fields.a.value();
	f7.fields.nested.prop.issues();
	f7.fields.nested.prop.value();

	// no schema
	const f8 = form((invalid) => {
		invalid(
			'foo',
			// @ts-expect-error
			invalid.x('bar')
		);
	});
	// @ts-expect-error
	f8.fields.x;
	// @ts-expect-error
	f6.input!['array[0].prop'] = 123;

	// doesn't use data
	const f9 = form(() => Promise.resolve({ success: true }));
	f9.result?.success === true;
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
