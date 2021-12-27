---
title: Hooks
---

オプションの `src/hooks.js` (または `src/hooks.ts`、または `src/hooks/index.js`) ファイルはサーバー上で実行される4つの関数 — **handle**、**handleError**、**getSession**、**externalFetch** — をエクスポートできます。それらは全てオプションです。

> このファイルの配置場所は [コンフィグ](#configuration) の `config.kit.files.hooks` で変更することができます。

### handle

この関数は SvelteKit がリクエストを受けるたびに (アプリの実行中であろうと、[プリレンダリング](#ssr-and-javascript-prerender)であろうと) 実行され、レスポンスを決定します。`request` オブジェクトと、SvelteKitのルーターを呼び出しそれに応じて(ページをレンダリングしたり、エンドポイントを呼び出したりして)レスポンスを生成する `resolve` という関数を受け取ります。これにより、レスポンスのヘッダーやボディを変更したり、SvelteKitを完全にバイパスすることができます (例えば、プログラムでエンドポイントを実装する場合など)。

> (プリレンダリング済みのページを含む) 静的アセットに対するリクエストは SvelteKit では処理されません。

未実装の場合、デフォルトでは `({ request, resolve }) => resolve(request)` となります。

```ts
// Declaration types for Hooks
// * declarations that are not exported are for internal use

// type of string[] is only for set-cookie
// everything else must be a type of string
type ResponseHeaders = Record<string, string | string[]>;
type RequestHeaders = Record<string, string>;

export type RawBody = null | Uint8Array;
export interface IncomingRequest {
	method: string;
	host: string;
	path: string;
	query: URLSearchParams;
	headers: RequestHeaders;
	rawBody: RawBody;
}

type ParameterizedBody<Body = unknown> = Body extends FormData
	? ReadOnlyFormData
	: (string | RawBody | ReadOnlyFormData) & Body;
// ServerRequest is exported as Request
export interface ServerRequest<Locals = Record<string, any>, Body = unknown>
	extends IncomingRequest {
	params: Record<string, string>;
	body: ParameterizedBody<Body>;
	locals: Locals; // populated by hooks handle
}

type StrictBody = string | Uint8Array;
// ServerResponse is exported as Response
export interface ServerResponse {
	status: number;
	headers: ResponseHeaders;
	body?: StrictBody;
}

export interface Handle<Locals = Record<string, any>, Body = unknown> {
	(input: {
		request: ServerRequest<Locals, Body>;
		resolve(request: ServerRequest<Locals, Body>): ServerResponse | Promise<ServerResponse>;
	}): ServerResponse | Promise<ServerResponse>;
}
```

エンドポイントに渡されるリクエストにカスタムデータを追加するには、以下のように `request.locals` オブジェクトにデータを投入します。

```js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ request, resolve }) {
	request.locals.user = await getUserInformation(request.headers.cookie);

	const response = await resolve(request);

	return {
		...response,
		headers: {
			...response.headers,
			'x-custom-header': 'potato'
		}
	};
}
```

[`sequence` ヘルパー関数](#modules-sveltejs-kit-hooks)を使用すると、複数の `handle` 関数呼び出しを追加することができます。

### handleError

もしレンダリング中にエラーがスローされたら、`error` とそれを引き起こした `request` を引数にこの関数が呼び出されます。これによってデータをエラートラッキングサービスに送ったり、エラーをコンソールに出力する前にフォーマットをカスタマイズしたりすることができます。

開発中、もし Svelte コードで構文エラーが発生した場合、エラー場所をハイライトする `frame` プロパティが追加されます。

未実装の場合、SvelteKitはデフォルトのフォーマットでエラーをログ出力します。

```ts
// Declaration types for handleError hook

export interface HandleError<Locals = Record<string, any>, Body = unknown> {
	(input: { error: Error & { frame?: string }; request: ServerRequest<Locals, Body> }): void;
}
```

```js
/** @type {import('@sveltejs/kit').HandleError} */
export async function handleError({ error, request }) {
	// example integration with https://sentry.io/
	Sentry.captureException(error, { request });
}
```

> `handleError` は例外がキャッチされていない場合にのみ呼び出されます。ページやエンドポイントが明示的に 4xx や 5xx ステータスコードで応答した場合は呼び出されません。

### getSession

この関数は、`request` オブジェクトを引数に取り、[クライアントからアクセス可能](#modules-$app-stores)な `session` オブジェクトを返します。つまり `session` オブジェクトはユーザーに公開しても安全でなければなりません。この関数はSvelteKitがページをサーバーレンダリングする際に実行されます。

未実装の場合、session は `{}` です。

```ts
// Declaration types for getSession hook

export interface GetSession<Locals = Record<string, any>, Body = unknown, Session = any> {
	(request: ServerRequest<Locals, Body>): Session | Promise<Session>;
}
```

```js
/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(request) {
	return request.locals.user
		? {
				user: {
					// only include properties needed client-side —
					// exclude anything else attached to the user
					// like access tokens etc
					name: request.locals.user.name,
					email: request.locals.user.email,
					avatar: request.locals.user.avatar
				}
		  }
		: {};
}
```

> `session` はシリアライズ可能でなければなりません。つまり、関数やカスタムクラスなどを含んではならず、JavaScriptの組み込みデータ型だけでなければいけません

### externalFetch

この関数によって、サーバー上で (またはプリレンダリング中に) 実行される `load` 関数の中で発生する、外部リソースへの `fetch` リクエストを変更 (または置換) することができます。

例えば、ユーザーがクライアントサイドで `https://api.yourapp.com` のようなパブリックなURLに移動をするときには、`load` 関数でそのURLにリクエストを行うかもしれません。しかしSSRでは、(パブリックなインターネットとの間にあるプロキシーやロードバランサーをバイパスして) 直接 API にアクセスするほうが理にかなっている場合があります。

```ts
// Declaration types for externalFetch hook

export interface ExternalFetch {
	(req: Request): Promise<Response>;
}
```

```js
/** @type {import('@sveltejs/kit').ExternalFetch} */
export async function externalFetch(request) {
	if (request.url.startsWith('https://api.yourapp.com/')) {
		// clone the original request, but change the URL
		request = new Request(
			request.url.replace('https://api.yourapp.com/', 'http://localhost:9999/'),
			request
		);
	}

	return fetch(request);
}
```
