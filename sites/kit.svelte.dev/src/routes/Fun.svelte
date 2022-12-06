<div class="heading">
	<p class="definition">
		<span>adjective</span> <em>/svelt/</em> attractively thin, graceful and stylish
	</p>
</div>

<div class="container">
	<div class="description">
		Svelte's a compiler that turns <code>&lt;h1&gt;Hello &lcub;name&rcub;!&lt;/h1&gt;</code> into:

		<div class="text"><pre class="language-typescript"><code>h1 <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">"h1"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
h1<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">`</span><span class="token string">Hello </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&lcub;</span>name<span class="token interpolation-punctuation punctuation">&rcub;</span></span><span class="token string">!</span><span class="token template-punctuation string">`</span></span><span class="token punctuation">;</span></code></pre></div>
		<br />
		<p>Svelte is easy, understandable, and fun, which is why developers consistently rank Svelte as the framework
					they're
					<a href="https://insights.stackoverflow.com/survey/2021#section-most-loved-dreaded-and-wanted-web-frameworks">most</a> <a href="https://tsh.io/state-of-frontend/#which-of-the-following-frameworks-would-you-like-to-learn-in-the-future">excited</a> <a href="https://2021.stateofjs.com/en-US/libraries/front-end-frameworks/">about</a> <a href="https://twitter.com/Rich_Harris/status/1589675637195042817">using</a>.

					<strong style="color: var(--sk-theme-2);">It's a love letter to web development.</strong></p>
		<br />
		<p>Don't take our word for it, hear what our users say…</p>
	</div>

	<div class="video">
		<video controls width="100%" preload="metadata" style="transform: scaleY(.9)">
			<source src="/svelte.webm" type="video/webm">
			Sorry, your browser doesn't support embedded videos.
		</video>
		Watch the full-length <a href="https://www.youtube.com/watch?v=kMlkCYL9qo0">Svelte Origins documentary on YouTube</a>.
	</div>

</div>

<style>
	.heading {
		margin-bottom: 2rem;
	}

	.container {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 20px;
	}

	.definition {
		font-size: var(--sk-text-l);
	}

	.definition span {
		text-transform: uppercase;
		font-size: var(--sk-text-s);
		color: var(--sk-text-3);
	}

	.definition em {
		font-style: italic;
		font-weight: 600;
		color: var(--sk-theme-1);
	}

	h3 {
		margin-bottom: 0.8rem;
	}

	.code-block {
		margin: 1rem 0;
		max-width: 500px;
	}

	.language-typescript {
		background-color:white;
		margin:0;
	}

	.description {
		line-height: 200%;
	}

	.quote {
		color: #40b3ff;
		font-size: 3rem;
		line-height: 1.1;
		max-width: 12em;
		margin-bottom: 1rem;
	}

	.author {
		font-weight: bold;
	}

	@media (min-width: 768px) {
		.container {
			grid-template-columns: repeat(10, minmax(0, 1fr));
		}
		.description {
			grid-column: span 4 / span 4;
			padding-right: 3rem;
			padding-top: 15px;
		}
		.video {
			grid-column: span 6 / span 6;
		}
	}
</style>
