// we redeclare node process and import this file before `@vercel/edge`
// cso that it an co-exist with `@types/node`.
// see https://github.com/sveltejs/kit/pull/9280#issuecomment-1452110035

declare global {
	var process: NodeJS.Process;
}

export {};
