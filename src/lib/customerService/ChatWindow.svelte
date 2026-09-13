<script lang="ts">
	import { onMount } from 'svelte';

	const autoReplies: Record<string, string[]> = {
		customer: ['Thank you for looking into this!', 'How long will this take to resolve?', 'Can I get an update please?', 'I appreciate the help 😊', 'Is there anything else you need from me?'],
		driver: ["I'm on my way now.", 'The restaurant was super busy.', 'I had an issue finding the address.', 'I can go back if needed.', 'Let me check and get back to you.'],
		merchant: ["We're preparing the order now.", 'The item is out of stock.', 'We can remake the order.', 'Our kitchen is backed up.', "We'll have it ready in 10 mins."]
	};

	let { chatWith, ticket, onClose }: {
		chatWith: any;
		ticket: any;
		onClose: () => void;
	} = $props();

	let messages = $state([
		{ from: 'system', text: `Chat started with ${chatWith.name} regarding ticket #${ticket.id}`, time: new Date() },
		{ from: chatWith.role, text: `Hi, this is ${chatWith.name}. I'm here to help resolve this issue.`, time: new Date() }
	]);
	let input = $state('');
	let messagesEnd: HTMLDivElement;

	$effect(() => {
		messagesEnd?.scrollIntoView({ behavior: 'smooth' });
	});

	function handleSend() {
		if (!input.trim()) return;
		messages = [...messages, { from: 'agent', text: input.trim(), time: new Date() }];
		input = '';
		setTimeout(() => {
			const replies = autoReplies[chatWith.role] || autoReplies.customer;
			const reply = replies[Math.floor(Math.random() * replies.length)];
			messages = [...messages, { from: chatWith.role, text: reply, time: new Date() }];
		}, 1000 + Math.random() * 1500);
	}

	const roleLabel = chatWith.role === 'customer' ? '👤' : chatWith.role === 'merchant' ? '🍕' : '🚗';
	const roleColor = chatWith.role === 'customer' ? 'bg-blue-500' : chatWith.role === 'merchant' ? 'bg-orange-500' : 'bg-green-500';
</script>

<div class="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
	<div class={`${roleColor} px-4 py-3 flex items-center justify-between`}>
		<div class="flex items-center gap-2">
			<span class="text-lg">{roleLabel}</span>
			<div>
				<p class="text-sm font-bold text-white">{chatWith.name}</p>
				<p class="text-[10px] text-white/80">Ticket #{ticket.id} · {chatWith.role}</p>
			</div>
		</div>
		<button onclick={onClose} class="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm transition">✕</button>
	</div>
	<div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
		{#each messages as msg, i}
			<div class={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
				<div class={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${msg.from === 'agent' ? 'bg-blue-500 text-white rounded-br-sm' : msg.from === 'system' ? 'bg-gray-200 text-gray-600 text-xs text-center w-full rounded-none' : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'}`}>
					{#if msg.from !== 'system' && msg.from !== 'agent'}
						<p class="text-[10px] font-semibold text-gray-500 mb-0.5">{msg.from === chatWith.role ? chatWith.name : 'You'}</p>
					{/if}
					<p>{msg.text}</p>
				</div>
			</div>
		{/each}
		<div bind:this={messagesEnd}></div>
	</div>
	<div class="p-3 border-t border-gray-200 bg-white">
		<div class="flex gap-2">
			<input type="text" value={input} oninput={(e) => (input = (e.currentTarget as HTMLInputElement).value)} onkeydown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." class="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
			<button onclick={handleSend} class="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold transition">Send</button>
		</div>
	</div>
</div>
