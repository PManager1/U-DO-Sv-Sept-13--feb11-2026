export const seeAllMockPool = [
	{ name: 'Golden Fork Bistro', image: '', deliveryFee: '$0 Delivery Fee', rating: 4.4, reviews: '820+', eta: '22 min', promoTag: '20% off', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Sizzling Skillet', image: '', deliveryFee: '$0.99 Delivery Fee', rating: 4.3, reviews: '1,200+', eta: '28 min', promoTag: '$0 Delivery Fee', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'The Cozy Nook Café', image: '', deliveryFee: '$1.99 Delivery Fee', rating: 4.6, reviews: '640+', eta: '19 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Urban Harvest Bowls', image: '', deliveryFee: '$0 Delivery Fee', rating: 4.7, reviews: '1,050+', eta: '25 min', promoTag: '10% off', type: 'restaurant', brandType: 'restaurant' },
	{ name: "Mama Rosa's Kitchen", image: '', deliveryFee: '$2.49 Delivery Fee', rating: 4.5, reviews: '2,400+', eta: '31 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Smokehouse Grill Co.', image: '', deliveryFee: '$0 Delivery Fee', rating: 4.8, reviews: '3,100+', eta: '24 min', promoTag: 'Buy 1, get 1', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Fresh Catch Sushi', image: '', deliveryFee: '$1.49 Delivery Fee', rating: 4.7, reviews: '980+', eta: '27 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'The Taco Cantina', image: '', deliveryFee: '$0.99 Delivery Fee', rating: 4.6, reviews: '1,700+', eta: '20 min', promoTag: '$0 Delivery Fee', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Sunny Side Pancake House', image: '', deliveryFee: '$2.99 Delivery Fee', rating: 4.4, reviews: '540+', eta: '26 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Spice Route Indian', image: '', deliveryFee: '$0 Delivery Fee', rating: 4.6, reviews: '1,300+', eta: '33 min', promoTag: '15% off', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Pasta La Vista', image: '', deliveryFee: '$1.99 Delivery Fee', rating: 4.5, reviews: '890+', eta: '29 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'The Burger Barn', image: '', deliveryFee: '$0 Delivery Fee', rating: 4.3, reviews: '2,900+', eta: '18 min', promoTag: '$0 Delivery Fee', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Thai Orchid Express', image: '', deliveryFee: '$1.49 Delivery Fee', rating: 4.7, reviews: '1,100+', eta: '30 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Veggie Delight Café', image: '', deliveryFee: '$0.99 Delivery Fee', rating: 4.5, reviews: '760+', eta: '21 min', promoTag: '10% off', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Southern Comfort Kitchen', image: '', deliveryFee: '$0 Delivery Fee', rating: 4.8, reviews: '1,600+', eta: '28 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Lucky Dragon Chinese', image: '', deliveryFee: '$1.99 Delivery Fee', rating: 4.2, reviews: '2,200+', eta: '23 min', promoTag: '20% off', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Mediterranean Mezze', image: '', deliveryFee: '$0 Delivery Fee', rating: 4.6, reviews: '980+', eta: '26 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Rocky Road Diner', image: '', deliveryFee: '$2.49 Delivery Fee', rating: 4.4, reviews: '1,400+', eta: '25 min', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Peruvian Flame', image: '', deliveryFee: '$0.99 Delivery Fee', rating: 4.7, reviews: '720+', eta: '34 min', promoTag: 'Buy 1, get 1', type: 'restaurant', brandType: 'restaurant' },
	{ name: 'Ethiopian Spice House', image: '', deliveryFee: '$0 Delivery Fee', rating: 4.8, reviews: '510+', eta: '35 min', type: 'restaurant', brandType: 'restaurant' }
];

let counter = 0;
function nextId() {
	counter += 1;
	return 'msee_' + counter + '_' + Math.random().toString(36).slice(2, 8);
}

export function buildSectionItems(sectionItems: any[], min = 16): any[] {
	const base = (sectionItems || []).map((it) => ({ ...it, brandType: it.brandType || 'restaurant', type: it.type || 'restaurant' }));
	const out = [...base];
	const used = new Set(base.map((b) => b.name).filter(Boolean));
	for (const p of seeAllMockPool) {
		if (used.has(p.name)) continue;
		out.push({ ...p, id: nextId() });
		used.add(p.name);
		if (out.length >= min) break;
	}
	return out.slice(0, min);
}
