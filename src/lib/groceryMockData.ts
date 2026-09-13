export const stores = [
	{
		id: 'store_0',
		name: 'Joy Luck House',
		logo: 'https://img.cdn4dd.com/p/fit=contain,width=1200,height=76,format=auto,quality=95/media/restaurant/cover_square/de50cbd9-913c-4962-ae1e-c1a9aea5992e.png',
		banner: 'https://img.cdn4dd.com/cdn-cgi/image/fit=cover,width=1000,height=300,format=auto,quality=80/https://doordash-static.s3.amazonaws.com/media/store/header/98e3bc80-2bcd-451b-b5ea-b3327c881b0b.jpg',
		type: 'restaurant',
		eta: '25-40 min',
		deliveryFee: '$2.99',
		rating: 5.0,
		reviewCount: 523,
		distance: '1.2 mi',
		badges: ['Popular', 'Chinese'],
		tags: ['restaurant']
	},
	{
		id: 'store_1',
		name: "Trader Joe's",
		logo: '',
		type: 'grocery',
		eta: '15-25 min',
		deliveryFee: '$1.99',
		rating: 4.6,
		reviewCount: 342,
		distance: '0.8 mi',
		badges: ['Epic deals', 'SNAP'],
		tags: ['grocery', 'convenience']
	},
	{
		id: 'store_2',
		name: 'Whole Foods Market',
		logo: '',
		type: 'grocery',
		eta: '20-35 min',
		deliveryFee: '$3.99',
		rating: 4.4,
		reviewCount: 567,
		distance: '1.2 mi',
		badges: ['Organic', 'SNAP'],
		tags: ['grocery']
	},
	{
		id: 'store_3',
		name: '7-Eleven',
		logo: '',
		type: 'convenience',
		eta: '10-20 min',
		deliveryFee: '$0.99',
		rating: 4.1,
		reviewCount: 189,
		distance: '0.3 mi',
		badges: ['Fastest'],
		tags: ['convenience']
	},
	{
		id: 'store_4',
		name: 'Walgreens',
		logo: '',
		type: 'retail',
		eta: '15-25 min',
		deliveryFee: '$1.99',
		rating: 4.2,
		reviewCount: 234,
		distance: '0.6 mi',
		badges: ['Retail'],
		tags: ['retail', 'convenience']
	},
	{
		id: 'store_5',
		name: 'BevMo!',
		logo: '',
		type: 'retail',
		eta: '25-40 min',
		deliveryFee: '$2.99',
		rating: 4.5,
		reviewCount: 178,
		distance: '1.5 mi',
		badges: ['Alcohol'],
		tags: ['retail', 'alcohol']
	},
	{
		id: 'store_6',
		name: 'Aldi',
		logo: '',
		type: 'grocery',
		eta: '15-30 min',
		deliveryFee: '$1.49',
		rating: 4.3,
		reviewCount: 423,
		distance: '1.0 mi',
		badges: ['Epic deals'],
		tags: ['grocery']
	}
];

export const popularStores = [
	{ id: 'pop_1', name: "Domino's", image: '', rating: 4.3, reviewCount: 890, distance: '0.5 mi', deliveryFee: '$0.99', eta: '20-30 min', priceRange: '$$' },
	{ id: 'pop_2', name: 'Pizza Hut', image: '', rating: 4.1, reviewCount: 654, distance: '0.7 mi', deliveryFee: '$1.99', eta: '25-35 min', priceRange: '$$' },
	{ id: 'pop_3', name: 'Chipotle', image: '', rating: 4.4, reviewCount: 1234, distance: '0.9 mi', deliveryFee: '$1.49', eta: '15-25 min', priceRange: '$$' },
	{ id: 'pop_4', name: "McDonald's", image: '', rating: 4.0, reviewCount: 2341, distance: '0.4 mi', deliveryFee: '$0.99', eta: '10-20 min', priceRange: '$' },
	{ id: 'pop_5', name: 'Subway', image: '', rating: 4.2, reviewCount: 876, distance: '0.6 mi', deliveryFee: '$1.49', eta: '15-25 min', priceRange: '$' },
	{ id: 'pop_6', name: 'Starbucks', image: '', rating: 4.5, reviewCount: 1567, distance: '0.3 mi', deliveryFee: '$0.99', eta: '10-15 min', priceRange: '$$$' }
];

export const productItems = [
	{ id: 'prod_1', storeId: 'store_1', name: 'Organic Bananas', price: 1.49, image: '', stock: 'Many in stock', category: 'Fruits' },
	{ id: 'prod_2', storeId: 'store_1', name: 'Whole Milk Gallon', price: 4.99, image: '', stock: 'Many in stock', category: 'Dairy' },
	{ id: 'prod_3', storeId: 'store_1', name: 'Sourdough Bread', price: 5.49, image: '', stock: 'Few left', category: 'Bakery' },
	{ id: 'prod_4', storeId: 'store_2', name: 'Organic Eggs (12pk)', price: 6.99, image: '', stock: 'Many in stock', category: 'Dairy' },
	{ id: 'prod_5', storeId: 'store_2', name: 'Avocados (3pk)', price: 3.99, image: '', stock: 'Many in stock', category: 'Fruits' },
	{ id: 'prod_6', storeId: 'store_2', name: 'Almond Butter', price: 9.99, image: '', stock: 'In stock', category: 'Pantry' },
	{ id: 'prod_7', storeId: 'store_3', name: 'Coca-Cola 2L', price: 2.49, image: '', stock: 'Many in stock', category: 'Beverages' },
	{ id: 'prod_8', storeId: 'store_3', name: 'Lays Classic Chips', price: 3.29, image: '', stock: 'Many in stock', category: 'Snacks' },
	{ id: 'prod_9', storeId: 'store_3', name: "Ben & Jerry's Ice Cream", price: 5.49, image: '', stock: 'In stock', category: 'Frozen' },
	{ id: 'prod_10', storeId: 'store_4', name: 'Tylenol Extra Strength', price: 12.99, image: '', stock: 'In stock', category: 'Health' },
	{ id: 'prod_11', storeId: 'store_5', name: 'Cabernet Sauvignon', price: 14.99, image: '', stock: 'Many in stock', category: 'Alcohol' },
	{ id: 'prod_12', storeId: 'store_5', name: 'Craft Beer 6pk', price: 11.99, image: '', stock: 'Many in stock', category: 'Alcohol' }
];

export const banners = [
	{
		id: 'banner_1',
		bgColor: '#1a73e8',
		title: 'Free delivery on\nyour first order',
		subtitle: 'Use code: UDOFIRST',
		image: '',
		cta: 'Order now'
	},
	{
		id: 'banner_2',
		bgColor: '#d93025',
		title: '50% OFF\nselect items',
		subtitle: 'Limited time offer',
		image: '',
		cta: 'Shop deals'
	}
];
