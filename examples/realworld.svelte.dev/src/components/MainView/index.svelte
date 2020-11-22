<script>
	import { getStores } from '/_app/main/runtime/stores';
	import ArticleList from '../ArticleList/index.svelte';

	export let tab = 'all';
	export let tag = null;
	export let p;

	const { session } = getStores();

	function yourFeed() {
		tab = "feed";
		tag = null;
	}

	function globalfeed() {
		tab = "all";
		tag = null;
	}
</script>

<div class="col-md-9">
	<div class="feed-toggle">
		<ul class="nav nav-pills outline-active">
			{#if $session.user}
				<li class="nav-item">
					<a href="." class='nav-link {tab === "feed" ? "active" : "" }' on:click='{yourFeed}'>
						Your Feed
					</a>
				</li>
			{:else}
				<li class="nav-item">
					<a href="/login" class='nav-link'>
						Your Feed
					</a>
				</li>
			{/if}

			<li class="nav-item">
				<a href="." class='nav-link {tab === "all" ? "active" : "" }' on:click='{globalfeed}'>
					Global Feed
				</a>
			</li>

			{#if tag}
				<li class="nav-item">
					<a href="." class='nav-link {tab === "tag" ? "active" : "" }' on:click='{() => tab = "tag"}'>
						<i class="ion-pound"></i> {tag}
					</a>
				</li>
			{/if}
		</ul>
	</div>

	<ArticleList {p} {tab} {tag}/>
</div>