// Mock ticket data for Customer Service dashboard
export const tickets = [
	{
		id: 'TK-9928',
		category: 'missing-items',
		status: 'urgent',
		statusLabel: 'URGENT',
		minutesAgo: 28,
		categoryIcon: '🍕',
		issue: 'Missing Item (Customer says "No Drink")',
		customer: { name: 'Martha', rating: 4.8, phone: '+1-555-0101' },
		merchant: { name: "Joe's Burgers", tier: 'Elite 15%', phone: '+1-555-0201' },
		driver: { name: 'Carlos', lang: '🇲🇽 ES', phone: '+1-555-0301' },
		stage: 'delivered',
		lastSeen: '📍 Delivered 4 mins ago.',
		items: '2x Deluxe Burger, 1x Large Coke (Reported Missing)',
		totalValue: 45.5,
		udoSaved: 12.4,
		actions: [
			{ label: 'Refund $3.00', color: 'blue' },
			{ label: 'Send Courier with Drink', color: 'orange' },
			{ label: 'Call Merchant', color: 'gray' }
		]
	},
	{
		id: 'TK-4021',
		category: 'not-delivered',
		status: 'urgent',
		statusLabel: 'URGENT',
		minutesAgo: 52,
		categoryIcon: '🚗',
		issue: 'Driver marked delivered but customer never received food',
		customer: { name: 'Aisha', rating: 4.9, phone: '+1-555-0102' },
		merchant: { name: 'Tasty Kabob', tier: 'Elite 15%', phone: '+1-555-0202' },
		driver: { name: 'Jose', lang: '🇲🇽 ES', phone: '+1-555-0302' },
		stage: 'in-transit',
		lastSeen: '📍 Driver is 1.2 miles from drop-off.',
		items: '3x Chicken Kabob Plate, 1x Hummus, 2x Soda',
		totalValue: 67.8,
		udoSaved: 18.3,
		actions: [
			{ label: 'Call Driver', color: 'orange' },
			{ label: 'Call Customer', color: 'blue' },
			{ label: 'Full Refund $67.80', color: 'red' }
		]
	},
	{
		id: 'TK-5510',
		category: 'safety',
		status: 'critical',
		statusLabel: 'CRITICAL',
		minutesAgo: 8,
		categoryIcon: '🚨',
		issue: 'Customer reports driver was driving erratically and felt unsafe',
		customer: { name: 'David', rating: 5.0, phone: '+1-555-0103' },
		merchant: { name: 'Pizza Roma', tier: 'Standard', phone: '+1-555-0203' },
		driver: { name: 'Mike', lang: '🇺🇸 EN', phone: '+1-555-0303' },
		stage: 'in-transit',
		lastSeen: '📍 Driver pulled over on I-95 near exit 12.',
		items: '1x Large Pepperoni Pizza, 1x Garlic Knots',
		totalValue: 32.0,
		udoSaved: 8.5,
		actions: [
			{ label: 'Escalate to Safety Team', color: 'red' },
			{ label: 'Call Customer', color: 'blue' },
			{ label: 'Call Driver', color: 'orange' },
			{ label: 'Full Refund $32.00', color: 'red' }
		]
	},
	{
		id: 'TK-3307',
		category: 'restaurant-closed',
		status: 'in-progress',
		statusLabel: 'IN PROGRESS',
		minutesAgo: 35,
		categoryIcon: '🏪',
		issue: 'Driver arrived but restaurant is closed. Waited 15 mins.',
		customer: { name: 'Lisa', rating: 4.7, phone: '+1-555-0104' },
		merchant: { name: 'Dragon Wok', tier: 'Standard', phone: '+1-555-0204' },
		driver: { name: 'Ana', lang: '🇧🇷 PT', phone: '+1-555-0304' },
		stage: 'preparing',
		lastSeen: '📍 Driver has been at Restaurant for 15 mins.',
		items: '2x General Tso Chicken, 1x Fried Rice, 1x Spring Rolls',
		totalValue: 52.2,
		udoSaved: 14.1,
		actions: [
			{ label: 'Call Merchant', color: 'orange' },
			{ label: 'Reassign Driver', color: 'blue' },
			{ label: 'Cancel & Refund $52.20', color: 'red' }
		]
	},
	{
		id: 'TK-7745',
		category: 'missing-items',
		status: 'pending',
		statusLabel: 'PENDING',
		minutesAgo: 14,
		categoryIcon: '🍕',
		issue: 'Customer says sides were missing from the order',
		customer: { name: 'James', rating: 4.6, phone: '+1-555-0105' },
		merchant: { name: 'Smokehouse BBQ', tier: 'Premium 10%', phone: '+1-555-0205' },
		driver: { name: 'Luis', lang: '🇲🇽 ES', phone: '+1-555-0305' },
		stage: 'delivered',
		lastSeen: '📍 Delivered 10 mins ago.',
		items: '1x Brisket Plate, 1x Mac & Cheese (Missing), 1x Cornbread (Missing)',
		totalValue: 38.9,
		udoSaved: 9.8,
		actions: [
			{ label: 'Refund $8.50', color: 'blue' },
			{ label: 'Send Courier', color: 'orange' },
			{ label: 'Call Merchant', color: 'gray' }
		]
	},
	{
		id: 'TK-6690',
		category: 'safety',
		status: 'in-progress',
		statusLabel: 'IN PROGRESS',
		minutesAgo: 22,
		categoryIcon: '🚨',
		issue: 'Driver reports minor accident, no injuries, food spilled',
		customer: { name: 'Rachel', rating: 4.9, phone: '+1-555-0106' },
		merchant: { name: 'Sushi Palace', tier: 'Elite 15%', phone: '+1-555-0206' },
		driver: { name: 'Tom', lang: '🇺🇸 EN', phone: '+1-555-0306' },
		stage: 'in-transit',
		lastSeen: '📍 Driver stopped at Main St & 5th Ave.',
		items: '2x Dragon Roll, 1x Miso Soup, 1x Edamame',
		totalValue: 55.0,
		udoSaved: 15.2,
		actions: [
			{ label: 'Escalate to Safety Team', color: 'red' },
			{ label: 'Redo Order (Free)', color: 'orange' },
			{ label: 'Full Refund $55.00', color: 'red' }
		]
	}
];

