---
title: Introduction
---

### Before we begin

> SvelteKitはまだ開発早期段階で、1.0に到達するまでに変更される可能性があります。このドキュメントは作業途中のものです。もし行き詰まったら、[Discord チャットルーム](https://svelte.dev/chat)にどうぞ。
>
> Sapperからのアップグレードについては[移行ガイド](/migrating)をご覧ください。

### What is SvelteKit?

SvelteKitはとてもハイパフォーマンスなWebアプリを構築するためのフレームワークです。

モダンなベストプラクティスを全て取り入れたアプリを構築するのは、恐ろしく複雑です。これらのプラクティスには、必要最小限のコードのみをロードするための[ビルドの最適化](https://vitejs.dev/guide/features.html#build-optimizations)、[オフラインサポート](#service-workers)、ユーザーがナビゲーションを開始する前のページの[プリフェッチ](#anchor-options-sveltekit-prefetch)、HTMLの生成をランタイム又は[ビルド時](#ssr-and-javascript-prerender)に、[サーバー上](#ssr-and-javascript-ssr)又は[ブラウザ上](#ssr-and-javascript-router)で行うか[設定可能なレンダリング](#ssr-and-javascript)が含まれています。SvelteKitが全ての退屈な作業を行ってくれるので、あなたはクリエイティブな作業に専念することができます。

[Vite](https://vitejs.dev/) を [Svelte plugin](https://github.com/sveltejs/vite-plugin-svelte) 経由で使用しており、非常に高速で機能豊富な開発体験を提供します。[Hot Module Replacement (HMR)](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#hot)により、コードを変更すると即座にブラウザに反映されます。

このガイドを理解するためにSvelteを知っておく必要はありませんが、知っていれば役に立つでしょう。簡単にいうとSvelteは、コンポーネントを高度に最適化されたvanilla JavaScriptにコンパイルしてくれるUIフレームワークです。詳しくは、[Svelteを紹介するブログ記事](https://svelte.dev/blog/svelte-3-rethinking-reactivity)と[Svelteチュートリアル](https://svelte.dev/tutorial)を読んでみてください。

### Getting started

SvelteKitアプリを構築してみるのに最も簡単な方法は、`npm init` を実行することです:

```bash
npm init svelte@next my-app
cd my-app
npm install
npm run dev
```

最初のコマンドは、TypeScriptなどの基本的なツールをセットアップするか確認して `my-app` ディレクトリに新しいプロジェクトを生成します。[追加のツールの設定に関するポイント](https://kit.svelte.jp/faq#integrations)については、FAQをご覧ください。以降のコマンドは、依存関係をインストールし、 [localhost:3000](http://localhost:3000) でサーバーを起動します。

ここには2つの基本的なコンセプトがあります。

- アプリの各ページは [Svelte](https://svelte.jp) コンポーネントです
- プロジェクトの `src/routes` ディレクトリにファイルを追加することで、ページを作成できます。これらはサーバーでレンダリングされるのでユーザーの最初のアクセスの際に可能な限り速く表示されるようになり、それからクライアントサイドのアプリに引き継がれます。

ファイルを編集して、どのように動作するのか確かめてみてください。もしかしたら、もうこれ以降のガイドを読む必要はないかもしれません!

#### Editor setup

[Visual Studio Code (aka VS Code)](https://code.visualstudio.com/download) と [Svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) のご使用をおすすめしていますが、[他にも数多くのエディタをサポートしています](https://sveltesociety.dev/tools#editor-support)。
