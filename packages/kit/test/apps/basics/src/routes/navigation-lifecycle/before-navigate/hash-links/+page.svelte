<script>
	import { beforeNavigate } from '$app/navigation';

	let before_navigate_ran = false;

	beforeNavigate(() => {
		before_navigate_ran = true;
	});
</script>

<h1>before_navigate_ran: {before_navigate_ran}</h1>
<a href="#x">x</a>
