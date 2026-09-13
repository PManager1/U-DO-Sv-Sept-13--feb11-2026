export const homeCategories = [
	{ id: 'cat-1', name: 'Fast Food', icon: '🍟' },
	{ id: 'cat-2', name: 'Pizza', icon: '🍕' },
	{ id: 'cat-3', name: 'Burgers', icon: '🍔' },
	{ id: 'cat-4', name: 'Desserts', icon: '🍦' },
	{ id: 'cat-5', name: 'Mexican', icon: '🌮' },
	{ id: 'cat-6', name: 'Indian', icon: '🍛' },
	{ id: 'cat-7', name: 'Chicken', icon: '🍗' },
	{ id: 'cat-8', name: 'Chinese', icon: '🥡' },
	{ id: 'cat-9', name: 'Sandwich', icon: '🥪' },
	{ id: 'cat-10', name: 'Seafood', icon: '🦐' },
	{ id: 'cat-11', name: 'Comfort Food', icon: '🍲' },
	{ id: 'cat-12', name: 'Peruvian', icon: '🇵🇪' },
	{ id: 'cat-13', name: 'Thai', icon: '🍜' },
	{ id: 'cat-14', name: 'Ethiopian', icon: '🇪🇹' },
	{ id: 'cat-15', name: 'Salad', icon: '🥗' },
	{ id: 'cat-16', name: 'Soup', icon: '🥣' },
	{ id: 'cat-17', name: 'Latin American', icon: '🌎' },
	{ id: 'cat-18', name: 'Italian', icon: '🍝' },
	{ id: 'cat-19', name: 'Ramen & Pho', icon: '🍜' },
	{ id: 'cat-20', name: 'African', icon: '🌍' },
	{ id: 'cat-21', name: 'Steak', icon: '🥩' },
	{ id: 'cat-22', name: 'Sushi', icon: '🍣' },
	{ id: 'cat-23', name: 'Southern', icon: '🍗' },
	{ id: 'cat-24', name: 'Greek', icon: '🇬🇷' }
];

export const homeFilters = [
	'Offers',
	'Delivery fee',
	'Under 30 min',
	'Best overall',
	'Rating',
	'Sort',
	'Benefits eligible',
	'SNAP'
];

export const homeHero = {
	headline: {
		title: 'Craving it? U-DO it.',
		subtitle: 'Search for a restaurant, cuisine, or dish.'
	},
	cards: [
		{
			id: 'hero-1',
			title: 'Flat Service Fee of $1',
			subtitle: 'For orders outside the DC • The service fee may go up by another $1...',
			cta: 'See details',
			icon: '★'
		},
		{
			id: 'hero-2',
			title: '$0 Delivery Fee + up to 10% off',
			cta: 'Try free for 4 weeks'
		}
	]
};

