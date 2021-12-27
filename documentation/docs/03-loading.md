---
title: Loading
---

ページやレイアウトを定義するコンポーネントは、コンポーネントが作成される前に実行される `load` 関数をエクスポートすることができます。この関数はサーバーサイドレンダリングとクライアントの両方で実行され、(例えば)ローディングスピナーを表示して `onMount` でデータをフェッチするといったような作業をすることなく、ページのデータを取得することができます。

```ts
// Declaration types for Loading
// * declarations that are not exported are for internal use

export interface LoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Stuff extends Record<string, any> = Record<string, any>,
	Session = any
> {
	page: {
		host: string;
		path: string;
		params: PageParams;
		query: URLSearchParams;
	};
	fetch(info: RequestInfo, init?: RequestInit): Promise<Response>;
	session: Session;
	stuff: Stuff;
}

export interface LoadOutput<
	Props extends Record<string, any> = Record<string, any>,
	Stuff extends Record<string, any> = Record<string, any>
> {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	stuff?: Stuff;
	maxage?: number;
}
```

ブログページの例では、以下のような `load` 関数が含まれています。

```html
<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page, fetch, session, stuff }) {
		const url = `/blog/${page.params.slug}.json`;
		const res = await fetch(url);

		if (res.ok) {
			return {
				props: {
					article: await res.json()
				}
			};
		}

		return {
			status: res.status,
			error: new Error(`Could not load ${url}`)
		};
	}
</script>
```

> `<script context="module">` であることにご注意ください。これは、コンポーネントがレンダリングされる前に `load` が実行されるのに必要なものです。コンポーネントインスタンスごとのコードは2つ目の `<script>` タグに記述する必要があります。

`load` は Next.js の `getStaticProps` や `getServerSideProps` に似ていますが、サーバーとクライアントの両方で動作する点が異なります。

