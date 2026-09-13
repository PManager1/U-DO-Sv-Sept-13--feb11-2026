<script lang="ts">
	const rows = [
		{ label: 'Monthly Subscription Fee', pass: '$9.99/mo (or $99/yr)', udo: '$0.00' },
		{ label: 'Grocery Cost', pass: '$115.00 (~15% hidden markup)', udo: '$100.00 (Real store price)' },
		{ label: 'Delivery Fee', pass: '$0.00 (Waived by pass)', udo: '$10.00 (100% goes to driver)' },
		{ label: 'Service & Platform Fee', pass: '~$3.50–$5.00 (Reduced, but not $0)', udo: '$8.00 (Flat U-DO tier fee)' },
		{ label: 'Driver Tip', pass: '$5.00', udo: '$5.00' }
	];

	const hooks = [
		{
			title: 'The "Hidden Tax" Visual',
			message: 'Did you know your $9.99/mo subscription doesn\u2019t give you store prices?',
			body: 'Show a side-by-side receipt image. Highlight a gallon of milk: $3.99 at the store vs $4.79 on the subscription app. Show how 20 items add up to $15–$20 in "hidden taxes" that the pass doesn\u2019t cover.',
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{
			title: 'The "No Lock-In" Guarantee',
			message: 'Stop paying $100/year just to get "discounted" fees.',
			body: 'Subscribing to a pass just gives you permission to pay inflated grocery prices. U-DO gives you real shelf prices on Day 1 without requiring a credit card subscription.',
			icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
		},
		{
			title: 'The "Driver First" Angle',
			message: 'Where does your delivery fee actually go?',
			body: 'When you use giant apps, your money goes to corporate overhead while drivers get low base pay. On U-DO, your delivery fee goes directly to the driver picking your groceries, ensuring better service and faster deliveries.',
			icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
		}
	];
</script>

<svelte:head><title>Why U-DO wins · U-DO</title></svelte:head>

<div class="min-h-screen bg-cream text-gray-900">
	<div class="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-10">

				<!-- Hero -->
				<section class="relative overflow-hidden rounded-3xl border border-line shadow-soft bg-gradient-to-br from-cream via-white to-peach/25 animate-[riseIn_0.5s_ease-out]">
					<div class="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-peach/25 blur-3xl pointer-events-none"></div>
					<div class="absolute -bottom-24 -left-12 w-80 h-80 rounded-full bg-coral/10 blur-3xl pointer-events-none"></div>
					<div class="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-6 sm:p-12">
						<div>
							<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-coral bg-coral/10 px-3 py-1 rounded-full w-fit mb-5">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
								No subscription. No hidden markups.
							</span>
							<h1 class="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight leading-[1.05]">Your delivery pass hides the real cost.<br /><span class="text-coral">We don't.</span></h1>
							<p class="text-ink-soft mt-4 text-base leading-relaxed max-w-xl">Your subscription pass drops the $5 delivery fee, but it doesn't stop the app from charging you $1 to $3 extra on every single item in your cart. On a $100 grocery order, you are still paying $15+ in hidden markups plus service fees. With U-DO, you pay real store shelf prices—no markups, no $9.99/month subscription required.</p>
							<div class="flex flex-wrap items-center gap-3 mt-7">
								<a href="/" class="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-6 py-3 rounded-full shadow-lift transition active:scale-[0.98]">
									Start ordering
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
								</a>
								<a href="#math" class="inline-flex items-center gap-2 text-ink font-semibold px-6 py-3 rounded-full border border-line bg-white hover:border-coral hover:text-coral transition">
									See the math
								</a>
							</div>
						</div>

						<div class="rounded-2xl border border-white/70 bg-white/80 backdrop-blur p-5 shadow-soft">
							<p class="text-xs font-bold uppercase tracking-wide text-ink-soft mb-3">A $100 grocery order</p>
							<div class="space-y-3">
								{#each rows as row}
									<div class="flex items-center justify-between gap-2 text-sm">
										<span class="text-ink-soft">{row.label}</span>
										<div class="flex items-center gap-4 flex-shrink-0">
											<span class="text-ink-soft line-through decoration-line">{row.pass}</span>
											<span class="font-semibold text-fresh">{row.udo}</span>
										</div>
									</div>
								{/each}
								<div class="flex items-center justify-between gap-2 pt-3 border-t border-line">
									<span class="text-sm font-bold text-ink">Total out-of-pocket</span>
									<div class="flex items-center gap-4">
										<span class="text-sm font-semibold text-ink-soft line-through decoration-line">~$123.50–125.00</span>
										<span class="text-lg font-extrabold text-fresh">$123.00</span>
									</div>
								</div>
							</div>
							<p class="text-xs text-ink-soft mt-4">Instacart+ / Uber One / DashPass vs. U-DO</p>
						</div>
					</div>
				</section>

				<!-- Math comparison table -->
				<section id="math" class="mt-12 scroll-mt-24">
					<div class="mb-6 text-center">
						<h2 class="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">How the Math Proves U-DO Wins</h2>
						<p class="text-ink-soft mt-2 max-w-2xl mx-auto">A side-by-side comparison of a $100 store-shelf grocery order for a customer using Instacart+ (or Uber One / DashPass) versus U-DO.</p>
					</div>

					<div class="rounded-3xl border border-line bg-white shadow-soft overflow-hidden">
						<div class="hidden md:grid grid-cols-3 gap-0 px-6 py-4 bg-cream border-b border-line">
							<span class="text-sm font-bold text-ink">Cost Component</span>
							<span class="text-sm font-bold text-ink-soft">Instacart+ Subscriber</span>
							<span class="text-sm font-bold text-coral flex items-center gap-1.5">
								<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 13l4 4L19 7l-1.41-1.41L9 14.17l-2.59-2.58L5 13z" clip-rule="evenodd" /></svg>
								U-DO Customer
							</span>
						</div>
						{#each rows as row}
							<div class="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-0 px-6 py-4 border-b border-line last:border-0">
								<span class="text-sm font-semibold text-ink md:font-bold">{row.label}</span>
								<span class="text-sm text-ink-soft">{row.pass}</span>
								<span class="text-sm font-semibold text-ink md:text-coral">{row.udo}</span>
							</div>
						{/each}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-0 px-6 py-5 bg-coral/5">
							<span class="text-sm font-extrabold text-ink uppercase tracking-wide">Total out-of-pocket</span>
							<span class="text-sm font-bold text-ink-soft">~$123.50 – $125.00</span>
							<span class="text-xl font-extrabold text-fresh">$123.00</span>
						</div>
					</div>

					<div class="mt-6 rounded-2xl border border-line bg-white shadow-soft p-6 sm:p-8">
						<p class="text-lg text-ink leading-relaxed">Even with a paid subscription waiving their delivery fee, <span class="font-bold">U-DO still beats them on the final receipt</span>—and the customer didn't have to lock themselves into a $120/year membership. On a larger $150 basket, U-DO saves them nearly <span class="font-extrabold text-coral">$15.00 per trip</span>.</p>
					</div>
				</section>

				<!-- Marketing hooks -->
				<section class="mt-12">
					<h2 class="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mb-6">Why people are switching</h2>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
						{#each hooks as hook}
							<article class="bg-white rounded-3xl border border-line shadow-soft p-6 hover:shadow-lift hover:-translate-y-1 transition-all duration-200 flex flex-col">
								<div class="w-12 h-12 rounded-2xl bg-coral/10 text-coral flex items-center justify-center mb-4">
									<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={hook.icon} /></svg>
								</div>
								<h3 class="text-lg font-bold text-ink">{hook.title}</h3>
								<p class="text-sm font-semibold text-coral mt-2">{hook.message}</p>
								<p class="text-sm text-ink-soft mt-3 leading-relaxed">{hook.body}</p>
							</article>
						{/each}
					</div>
				</section>

				<!-- Closing CTA -->
				<section class="mt-12 rounded-3xl overflow-hidden relative bg-gradient-to-br from-coral to-coral-dark text-white p-8 sm:p-12 text-center shadow-lift">
					<div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
					<h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight">See the real shelf price today.</h2>
					<p class="text-white/85 mt-3 max-w-xl mx-auto">No membership. No markups. Your delivery fee goes straight to your driver.</p>
					<a href="/" class="inline-flex items-center gap-2 bg-white text-coral font-bold px-8 py-3.5 rounded-full shadow-lift transition hover:bg-cream active:scale-[0.98] mt-7">
						Start ordering
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
					</a>
				</section>

			</div>
</div>
