export const historyItems = [
	{ id: 'rh_1', name: 'Organic Bananas', price: 1.49, image: '', category: 'Fruits & Veggies', boughtCount: 8, lastOrderedDaysAgo: 2, available: true },
	{ id: 'rh_2', name: 'Whole Milk Gallon', price: 4.99, image: '', category: 'Dairy & Eggs', boughtCount: 6, lastOrderedDaysAgo: 3, available: true },
	{ id: 'rh_3', name: 'Organic Eggs (12pk)', price: 6.99, image: '', category: 'Dairy & Eggs', boughtCount: 5, lastOrderedDaysAgo: 4, available: true },
	{ id: 'rh_4', name: 'Sourdough Bread', price: 5.49, image: '', category: 'Bakery', boughtCount: 4, lastOrderedDaysAgo: 5, available: true },
	{ id: 'rh_5', name: 'Avocados (3pk)', price: 3.99, image: '', category: 'Fruits & Veggies', boughtCount: 4, lastOrderedDaysAgo: 6, available: false },
	{ id: 'rh_6', name: 'Whole Bean Coffee 12oz', price: 9.99, image: '', category: 'Beverages', boughtCount: 3, lastOrderedDaysAgo: 7, available: true },
	{ id: 'rh_7', name: 'Almond Butter', price: 9.99, image: '', category: 'Pantry', boughtCount: 3, lastOrderedDaysAgo: 9, available: true },
	{ id: 'rh_8', name: 'Spaghetti Pasta', price: 1.99, image: '', category: 'Pantry', boughtCount: 3, lastOrderedDaysAgo: 10, available: true },
	{ id: 'rh_9', name: 'Marinara Sauce', price: 3.49, image: '', category: 'Pantry', boughtCount: 2, lastOrderedDaysAgo: 10, available: true },
	{ id: 'rh_10', name: 'Greek Yogurt (32oz)', price: 5.99, image: '', category: 'Dairy & Eggs', boughtCount: 2, lastOrderedDaysAgo: 12, available: true },
	{ id: 'rh_11', name: 'Baby Spinach', price: 3.79, image: '', category: 'Fruits & Veggies', boughtCount: 2, lastOrderedDaysAgo: 14, available: false },
	{ id: 'rh_12', name: 'Frozen Mixed Berries', price: 6.49, image: '', category: 'Frozen', boughtCount: 2, lastOrderedDaysAgo: 18, available: true }
];

export const pastOrders = [
	{
		id: 'po_1',
		title: 'Order from Tuesday, Aug 1',
		date: 'Aug 1, 2026',
		items: [
			{ id: 'rh_1', name: 'Organic Bananas', qty: 2, price: 1.49 },
			{ id: 'rh_2', name: 'Whole Milk Gallon', qty: 1, price: 4.99 },
			{ id: 'rh_3', name: 'Organic Eggs (12pk)', qty: 1, price: 6.99 },
			{ id: 'rh_6', name: 'Whole Bean Coffee 12oz', qty: 1, price: 9.99 }
		]
	},
	{
		id: 'po_2',
		title: 'Order from Friday, Jul 26',
		date: 'Jul 26, 2026',
		items: [
			{ id: 'rh_4', name: 'Sourdough Bread', qty: 1, price: 5.49 },
			{ id: 'rh_5', name: 'Avocados (3pk)', qty: 1, price: 3.99 },
			{ id: 'rh_8', name: 'Spaghetti Pasta', qty: 2, price: 1.99 }
		]
	},
	{
		id: 'po_3',
		title: 'Order from Monday, Jul 20',
		date: 'Jul 20, 2026',
		items: [
			{ id: 'rh_7', name: 'Almond Butter', qty: 1, price: 9.99 },
			{ id: 'rh_10', name: 'Greek Yogurt (32oz)', qty: 1, price: 5.99 },
			{ id: 'rh_12', name: 'Frozen Mixed Berries', qty: 1, price: 6.49 }
		]
	}
];

export const favorites = ['rh_2', 'rh_6', 'rh_8'];

export const popularEssentials = [
	{ id: 'pe_1', name: 'Milk 1 Gallon', price: 4.99, image: '', category: 'Dairy & Eggs' },
	{ id: 'pe_2', name: 'Bananas', price: 1.49, image: '', category: 'Fruits & Veggies' },
	{ id: 'pe_3', name: 'Sourdough Bread', price: 5.49, image: '', category: 'Bakery' },
	{ id: 'pe_4', name: 'Eggs (12pk)', price: 6.99, image: '', category: 'Dairy & Eggs' },
	{ id: 'pe_5', name: 'Baby Carrots', price: 2.49, image: '', category: 'Fruits & Veggies' },
	{ id: 'pe_6', name: 'Chicken Breast', price: 8.99, image: '', category: 'Meat & Seafood' }
];

export const frequentlyBought = [
	{ id: 'fb_1', name: 'Pasta', price: 1.99, image: '', category: 'Pantry' },
	{ id: 'fb_2', name: 'Marinara Sauce', price: 3.49, image: '', category: 'Pantry' },
	{ id: 'fb_3', name: 'Parmesan Cheese', price: 5.49, image: '', category: 'Dairy & Eggs' },
	{ id: 'fb_4', name: 'Garlic Bread', price: 4.29, image: '', category: 'Bakery' }
];

export const demoZeroOrders = false;
