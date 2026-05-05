const API_URL = "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

// ======================
// PRODUCTS
// ======================
export async function getProducts() {
    const res = await fetch(API_URL + "?type=products");
    return await res.json();
}

// ======================
// CUSTOMERS
// ======================
export async function getCustomers() {
    const res = await fetch(API_URL + "?type=customers");
    return await res.json();
}

// ======================
// ORDER ID
// ======================
export async function getOrderId() {
    const res = await fetch(API_URL + "?type=orderId");
    return await res.text();
}

// ======================
// SAVE ORDER
// ======================
export async function saveOrder(order) {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            type: "order",
            data: order
        })
    });

    return await res.json();
}