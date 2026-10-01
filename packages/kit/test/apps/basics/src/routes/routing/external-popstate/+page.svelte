<h1>hello</h1>

<button
	on:click={() => {
		history.pushState({}, '', '/routing/external-popstate/does-not-exist');
	}}>go to /routing/external-popstate/does-not-exist</button
>