export const categoryDefs = [
	{
		id: 'safety',
		title: 'Safety / Accident',
		description: 'A driver was in an accident or a customer felt unsafe.',
		priority: 'HIGHEST',
		priorityColor: 'text-red-600',
		priorityBg: 'bg-red-50 border-red-200',
		iconBg: 'bg-red-100',
		icon: '🚨'
	},
	{
		id: 'not-delivered',
		title: 'Order Not Delivered',
		description: 'Driver says "delivered," customer says "no."',
		priority: 'HIGH',
		priorityColor: 'text-orange-600',
		priorityBg: 'bg-orange-50 border-orange-200',
		iconBg: 'bg-orange-100',
		icon: '🚗'
	},
	{
		id: 'restaurant-closed',
		title: 'Restaurant Closed / Busy',
		description: "Driver arrives and the store isn't making the food.",
		priority: 'MEDIUM',
		priorityColor: 'text-yellow-600',
		priorityBg: 'bg-yellow-50 border-yellow-200',
		iconBg: 'bg-yellow-100',
		icon: '🏪'
	},
	{
		id: 'missing-items',
		title: 'Missing Items',
		description: 'The most common food ticket. Did the restaurant forget the drink?',
		priority: 'STANDARD',
		priorityColor: 'text-blue-600',
		priorityBg: 'bg-blue-50 border-blue-200',
		iconBg: 'bg-blue-100',
		icon: '🍕'
	}
];
