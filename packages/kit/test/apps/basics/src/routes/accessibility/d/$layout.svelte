<script>
	import { setNavigationAnnouncer } from '$app/a11y';

	setNavigationAnnouncer(title => 'Subnav to ' + title);	
</script>

<slot />
