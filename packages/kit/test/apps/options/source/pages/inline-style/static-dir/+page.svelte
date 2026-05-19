<div></div>

<p>
	Assets located in the static directory have their URL path transformed to '../../../asset.png'
	instead of './asset.png' like most assets that go through Vite's static asset handling
</p>

<style>
	div {
		background: url(/favicon.png?v=1);
		height: 128px;
		width: 128px;
	}
</style>
