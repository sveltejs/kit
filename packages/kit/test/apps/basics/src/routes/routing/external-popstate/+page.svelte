<h1>hello</h1>

<button
	onclick={() => {
		history.pushState({}, '', '/routing/external-popstate/does-not-exist');
	}}>go to /routing/external-popstate/does-not-exist</button
>
