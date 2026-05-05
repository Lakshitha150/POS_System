window.API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

async function postToGoogleScript(payload) {
    const res = await fetch(window.API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    });

    return await res.json();
}

// ======================
// PRODUCTS
// ======================
async function getProducts() {
    const res = await fetch(window.API_URL + "?type=products");
    return await res.json();
}

// ======================
// CUSTOMERS
// ======================
async function getCustomers() {
    const res = await fetch(window.API_URL + "?type=customers");
    return await res.json();
}

// ======================
// ORDER ID
// ======================
async function getOrderId() {
    const res = await fetch(window.API_URL + "?type=orderId");
    return await res.text();
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
window.getProducts = getProducts;
window.getCustomers = getCustomers;
window.getOrderId = getOrderId;
window.saveOrder = saveOrder;
