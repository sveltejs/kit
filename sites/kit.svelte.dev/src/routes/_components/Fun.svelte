<script>
	const quotes = [
		{ text: 'The popularity finally just got too great to ignore, so I finally just gave it a try and I fell in love.', author: 'Adam Rackis', title: 'Senior Web Engineer at Spotify' },
		{ text: 'I tried it and then I wanted to teach it immediately. I wanted to share it immediately. I wanted to build more things in it.', author: 'Scott Tolinski', title: 'Creator of Level Up Tutorials' },
		{ text: 'I use it for pretty much all the articles I work on. The thing I like most about Svelte is how fast you can move.', author: 'Aliza Aufrichtig', title: 'Graphics & Multimedia Editor at The New York Times' },
		{ text: "There's quite a bit of usage these days and satisfaction is I think the highest or one of the highest for any of the larger or more used JavaScript frameworks.", author: 'Amelia Wattenberger', title: 'Staff Research Engineer at Github Next' },
		{ text: 'I was considered a React expert and I could not be anywhere near as productive as I could be in Svelte.', author: 'Shawn Wang', title: 'Head of Developer Experience at Temporal.io' }
	];

	let i = 0;
	let quote = {};

	function update() {
		quote = quotes[i];
		i = (i + 1) % quotes.length;
		setTimeout(update, 5000);
	}

	update();
</script>

<div class="flex-container">

	<div class="flex-child text">
		<h3>Web development. <span style="font-weight:bold">But fun.</span></h3>
		Don't take our word for it, hear what our users say…
	</div>

	<div class="flex-child">
		<p class="quote">{quote.text}</p>
		<p><span class="author">{quote.author}</span><br/>{quote.title}</p>
	</div>

</div>

<style>
	.flex-container {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
	}

	.flex-child {
		flex: 1;
	}

	h3 {
		margin-bottom: 0.8rem;
	}

	.text {
		margin: 25px 0 0 0;
	}

	.quote {
		color: #40b3ff;
		font-size: 2rem;
	}

	.author {
		font-weight: bold;
	}
</style>
