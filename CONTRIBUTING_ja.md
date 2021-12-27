# SvelteKit 日本語翻訳ドキュメントへの貢献について

svelte-jp/kit は SvelteKit ドキュメントサイトの日本語化プロジェクトです。

このリポジトリは[sveltejs/kit](https://github.com/sveltejs/kit)をフォークして作成されており、ライセンスやコミュニティ・コラボレーションの精神についてはFork元を引き継ぎます。

> Svelte本体のドキュメントの日本語化プロジェクトのリポジトリは [svelte-jp/svelte-site-jp](https://github.com/svelte-jp/svelte-site-jp) です。


## 貢献するには

SvelteKitドキュメントの日本語翻訳に貢献する方法はたくさんあり、その多くはコードを書く必要もなければ、いきなり翻訳する必要もありません。

- 日本語ドキュメントサイト([https://kit.svelte.jp/](https://kit.svelte.jp/))を使ってみてください。気になるところや改善点があれば[Issueを開いて](#issueを作成する)お知らせください。
- 翻訳で貢献されたい場合は[翻訳作業について](#翻訳作業について)をチェックしてみてください。翻訳にはみなさんの協力が必要です。誤訳があっても誤字・脱字があっても単語が統一できていなくても構いません、後からみんなで良くしていければと考えています。

貢献は大歓迎です！もし貢献を迷っていたり、助けが必要であれば[Svelte日本のDiscord](https://discord.com/invite/YTXq3ZtBbx)で知らせてください。


## 翻訳作業について


### ドキュメントのディレクトリ構成

ドキュメントのファイルはこのリポジトリの `documentation` ディレクトリにあります。

- **Docs**
  - Docsは documentation/docs 配下にあります。
- **FAQ**
  - FAQは documentation/faq 配下にあります。 
- **Migrating**
  - Migratingは documentation/migrating 配下にあります。

```
documentation
├── docs
│   ├── 00-introduction.md      # <- Docs
│   ...
│
├── faq
│   ├── 00-other-resources.md   # <- FAQ
│   ...
│
└── migrating
    ├── 01-migrating.md         # <- Migrating
    ...

```

サイトのソース、TOPページの日本語訳は [svelte-jp/site](https://github.com/svelte-jp/sites) にあります。


### 翻訳の流れ


#### 1. 翻訳するドキュメントを選ぶ

翻訳が必要なドキュメントは[Issue](https://github.com/svelte-jp/kit/issues?q=is%3Aopen+is%3Aissue+label%3Atranslation)が作成されています。

まだ誰も着手していないものには`翻訳者募集中`というLabelがついています。翻訳したいものがあれば、Issueのコメントで知らせてください(堅苦しい挨拶などは不要で、「この翻訳やりましょうか？」と言っていただければOKです！)。

運営側から依頼する旨をコメントで返信しますので、その後に作業を開始してください。

もし翻訳したいドキュメントのIssueがなければ、Issueを作成してください。


#### 2. 翻訳作業

このリポジトリをForkし、ローカルにcloneしてください。

```
git clone https://github.com/{USER}/kit.git
```

[ドキュメントのディレクトリ構成](#ドキュメントのディレクトリ構成)を参考に、翻訳するドキュメントを見つけてください。

翻訳スタイルについては[翻訳スタイル](#翻訳スタイル)を参考にしてください。

> いきなり完璧な翻訳を目指さなくても大丈夫です。PRに間違いや誤字・脱字があっても大丈夫です。ちゃんとレビューをしますし、レビューで怒ったりしませんのでご安心ください。それより、あなたがこのプロジェクトに貢献するため時間と労力を割いてくれたことに感謝しかありません。


#### 3. lintの実行

lintを実行し、引っかかった箇所は修正してください。

```
npm run textlint
```

終わったらcommitし、Fork先にpushします。


#### 4. Pull Request作成

Fork元にPull Requestを提出してください。Pull RequestのコメントにはIssueの番号を含めてください。レビュー後、問題がなければマージされます。
PRに間違いや誤字・脱字、ガイドライン違反があっても大丈夫です。間違いを恐れないでください。


## 翻訳スタイル

[svelte-jp/svelte-site-jp の「翻訳スタイル」](https://github.com/svelte-jp/svelte-site-jp/blob/master/CONTRIBUTING_ja.md#%E7%BF%BB%E8%A8%B3%E3%82%B9%E3%82%BF%E3%82%A4%E3%83%AB) をご参照ください。


## ライセンス

このリポジトリは [sveltejs/kit](https://github.com/sveltejs/kit) をフォークして作成されており、ライセンス(MIT)を引き継いでいます。

このリポジトリに貢献することにより、あなたはあなたの貢献が[MIT license](https://github.com/svelte-jp/kit/blob/master/LICENSE)の下でライセンスされることに同意するものとします。
