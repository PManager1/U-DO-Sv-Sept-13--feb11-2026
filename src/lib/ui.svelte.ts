export const ui = $state({ sidebarOpen: false, cartOpen: false });

export const toggleSidebar = () => (ui.sidebarOpen = !ui.sidebarOpen);
export const toggleCart = () => (ui.cartOpen = !ui.cartOpen);
export const closeSidebar = () => (ui.sidebarOpen = false);
export const closeCart = () => (ui.cartOpen = false);
