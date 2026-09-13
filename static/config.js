// ═══════════════════════════════════════════════════════════════════
// Central API Configuration for UDO Application
// ⚠️  THIS IS THE CANONICAL CONFIG — all other config files reference this.
//     When changing API URLs or endpoints, edit ONLY this file.
// ═══════════════════════════════════════════════════════════════════

// Base API URL — both local and production include /api/v1/ prefix
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:4000/api/v1/'
  : 'https://gigalixir/dev/api/v1/';

// Authentication Endpoints
const AUTH_API = {
  google: `${API_BASE}auth/google/`,
  signin: `${API_BASE}signin`,
  signup: `${API_BASE}signup`,
  me: `${API_BASE}me`,
  sendOtp: `${API_BASE}send-otp-aws`,
  verifyOtp: `${API_BASE}verify-otp`,
  sendEmailOtp: `${API_BASE}send-email-otp`,
  verifyEmailOtp: `${API_BASE}verify-email-otp`,
  sendSms: `${API_BASE}send-sms`,
  demoLogin: `${API_BASE}demo-login`
};

// User Profile Endpoints (require authentication)
const USER_API = {
  getProfile: `${API_BASE}me`,
  updateProfile: `${API_BASE}meProfile`
};

// Restaurant Menu Endpoints
const RESTAURANT_API = {
  baseURL: `${API_BASE}restaurant`,
  endpoints: {
    categories: '/categories',
    items: '/items',
    modifier_groups: '/modifier-groups',
    upload: '/upload'
  }
};

// Search Overlay Items Endpoints
const SEARCH_OVERLAY_API = {
  publicItems: `${API_BASE}search-overlay-items`,
  adminItems: `${API_BASE}admin/search-overlay-items`
};

// Google Maps / Places Endpoints (proxied through backend)
const MAPS_API = {
  autocomplete: `${API_BASE}autocomplete`,
  geocoordinates: `${API_BASE}geocoordinates`,
};

// Issue Ticket Endpoints (Customer Service)
const ISSUE_API = {
  create: `${API_BASE}issues`,
  getAll: `${API_BASE}issues`,
  updateStatus: (id) => `${API_BASE}issues/${id}/status`,
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDTm4xeMjg5_GFa2YYUE6zsk2-vagqlAno';

// Helper function to get full restaurant endpoint URL
function getRestaurantEndpoint(endpoint) {
  return RESTAURANT_API.baseURL + RESTAURANT_API.endpoints[endpoint];
}

// Log configuration (for debugging)
console.log('API Configuration Loaded:');
console.log('API_BASE:', API_BASE);
console.log('AUTH_API.google:', AUTH_API.google);
console.log('RESTAURANT_API.baseURL:', RESTAURANT_API.baseURL);




// Grocery & Brand Aisles Endpoints (Phoenix Backend)
export const GROCERY_API = {
  getBrand: (brandId) => `${API_BASE}brands/${brandId}`,
  getAisles: (brandId) => `${API_BASE}brands/${brandId}/aisles`,
  saveAisles: (brandId) => `${API_BASE}admin/brands/${brandId}/aisles`,
  patchItem: (brandId, ai, ii) => 
    `${API_BASE}admin/brands/${brandId}/aisles/${ai}/items/${ii}`
};

export default API_BASE;