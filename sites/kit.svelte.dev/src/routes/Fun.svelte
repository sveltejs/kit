<script>
	import CompilerOutput from './compiler-output.png';
</script>

<div>
	<h3>Web development. <br/><span style="font-weight:bold">But fun.</span></h3>

	Svelte's a compiler that turns <code>&lt;h1&gt;Hello &lcub;name&rcub;!&lt;/h1&gt;</code> into:

	<div>
		<img src={CompilerOutput} alt="JavaScript" />
	</div>

	No <code>useState</code>, <code>ref</code>, or virtual DOM.<br/>The work happens when you build your app - not when you run it.<br />
	That makes writing code fast, easy, understandable, and fun.
</div>

<div class="container">
	<div>
		Don't take our word for it, hear what our users say…<br/>
		<br/>
		<p class="quote">"I tried it and then I wanted to teach it immediately. I wanted to share it immediately. I wanted to build more things in it."</p>
		<p><span class="author">Scott Tolinski</span><br/>Creator of Level Up Tutorials</p>
	</div>

	<div>
		<video controls width="100%" preload="metadata">
			<source src="/svelte.webm" type="video/webm">
			Sorry, your browser doesn't support embedded videos.
		</video>
		Watch the full-length <a href="https://www.youtube.com/watch?v=kMlkCYL9qo0">Svelte Origins documentary on YouTube</a>.
	</div>

</div>

<style>
	.container {
		margin-top: 50px;
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 20px;
	}

	h3 {
		margin-bottom: 0.8rem;
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
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
