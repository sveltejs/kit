import { query, prerender, command, form } from '$app/server';
import { StandardSchemaV1 } from '@standard-schema/spec';
import { RemoteQuery } from '@sveltejs/kit';

const schema: StandardSchemaV1<string> = null as any;

function query_tests() {
	const no_args: RemoteQuery<void, string> = query(() => 'Hello world');
	no_args();
	// @ts-expect-error
	no_args('');

	const one_arg: RemoteQuery<number, string> = query('unchecked', (a: number) => a.toString());
	one_arg(1);
	// @ts-expect-error
	one_arg('1');
	// @ts-expect-error
	one_arg();

	async function query_without_args() {
		const q = query(() => 'Hello world');
		const result: string = await q();
		result;
		// @ts-expect-error
		const wrong: number = await q();
		wrong;
		// @ts-expect-error
		q(1);
		// @ts-expect-error
		query((a: string) => 'hi');
	}
	query_without_args();

	async function query_unsafe() {
		const q = query('unchecked', (a: number) => a);
		const result: number = await q(1);
		result;
		// @ts-expect-error
		q(1, 2, 3);
		// @ts-expect-error
		q('1', '2');
	}
	query_unsafe();

	async function query_schema() {
		const q = query(schema, (a) => a);
		const result: string = await q('1');
		result;
	}
	query_schema();
}
query_tests();

function prerender_tests() {
	const no_args: RemoteQuery<void, string> = prerender(() => 'Hello world');
	no_args();
	// @ts-expect-error
	no_args('');
	const one_arg: RemoteQuery<number, string> = prerender('unchecked', (a: number) => a.toString());
	one_arg(1);
	// @ts-expect-error
	one_arg('1');
	// @ts-expect-error
	one_arg();

	async function prerender_without_args() {
		const q = prerender(() => 'Hello world');
		const result: string = await q();
		result;
		// @ts-expect-error
		const wrong: number = await q();
		wrong;
		// @ts-expect-error
		q(1);
		// @ts-expect-error
		query((a: string) => 'hi');
	}
	prerender_without_args();

	async function prerender_unsafe() {
		const q = prerender('unchecked', (a: number) => a);
		const result: number = await q(1);
		result;
		// @ts-expect-error
		q(1, 2, 3);
		// @ts-expect-error
		q('1', '2');
	}
	prerender_unsafe();

	async function prerender_schema() {
		const q = prerender(schema, (a) => a);
		const result: string = await q('1');
		result;
	}
	prerender_schema();

	async function prerender_schema_entries() {
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
	command_without_args();

	async function command_unsafe() {
		const cmd = command('unchecked', (a: string) => a);
		const result: string = await cmd('test');
		result;
		// @ts-expect-error
		cmd(1);
		// @ts-expect-error
		cmd('1', 2);
	}
	command_unsafe();

	async function command_schema() {
		const cmd = command(schema, (a) => a);
		const result: string = await cmd('foo');
		result;
		// @ts-expect-error
		cmd(123);
	}
	command_schema();
}
command_tests();

async function form_tests() {
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

function status_tests() {
	const q = query(() => 'Hello world');
	const result = q();
	if (result.status === 'loading') {
		result.current === undefined;
		// @ts-expect-error
		result.current.length;
		// @ts-expect-error
		result.current?.length;
	} else if (result.status === 'reloading') {
		result.current === 'a';
		result.current.length;
		// @ts-expect-error
		result.current === true;
	} else if (result.status === 'error') {
		result.current === 'a';
		result.current?.length;
		// @ts-expect-error
		result.current.length;
		// @ts-expect-error
		result.current === true;
	} else if (result.status === 'success') {
		result.current === 'a';
		result.current.length;
		// @ts-expect-error
		result.current === true;
	}
}
status_tests();
