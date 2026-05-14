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
    const currentDateEl = document.getElementById("current-date");

    if (currentDateEl) {
        currentDateEl.innerText = new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    async function loadProducts() {
        const res = await fetch(window.buildAuthedUrl ? window.buildAuthedUrl({ type: "products" }) : (ORDER_API_URL + "?type=products"));
        productList = await window.readJsonResponse(res);

        productBox.innerHTML = "";

        productList.map(normalizeProduct).forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <h4>${escapeHtml(product.pro_name || "Unnamed item")}</h4>
                <strong>${formatCurrency(product.price)}</strong>
                <p>${escapeHtml(product.category || "Uncategorized")}</p>
                <p>Stock: ${product.quantity}</p>
            `;
            card.addEventListener("click", () => addToCart(product));
            productBox.appendChild(card);
        });
    }

    async function loadCustomers() {
        const res = await fetch(window.buildAuthedUrl ? window.buildAuthedUrl({ type: "customers" }) : (ORDER_API_URL + "?type=customers"));
        customerList = await window.readJsonResponse(res);

        customerSelect.innerHTML = `<option value="">Select Customer</option>`;

        customerList.map(normalizeCustomer).forEach(customer => {
            const option = document.createElement("option");
            option.value = customer.custContact;
            option.textContent = customer.custName ? `${customer.custName} - ${customer.custContact}` : customer.custContact;
            customerSelect.appendChild(option);
        });
    }

    function normalizeProduct(product) {
        return {
            pro_id: product.pro_id || product.productID || product.productId || product.id || product["Product ID"] || "",
            pro_name: product.pro_name || product.productName || product.name || product.product || product["Product"] || product["Product Name"] || "",
            price: Number(product.price || product.Price || product["Price"] || 0),
            category: product.category || product.Category || product["Category"] || "",
            quantity: Number(product.quantity || product.qty || product.Quantity || product["Quantity"] || 0)
        };
    }

    function normalizeCustomer(customer) {
        return {
            placeCode: customer.placeCode || customer["Place Code"] || customer["Place code"] || "",
            customerID: customer.customerID || customer.customerId || customer["Customer ID"] || customer.custId || "",
            custName: customer.name || customer.Name || customer.custName || customer.customerName || "",
            custContact: customer.contactNo || customer.custContact || customer.customerNumber || customer.contact || customer.mobile || customer["Contact No"] || customer["Contact Number"] || customer["Mobile Number"] || "",
            representative: customer.representative || customer.Representative || ""
        };
    }

    function addToCart(product) {
        const existing = cart.find(item => item.pro_id === product.pro_id);

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }

        renderCart();
    }

    function removeItem(id) {
        cart = cart.filter(item => item.pro_id !== id);
        renderCart();
    }

    function renderCart() {
        cartBox.innerHTML = "";
        let subtotal = 0;

        if (!cart.length) {
            cartBox.innerHTML = `<div class="cart-empty">No items added yet.</div>`;
        }

        cart.forEach(item => {
            subtotal += item.price * item.quantity;

            const row = document.createElement("div");
            row.className = "cart-item";
            row.innerHTML = `
                <div>
                    <strong>${escapeHtml(item.pro_name)}</strong>
                    <small>${formatCurrency(item.price)} x ${item.quantity}</small>
                </div>
                <span>${formatCurrency(item.price * item.quantity)}</span>
                <button class="remove-button-cart" type="button">X</button>
            `;
            row.querySelector("button").addEventListener("click", () => removeItem(item.pro_id));
            cartBox.appendChild(row);
        });

        const discount = Number(discountEl.value) || 0;
        const cash = Number(cashEl.value) || 0;
        const total = Math.max(subtotal - discount, 0);
        const balance = cash - total;

        subtotalEl.innerText = formatCurrency(subtotal);
        totalEl.innerText = formatCurrency(total);
        balanceEl.innerText = formatCurrency(balance);
    }

    function showInvoice(order) {
        document.getElementById("invoice-modal").style.display = "flex";
        document.getElementById("inv-order-id").innerText = "Order: " + order.order_id;
        document.getElementById("inv-date").innerText = "Date: " + new Date().toLocaleString("en-GB");
        document.getElementById("inv-customer").innerText = "Customer: " + (order.customerName || order.contact || "Walk-in");

        const itemsBox = document.getElementById("inv-items");
        itemsBox.innerHTML = "";

        order.items.forEach(item => {
            const row = document.createElement("div");
            row.className = "receipt-line";
            row.innerHTML = `<span>${escapeHtml(item.pro_name)} x ${item.quantity}</span><span>${formatCurrency(item.price * item.quantity)}</span>`;
            itemsBox.appendChild(row);
        });

        document.getElementById("inv-subtotal").innerHTML = `<span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span>`;
        document.getElementById("inv-discount").innerHTML = `<span>Discount</span><span>${formatCurrency(order.discount)}</span>`;
        document.getElementById("inv-total").innerHTML = `<span>Total</span><span>${formatCurrency(order.total)}</span>`;
        document.getElementById("inv-cash").innerHTML = `<span>Cash</span><span>${formatCurrency(order.cash)}</span>`;
        document.getElementById("inv-balance").innerHTML = `<span>Balance</span><span>${formatCurrency(order.balance)}</span>`;
    }

    window.closeInvoice = function closeInvoice() {
        document.getElementById("invoice-modal").style.display = "none";
    };

    cashEl.addEventListener("input", renderCart);
    discountEl.addEventListener("input", renderCart);

    document.getElementById("purchase").addEventListener("click", async function () {
        if (!cart.length) {
            alert("Please add at least one item.");
            return;
        }

        if (!customerSelect.value) {
            alert("Please select a customer.");
            return;
        }

        const selectedCustomer = customerList
            .map(normalizeCustomer)
            .find(customer => customer.custContact === customerSelect.value);

        const orderId = buildOrderId(selectedCustomer);
        const order = {
            order_id: orderId,
            placeCode: selectedCustomer ? selectedCustomer.placeCode : "",
            customerID: selectedCustomer ? selectedCustomer.customerID : "",
            contact: customerSelect.value,
            customerName: selectedCustomer ? selectedCustomer.custName : "",
            representative: selectedCustomer ? selectedCustomer.representative : "",
            items: cart.map(item => ({ ...item })),
            itemName: cart.map(item => item.pro_name).filter(Boolean).join(" | "),
            subtotal: parseCurrency(subtotalEl.innerText),
            discount: Number(discountEl.value) || 0,
            total: parseCurrency(totalEl.innerText),
            cash: Number(cashEl.value) || 0,
            balance: parseCurrency(balanceEl.innerText)
        };

        await window.postToGoogleScript({
            type: "order",
            data: order
        });

        showInvoice(order);
        cart = [];
        cashEl.value = "";
        discountEl.value = "";
        renderCart();
    });

    function formatCurrency(value) {
        return "Rs " + Math.round(Number(value || 0)).toLocaleString("en-US");
    }

    function parseCurrency(value) {
        return Number(String(value || "0").replace(/[^\d.-]/g, "")) || 0;
    }

    function buildOrderId(customer) {
        const placeCode = String(customer && customer.placeCode || "").trim();
        const customerID = String(customer && customer.customerID || "").trim();
        if (placeCode && customerID && customerID.toUpperCase().startsWith(placeCode.toUpperCase())) {
            return customerID;
        }
        return `${placeCode}${customerID}` || `ORD-${Date.now()}`;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));
    }

    loadProducts();
    loadCustomers();
    renderCart();
});
