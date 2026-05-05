const CUSTOMER_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

let customerDataList = [];

document.addEventListener("DOMContentLoaded", function () {

    const table = document.getElementById("customer-table-list");
    const form = document.getElementById("customer-form");
    const quickForm = document.getElementById("quick-customer-form");
    const tableWrap = document.getElementById("customer-table-wrap");
    const scrollDock = document.getElementById("customer-scroll-dock");
    const horizontalScroll = document.getElementById("customer-horizontal-scroll");
    const popup = document.getElementById("customerRegisterForm");
    const title = document.getElementById("registerTitle");
    const btn = document.getElementById("customer-submit");
    const filterIds = [
        "customer-search-filter",
        "customer-status-filter",
        "customer-town-filter",
        "customer-place-filter",
        "customer-representative-filter",
        "customer-year-filter",
        "customer-month-filter"
    ];

    let isUpdate = false;
    let currentCustomerId = null;

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
        currentCustomerId = null;
        btn.innerText = "Submit";
    };

    // ======================
    // LOAD CUSTOMERS
    // ======================
    async function loadCustomers() {
        customerDataList = await window.getCustomers();
        setupCustomerFilters();
        applyCustomerFilters();
    }

    function normalizeCustomer(c) {
        return {
            town: c.town || c.Town || "",
            place: c.place || c.Place || "",
            representative: c.representative || c.Representative || "",
            customerID: c.customerID || c.customerId || c["Customer ID"] || c.custId || "",
            name: c.name || c.Name || c.custName || c.customerName || "",
            age: c.age || c.Age || "",
            birthday: formatDate(c.birthday || c.Birthday || ""),
            contactNo: c.contactNo || c.contact || c["Contact No"] || c["Contact Number"] || c.custContact || "",
            appointmentDate: formatDate(c.appointmentDate || c["Appointment Date"] || ""),
            prescription: c.prescription || c.Prescription || "",
            frameType: c.frameType || c["Frame Type"] || "",
            lensType: c.lensType || c["Lens Type"] || "",
            totalAmount: c.totalAmount || c["Total Amount"] || "",
            advancedPayment: c.advancedPayment || c["Advanced Payment"] || "",
            remainingBalance: c.remainingBalance || c["Remaining Balance"] || "",
            orderStatus: c.orderStatus || c["Order Status"] || ""
        };
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toISOString().slice(0, 10);
    }

    function renderCustomerTable(customers) {
        table.innerHTML = "";

        if (!customers.length) {
            table.innerHTML = `<tr><td colspan="18">No customers found. Check the Google Apps Script deployment.</td></tr>`;
            requestAnimationFrame(updateCustomerTableScroll);
            return;
        }

        customers.forEach(c => renderRow(normalizeCustomer(c)));
        requestAnimationFrame(updateCustomerTableScroll);
    }

    function setupCustomerFilters() {
        const customers = customerDataList.map(normalizeCustomer);
        const representatives = unique(customers.map(customer => customer.representative));

        fillSelect("customer-status-filter", unique(customers.map(customer => customer.orderStatus)), "All Status");
        fillSelect("customer-town-filter", unique(customers.map(customer => customer.town)), "All Towns");
        fillSelect("customer-place-filter", unique(customers.map(customer => customer.place)), "All Places");
        fillSelect("customer-representative-filter", representatives, "All Representatives");
        fillSelect("customer-year-filter", unique(customers.map(customer => getCustomerYear(customer))).sort(), "All Years");
        fillSelect("quickRepresentative", representatives, "Representative");
        fillSelect("representative", representatives, "Representative");

        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element && !element.dataset.bound) {
                element.addEventListener(id === "customer-search-filter" ? "input" : "change", applyCustomerFilters);
                element.dataset.bound = "true";
            }
        });

        const moreButton = document.getElementById("customer-more-filters");
        const moreFilters = document.getElementById("customer-filter-more");
        if (moreButton && moreFilters && !moreButton.dataset.bound) {
            moreButton.addEventListener("click", () => {
                moreFilters.classList.toggle("open");
                moreButton.innerText = moreFilters.classList.contains("open") ? "Less Filters" : "More Filters";
            });
            moreButton.dataset.bound = "true";
        }

        const clearButton = document.getElementById("customer-clear-filters");
        if (clearButton && !clearButton.dataset.bound) {
            clearButton.addEventListener("click", () => {
                resetCustomerFilters();
                applyCustomerFilters();
            });
            clearButton.dataset.bound = "true";
        }

        setupCustomerTableScroll();
    }

    function fillSelect(id, values, firstLabel) {
        const select = document.getElementById(id);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = `<option value="">${firstLabel}</option>`;

        values.filter(Boolean).forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        if ([...select.options].some(option => option.value === currentValue)) {
            select.value = currentValue;
        }
    }

    function applyCustomerFilters() {
        const search = getFilterValue("customer-search-filter").toLowerCase();
        const status = getFilterValue("customer-status-filter");
        const town = getFilterValue("customer-town-filter");
        const place = getFilterValue("customer-place-filter");
        const representative = getFilterValue("customer-representative-filter");
        const year = getFilterValue("customer-year-filter");
        const month = getFilterValue("customer-month-filter");

        const filtered = customerDataList.filter(customer => {
            const c = normalizeCustomer(customer);
            const date = parseCustomerDate(c.appointmentDate);
            const searchable = [
                c.town,
                c.place,
                c.representative,
                c.customerID,
                c.name,
                c.contactNo,
                c.orderStatus
            ].join(" ").toLowerCase();

            const matchesSearch = !search || searchable.includes(search);
            const matchesStatus = !status || c.orderStatus === status;
            const matchesTown = !town || c.town === town;
            const matchesPlace = !place || c.place === place;
            const matchesRepresentative = !representative || c.representative === representative;
            const matchesYear = !year || (date && String(date.getFullYear()) === year);
            const matchesMonth = month === "" || (date && String(date.getMonth()) === month);

            return matchesSearch && matchesStatus && matchesTown && matchesPlace && matchesRepresentative && matchesYear && matchesMonth;
        });

        renderCustomerTable(filtered);
    }

    function isPendingCustomerStatus(status) {
        const normalized = String(status || "").toLowerCase();
        return !["complete", "completed", "delivered", "done", "closed"].includes(normalized);
    }

    window.showPendingCustomers = function () {
        const pendingCustomers = customerDataList.filter(customer => {
            const normalizedCustomer = normalizeCustomer(customer);
            return isPendingCustomerStatus(normalizedCustomer.orderStatus);
        });

        renderCustomerTable(pendingCustomers);
    };

    window.showAllCustomers = function () {
        resetCustomerFilters();
        applyCustomerFilters();
    };

    function resetCustomerFilters() {
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = "";
        });

        const moreButton = document.getElementById("customer-more-filters");
        const moreFilters = document.getElementById("customer-filter-more");
        if (moreFilters) moreFilters.classList.remove("open");
        if (moreButton) moreButton.innerText = "More Filters";

        if (tableWrap) tableWrap.scrollLeft = 0;
        if (horizontalScroll) horizontalScroll.value = "0";
    }

    function parseCustomerDate(value) {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function getCustomerYear(customer) {
        const date = parseCustomerDate(customer.appointmentDate);
        return date ? date.getFullYear() : "";
    }

    function getFilterValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : "";
    }

    function unique(values) {
        return [...new Set(values.filter(Boolean))].sort();
    }

    function setupCustomerTableScroll() {
        if (!tableWrap || !horizontalScroll || horizontalScroll.dataset.bound) return;

        horizontalScroll.addEventListener("input", () => {
            tableWrap.scrollLeft = Number(horizontalScroll.value);
        });

        tableWrap.addEventListener("scroll", () => {
            horizontalScroll.value = String(Math.round(tableWrap.scrollLeft));
        });

        window.addEventListener("resize", updateCustomerTableScroll);
        horizontalScroll.dataset.bound = "true";
        updateCustomerTableScroll();
    }

    function updateCustomerTableScroll() {
        if (!tableWrap || !horizontalScroll || !scrollDock) return;

        const customerSection = document.getElementById("CustomerForm");
        const isCustomerVisible = customerSection && window.getComputedStyle(customerSection).display !== "none";
        const maxScroll = Math.max(tableWrap.scrollWidth - tableWrap.clientWidth, 0);

        horizontalScroll.max = String(maxScroll);
        horizontalScroll.value = String(Math.min(Math.round(tableWrap.scrollLeft), maxScroll));
        scrollDock.classList.toggle("visible", isCustomerVisible && maxScroll > 0);
    }

    window.updateCustomerTableScroll = updateCustomerTableScroll;

    // ======================
    // RENDER ROW
    // ======================
    function renderRow(c) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${c.town}</td>
            <td>${c.place}</td>
            <td>${c.representative}</td>
            <td>${c.customerID}</td>
            <td>${c.name}</td>
            <td>${c.age}</td>
            <td>${c.birthday}</td>
            <td>${c.contactNo}</td>
            <td>${c.appointmentDate}</td>
            <td>${c.prescription}</td>
            <td>${c.frameType}</td>
            <td>${c.lensType}</td>
            <td>${c.totalAmount}</td>
            <td>${c.advancedPayment}</td>
            <td>${c.remainingBalance}</td>
            <td>${c.orderStatus}</td>
        `;

        // UPDATE
        const updateBtn = document.createElement("button");
        updateBtn.innerText = "Update";
        updateBtn.onclick = () => {
            document.getElementById("town").value = c.town;
            document.getElementById("place").value = c.place;
            document.getElementById("representative").value = c.representative;
            document.getElementById("customerID").value = c.customerID;
            document.getElementById("customerName").value = c.name;
            document.getElementById("age").value = c.age;
            document.getElementById("birthday").value = c.birthday;
            document.getElementById("contactNo").value = c.contactNo;
            document.getElementById("appointmentDate").value = c.appointmentDate;
            document.getElementById("prescription").value = c.prescription;
            document.getElementById("frameType").value = c.frameType;
            document.getElementById("lensType").value = c.lensType;
            document.getElementById("totalAmount").value = c.totalAmount;
            document.getElementById("advancedPayment").value = c.advancedPayment;
            document.getElementById("remainingBalance").value = c.remainingBalance;
            document.getElementById("orderStatus").value = c.orderStatus;

            popup.style.display = "block";
            title.innerText = "Update Customer";

            isUpdate = true;
            currentCustomerId = c.customerID;
            btn.innerText = "Update";
        };

        // DELETE
        const deleteBtn = document.createElement("button");
        deleteBtn.innerText = "Delete";
        deleteBtn.onclick = async () => {
            if (!confirm("Delete this customer record?")) return;

            await fetch(CUSTOMER_API_URL, {
                method: "POST",
                body: JSON.stringify({
                    type: "deleteCustomer",
                    data: { customerID: c.customerID }
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
    // QUICK SUBMIT
    // ======================
    quickForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const customer = {
            town: document.getElementById("quickTown").value,
            place: document.getElementById("quickPlace").value,
            representative: document.getElementById("quickRepresentative").value,
            customerID: "C-" + Date.now(),
            name: document.getElementById("quickCustomerName").value,
            contactNo: document.getElementById("quickContactNo").value,
            appointmentDate: document.getElementById("quickAppointmentDate").value,
            orderStatus: "Free Check",
            totalAmount: 0,
            advancedPayment: 0,
            remainingBalance: 0
        };

        await fetch(CUSTOMER_API_URL, {
            method: "POST",
            body: JSON.stringify({
                type: "addCustomer",
                data: customer
            })
        });

        toast("Quick customer added");
        quickForm.reset();
        loadCustomers();
    });

    // ======================
    // SUBMIT
    // ======================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const totalAmount = Number(document.getElementById("totalAmount").value) || 0;
        const advancedPayment = Number(document.getElementById("advancedPayment").value) || 0;
        const remainingBalance = document.getElementById("remainingBalance");

        if (!remainingBalance.value) {
            remainingBalance.value = totalAmount - advancedPayment;
        }

        const customer = {
            town: document.getElementById("town").value,
            place: document.getElementById("place").value,
            representative: document.getElementById("representative").value,
            customerID: document.getElementById("customerID").value,
            name: document.getElementById("customerName").value,
            age: document.getElementById("age").value,
            birthday: document.getElementById("birthday").value,
            contactNo: document.getElementById("contactNo").value,
            appointmentDate: document.getElementById("appointmentDate").value,
            prescription: document.getElementById("prescription").value,
            frameType: document.getElementById("frameType").value,
            lensType: document.getElementById("lensType").value,
            totalAmount: totalAmount,
            advancedPayment: advancedPayment,
            remainingBalance: Number(remainingBalance.value) || 0,
            orderStatus: document.getElementById("orderStatus").value,
            originalCustomerID: currentCustomerId
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
        currentCustomerId = null;
        btn.innerText = "Submit";

        loadCustomers();
    });

    loadCustomers();
});
