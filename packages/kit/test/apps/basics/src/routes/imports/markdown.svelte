<script>
	import {marked} from 'marked';
</script>

<main>{@html marked.parse('this is some **markdown**')}</main>
