<script lang="ts">
	let { dataUrl = $bindable(''), isEmpty = $bindable(true) } = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let drawing = $state(false);
	let ctx: CanvasRenderingContext2D | null = null;
	let last = $state<{ x: number; y: number } | null>(null);

	function getCtx() {
		if (ctx) return ctx;
		if (canvas) {
			ctx = canvas.getContext('2d');
			canvas.width = canvas.offsetWidth || 400;
			canvas.height = 180;
			ctx!.fillStyle = '#fff';
			ctx!.fillRect(0, 0, canvas.width, canvas.height);
		}
		return ctx;
	}

	function pos(e: PointerEvent) {
		const r = canvas!.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	function onPointerDown(e: PointerEvent) {
		drawing = true;
		last = pos(e);
		(canvas as HTMLCanvasElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!drawing || !canvas) return;
		const c = getCtx();
		if (!c) return;
		const p = pos(e);
		c.lineWidth = 2;
		c.lineCap = 'round';
		c.lineJoin = 'round';
		c.strokeStyle = '#000';
		c.beginPath();
		c.moveTo(last ? last.x : p.x, last ? last.y : p.y);
		c.lineTo(p.x, p.y);
		c.stroke();
		last = p;
	}

	function onPointerUp() {
		if (!drawing) return;
		drawing = false;
		isEmpty = false;
		if (canvas) dataUrl = canvas.toDataURL('image/png');
	}

	function clearSignature() {
		if (!canvas) return;
		const c = getCtx();
		c?.clearRect(0, 0, canvas.width, canvas.height);
		c?.fillRect(0, 0, canvas.width, canvas.height);
		last = null;
		dataUrl = '';
		isEmpty = true;
	}
</script>

<div class="border border-gray-300 rounded-lg overflow-hidden bg-white" style="touch-action:none">
	<canvas
		bind:this={canvas}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointerleave={onPointerUp}
		class="w-full"
		style="height:180px; display:block; touch-action:none"
	></canvas>
</div>
<button type="button" onclick={clearSignature} class="mt-2 text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer">Clear signature</button>
