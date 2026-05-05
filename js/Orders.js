const ORDER_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

let cart = [];
let productList = [];
let customerList = [];

document.addEventListener("DOMContentLoaded", function () {

    const productBox = document.getElementById("order-items");
    const cartBox = document.getElementById("cart-items");

    const subtotalEl = document.getElementById("sub-total");
    const totalEl = document.getElementById("total");
    const balanceEl = document.getElementById("balance");

    const cashEl = document.getElementById("cash");
    const discountEl = document.getElementById("discount");

    const customerSelect = document.getElementById("customerDropDown");

    // ======================
    // LOAD PRODUCTS
    // ======================
    async function loadProducts() {
        const res = await fetch(ORDER_API_URL + "?type=products");
        productList = await res.json();

        productBox.innerHTML = "";

        productList.forEach(p => {
            const div = document.createElement("div");
            div.className = "product-card";

            div.innerHTML = `
                <h4>${p.pro_name}</h4>
                <p>Rs ${p.price}</p>
                <p>Stock: ${p.quantity}</p>
            `;

            div.onclick = () => addToCart(p);

            productBox.appendChild(div);
        });
    }

    // ======================
    // LOAD CUSTOMERS
    // ======================
    async function loadCustomers() {
        const res = await fetch(ORDER_API_URL + "?type=customers");
        customerList = await res.json();

        customerSelect.innerHTML = `<option value="">Select Customer</option>`;

        customerList.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.custContact;
            opt.textContent = c.custContact;
            customerSelect.appendChild(opt);
        });
    }

    // ======================
    // ADD TO CART
    // ======================
    function addToCart(product) {
        const existing = cart.find(i => i.pro_id === product.pro_id);

        if (existing) {
            existing.quantity++;
        } else {
            cart.push({
                ...product,
                quantity: 1
            });
        }

        renderCart();
    }

    // ======================
    // REMOVE ITEM
    // ======================
    function removeItem(id) {
        cart = cart.filter(i => i.pro_id !== id);
        renderCart();
    }

    // ======================
    // RENDER CART
    // ======================
    function renderCart() {
        cartBox.innerHTML = "";
        let subtotal = 0;

        cart.forEach(item => {
            subtotal += item.price * item.quantity;

            const div = document.createElement("div");
            div.innerHTML = `
                ${item.pro_name} x ${item.quantity} - Rs ${item.price * item.quantity}
                <button>❌</button>
            `;

            div.querySelector("button").onclick = () => removeItem(item.pro_id);

            cartBox.appendChild(div);
        });

        const discount = parseFloat(discountEl.value) || 0;
        const cash = parseFloat(cashEl.value) || 0;

        const total = subtotal - discount;
        const balance = cash - total;

        subtotalEl.innerText = "Rs " + subtotal;
        totalEl.innerText = "Rs " + total;
        balanceEl.innerText = "Rs " + balance;
    }

    function showInvoice(order) {

    document.getElementById("invoice-modal").style.display = "flex";

    document.getElementById("inv-order-id").innerText = "Order: " + order.order_id;
    document.getElementById("inv-date").innerText = "Date: " + new Date().toLocaleString();
    document.getElementById("inv-customer").innerText = "Customer: " + order.contact;

    const itemsBox = document.getElementById("inv-items");
    itemsBox.innerHTML = "";

    order.items.forEach(i => {
        const p = document.createElement("p");
        p.innerHTML = `<span>${i.pro_name} x ${i.quantity}</span><span>Rs ${i.price * i.quantity}</span>`;
        itemsBox.appendChild(p);
    });

    document.getElementById("inv-subtotal").innerText = "Subtotal: Rs " + order.subtotal;
    document.getElementById("inv-discount").innerText = "Discount: Rs " + order.discount;
    document.getElementById("inv-total").innerText = "Total: Rs " + order.total;
    document.getElementById("inv-cash").innerText = "Cash: Rs " + order.cash;
    document.getElementById("inv-balance").innerText = "Balance: Rs " + order.balance;
}

    window.closeInvoice = function closeInvoice() {
        document.getElementById("invoice-modal").style.display = "none";
    };

    // ======================
    // INPUT EVENTS
    // ======================
    cashEl.oninput = renderCart;
    discountEl.oninput = renderCart;

    // ======================
    // PURCHASE
    // ======================
    document.getElementById("purchase").onclick = async function () {

        const order = {
            order_id: "ORD-" + Date.now(),
            contact: customerSelect.value,
            items: cart,
            subtotal: parseFloat(subtotalEl.innerText.replace("Rs", "")),
            discount: parseFloat(discountEl.value) || 0,
            total: parseFloat(totalEl.innerText.replace("Rs", "")),
            cash: parseFloat(cashEl.value) || 0,
            balance: parseFloat(balanceEl.innerText.replace("Rs", ""))
        };

        await fetch(ORDER_API_URL, {
            method: "POST",
            body: JSON.stringify({
                type: "order",
                data: order
            })
        });

        alert("Order Successful!");
        showInvoice(order);
        cart = [];
        renderCart();
    };

    loadProducts();
    loadCustomers();
});