export const homeSections = [
	{
		id: 'featured',
		title: 'Featured on U-DO',
		items: [
			{
				id: 'store_0',
				name: 'Chick-A-Licous',
				image: '/img/food/Coconut-Chicken-Rice.jpg',
				promoTag: '30% off select items',
				deliveryFee: '$0 Delivery Fee',
				rating: 4.2,
				reviews: '1,500+',
				eta: '19 min'
			},
			{
				id: 's2',
				name: 'Popeyes Louisiana Chicken',
				image: '/img/food/burger.webp',
				promoTag: '$0 Delivery Fee on $15+',
				deliveryFee: '$0 Delivery Fee',
				rating: 4.3,
				reviews: '3,000+',
				eta: '23 min',
				badge: 'Farther Away (+$0.49)'
			},
			{
				id: 's3',
				name: 'Hip Hop Fish & Chicken',
				image: '/img/food/fish.jpg',
				promoTag: 'Buy 1, get 1',
				deliveryFee: '$0 Delivery Fee',
				rating: 4.4,
				reviews: '3,000+',
				eta: '17 min',
				badge: 'Great value'
			},
			{
				id: 's4',
				name: 'The Essence By John N Nair',
				image: '/img/food/biryani.jpg',
				promoTag: '$3 off $50+',
				deliveryFee: '$0 Delivery Fee',
				rating: 4.6,
				reviews: '340+',
				eta: '34 min',
				badge: 'Great value'
			}
		]
	},
	{
		id: 'recently-viewed',
		title: 'Recently Viewed',
		items: []
	},
	{
		id: 'comfort',
		title: 'Pizza for you',
		items: [
			{
				id: 'c1',
				name: "Mama's Kitchen",
				image: '/img/food/pizza2.png',
				deliveryFee: '$1.99 Delivery Fee',
				rating: 4.5,
				reviews: '2,100+',
				eta: '25 min',
				badge: 'Comfort'
			},
			{
				id: 'c2',
				name: 'Home Style Cooking',
				image: '/img/food/breakfast.jpg',
				promoTag: '10% off',
				deliveryFee: '$0.99 Delivery Fee',
				rating: 4.3,
				reviews: '1,800+',
				eta: '30 min'
			},
			{
				id: 'c3',
				name: "Granny's Soul Food",
				image: '/img/food/dumplings.jpg',
				deliveryFee: '$0 Delivery Fee',
				rating: 4.7,
				reviews: '950+',
				eta: '22 min',
				badge: 'Great value'
			},
			{
				id: 'c4',
				name: 'The Southern Table',
				image: '/img/food/salad.jpg',
				promoTag: 'Buy 1, get 1 free',
				deliveryFee: '$2.49 Delivery Fee',
				rating: 4.4,
				reviews: '620+',
				eta: '35 min'
			}
		]
	},
	{
		id: 'tacos',
		title: 'Tasty tacos',
		items: [
			{
				id: 't1',
				name: 'District Taco',
				image: '/img/food/tacos.jpg',
				deliveryFee: '$2.49 Delivery Fee',
				rating: 4.7,
				reviews: '4,000+',
				eta: '41 min',
				badge: 'Farther Away (+$1.49)'
			},
			{
				id: 't2',
				name: 'El Papi Real Street Tacos',
				image: '/img/food/burito.jpg',
				deliveryFee: '$0 Delivery Fee',
				rating: 4.8,
				reviews: '350+',
				eta: '18 min'
			},
			{
				id: 't3',
				name: 'Taco Bell',
				image: '/img/food/salad.jpg',
				deliveryFee: '$0.99 Delivery Fee',
				rating: 4.2,
				reviews: '6,000+',
				eta: '16 min'
			},
			{
				id: 't4',
				name: 'Tacos a la Madre',
				image: '/img/food/sand-guac.jpg',
				deliveryFee: '$2.99 Delivery Fee',
				rating: 4.7,
				reviews: '1,000+',
				eta: '65 min',
				badge: 'Great value'
			}
		]
	},
	{
		id: 'neighborhood',
		title: 'Neighborhood Favorites',
		items: [
			{
				id: 'n1',
				name: 'El Paisa Deli',
				image: '/img/food/sand-guac.jpg',
				deliveryFee: '$0 Delivery Fee',
				rating: 4.6,
				reviews: '1,000+',
				eta: '25 min',
				badge: 'Great value'
			},
			{
				id: 'n2',
				name: 'Sonic Drive-In',
				image: '/img/food/burger.webp',
				deliveryFee: '$2.49 Delivery Fee',
				rating: 4.2,
				reviews: '3,000+',
				eta: '33 min',
				badge: 'Great value'
			},
			{
				id: 'n3',
				name: 'Quickway Japanese Hibachi',
				image: '/img/food/sushi.jpg',
				promoTag: 'Buy 1, get 1',
				deliveryFee: '$0.99 Delivery Fee',
				rating: 4.4,
				reviews: '2,000+',
				eta: '18 min',
				badge: 'Great value'
			},
			{
				id: 'n4',
				name: "Nando's Peri-Peri",
				image: '/img/food/salmon.jpg',
				deliveryFee: '$0 Delivery Fee',
				rating: 4.5,
				reviews: '2,000+',
				eta: '33 min',
				badge: 'Farther Away (+$0.49)'
			}
		]
	}
];
