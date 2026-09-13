<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import tokenManager from '$lib/tokenManager';
	import Sidebar from '$lib/mystore/Sidebar.svelte';
	import * as api from '$lib/mystore/api';

	let sidebarCollapsed = $state(false);
	let referralCode = $state('');
	let loading = $state(true);

	onMount(() => {
		if (!tokenManager.hasValidToken()) { goto('/login'); return; }
		sidebarCollapsed = window.innerWidth < 768;
		api.getProfile().then((profile: any) => { if (profile.referralCode) referralCode = profile.referralCode; }).catch((err) => console.error('Failed to load profile:', err)).finally(() => (loading = false));
	});

	const referralText = $derived(referralCode || '— — — —');

	function buildStripsHtml(extraText: boolean) {
		let stripsHtml = '';
		for (let i = 0; i < 15; i++) {
			stripsHtml += `
        <div class="strip">
          <div class="strip-headline">Tired of corporate apps ripping off your favorite local spots?</div>
          <div class="strip-sub">Order direct through U-DO. No hidden markups, service fees, or "priority delivery" fees.</div>
          <div class="strip-sub">Drivers keep 100% of delivery fees. Restaurants keep their profits.</div>
          <div class="strip-cta">Scan or visit <strong>UDOnow.com</strong> to support local food.</div>
          <div class="strip-code">VIP Activation Code: <strong>${referralText}</strong></div>
        </div>
        ${i < 14 ? '<div class="cutline">✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─</div>' : ''}
      `;
		}
		return stripsHtml;
	}

	function openPrintDoc(title: string, css: string, body: string) {
		const printWindow = window.open('', '_blank', 'width=800,height=600');
		if (!printWindow) return;
		printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,Helvetica,sans-serif}${css}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${body}</body></html>`);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => { printWindow.print(); }, 300);
	}

	function handlePrintHeader() {
		openPrintDoc('Marketing Flyer - Header', `
      .header{text-align:center;padding:40px 30px 30px;background:#fff;border-bottom:3px solid #f97316}
      .header-badge{display:inline-block;background:#f97316;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 16px;border-radius:20px;margin-bottom:18px}
      .header h1{font-size:22px;font-weight:800;color:#111;line-height:1.3;margin-bottom:12px}
      .header .subheadline{font-size:13px;color:#555;line-height:1.5;max-width:480px;margin:0 auto 18px}
      .header .cta{font-size:15px;color:#f97316;font-weight:700;margin-bottom:14px}
      .header .cta strong{color:#ea580c}
      .header .referral-box{display:inline-block;border:2px solid #f97316;border-radius:8px;padding:8px 24px;margin-top:4px}
      .header .referral-box .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px}
      .header .referral-box .code{font-size:20px;font-weight:800;color:#f97316;letter-spacing:3px}
      @media print{.header{padding:30px 20px 24px}}
    `, `<div class="header">
      <div class="header-badge">Support Local Food</div>
      <h1>Tired of corporate apps ripping off your favorite local spots?</h1>
      <p class="subheadline">Order direct through U-DO. We've completely eliminated the hidden menu markups, service fees, small-order penalties, "bag & packaging" and 'priority delivery' fees that the big apps slide onto your bill.</p>
      <p class="subheadline" style="margin-top:-10px">Our drivers keep 100% of their delivery fees, and our local restaurants keep their hard-earned profits.</p>
      <p class="cta">Scan or visit <strong>UDOnow.com</strong> to support local food.</p>
      <div class="referral-box"><div class="label">VIP Activation Code</div><div class="code">${referralText}</div></div>
    </div>`);
	}

	function handlePrintStrips() {
		openPrintDoc('Marketing Flyer - Tear-off Strips', `
      .tear-offs{padding:10px 20px 20px}
      .strip{text-align:center;padding:6px 10px}
      .strip-headline{font-size:10px;font-weight:700;color:#333;margin-bottom:2px}
      .strip-sub{font-size:9px;color:#555;margin-bottom:1px}
      .strip-cta{font-size:9px;color:#555;margin-bottom:1px}
      .strip-cta strong{color:#ea580c}
      .strip-code{font-size:10px;color:#f97316;font-weight:700}
      .strip-code strong{font-size:11px;letter-spacing:1px}
      .cutline{color:#ccc;font-size:10px;text-align:center;padding:1px 0;user-select:none}
      @media print{.tear-offs{padding:6px 14px 14px}}
    `, `<div class="tear-offs">${buildStripsHtml(false)}</div>`);
	}

	function handlePrintAll() {
		openPrintDoc('Marketing Flyer', `
      .header{text-align:center;padding:40px 30px 30px;background:#fff;border-bottom:3px solid #f97316}
      .header-badge{display:inline-block;background:#f97316;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 16px;border-radius:20px;margin-bottom:18px}
      .header h1{font-size:22px;font-weight:800;color:#111;line-height:1.3;margin-bottom:12px}
      .header .subheadline{font-size:13px;color:#555;line-height:1.5;max-width:480px;margin:0 auto 18px}
      .header .cta{font-size:15px;color:#f97316;font-weight:700;margin-bottom:14px}
      .header .cta strong{color:#ea580c}
      .header .referral-box{display:inline-block;border:2px solid #f97316;border-radius:8px;padding:8px 24px;margin-top:4px}
      .header .referral-box .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px}
      .header .referral-box .code{font-size:20px;font-weight:800;color:#f97316;letter-spacing:3px}
      .tear-offs{padding:10px 20px 20px}
      .strip{text-align:center;padding:6px 10px}
      .strip-headline{font-size:10px;font-weight:700;color:#333;margin-bottom:2px}
      .strip-sub{font-size:9px;color:#555;margin-bottom:1px}
      .strip-cta{font-size:9px;color:#555;margin-bottom:1px}
      .strip-cta strong{color:#ea580c}
      .strip-code{font-size:10px;color:#f97316;font-weight:700}
      .strip-code strong{font-size:11px;letter-spacing:1px}
      .cutline{color:#ccc;font-size:10px;text-align:center;padding:1px 0;user-select:none}
      @media print{.header{padding:30px 20px 24px}.tear-offs{padding:6px 14px 14px}}
    `, `<div class="header">
      <div class="header-badge">Support Local Food</div>
      <h1>Tired of corporate apps ripping off your favorite local spots?</h1>
      <p class="subheadline">Order direct through U-DO. We've completely eliminated the hidden menu markups, service fees, small-order penalties, "bag & packaging" and 'priority delivery' fees that the big apps slide onto your bill.</p>
      <p class="subheadline" style="margin-top:-10px">Our drivers keep 100% of their delivery fees, and our local restaurants keep their hard-earned profits.</p>
      <p class="cta">Scan or visit <strong>UDOnow.com</strong> to support local food.</p>
      <div class="referral-box"><div class="label">VIP Activation Code</div><div class="code">${referralText}</div></div>
    </div><div class="tear-offs">${buildStripsHtml(true)}</div>`);
	}
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-[#f9f7f5]">
		<div class="text-center">
			<div class="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-500 font-medium">Loading...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen flex bg-[#f9f7f5]">
		<Sidebar collapsed={sidebarCollapsed} onCollapse={() => (sidebarCollapsed = true)} />
		<div class="flex-1 flex flex-col min-w-0">
			<header class="print-hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
				<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<button onclick={() => (sidebarCollapsed = false)} class="md:hidden p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-100 rounded-lg transition" title="Open menu">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
						</button>
						<h1 class="text-lg font-bold text-gray-900">📄 Marketing Flyer</h1>
					</div>
				</div>
			</header>

			<main class="print-flyer-area flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
				{#if !referralCode}
					<div class="print-hidden mb-4 text-center">
						<div class="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">
							<span>⚠️</span>
							<span>No referral code set. Go to Menu Items page to set your referral code first.</span>
						</div>
					</div>
				{/if}

				<div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
					<div class="print-hidden flex justify-center py-3 bg-gray-50 border-b border-gray-100">
						<button onclick={handlePrintHeader} class="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-5 rounded-full text-sm transition shadow-sm hover:shadow-md">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
							Print Header
						</button>
					</div>

					<div class="bg-gradient-to-b from-orange-50 to-white px-6 py-8 text-center border-b-4 border-orange-400">
						<span class="inline-block bg-orange-500 text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1 rounded-full mb-5">Support Local small business</span>
						<h2 class="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight mb-3">Tired of corporate apps ripping off your favorite local spots?</h2>
						<p class="text-sm text-gray-500 leading-relaxed max-w-lg mx-auto mb-2">Order direct through U-DO. We've completely eliminated the hidden menu markups, service fees, small-order penalties, "bag & packaging" and 'priority delivery' fees that the big apps slide onto your bill.</p>
						<p class="text-sm text-gray-500 leading-relaxed max-w-lg mx-auto mb-5">Our drivers keep 100% of their delivery fees, and our local restaurants keep their hard-earned profits.</p>
						<p class="text-base font-bold text-orange-500 mb-4">Scan or visit <span class="text-orange-600">UDOnow.com</span> to support local food.</p>
						<div class="inline-block border-2 border-orange-400 rounded-xl px-6 py-3 bg-white">
							<p class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">VIP Activation Code</p>
							<p class="text-2xl font-extrabold text-orange-500 tracking-widest">{referralText}</p>
						</div>
					</div>

					<div class="print-hidden flex justify-center py-3">
						<button onclick={handlePrintStrips} class="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-5 rounded-full text-sm transition shadow-sm hover:shadow-md">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
							Print Tear-off Strips
						</button>
						<button onclick={handlePrintAll} class="ml-3 flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-5 rounded-full text-sm transition shadow-sm">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
							Print All
						</button>
					</div>

					<div class="px-4 py-3">
						{#each Array(15) as _, i}
							<div>
								<div class="py-2 text-center">
									<p class="text-xs font-bold text-gray-800 leading-tight">Tired of corporate apps ripping off your favorite local spots?</p>
									<p class="text-[11px] text-black mt-0.5">Order direct through U-DO. We've completely eliminated the hidden menu markups, service fees, 'bag & packaging' fee and 'priority delivery' fees that the big apps slide onto your bill.</p>
									<p class="text-[11px] text-gray-500 mt-0.5">Drivers keep 100% of delivery fees. Restaurants keep their profits.</p>
									<p class="text-[11px] mt-0.5 text-black">Scan or visit <span class="font-bold text-orange-500">UDOnow.com</span> to support local food.</p>
									<p class="text-xs font-bold text-orange-500 mt-0.5">VIP Activation Code: <span class="tracking-wide">{referralText}</span></p>
								</div>
								{#if i < 14}
									<div class="flex items-center gap-2 text-gray-300">
										<span class="text-xs">✂</span>
										<div class="flex-1 border-t-2 border-dashed border-gray-200"></div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="print-hidden mt-6 text-center">
					<p class="text-gray-400 text-sm">Use the buttons above to print each section — then cut along the dashed lines.</p>
				</div>
			</main>
		</div>
	</div>
{/if}
