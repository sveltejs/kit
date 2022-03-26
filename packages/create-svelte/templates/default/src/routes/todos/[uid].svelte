<script lang="ts">
	type Todo = {
		uid: string;
		text: string;
	};

	export let todo: Todo;
	export let previousUid: string;
	export let nextUid: string;
</script>

<svelte:head>
	<title>Todos</title>
</svelte:head>

<h1>Todo</h1>

<div class="row">
	<a
		class={previousUid === null ? 'arrow-left-disabled' : 'arrow-left-enable'}
		disabled={previousUid === null}
		href={previousUid === null ? '' : `/todos/${previousUid}`}>&nbsp;</a
	>
	<h2>
		{todo.text}
	</h2>
	<a
		class={nextUid === null ? 'arrow-right-disabled' : 'arrow-right-enable'}
		disabled={nextUid === null}
		href={nextUid === null ? '' : `/todos/${nextUid}`}>&nbsp;</a
	>
</div>

<style>
	.row {
		display: flex;
	}

	h2 {
		margin: auto;
		font-size: 28px;
	}

	.arrow-left-disabled {
		width: 0;
		height: 0;
		cursor: not-allowed;

		border-top: 16px solid transparent;
		border-bottom: 16px solid transparent;

		border-right: 20px solid var(--text-color);
	}

	.arrow-right-disabled {
		width: 0;
		height: 0;
		cursor: not-allowed;

		border-top: 16px solid transparent;
		border-bottom: 16px solid transparent;

		border-left: 20px solid var(--text-color);
	}

	.arrow-left-enable {
		width: 0;
		height: 0;
		border-top: 16px solid transparent;
		border-bottom: 16px solid transparent;

		border-right: 20px solid var(--accent-color);
	}

	.arrow-right-enable {
		width: 0;
		height: 0;
		border-top: 16px solid transparent;
		border-bottom: 16px solid transparent;

		border-left: 20px solid var(--accent-color);
	}
</style>
