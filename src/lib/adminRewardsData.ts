export const marketData: Record<string, any> = {
	washington_dc: {
		name: 'Washington D.C.',
		label: 'Washington D.C. (DMV)',
		profitPool: 84320, profitTarget: 150000, orderVelocity: 112426, orderTarget: 200000, driversOnline: 412, storesActive: 28,
		drivers: [
			{ rank: 1, name: 'Marcus Vance', id: '#1042', code: 'MARCUS_DMV', activeRecruits: 42, totalRecruits: 45, downlineTrips: 14200, downlinePay: 710.0, customersReferred: 312, customerPoints: 4570, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 2, name: 'Jessica Kim', id: '#2291', code: 'JESS_RIDES', activeRecruits: 28, totalRecruits: 30, downlineTrips: 11850, downlinePay: 592.5, customersReferred: 140, customerPoints: 2100, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 3, name: 'David Stone', id: '#0984', code: 'STONE_U_DO', activeRecruits: 5, totalRecruits: 6, downlineTrips: 310, downlinePay: 15.5, customersReferred: 410, customerPoints: 5100, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 4, name: 'Carlos Mendez', id: '#1156', code: 'LOS_DRIVES', activeRecruits: 19, totalRecruits: 24, downlineTrips: 4200, downlinePay: 210.0, customersReferred: 85, customerPoints: 1250, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ High Cancellation Rate'], alertType: 'warning' },
			{ rank: 5, name: 'Amara Lewis', id: '#3302', code: 'AMARA_S', activeRecruits: 12, totalRecruits: 40, downlineTrips: 890, downlinePay: 44.5, customersReferred: 240, customerPoints: 4290, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: ['⚠ Multiple Devices Flagged'], alertType: 'warning' },
			{ rank: 6, name: 'Mike Ross', id: '#5521', code: 'MROSS_5', activeRecruits: 1, totalRecruits: 12, downlineTrips: 40, downlinePay: 2.0, customersReferred: 12, customerPoints: 80, stripeStatus: 'Restricted', stripeColor: 'text-red-600', alerts: ['🛑 Suspected Ghost Referrals'], alertType: 'danger' },
			{ rank: 7, name: 'Nina Patel', id: '#D107', code: 'PATEL_DMV', activeRecruits: 15, totalRecruits: 17, downlineTrips: 6200, downlinePay: 310.0, customersReferred: 128, customerPoints: 2600, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 8, name: 'Omar Hassan', id: '#D108', code: 'HASSAN_DMV', activeRecruits: 10, totalRecruits: 12, downlineTrips: 3900, downlinePay: 195.0, customersReferred: 95, customerPoints: 1900, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 9, name: 'Paula Garcia', id: '#D109', code: 'GARCIA_DMV', activeRecruits: 7, totalRecruits: 9, downlineTrips: 2400, downlinePay: 120.0, customersReferred: 63, customerPoints: 1350, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ Docs Expired'], alertType: 'warning' },
			{ rank: 10, name: 'Quinn Brooks', id: '#D110', code: 'BROOKS_DMV', activeRecruits: 3, totalRecruits: 5, downlineTrips: 890, downlinePay: 44.5, customersReferred: 34, customerPoints: 720, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' }
		]
	},
	manhattan: {
		name: 'Manhattan', label: 'Manhattan, NY',
		profitPool: 92340, profitTarget: 150000, orderVelocity: 118400, orderTarget: 200000, driversOnline: 486, storesActive: 34,
		drivers: [
			{ rank: 2, name: 'Bianca Reyes', id: '#M102', code: 'REYES_MN', activeRecruits: 31, totalRecruits: 35, downlineTrips: 12400, downlinePay: 620.0, customersReferred: 210, customerPoints: 3800, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 3, name: 'Carlos Vega', id: '#M103', code: 'VEGA_MN', activeRecruits: 22, totalRecruits: 28, downlineTrips: 8900, downlinePay: 445.0, customersReferred: 175, customerPoints: 3200, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ High Cancellation Rate'], alertType: 'warning' },
			{ rank: 4, name: 'Diana Park', id: '#M104', code: 'PARK_MN', activeRecruits: 18, totalRecruits: 20, downlineTrips: 7200, downlinePay: 360.0, customersReferred: 198, customerPoints: 4100, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 5, name: 'Elijah Brooks', id: '#M105', code: 'BROOKS_MN', activeRecruits: 14, totalRecruits: 16, downlineTrips: 5600, downlinePay: 280.0, customersReferred: 134, customerPoints: 2900, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 6, name: 'Fatima Al-Rashid', id: '#M106', code: 'RASHID_MN', activeRecruits: 25, totalRecruits: 30, downlineTrips: 10200, downlinePay: 510.0, customersReferred: 220, customerPoints: 4200, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 7, name: 'George Kim', id: '#M107', code: 'KIM_MN', activeRecruits: 12, totalRecruits: 15, downlineTrips: 4800, downlinePay: 240.0, customersReferred: 105, customerPoints: 2100, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 8, name: "Hannah O'Brien", id: '#M108', code: 'OBRIEN_MN', activeRecruits: 9, totalRecruits: 12, downlineTrips: 3400, downlinePay: 170.0, customersReferred: 88, customerPoints: 1750, stripeStatus: 'Restricted', stripeColor: 'text-red-600', alerts: ['🛑 Duplicate Payments'], alertType: 'danger' },
			{ rank: 9, name: 'Isaiah Thomas', id: '#M109', code: 'THOMAS_MN', activeRecruits: 7, totalRecruits: 10, downlineTrips: 2100, downlinePay: 105.0, customersReferred: 62, customerPoints: 1300, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 10, name: 'Jenna Patel', id: '#M110', code: 'PATEL_MN', activeRecruits: 4, totalRecruits: 6, downlineTrips: 980, downlinePay: 49.0, customersReferred: 41, customerPoints: 890, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ Incomplete Docs'], alertType: 'warning' }
		]
	},
	brooklyn: {
		name: 'Brooklyn', label: 'Brooklyn, NY',
		profitPool: 78450, profitTarget: 150000, orderVelocity: 98400, orderTarget: 200000, driversOnline: 412, storesActive: 31,
		drivers: [
			{ rank: 1, name: 'Marcus Vance', id: '#1042', code: 'MARCUS_BK', activeRecruits: 42, totalRecruits: 45, downlineTrips: 14200, downlinePay: 710.0, customersReferred: 312, customerPoints: 4570, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 2, name: 'Jessica Kim', id: '#2291', code: 'JESS_RIDES', activeRecruits: 28, totalRecruits: 30, downlineTrips: 11850, downlinePay: 592.5, customersReferred: 140, customerPoints: 2100, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 3, name: 'David Stone', id: '#0984', code: 'STONE_UDO', activeRecruits: 5, totalRecruits: 6, downlineTrips: 310, downlinePay: 15.5, customersReferred: 410, customerPoints: 5100, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 4, name: 'Carlos Mendez', id: '#1156', code: 'LOS_DRIVES', activeRecruits: 19, totalRecruits: 24, downlineTrips: 4200, downlinePay: 210.0, customersReferred: 85, customerPoints: 1250, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ High Cancellation Rate'], alertType: 'warning' },
			{ rank: 5, name: 'Amara Lewis', id: '#3302', code: 'AMARA_S', activeRecruits: 12, totalRecruits: 40, downlineTrips: 890, downlinePay: 44.5, customersReferred: 240, customerPoints: 4290, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: ['⚠ Multiple Devices Flagged'], alertType: 'warning' },
			{ rank: 6, name: 'Brandon Cruz', id: '#B106', code: 'CRUZ_BK', activeRecruits: 26, totalRecruits: 28, downlineTrips: 10400, downlinePay: 520.0, customersReferred: 195, customerPoints: 3700, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 7, name: 'Christina Wu', id: '#B107', code: 'WU_BK', activeRecruits: 15, totalRecruits: 18, downlineTrips: 6100, downlinePay: 305.0, customersReferred: 132, customerPoints: 2600, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 8, name: 'Derek Johnson', id: '#B108', code: 'JOHNSON_BK', activeRecruits: 10, totalRecruits: 14, downlineTrips: 3900, downlinePay: 195.0, customersReferred: 97, customerPoints: 1900, stripeStatus: 'Restricted', stripeColor: 'text-red-600', alerts: ['🛑 Suspended Account'], alertType: 'danger' },
			{ rank: 9, name: 'Elena Martinez', id: '#B109', code: 'MARTINEZ_BK', activeRecruits: 8, totalRecruits: 9, downlineTrips: 2800, downlinePay: 140.0, customersReferred: 73, customerPoints: 1500, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 10, name: 'Franklin Adams', id: '#B110', code: 'ADAMS_BK', activeRecruits: 3, totalRecruits: 5, downlineTrips: 750, downlinePay: 37.5, customersReferred: 28, customerPoints: 620, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ Low Activity'], alertType: 'warning' }
		]
	},
	queens: {
		name: 'Queens', label: 'Queens, NY',
		profitPool: 62100, profitTarget: 150000, orderVelocity: 82300, orderTarget: 200000, driversOnline: 354, storesActive: 26,
		drivers: [
			{ rank: 1, name: 'Mike Ross', id: '#5521', code: 'MROSS_5', activeRecruits: 1, totalRecruits: 12, downlineTrips: 40, downlinePay: 2.0, customersReferred: 12, customerPoints: 80, stripeStatus: 'Restricted', stripeColor: 'text-red-600', alerts: ['🛑 Suspected Ghost Referrals'], alertType: 'danger' },
			{ rank: 2, name: 'Sarah Chen', id: '#Q201', code: 'CHEN_QNS', activeRecruits: 24, totalRecruits: 27, downlineTrips: 9800, downlinePay: 490.0, customersReferred: 178, customerPoints: 3400, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 3, name: 'Jake Miller', id: '#Q202', code: 'MILLER_QNS', activeRecruits: 16, totalRecruits: 18, downlineTrips: 6400, downlinePay: 320.0, customersReferred: 156, customerPoints: 2800, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 4, name: 'Lena Ochoa', id: '#Q203', code: 'OCHOA_QNS', activeRecruits: 9, totalRecruits: 14, downlineTrips: 3100, downlinePay: 155.0, customersReferred: 92, customerPoints: 1800, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ Low Activity'], alertType: 'warning' },
			{ rank: 5, name: 'Omar Hassan', id: '#Q204', code: 'HASSAN_QNS', activeRecruits: 20, totalRecruits: 22, downlineTrips: 8200, downlinePay: 410.0, customersReferred: 167, customerPoints: 3100, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 6, name: 'Priya Singh', id: '#Q205', code: 'SINGH_QNS', activeRecruits: 13, totalRecruits: 15, downlineTrips: 5100, downlinePay: 255.0, customersReferred: 110, customerPoints: 2300, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 7, name: 'Quinn Taylor', id: '#Q206', code: 'TAYLOR_QNS', activeRecruits: 7, totalRecruits: 9, downlineTrips: 2400, downlinePay: 120.0, customersReferred: 65, customerPoints: 1400, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 8, name: 'Ryan Mitchell', id: '#Q207', code: 'MITCHELL_QNS', activeRecruits: 5, totalRecruits: 8, downlineTrips: 1600, downlinePay: 80.0, customersReferred: 44, customerPoints: 950, stripeStatus: 'Restricted', stripeColor: 'text-red-600', alerts: ['🛑 Fraud Alert'], alertType: 'danger' },
			{ rank: 9, name: 'Sofia Garcia', id: '#Q208', code: 'GARCIA_QNS', activeRecruits: 11, totalRecruits: 13, downlineTrips: 4200, downlinePay: 210.0, customersReferred: 88, customerPoints: 1700, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 10, name: 'Tyler Nguyen', id: '#Q209', code: 'NGUYEN_QNS', activeRecruits: 2, totalRecruits: 4, downlineTrips: 510, downlinePay: 25.5, customersReferred: 19, customerPoints: 420, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ New Driver'], alertType: 'warning' }
		]
	},
	bronx: {
		name: 'Bronx', label: 'Bronx, NY',
		profitPool: 51300, profitTarget: 150000, orderVelocity: 67400, orderTarget: 200000, driversOnline: 278, storesActive: 22,
		drivers: [
			{ rank: 1, name: 'Tyrone Jackson', id: '#B301', code: 'JACKSON_BX', activeRecruits: 20, totalRecruits: 22, downlineTrips: 8100, downlinePay: 405.0, customersReferred: 165, customerPoints: 3100, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 2, name: 'Maria Santos', id: '#B302', code: 'SANTOS_BX', activeRecruits: 14, totalRecruits: 17, downlineTrips: 5200, downlinePay: 260.0, customersReferred: 98, customerPoints: 2200, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 3, name: 'Kevin Lee', id: '#B303', code: 'LEE_BX', activeRecruits: 7, totalRecruits: 10, downlineTrips: 1800, downlinePay: 90.0, customersReferred: 54, customerPoints: 1100, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ Multiple Devices Flagged'], alertType: 'warning' },
			{ rank: 4, name: 'Andrea Torres', id: '#B304', code: 'TORRES_BX', activeRecruits: 17, totalRecruits: 19, downlineTrips: 6800, downlinePay: 340.0, customersReferred: 145, customerPoints: 2900, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 5, name: 'Brian Foster', id: '#B305', code: 'FOSTER_BX', activeRecruits: 11, totalRecruits: 13, downlineTrips: 4300, downlinePay: 215.0, customersReferred: 92, customerPoints: 1850, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 6, name: 'Catherine Diaz', id: '#B306', code: 'DIAZ_BX', activeRecruits: 8, totalRecruits: 11, downlineTrips: 2900, downlinePay: 145.0, customersReferred: 76, customerPoints: 1600, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 7, name: 'Daniel Park', id: '#B307', code: 'PARK_BX', activeRecruits: 5, totalRecruits: 7, downlineTrips: 1800, downlinePay: 90.0, customersReferred: 48, customerPoints: 1050, stripeStatus: 'Restricted', stripeColor: 'text-red-600', alerts: ['🛑 Terms Violation'], alertType: 'danger' },
			{ rank: 8, name: 'Erika Johnson', id: '#B308', code: 'JOHNSON_BX', activeRecruits: 10, totalRecruits: 12, downlineTrips: 3800, downlinePay: 190.0, customersReferred: 83, customerPoints: 1700, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 9, name: 'Fernando Lopez', id: '#B309', code: 'LOPEZ_BX', activeRecruits: 4, totalRecruits: 6, downlineTrips: 1200, downlinePay: 60.0, customersReferred: 35, customerPoints: 780, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ Docs Pending'], alertType: 'warning' },
			{ rank: 10, name: 'Gloria Chen', id: '#B310', code: 'CHEN_BX', activeRecruits: 2, totalRecruits: 3, downlineTrips: 450, downlinePay: 22.5, customersReferred: 15, customerPoints: 340, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' }
		]
	},
	staten_island: {
		name: 'Staten Island', label: 'Staten Island, NY',
		profitPool: 28900, profitTarget: 150000, orderVelocity: 42100, orderTarget: 200000, driversOnline: 156, storesActive: 14,
		drivers: [
			{ rank: 1, name: 'Paul Gianni', id: '#S401', code: 'GIANNI_SI', activeRecruits: 11, totalRecruits: 13, downlineTrips: 4400, downlinePay: 220.0, customersReferred: 87, customerPoints: 1900, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 2, name: 'Rachel Wu', id: '#S402', code: 'WU_SI', activeRecruits: 6, totalRecruits: 8, downlineTrips: 2100, downlinePay: 105.0, customersReferred: 43, customerPoints: 950, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 3, name: 'Steven Blake', id: '#S403', code: 'BLAKE_SI', activeRecruits: 9, totalRecruits: 11, downlineTrips: 3600, downlinePay: 180.0, customersReferred: 72, customerPoints: 1550, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 4, name: 'Tiffany Brooks', id: '#S404', code: 'BROOKS_SI', activeRecruits: 5, totalRecruits: 7, downlineTrips: 1900, downlinePay: 95.0, customersReferred: 51, customerPoints: 1100, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ High Cancellation Rate'], alertType: 'warning' },
			{ rank: 5, name: 'Umar Patel', id: '#S405', code: 'PATEL_SI', activeRecruits: 7, totalRecruits: 9, downlineTrips: 2600, downlinePay: 130.0, customersReferred: 63, customerPoints: 1350, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 6, name: 'Victor Diaz', id: '#S406', code: 'DIAZ_SI', activeRecruits: 4, totalRecruits: 5, downlineTrips: 1100, downlinePay: 55.0, customersReferred: 29, customerPoints: 650, stripeStatus: 'Restricted', stripeColor: 'text-red-600', alerts: ['🛑 Policy Violation'], alertType: 'danger' },
			{ rank: 7, name: 'Wendy Chen', id: '#S407', code: 'CHEN_SI', activeRecruits: 8, totalRecruits: 10, downlineTrips: 3100, downlinePay: 155.0, customersReferred: 68, customerPoints: 1450, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 8, name: 'Xander Cruz', id: '#S408', code: 'CRUZ_SI', activeRecruits: 3, totalRecruits: 4, downlineTrips: 890, downlinePay: 44.5, customersReferred: 22, customerPoints: 510, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' },
			{ rank: 9, name: 'Yolanda Hayes', id: '#S409', code: 'HAYES_SI', activeRecruits: 5, totalRecruits: 6, downlineTrips: 1700, downlinePay: 85.0, customersReferred: 37, customerPoints: 820, stripeStatus: 'Pending KYC', stripeColor: 'text-yellow-600', alerts: ['⚠ Docs Expired'], alertType: 'warning' },
			{ rank: 10, name: 'Zachary Moon', id: '#S410', code: 'MOON_SI', activeRecruits: 1, totalRecruits: 2, downlineTrips: 210, downlinePay: 10.5, customersReferred: 8, customerPoints: 180, stripeStatus: 'Verified', stripeColor: 'text-green-600', alerts: [], alertType: 'clear' }
		]
	}
};

export const boroughs = [
	{ key: 'washington_dc', label: 'Washington D.C. (DMV)' },
	{ key: 'manhattan', label: 'Manhattan, NY' },
	{ key: 'brooklyn', label: 'Brooklyn, NY' },
	{ key: 'queens', label: 'Queens, NY' },
	{ key: 'bronx', label: 'Bronx, NY' },
	{ key: 'staten_island', label: 'Staten Island, NY' }
];
