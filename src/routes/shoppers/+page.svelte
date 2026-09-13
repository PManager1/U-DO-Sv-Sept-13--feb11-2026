<script lang="ts">
	import { openSignIn, openSignUp } from '$lib/authModal.svelte';
	import SignInModal from '$lib/SignInModal.svelte';
	import SignUpModal from '$lib/SignUpModal.svelte';

	const steps = [
		{ n: '1', title: 'Apply in minutes', body: 'Sign up with your name and phone. Approval usually takes just a few hours.' },
		{ n: '2', title: 'Get approved', body: 'A quick background check and you are ready to start accepting shop requests.' },
		{ n: '3', title: 'Shop & earn', body: 'Pick the hours that fit your life. Shop the order, get it delivered, and get paid.' }
	];

	const benefits = [
		{
			title: 'Your fee, your pay',
			body: 'Your delivery fee goes straight to you — not into corporate overhead. Fair pay for the work you do.',
			icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{
			title: 'Shop on your schedule',
			body: 'No minimum hours, no forced shifts. Go online when it works for you and go offline when you need to.',
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{
			title: 'Earn weekly',
			body: 'Get paid on a reliable schedule. Track your earnings in real time and cash out with confidence.',
			icon: 'M4 5h16v14H4V5zm2 4h12M4 10h16M6 14h4m8 0h0'
		}
	];
</script>

<svelte:head><title>Become a Shopper · U-DO</title></svelte:head>

<div class="min-h-dvh flex flex-col bg-cream text-ink pb-[env(safe-area-inset-bottom)]">
	<!-- Header -->
	<header class="sticky top-0 z-50 bg-cream/85 backdrop-blur-md border-b border-line">
		<div class="max-w-[1400px] mx-auto px-3 sm:px-6">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-2">
					<a href="/" class="text-[28px] font-bold tracking-tight"><span class="text-coral">U-</span><span class="text-gray-800">DO</span></a>
					<span class="hidden sm:inline-flex items-center text-xs font-semibold text-coral bg-coral/10 px-2.5 py-1 rounded-full">For Shoppers</span>
				</div>
				<button onclick={() => openSignIn()} class="text-sm font-semibold text-ink hover:text-coral transition">Sign in</button>
			</div>
		</div>
	</header>

	<main class="flex-1 w-full">
		<div class="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-12">

			<!-- Hero -->
			<section class="relative overflow-hidden rounded-3xl border border-line shadow-soft bg-gradient-to-br from-cream via-white to-peach/25 animate-[riseIn_0.5s_ease-out]">
				<div class="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-peach/25 blur-3xl pointer-events-none"></div>
				<div class="absolute -bottom-24 -left-12 w-80 h-80 rounded-full bg-coral/10 blur-3xl pointer-events-none"></div>
				<div class="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center p-6 sm:p-12">
					<div>
						<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-coral bg-coral/10 px-3 py-1 rounded-full w-fit mb-5">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0l3 3m-3-3l-3 3m9-9a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							Earn on your terms
						</span>
						<h1 class="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight leading-[1.05]">Shop. Earn.<br /><span class="text-coral">On your terms.</span></h1>
						<p class="text-black mt-4 text-base leading-relaxed max-w-xl">Turn your spare hours into real earnings. Shop orders, set your own schedule, and get paid weekly — no minimum hours, no forced shifts. Your delivery fee goes straight to you.</p>
						<div class="flex flex-wrap items-center gap-3 mt-7">
							<button onclick={openSignUp} class="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-6 py-3 rounded-full shadow-lift transition active:scale-[0.98]">
								Become a shopper
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
							</button>
							<a href="#how-it-works" class="inline-flex items-center gap-2 text-ink font-semibold px-6 py-3 rounded-full border border-line bg-white hover:border-coral hover:text-coral transition">See how it works</a>
						</div>
					</div>

					<div class="rounded-2xl border border-white/70 bg-white/85 backdrop-blur p-5 shadow-soft">
						<p class="text-xs font-bold uppercase tracking-wide text-black mb-3">Earnings estimate</p>
						<div class="flex items-end gap-2 mb-4">
							<span class="text-4xl font-extrabold text-ink">$[X]</span>
							<span class="text-sm text-black mb-1">/hr</span>
						</div>
						<div class="space-y-3">
							{#each [
								{ label: 'Shop requests this week', value: '12' },
								{ label: 'Hours online', value: '18' },
								{ label: 'Estimated weekly pay', value: '$[X]' }
							] as stat}
								<div class="flex items-center justify-between text-sm">
									<span class="text-black">{stat.label}</span>
									<span class="font-bold text-ink">{stat.value}</span>
								</div>
							{/each}
						</div>
						<p class="text-xs text-black mt-4">Estimates shown for illustration. Your earnings depend on demand and hours.</p>
					</div>
				</div>
			</section>

			<!-- Trust strip -->
			<section class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
				{#each ['Flexible hours', 'Weekly pay', 'No minimum hours'] as t}
					<div class="bg-white rounded-2xl border border-line shadow-soft p-5 flex items-center gap-3">
						<div class="w-9 h-9 rounded-full bg-coral/10 text-coral flex items-center justify-center">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
						</div>
						<span class="font-semibold text-ink">{t}</span>
					</div>
				{/each}
			</section>

			<!-- How it works -->
			<section id="how-it-works" class="mt-14 scroll-mt-24">
				<h2 class="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mb-8">How it works</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
					{#each steps as step}
						<article class="bg-white rounded-3xl border border-line shadow-soft p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200">
							<div class="w-10 h-10 rounded-full bg-coral text-white font-extrabold flex items-center justify-center mb-4">{step.n}</div>
							<h3 class="text-lg font-bold text-ink">{step.title}</h3>
							<p class="text-sm text-black mt-2 leading-relaxed">{step.body}</p>
						</article>
					{/each}
				</div>
			</section>

			<!-- Benefits -->
			<section class="mt-14">
				<h2 class="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mb-8">Why shop with U-DO</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
					{#each benefits as b}
						<article class="bg-white rounded-3xl border border-line shadow-soft p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200">
							<div class="w-12 h-12 rounded-2xl bg-coral/10 text-coral flex items-center justify-center mb-4">
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={b.icon} /></svg>
							</div>
							<h3 class="text-lg font-bold text-ink">{b.title}</h3>
							<p class="text-sm text-black mt-2 leading-relaxed">{b.body}</p>
						</article>
					{/each}
				</div>
			</section>

			<!-- Sign in + app download -->
			<section class="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-5">
				<div class="bg-white rounded-3xl border border-line shadow-soft p-8 flex flex-col justify-center">
					<h2 class="text-2xl font-extrabold text-ink tracking-tight">Already a shopper?</h2>
					<p class="text-black mt-2">Sign in to see your schedule, track earnings, and accept shop requests.</p>
					<div class="flex flex-wrap gap-3 mt-6">
						<button onclick={() => openSignIn()} class="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-6 py-3 rounded-full shadow-soft transition active:scale-[0.98]">Sign in</button>
					</div>
				</div>
				<div class="bg-white rounded-3xl border border-line shadow-soft p-8 flex flex-col justify-center">
					<h2 class="text-2xl font-extrabold text-ink tracking-tight">Download the shopper app</h2>
					<p class="text-black mt-2">Get the U-DO Shopper app to manage orders on the go.</p>
					<div class="flex flex-wrap gap-3 mt-6">
						<a href="#" class="inline-flex items-center gap-2 bg-ink text-white font-semibold px-5 py-3 rounded-full shadow-soft transition hover:bg-black active:scale-[0.98]">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6 3a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V6a3 3 0 00-3-3H6zM8 8h8M8 12h8M8 16h5" /></svg>
							App Store
						</a>
						<a href="#" class="inline-flex items-center gap-2 bg-ink text-white font-semibold px-5 py-3 rounded-full shadow-soft transition hover:bg-black active:scale-[0.98]">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4M12 4l-2 2M12 4l2 2M7 7h10v8H7V7zm0 8l-2 3h14l-2-3" /></svg>
							Google Play
						</a>
					</div>
				</div>
			</section>

			<!-- Closing CTA -->
			<section class="mt-14 rounded-3xl overflow-hidden relative bg-gradient-to-br from-coral to-coral-dark text-white p-8 sm:p-12 text-center shadow-lift">
				<div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
				<h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight">Start earning today.</h2>
				<p class="text-white/85 mt-3 max-w-xl mx-auto">Set your hours. Shop. Get paid weekly.</p>
				<button onclick={openSignUp} class="inline-flex items-center gap-2 bg-white text-coral font-bold px-8 py-3.5 rounded-full shadow-lift transition hover:bg-cream active:scale-[0.98] mt-7">
					Become a shopper
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
				</button>
			</section>

		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-line bg-white mt-6">
		<div class="max-w-[1400px] mx-auto px-3 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
			<p class="text-xl font-bold"><span class="text-coral">U-</span><span class="text-gray-800">DO</span></p>
			<div class="flex items-center gap-5 text-sm text-black">
				<a href="/privacy/" class="hover:text-coral transition">Privacy Policy</a>
				<a href="/terms/" class="hover:text-coral transition">Terms</a>
				<a href="/contact-us/" class="hover:text-coral transition">Help</a>
			</div>
			<p class="text-sm text-black">© 2026 U-DO, Inc. All rights reserved.</p>
		</div>
	</footer>
</div>

<SignInModal />
<SignUpModal />
