<div class="container">

	<div class="description">
		<h3>TypeScript and<br/>IDE support</h3>
		Type definitions for all APIs for first-class TypeScript support. And an official <a href="https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode">VS Code extension</a> and <a href="https://sveltesociety.dev/tools#editor-support">community support for numerous other editors</a> like Emacs, Vim, and Sublime Text.
	</div>

	<div>
		<div class="text"><pre data-file="src/routes/+page.ts" class="shiki twoslash lsp" style="background-color: var(--shiki-color-background); color: var(--shiki-color-text)"><div class="language-id">ts</div><div class="code-container"><code><div class="line"><span style="color: var(--shiki-token-keyword)">import</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-keyword)">type</span><span style="color: var(--shiki-color-text)"> &lcub; <data-lsp lsp="(alias) type PageLoad = Kit.<a href=&quot;/docs/types#sveltejs-kit-load&quot;>Load</a>&amp;lt;&lcub;&rcub;, Record&amp;lt;string, any> | null, Record&amp;lt;string, any>, void | Record&amp;lt;string, any>>&amp;#10;import PageLoad">PageLoad</data-lsp> &rcub; </span><span style="color: var(--shiki-token-keyword)">from</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-string-expression)">'./$types'</span><span style="color: var(--shiki-color-text)">;</span></div><div class="line">&nbsp;</div><div class="line"><span style="color: var(--shiki-token-comment)">// Try me! Hover the underlined code sections</span></div><div class="line"><span style="color: var(--shiki-token-keyword)">export</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)"><data-lsp lsp="function load(event: PageLoad): &lcub;&amp;#10;    some: string;&amp;#10;&rcub;">load</data-lsp></span><span style="color: var(--shiki-color-text)">(<data-lsp lsp="(parameter) event: PageLoad">event</data-lsp></span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)"><data-lsp lsp="(alias) type PageLoad = Kit.<a href=&quot;/docs/types#sveltejs-kit-load&quot;>Load</a>&amp;lt;&lcub;&rcub;, Record&amp;lt;string, any> | null, Record&amp;lt;string, any>, void | Record&amp;lt;string, any>>&amp;#10;import PageLoad">PageLoad</data-lsp></span><span style="color: var(--shiki-color-text)">) &lcub;</span></div><div class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> &lcub;</span></div><div class="line"><span style="color: var(--shiki-color-text)">    <data-lsp lsp="(property) some: string">some</data-lsp></span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-string-expression)">'data'</span></div><div class="line"><span style="color: var(--shiki-color-text)">  &rcub;;</span></div><div class="line"><span style="color: var(--shiki-color-text)">&rcub;</span></div></code></div></pre></div>
	</div>

</div>

<style>
	.container {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 20px;
	}

	.description {
		padding-right: 50px;
	}

	h3 {
		margin-bottom: 0.8rem;
	}

	.shiki {
		background-color: white !important;
	}

	@media (min-width: 1024px) {
		.container {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
