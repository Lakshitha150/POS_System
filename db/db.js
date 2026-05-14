window.API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";
const POS_CACHE_PREFIX = "posSheetCache:";
const POS_CACHE_TTL_MS = 5 * 60 * 1000;
const posCacheRequests = {};

async function postToGoogleScript(payload) {
    const body = {
        ...payload,
        sessionToken: window.getSessionToken ? window.getSessionToken() : ""
    };

    const res = await fetch(window.API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(body)
    });

    const result = await res.json();

    if (!result || result.success !== false) {
        const type = String(payload && payload.type || "").toLowerCase();
        if (type.includes("customer")) {
            clearSheetCache("customers");
            clearSheetCache("places");
        }
        if (type.includes("order")) clearSheetCache("orders");
        if (type.includes("product")) clearSheetCache("products");
        if (type.includes("place")) clearSheetCache("places");
    }

    return result;
}

async function readJsonResponse(res, fallback = []) {
    const data = await res.json();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.products)) return data.products;
    if (Array.isArray(data.customers)) return data.customers;

    if (data && data.message) {
        console.error("Google Script response:", data.message);
    }

    return fallback;
}

function buildApiUrl(type) {
    return window.buildAuthedUrl ? window.buildAuthedUrl({ type }) : (window.API_URL + "?type=" + encodeURIComponent(type));
}

function readCachedData(cacheKey) {
    try {
        const cache = JSON.parse(localStorage.getItem(POS_CACHE_PREFIX + cacheKey) || "null");
        if (!cache || !Array.isArray(cache.data)) return null;
        return cache;
    } catch (error) {
        return null;
    }
}

function writeCachedData(cacheKey, data) {
    localStorage.setItem(POS_CACHE_PREFIX + cacheKey, JSON.stringify({
        savedAt: Date.now(),
        data: Array.isArray(data) ? data : []
    }));
}

async function refreshCachedData(type, cacheKey) {
    if (posCacheRequests[cacheKey]) return posCacheRequests[cacheKey];

    posCacheRequests[cacheKey] = fetch(buildApiUrl(type))
        .then(res => readJsonResponse(res))
        .then(data => {
            writeCachedData(cacheKey, data);
            window.dispatchEvent(new CustomEvent("pos-cache-updated", {
                detail: { type, cacheKey, data }
            }));
            return data;
        })
        .finally(() => {
            delete posCacheRequests[cacheKey];
        });

    return posCacheRequests[cacheKey];
}

async function getCachedSheetData(type, cacheKey) {
    const cached = readCachedData(cacheKey);
    if (cached && Array.isArray(cached.data)) {
        if (Date.now() - cached.savedAt > POS_CACHE_TTL_MS && navigator.onLine !== false) {
            refreshCachedData(type, cacheKey).catch(error => console.warn(`${type} refresh failed`, error));
        }
        return cached.data;
    }

    return await refreshCachedData(type, cacheKey);
}

function clearSheetCache(cacheKey) {
    if (cacheKey) {
        localStorage.removeItem(POS_CACHE_PREFIX + cacheKey);
        return;
    }

    Object.keys(localStorage)
        .filter(key => key.startsWith(POS_CACHE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
}

// ======================
// PRODUCTS
// ======================
async function getProducts() {
    return await getCachedSheetData("products", "products");
}

// ======================
// CUSTOMERS
// ======================
async function getCustomers() {
    return await getCachedSheetData("customers", "customers");
}

// ======================
// ORDER ID
// ======================
async function getOrderId() {
    const res = await fetch(window.buildAuthedUrl ? window.buildAuthedUrl({ type: "orderId" }) : (window.API_URL + "?type=orderId"));
    return await res.text();
}

async function getOrders() {
    return await getCachedSheetData("orders", "orders");
}

async function getPlaces() {
    return await getCachedSheetData("places", "places");
}

// ======================
// SAVE ORDER
// ======================
async function saveOrder(order) {
    return await postToGoogleScript({
        type: "order",
        data: order
    });
}

window.postToGoogleScript = postToGoogleScript;
window.readJsonResponse = readJsonResponse;
window.getProducts = getProducts;
window.getCustomers = getCustomers;
window.getOrderId = getOrderId;
window.getOrders = getOrders;
window.getPlaces = getPlaces;
window.saveOrder = saveOrder;
window.clearSheetCache = clearSheetCache;
