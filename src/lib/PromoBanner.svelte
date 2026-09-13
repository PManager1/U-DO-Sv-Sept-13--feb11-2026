<script lang="ts">
	let { banners }: { banners: any[] } = $props();
</script>

<section class="mb-8">
	<div class="flex flex-col md:flex-row gap-3">
		{#each banners as banner}
			<div class="flex-1 relative rounded-2xl overflow-hidden min-h-[160px] flex items-center" style={`background-color:${banner.bgColor}`}>
				<div class="relative z-10 p-5 sm:p-6 text-white w-2/3">
					<h3 class="text-lg sm:text-xl font-extrabold leading-tight whitespace-pre-line">{banner.title}</h3>
					{#if banner.subtitle}
						<p class="text-sm opacity-90 mt-1 font-medium">{banner.subtitle}</p>
					{/if}
					<a href="/" class="inline-block mt-3 bg-white text-gray-900 font-bold text-sm px-4 py-2 rounded-full hover:bg-gray-100 transition">{banner.cta}</a>
				</div>
				{#if banner.image}
					<div class="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-center opacity-70">
						<img src={banner.image} alt="" class="h-full w-full object-contain" />
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>
