---
title: Layouts
---

ここまで、ページを完全に独立したコンポーネントとして扱ってきました — ナビゲーションを行うと、既存のコンポーネントは破棄され、新しいコンポーネントがその場所を引き継ぎます。

しかし、多くのアプリでは、トップレベルのナビゲーションやフッターなど、全てのページで表示されるべき要素が存在します。それらを全てのページで繰り返し書くのではなく、_レイアウト(layout)_ コンポーネントを使うことができます。

全てのページに適用されるレイアウトコンポーネントを作るには、`src/routes/__layout.svelte` というファイルを作成します。(自分で作成していない場合に使用される)デフォルトのレイアウトコンポーネントは、以下のようなものです…

```html
<slot></slot>
```

…ですが、お好みのマークアップ、スタイル、動作を追加できます。ただし、コンポーネントがページコンテンツ用の `<slot>` を含んでいる必要があります。例えば、ナビゲーションバー(nav bar)を追加してみるとしましょう。

```html
<!-- src/routes/__layout.svelte -->
<nav>
	<a href="/">Home</a>
	<a href="/about">About</a>
	<a href="/settings">Settings</a>
</nav>

<slot></slot>
```

`/`、`/about`、`/settings` 用のページを作成してみます…

```html
<!-- src/routes/index.svelte -->
<h1>Home</h1>
```

```html
<!-- src/routes/about.svelte -->
<h1>About</h1>
```

```html
<!-- src/routes/settings.svelte -->
<h1>Settings</h1>
```

...nav は常に表示され、3つのページリンクをそれぞれクリックすると、`<h1>` が置き換えられるだけです。

### Nested layouts

単一の `/settings` ページを持つのではなく、`/settings/profile` や `/settings/notifications` といったページを入れ子にしてサブメニューを共有するとします (実例としては、[github.com/settings](https://github.com/settings) をご覧ください)。

(Topレベルの nav を持つルートレイアウト(root layout)を継承しつつ) `/settings` 以下のページにのみ適用されるレイアウトを作成することができます。

```html
<!-- src/routes/settings/__layout.svelte -->
<h1>Settings</h1>

<div class="submenu">
	<a href="/settings/profile">Profile</a>
	<a href="/settings/notifications">Notifications</a>
</div>

<slot></slot>
```

### Resets

レイアウトスタックをリセットするには、`__layout.svelte` の代わりに、`__layout.reset.svelte` ファイルを作成します。例えば、`/admin/*` ページにはルートレイアウト(root layout)を継承させたくない場合は、`src/routes/admin/__layout.reset.svelte` というファイルを作成します。

レイアウトリセットは、それ以外は通常のレイアウトコンポーネントと同じです。

### Error pages

ページがロード([Loading](#loading)を参照)に失敗した場合、SvelteKitはエラーページをレンダリングします。レイアウトやページコンポーネントと一緒に `__error.svelte` コンポーネントを作ることで、このページをカスタマイズすることができます。

例えば、`src/routes/settings/notifications/index.svelte` でロードに失敗した場合、`src/routes/settings/notifications/__error.svelte` が存在すればSveltekitはそれを同じレイアウトでレンダリングします。もし存在しなければ、`src/routes/settings/__error.svelte` を親のレイアウトでレンダリングします。もしそれも存在しなければ、 `src/routes/__error.svelte` をルートレイアウト(root layout) でレンダリングします。

> SvelteKit はデフォルトのエラーページを提供してますが、ご自身で `src/routes/__error.svelte` を用意することを推奨します。

```ts
// declaration type
// * also see type for `LoadOutput` in the Loading section

export interface ErrorLoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Stuff extends Record<string, any> = Record<string, any>,
	Session = any
> extends LoadInput<PageParams, Stuff, Session> {
	status?: number;
	error?: Error;
}
```

エラーコンポーネントに [`load`](#loading) 関数がある場合、`error` プロパティと `status` プロパティが引数に渡されて呼び出されます。

```html
<script context="module">
	/** @type {import('@sveltejs/kit').ErrorLoad} */
	export function load({ error, status }) {
		return {
			props: {
				title: `${status}: ${error.message}`
			}
		};
	}
</script>

<script>
	export let title;
</script>

<h1>{title}</h1>
```

> ユーザーに特権的な情報が公開されないようにするため、本番環境では `error` からサーバーサイドのスタックトレースが取り除かれます。
