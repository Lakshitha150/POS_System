const CUSTOMER_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

let customerDataList = [];

document.addEventListener("DOMContentLoaded", function () {

    const table = document.getElementById("customer-table-list");
    const form = document.getElementById("customer-form");
    const popup = document.getElementById("customerRegisterForm");
    const title = document.getElementById("registerTitle");
    const btn = document.getElementById("customer-submit");

    let isUpdate = false;
    let currentContact = null;

    // ======================
    // TOAST
    // ======================
    function toast(msg, type = "success") {
        const t = document.getElementById("toast");
        t.className = "toast " + type + " show";
        t.innerText = msg;

        setTimeout(() => t.classList.remove("show"), 3000);
    }

    // ======================
    // OPEN FORM
    // ======================
    document.getElementById("add-customer").onclick = () => {
        popup.style.display = "block";
        title.innerText = "Add Customer";
    };

    document.getElementById("customerRegisterForm-close").onclick = () => {
        popup.style.display = "none";
        form.reset();
        isUpdate = false;
        currentContact = null;
        btn.innerText = "Submit";
    };

    // ======================
    // LOAD CUSTOMERS
    // ======================
    async function loadCustomers() {
        const res = await fetch(CUSTOMER_API_URL + "?type=customers");
        customerDataList = await res.json();

        table.innerHTML = "";

        customerDataList.forEach(c => renderRow(c));
    }

    // ======================
    // RENDER ROW
    // ======================
    function renderRow(c) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${c.custId}</td>
            <td>${c.custName}</td>
            <td>${c.custAddress}</td>
            <td>${c.custContact}</td>
        `;

        // UPDATE
        const updateBtn = document.createElement("button");
        updateBtn.innerText = "Update";
        updateBtn.onclick = () => {
            document.getElementById("customerID").value = c.custId;
            document.getElementById("customerName").value = c.custName;
            document.getElementById("customerAddress").value = c.custAddress;
            document.getElementById("customerNumber").value = c.custContact;

            popup.style.display = "block";
            title.innerText = "Update Customer";

            isUpdate = true;
            currentContact = c.custContact;
            btn.innerText = "Update";
        };

        // DELETE
        const deleteBtn = document.createElement("button");
        deleteBtn.innerText = "Delete";
        deleteBtn.onclick = async () => {
            if (!confirm("Delete this customer?")) return;

            await fetch(CUSTOMER_API_URL, {
                method: "POST",
                body: JSON.stringify({
                    type: "deleteCustomer",
                    data: { custContact: c.custContact }
                })
            });

            toast("Customer Deleted");
            loadCustomers();
        };

        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.role !== "admin") {
            updateBtn.style.display = "none";
            deleteBtn.style.display = "none";
        }

        const actionTd = document.createElement("td");
        actionTd.appendChild(updateBtn);

        const actionTd2 = document.createElement("td");
        actionTd2.appendChild(deleteBtn);

        row.appendChild(actionTd);
        row.appendChild(actionTd2);

        table.appendChild(row);
    }

    // ======================
    // SUBMIT
    // ======================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const customer = {
            custId: document.getElementById("customerID").value,
            custName: document.getElementById("customerName").value,
            custAddress: document.getElementById("customerAddress").value,
            custContact: document.getElementById("customerNumber").value
        };

        const type = isUpdate ? "updateCustomer" : "addCustomer";

        await fetch(CUSTOMER_API_URL, {
            method: "POST",
            body: JSON.stringify({
                type,
                data: customer
            })
        });

        toast(isUpdate ? "Updated" : "Added");

        popup.style.display = "none";
        form.reset();
        isUpdate = false;
        btn.innerText = "Submit";

        loadCustomers();
    });

    loadCustomers();
});
