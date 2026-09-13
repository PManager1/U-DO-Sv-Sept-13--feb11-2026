export interface CategoryItem {
	label: string;
	img: string;
	keywords: string[];
	rounded?: boolean;
	fit?: string;
	subcategories: string[];
}

export const items: CategoryItem[] = [
	{
		label: 'Produce',
		img: '/img/ribbon-images/p1_card_1.jpg',
		keywords: ['produce', 'veg', 'fruit'],
		rounded: true,
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Dairy & Eggs',
		img: '/img/ribbon-images/MILK.jpeg',
		keywords: ['dairy', 'eggs', 'milk'],
		rounded: true,
		fit: 'object-contain',
		subcategories: ['Cheese', 'Milk', 'Eggs', 'Yogurt', 'Butter', 'Cream Cheese', 'Creamer', 'Milk Alternatives', 'Whipping Cream', 'Sour Cream', 'Flavored Milk', 'Cottage Cheese']
	},
	{
		label: 'Bakery',
		img: '/img/ribbon-images/crissant2.jpg',
		keywords: ['bakery', 'bread'],
		rounded: true,
		subcategories: ['Bread', 'Desserts', 'Buns', 'Tortillas & Wraps', 'Bagels', 'Rolls', 'English Muffins', 'Break & Bake']
	},
	{
		label: 'Deli',
		img: '/img/ribbon-images/d1_card.jpg',
		keywords: ['Deli', 'deli'],
		subcategories: ['Turkey', 'Ham', 'Bacon', 'Salami', 'Beef', 'Chicken', 'Pepperoni', 'Bologna', 'Proscuitto', 'Other']
	},
	{
		label: 'Meat',
		img: '/img/ribbon-images/meatp.jpg',
		keywords: ['meat', 'poultry', 'deli'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Sea Food',
		img: '/img/ribbon-images/sf7_card.jpg',
		keywords: ['Sea Food', 'meat', 'sea food'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Frozen',
		img: '/img/ribbon-images/frozenVegi_card.jpg',
		keywords: ['frozen'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Canned',
		img: '/img/ribbon-images/c5_card.jpg',
		keywords: ['Canned'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Candy',
		img: '/img/ribbon-images/Candy_detail.jpg',
		keywords: ['Candy'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Snacks',
		img: '/img/ribbon-images/Snacks.jpg',
		keywords: ['Snacks'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Condiments & Similar',
		img: '/img/ribbon-images/c4_card.jpg',
		keywords: ['Snacks', 'sauces'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Beverages',
		img: '/img/ribbon-images/j4_card.jpg',
		keywords: ['drink', 'beverage', 'soda'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Alcohal',
		img: '/img/ribbon-images/Alcohal_1.jpg',
		keywords: ['alcohal', 'Alcohal', 'soda'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Beauty',
		img: '/img/ribbon-images/lipstick.jpg',
		keywords: ['Beauty'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'House hold items',
		img: '/img/ribbon-images/tide2.jpg',
		keywords: ['frozenHouse hold items'],
		rounded: false,
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Child Care',
		img: '/img/ribbon-images/BabyChild_detail.jpg',
		keywords: ['Child Care'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Personal care',
		img: '/img/ribbon-images/Comb.jpg',
		keywords: ['Personal care'],
		rounded: true,
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Electronics',
		img: '/img/ribbon-images/i2_card.jpg',
		keywords: ['Electronics'],
		rounded: false,
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Pet Care',
		img: '/img/ribbon-images/PEtMed_detail.jpg',
		keywords: ['Pet Care', 'pet', 'pet supply'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Vitamins',
		img: '/img/ribbon-images/vit5.jpg',
		keywords: ['Vitamins'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Medicine',
		img: '/img/ribbon-images/Med_detail.jpg',
		keywords: ['Medicine'],
		rounded: true,
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Flower & Plants',
		img: '/img/ribbon-images/Plt2.jpg',
		keywords: ['Flower & Plants'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	},
	{
		label: 'Outdoor',
		img: '/img/ribbon-images/o3_card.jpg',
		keywords: ['Outdoor'],
		subcategories: ['Fruit', 'Vegetables', 'Leaf Greens', 'Herbs', 'Lettuce Mix']
	}
];
