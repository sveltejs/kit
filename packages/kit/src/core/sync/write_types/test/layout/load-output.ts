import type {
	LayoutLoad,
	LayoutServerLoad,
	PageLoad,
	PageServerLoad
} from './.svelte-kit/types/$types';

const not_a_path = 'not a path' as string;

// @ts-expect-error
export const layout_sync: LayoutLoad = () => ({ title: not_a_path });
// @ts-expect-error
export const layout_async: LayoutLoad = async () => ({ title: not_a_path });
// @ts-expect-error
export const layout_promise: LayoutLoad = () => Promise.resolve({ title: not_a_path });
// @ts-expect-error
export const layout_server_async: LayoutServerLoad = async () => ({ title: not_a_path });
// @ts-expect-error
export const page_async: PageLoad = async () => ({ title: not_a_path });
// @ts-expect-error
export const page_server_async: PageServerLoad = async () => ({ title: not_a_path });
// @ts-expect-error
export const thenable: LayoutLoad = () => ({ then: () => {} });

export const valid_async: LayoutLoad = async () => ({ title: '/a', other: 1 });
export const valid_void: LayoutLoad = async () => {};
export const valid_server_async: PageServerLoad = async () => ({ title: '/a', other: 1 });

interface Output {
	title: '/a';
	count: number;
}
export const valid_interface: LayoutLoad = async () => ({ title: '/a', count: 1 }) as Output;

export const valid_then_number: LayoutLoad = async () => ({ then: 123 });
export const valid_then_object: LayoutLoad = async () => ({ then: { x: 1 } });
export const valid_then_generic: LayoutLoad<{ then: number }> = async () => ({ then: 1 });
