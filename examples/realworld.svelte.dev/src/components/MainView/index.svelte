<script>
	import { session } from '$app/stores';
	import ArticleList from '../ArticleList/index.svelte';

	export let tab = 'all';
	export let tag = null;
	export let p;

	function your_feed() {
		tab = "feed";
		tag = null;
	}

	function global_feed() {
		tab = "all";
		tag = null;
	}
</script>

<div class="col-md-9">
	<div class="feed-toggle">
		<ul class="nav nav-pills outline-active">
			{#if $session.user}
				<li class="nav-item">
					<a href="." class='nav-link {tab === "feed" ? "active" : "" }' on:click={your_feed}>
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
				<a href="." class='nav-link {tab === "all" ? "active" : "" }' on:click={global_feed}>
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