<script>
	import { page } from '$app/stores';
	import DarkModeToggle from '../lib/DarkModeToggle.svelte';
	let currentPage = '';
	
	page.subscribe((value) => {
		currentPage = value.path;
	})
</script>

<nav>
	<ul>
		<li class:isActive={currentPage === '/'}><a href="." >Home</a></li>
		<li class:isActive={currentPage === '/about'}><a href="about" >About</a></li>
		<li class:isActive={currentPage === '/blog'}><a href="blog" >Blog</a></li>
	</ul>
	<DarkModeToggle/>
</nav>

<style>
    nav {
		display: flex;
		justify-content: center;
	}

	nav ul {
		margin: 0;
		padding: 20px 30px;
		display: flex;
		justify-content: center;
		align-items: center;
		list-style: none;
		background: url("/menu-background-light.svg") center top no-repeat;
		background-size: contain;
	}

	html[data-theme="dark"] nav ul{ 
		background-image: url("/menu-background.svg");
	}

	nav ul li {
		position: relative;
	}

	nav ul li a {
		margin: 10px 16px;
		color: var(--heading-color);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 10%;
		text-decoration: none;
		transition: color 0.2s linear;
	}

	nav ul li a:hover {
		color: var(--accent-color);
	}

	nav ul li.isActive::before {
		content: '';
		width: 12px;
		height: 10px;
		position: absolute;
		top: -28px;
		margin-left: auto;
		margin-right: auto;
		left: 0;
		right: 0;
		background-color: var(--accent-color);
		transform: rotate(45deg);
	}
</style>