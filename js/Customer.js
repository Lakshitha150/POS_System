const CUSTOMER_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

let customerDataList = [];
let customerPlaceList = [];
const currentCustomerUser = window.getStoredUser ? window.getStoredUser() : JSON.parse(localStorage.getItem("user") || "null");
const currentRepresentativeName = window.getUserDisplayName ? window.getUserDisplayName(currentCustomerUser) : ((currentCustomerUser && (currentCustomerUser.name || currentCustomerUser.username)) || "");
const customerIsAdmin = (window.getUserPrivilege ? window.getUserPrivilege(currentCustomerUser) : ((currentCustomerUser && currentCustomerUser.role) || "")).toLowerCase() === "admin";

document.addEventListener("DOMContentLoaded", function () {

    const table = document.getElementById("customer-table-list");
    const form = document.getElementById("customer-form");
    const quickForm = document.getElementById("quick-customer-form");
    const tableWrap = document.getElementById("customer-table-wrap");
    const scrollDock = document.getElementById("customer-scroll-dock");
    const horizontalScroll = document.getElementById("customer-horizontal-scroll");
    const goTopButton = document.getElementById("customer-go-top");
    const popup = document.getElementById("customerRegisterForm");
    const title = document.getElementById("registerTitle");
    const btn = document.getElementById("customer-submit");
    const clearFormButton = document.getElementById("customer-clear-form");
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
        form.reset();
        isUpdate = false;
        currentCustomerId = null;
        btn.innerText = "Submit";
        applyLoggedInRepresentative();
    };

    if (clearFormButton) {
        clearFormButton.onclick = () => {
            form.reset();
            isUpdate = false;
            currentCustomerId = null;
            title.innerText = "Add Customer";
            btn.innerText = "Submit";
            applyLoggedInRepresentative();
        };
    }

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
        const [customers, places] = await Promise.all([
            window.getCustomers(),
            window.getPlaces ? window.getPlaces() : []
        ]);
        customerDataList = customers;
        customerPlaceList = places.map(normalizePlace);
        setupCustomerFilters();
        applyCustomerFilters();
    }

    window.addEventListener("pos-cache-updated", event => {
        if (!event.detail || event.detail.type !== "customers") return;
        customerDataList = event.detail.data || [];
        setupCustomerFilters();
        applyCustomerFilters();
    });

    window.addEventListener("pos-cache-updated", event => {
        if (!event.detail || event.detail.type !== "places") return;
        customerPlaceList = (event.detail.data || []).map(normalizePlace);
        setupCustomerFilters();
        applyCustomerFilters();
    });

    function normalizeCustomer(c) {
        const placeCode = c.placeCode || c["Place Code"] || c["Place code"] || "";
        const placeDefaults = getPlaceByCode(placeCode);
        return {
            town: c.town || c.Town || placeDefaults.town || "",
            place: c.place || c.Place || placeDefaults.place || "",
            placeCode: placeCode,
            representative: c.representative || c.Representative || placeDefaults.representative || "",
            customerID: c.customerID || c.customerId || c["Customer ID"] || c.custId || "",
            name: c.name || c.Name || c.custName || c.customerName || "",
            age: c.age || c.Age || "",
            birthday: formatDate(c.birthday || c.Birthday || ""),
            contactNo: c.contactNo || c.contact || c["Contact No"] || c["Contact Number"] || c.custContact || "",
            awarenessProgramDate: formatDate(c.awarenessProgramDate || c["Awareness Program Date"] || c["Awreness Program Date"] || placeDefaults.awarenessProgramDate || ""),
            appointmentDate: formatDate(c.appointmentDate || c.eyeCampDate || c["Eye Camp Date"] || c["Appointment Date"] || placeDefaults.eyeCampDate || ""),
            prescription: c.prescription || c.Prescription || "",
            frameType: c.frameType || c["Frame Type"] || "",
            lensMaterial: c.lensMaterial || c["Lens Material"] || "",
            lensType: c.lensType || c["Lens Type"] || c["Lens Type "] || "",
            bifocalSegment: c.bifocalSegment || c["Bifocal Segment"] || "",
            coating: c.coating || c.Coating || "",
            lensModel: c.lensModel || c["Lens Model"] || "",
            totalAmount: c.totalAmount || c["Total Amount"] || "",
            advancedPayment: c.advancedPayment || c["Advanced Payment"] || "",
            remainingBalance: c.remainingBalance || c["Remaining Balance"] || "",
            orderStatus: c.orderStatus || c["Order Status"] || "",
            autoGeneratedComments: c.autoGeneratedComments || c["Auto Generated Comments"] || "",
            comments: c.comments || c.Comments || ""
        };
    }

    function normalizePlace(place) {
        return {
            placeCode: place.placeCode || place["Place Code"] || place["Place code"] || "",
            town: place.town || place.Town || "",
            place: place.place || place.Place || "",
            representative: place.representative || place.Representative || "",
            awarenessProgramDate: place.awarenessProgramDate || place["Awareness Program Date"] || place["Awreness Program Date"] || place.discussionDate || place["Discussion Date"] || "",
            eyeCampDate: place.eyeCampDate || place["Eye Camp Date"] || place.decidedDate || place["Decided Date"] || ""
        };
    }

    function getPlaceByCode(placeCode) {
        const code = normalizePlaceCode(placeCode);
        return customerPlaceList.find(place => normalizePlaceCode(place.placeCode) === code) || {};
    }

    function applyPlaceDefaultsFromCode(placeCode) {
        const place = getPlaceByCode(placeCode);
        if (!place.placeCode) return;

        document.getElementById("town").value = place.town || "";
        document.getElementById("place").value = place.place || "";
        document.getElementById("representative").value = place.representative || "";
        document.getElementById("awarenessProgramDate").value = formatDate(place.awarenessProgramDate);
        document.getElementById("appointmentDate").value = formatDate(place.eyeCampDate);
    }

    function normalizePlaceCode(value) {
        return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    function formatDate(value) {
        if (!value) return "";
        if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value).trim())) {
            const numeric = Number(value);
            if (numeric > 20000 && numeric < 80000) {
                return new Date(Math.round((numeric - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
            }
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toISOString().slice(0, 10);
    }

    function renderCustomerTable(customers) {
        table.innerHTML = "";

        if (!customers.length) {
            table.innerHTML = `<tr><td colspan="21">No customers found. Check the Google Apps Script deployment.</td></tr>`;
            requestAnimationFrame(updateCustomerTableScroll);
            return;
        }

        customers.forEach(c => renderRow(normalizeCustomer(c)));
        requestAnimationFrame(updateCustomerTableScroll);
    }

    function setupCustomerFilters() {
        const customers = customerDataList.map(normalizeCustomer);
        const representatives = unique([
            ...customers.map(customer => customer.representative),
            ...customerPlaceList.map(place => place.representative)
        ]);

        fillSelect("customer-status-filter", unique(customers.map(customer => customer.orderStatus)), "All Status");
        fillSelect("customer-town-filter", unique([...customers.map(customer => customer.town), ...customerPlaceList.map(place => place.town)]), "All Towns");
        fillSelect("customer-place-filter", unique([...customers.map(customer => customer.place), ...customerPlaceList.map(place => place.place)]), "All Places");
        fillSelect("customer-representative-filter", representatives, "All Representatives");
        fillSelect("customer-year-filter", unique(customers.map(customer => getCustomerYear(customer))).sort(), "All Years");
        fillSelect("quickRepresentative", representatives, "Representative");
        fillSelect("representative", representatives, "Representative");
        applyLoggedInRepresentative();

        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element && !element.dataset.bound) {
                element.addEventListener(id === "customer-search-filter" ? "input" : "change", applyCustomerFilters);
                element.dataset.bound = "true";
            }
        });

        const placeCodeInput = document.getElementById("placeCode");
        if (placeCodeInput && !placeCodeInput.dataset.bound) {
            placeCodeInput.addEventListener("blur", () => applyPlaceDefaultsFromCode(placeCodeInput.value));
            placeCodeInput.dataset.bound = "true";
        }

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
                filterIds.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) element.value = "";
                });
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

    function applyLoggedInRepresentative() {
        ["quickRepresentative", "representative"].forEach(id => {
            const field = document.getElementById(id);
            if (!field) return;

            if (window.ensureRepresentativeValue) {
                window.ensureRepresentativeValue(field, currentRepresentativeName, customerIsAdmin);
            }

            if (!customerIsAdmin) {
                field.value = currentRepresentativeName;
                field.disabled = true;
            }
        });
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
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = "";
        });
        applyCustomerFilters();
    };

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
        updateCustomerGoTop();
    }

    window.updateCustomerTableScroll = updateCustomerTableScroll;

    function updateCustomerGoTop() {
        if (!goTopButton) return;

        const customerSection = document.getElementById("CustomerForm");
        const isCustomerVisible = customerSection && window.getComputedStyle(customerSection).display !== "none";

        goTopButton.classList.toggle("visible", isCustomerVisible && window.scrollY > 260);
    }

    if (goTopButton) {
        goTopButton.addEventListener("click", () => {
            document.getElementById("customerHeaderSection").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }

    window.addEventListener("scroll", updateCustomerGoTop);
    window.addEventListener("resize", updateCustomerGoTop);
    window.updateCustomerPageControls = function () {
        updateCustomerTableScroll();
        updateCustomerGoTop();
    };

    // ======================
    // RENDER ROW
    // ======================
    function renderRow(c) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${c.placeCode}</td>
            <td>${c.customerID}</td>
            <td>${c.name}</td>
            <td>${c.age}</td>
            <td>${c.birthday}</td>
            <td>${c.contactNo}</td>
            <td>${c.frameType}</td>
            <td>${c.lensMaterial}</td>
            <td>${c.lensType}</td>
            <td>${c.bifocalSegment}</td>
            <td>${c.coating}</td>
            <td>${c.lensModel}</td>
            <td>${c.prescription}</td>
            <td>${c.totalAmount}</td>
            <td>${c.advancedPayment}</td>
            <td>${c.remainingBalance}</td>
            <td>${c.orderStatus}</td>
            <td>${c.autoGeneratedComments}</td>
            <td>${c.comments}</td>
        `;

        // UPDATE
        const updateBtn = document.createElement("button");
        updateBtn.innerText = "Update";
        updateBtn.onclick = () => {
            document.getElementById("placeCode").value = c.placeCode;
            document.getElementById("town").value = c.town;
            document.getElementById("place").value = c.place;
            document.getElementById("representative").value = c.representative;
            document.getElementById("customerID").value = c.customerID;
            document.getElementById("customerName").value = c.name;
            document.getElementById("age").value = c.age;
            document.getElementById("birthday").value = c.birthday;
            document.getElementById("contactNo").value = c.contactNo;
            document.getElementById("awarenessProgramDate").value = c.awarenessProgramDate;
            document.getElementById("appointmentDate").value = c.appointmentDate;
            document.getElementById("prescription").value = c.prescription;
            document.getElementById("frameType").value = c.frameType;
            document.getElementById("lensType").value = c.lensType;
            document.getElementById("totalAmount").value = c.totalAmount;
            document.getElementById("advancedPayment").value = c.advancedPayment;
            document.getElementById("remainingBalance").value = c.remainingBalance;
            document.getElementById("orderStatus").value = c.orderStatus;
            applyPlaceDefaultsFromCode(c.placeCode);

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

            await window.postToGoogleScript({
                type: "deleteCustomer",
                data: { customerID: c.customerID }
            });

            toast("Customer Deleted");
            loadCustomers();
        };

        const user = currentCustomerUser;
        if (user && !customerIsAdmin) {
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
            representative: document.getElementById("quickRepresentative").value || currentRepresentativeName,
            customerID: "C-" + Date.now(),
            name: document.getElementById("quickCustomerName").value,
            contactNo: document.getElementById("quickContactNo").value,
            appointmentDate: document.getElementById("quickAppointmentDate").value,
            orderStatus: "Free Check",
            totalAmount: 0,
            advancedPayment: 0,
            remainingBalance: 0
        };

        await window.postToGoogleScript({
            type: "addCustomer",
            data: customer
        });

        toast("Quick customer added");
        quickForm.reset();
        applyLoggedInRepresentative();
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
            placeCode: document.getElementById("placeCode").value,
            town: document.getElementById("town").value,
            place: document.getElementById("place").value,
            representative: document.getElementById("representative").value || currentRepresentativeName,
            customerID: document.getElementById("customerID").value,
            name: document.getElementById("customerName").value,
            age: document.getElementById("age").value,
            birthday: document.getElementById("birthday").value,
            contactNo: document.getElementById("contactNo").value,
            awarenessProgramDate: document.getElementById("awarenessProgramDate").value,
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

        await window.postToGoogleScript({
            type,
            data: customer
        });

        toast(isUpdate ? "Updated" : "Added");

        popup.style.display = "none";
        form.reset();
        applyLoggedInRepresentative();
        isUpdate = false;
        currentCustomerId = null;
        btn.innerText = "Submit";

        loadCustomers();
    });

    loadCustomers();
});