`load` が何も返さない場合、SvelteKitは応答が返るまで他のルート(routes)に[フォールスルー](#routing-advanced-fallthrough-routes)するか、もしくは一般的な404で応答します。

SvelteKitの `load` は、以下のような特別なプロパティを持つ `fetch` の実装を受け取ります。

- サーバー上のクッキーにアクセスできます
- HTTPコールを発行することなく、アプリ自身のエンドポイントに対してリクエストを行うことができます
- 使用時にレスポンスのコピーを作成し、ハイドレーション(hydration)のために最初のページロードに埋め込んで送信します

`load` は [ページ](#routing-pages)、[レイアウト](#layouts)コンポーネントにのみ適用され (インポートされるコンポーネントには適用できません)、デフォルトのレンダリング設定ではサーバーとクライアントの両方で実行されます。

> `load` の中で呼び出されるコードについて:
>
> - ネイティブの `fetch` ではなく Sveltekitが提供する [`fetch`](#loading-input-fetch) ラッパーを使用する必要があります
> - `window` や `document` などの、ブラウザ固有のオブジェクトを参照してはいけません
> - クライアントに公開されるAPIキーやシークレットを直接参照するのではなく、必要なシークレットを使用するエンドポイントを呼び出す必要があります。

リクエスト前の状態をグローバル変数に保存しないでください。キャッシュやデータベース接続の保持など、横断的な関心事にのみ使用することを推奨します。

> サーバー上の共有状態を変更すると、現在のクライアントだけでなく全てのクライアントに影響します。

### Input

`load` 関数は、`page`、`fetch`、`session`、`stuff` の4つのフィールドを持つオブジェクトを受け取ります。`load` 関数はリアクティブなので、関数内でそれらのパラメータが使われている場合は、そのパラメータが変更されると再実行されます。具体的には、`page.query`、`page.path`、`session`、`stuff` が関数で使用されている場合、それらの値が変更されると再実行されます。関数宣言の中でパラメータを分割しているだけで、使用されていると見なされるのでご注意ください。上記の例の `load({ page, fetch, session, stuff })` 関数の場合、その関数のボディで `session` や `stuff` を使用していませんが、それらが変更されると再実行されます。もしこれを `load({ page, fetch })` のように書き換えれば、`page.params.slug` が変更されたときにのみ再実行されるようになります。同じリアクティビティが `page.params` にも適用されますが、実際に関数の中で使われているパラメータにのみ適用されます。もし `page.params.foo` が変更されたとしても、上記の例では `page.params.foo` にはアクセスしていないため、再実行されません。

#### page

`page` は `{ host, path, params, query }` というオブジェクトで、`host` には URL のホスト、`path` にはそのパス名、`params` は `path` とルート(route)のファイル名から抽出され、`query` は [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) のインスタンスです。`page` を変更しても現在のURLは更新されません。代わりに、[`goto`](#modules-$app-navigation) を使用してナビゲートする必要があります。

なので、上記の例が `src/routes/blog/[slug].svelte` であるとして、URL が `https://example.com/blog/some-post?foo=bar&baz&bizz=a&bizz=b` だったとしたら、以下は全て true になります。

- `page.host === 'example.com'`
- `page.path === '/blog/some-post'`
- `page.params.slug === 'some-post'`
- `page.query.get('foo') === 'bar'`
- `page.query.has('baz')`
- `page.query.getAll('bizz') === ['a', 'b']`

#### fetch

`fetch` はネイティブの `fetch` web API と同等であり、クレデンシャル付きのリクエストができます。クライアントとサーバーの両方のコンテキストで使用することができます。

> `fetch` がサーバーで実行される場合、その結果のレスポンスはシリアライズされ、レンダリング済のHTMLにインライン化されます。これにより、その後のクライアントサイドの `load` は、追加のネットワークリクエストなしで、同一のデータに即座にアクセスすることができます。

> クッキーは、ターゲットホストが Sveltekit アプリケーションと同じか、より特定のサブドメインである場合にのみ引き渡されます。

#### session

`session` は現在のリクエストに関連するサーバーからのデータ(例えば現在のユーザー情報)の受け渡しに使用することができます。デフォルトでは `undefined` です。使い方を学ぶには [`getSession`](#hooks-getsession) をご参照ください。

#### stuff

`stuff` は、レイアウトコンポーネントから子レイアウトコンポーネントと子ページコンポーネントに渡されるもので、使いたいものを埋め込むことができます。ルート(root)の `__layout.svelte` コンポーネントでは `{}` と同じですが、そのコンポーネントの `load` 関数が `stuff` プロパティを持つオブジェクトを帰す場合、それ以降の `load` 関数でそれが利用できるようになります。

### Output

`load` から Promise を返した場合、SvelteKit は Promise が解決するまでレンダリングを遅らせます。戻り値にはいくつかプロパティがあり、全てオプションです。

#### status

ページの HTTPステータスコードです。`error` を返す場合は `4xx` か `5xx` のレスポンスでなければなりません。`redirect` を返す場合は `3xx` のレスポンスでなければなりません。デフォルトは `200` です。

#### error

`load` で何か問題が発生した場合、`Error` オブジェクトか、`4xx` または `5xx` といったステータスコードとともにエラーを説明する `string` を返しましょう。

#### redirect

(ページが非推奨であるとか、もしくはログインが必要であるなどの理由で) ページがリダイレクトされるべきなら、`3xx` のステータスコードとともにリダイレクト先となる location を含む `string` を返しましょう。

#### maxage

ページをキャッシュさせるには、ページの max age を秒単位で表した `number` を返します。レンダリングページにユーザーデータが含まれる場合(`session`経由か、`load` 関数内のクレデンシャル付きの `fetch` など)、結果のキャッシュヘッダには `private` が含まれます。それ以外の場合は、CDN でキャッシュできるように `public` が含まれます。

これはページコンポーネントにのみ適用され、レイアウトコンポーネントには適用されません。

#### props

`load` 関数が `props` オブジェクトを返す場合、そのプロパティ(props)はレンダリング時にコンポーネントに渡されます。

#### stuff

これは既存の `stuff` とマージされ、後続のレイアウトコンポーネントやページコンポーネントの `load` 関数に渡されます。

これはレイアウトコンポーネントにのみ適用され、ページコンポーネントには適用されません。
