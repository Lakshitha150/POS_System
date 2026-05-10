window.API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

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

    return await res.json();
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

// ======================
// PRODUCTS
// ======================
async function getProducts() {
    const res = await fetch(window.buildAuthedUrl ? window.buildAuthedUrl({ type: "products" }) : (window.API_URL + "?type=products"));
    return await readJsonResponse(res);
}

// ======================
// CUSTOMERS
// ======================
async function getCustomers() {
    const res = await fetch(window.buildAuthedUrl ? window.buildAuthedUrl({ type: "customers" }) : (window.API_URL + "?type=customers"));
    return await readJsonResponse(res);
}

// ======================
// ORDER ID
// ======================
async function getOrderId() {
    const res = await fetch(window.buildAuthedUrl ? window.buildAuthedUrl({ type: "orderId" }) : (window.API_URL + "?type=orderId"));
    return await res.text();
}

async function getOrders() {
    const res = await fetch(window.buildAuthedUrl ? window.buildAuthedUrl({ type: "orders" }) : (window.API_URL + "?type=orders"));
    return await readJsonResponse(res);
}

async function getPlaces() {
    const res = await fetch(window.buildAuthedUrl ? window.buildAuthedUrl({ type: "places" }) : (window.API_URL + "?type=places"));
    return await readJsonResponse(res);
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
