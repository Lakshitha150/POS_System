const dashboardUser = JSON.parse(localStorage.getItem("user"));

if (!dashboardUser) {
    window.location.href = "loginRegister.html";
}

if (dashboardUser.role !== "admin") {
    console.log("Cashier mode - limited access");
}

const DASHBOARD_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DASHBOARD_REFRESH_INTERVAL_MS = 60000;

let dashboardCustomers = [];
let dashboardItems = [];
let dashboardOrders = [];
let dashboardPlaces = [];
let yearlyRevenueChart = null;
let activeRevenueChartView = "year";
let dashboardRefreshTimer = null;
let dashboardRefreshInProgress = false;
const PENDING_STATUS_FILTER = "__pending_customers__";

async function loadDashboard() {
    if (dashboardRefreshInProgress) return;
    dashboardRefreshInProgress = true;

    try {
        const [customers, items, orders, places, dashboardData] = await Promise.all([
            window.getCustomers(),
            window.getProducts(),
            window.getOrders(),
            window.getPlaces ? window.getPlaces() : [],
            getDashboardData()
        ]);

        dashboardCustomers = customers.map(normalizeCustomerRecord);
        dashboardItems = items;
        dashboardOrders = orders;
        dashboardPlaces = places.map(normalizePlaceRecord);

        setupDashboardFilters(dashboardCustomers, dashboardPlaces);
        applyDashboardFilters(dashboardData);
    } catch (error) {
        console.error("Dashboard load failed:", error);
    } finally {
        dashboardRefreshInProgress = false;
    }
}

function startDashboardAutoRefresh() {
    if (dashboardRefreshTimer) return;
    dashboardRefreshTimer = setInterval(() => {
        loadDashboard();
    }, DASHBOARD_REFRESH_INTERVAL_MS);
}

async function getDashboardData() {
    try {
        const res = await fetch(DASHBOARD_API_URL + "?type=dashboard");
        const data = await res.json();
        return data && !data.message ? data : {};
    } catch (error) {
        console.warn("Dashboard summary endpoint failed, using table data.", error);
        return {};
    }
}

function setupDashboardFilters(customers, places) {
    const representatives = unique([
        ...customers.map(customer => customer.representative),
        ...places.map(place => place.representative)
    ]);
    const placeNames = unique([
        ...customers.map(customer => customer.place),
        ...places.map(place => place.place)
    ]);

    fillSelect("dashboard-representative-filter", representatives, "All Representatives");
    fillSelect("dashboard-place-filter", placeNames, "All Places");
    fillSelect("dashboard-status-filter", unique(customers.map(customer => customer.orderStatus)), "All Status");
    addPendingStatusOption("dashboard-status-filter");
    const years = unique(customers.map(customer => getRecordYear(customer))).sort();
    fillSelect("dashboard-year-filter", years, "All Years");
    fillSelect("revenue-chart-year-filter", years, "Select Year");

    ["dashboard-representative-filter", "dashboard-place-filter", "dashboard-status-filter", "dashboard-year-filter", "dashboard-month-filter"].forEach(id => {
        const element = document.getElementById(id);
        if (element && !element.dataset.bound) {
            element.addEventListener("change", () => {
                if (id === "dashboard-year-filter") syncRevenueChartYear(element.value);
                if (id === "dashboard-month-filter") syncRevenueChartMonth(element.value);
                applyDashboardFilters();
            });
            element.dataset.bound = "true";
        }
    });

    setupRevenueChartTabs();

    const clearButton = document.getElementById("dashboard-clear-filters");
    if (clearButton && !clearButton.dataset.bound) {
        clearButton.addEventListener("click", () => {
            ["dashboard-representative-filter", "dashboard-place-filter", "dashboard-status-filter", "dashboard-year-filter", "dashboard-month-filter"].forEach(id => {
                const element = document.getElementById(id);
                if (element) element.value = "";
            });
            syncRevenueChartYear("");
            syncRevenueChartMonth("");
            applyDashboardFilters();
        });
        clearButton.dataset.bound = "true";
    }

    const pendingCard = document.getElementById("pending-customers-card");
    if (pendingCard && !pendingCard.dataset.bound) {
        pendingCard.addEventListener("click", () => {
            setSelectValue("dashboard-status-filter", PENDING_STATUS_FILTER);
            applyDashboardFilters();

            if (typeof openSection === "function") {
                openSection("CustomerForm", "CustomerForm-button");
            }

            if (typeof window.showPendingCustomers === "function") {
                window.showPendingCustomers();
            }
        });
        pendingCard.dataset.bound = "true";
    }
}

function setupRevenueChartTabs() {
    document.querySelectorAll("[data-chart-view]").forEach(tab => {
        if (tab.dataset.bound) return;

        tab.addEventListener("click", () => {
            activeRevenueChartView = tab.dataset.chartView || "year";
            updateRevenueChartTabs();
            applyDashboardFilters();
        });
        tab.dataset.bound = "true";
    });

    const chartYear = document.getElementById("revenue-chart-year-filter");
    if (chartYear && !chartYear.dataset.bound) {
        chartYear.addEventListener("change", () => {
            setSelectValue("dashboard-year-filter", chartYear.value);
            applyDashboardFilters();
        });
        chartYear.dataset.bound = "true";
    }

    const chartMonth = document.getElementById("revenue-chart-month-filter");
    if (chartMonth && !chartMonth.dataset.bound) {
        chartMonth.addEventListener("change", () => {
            setSelectValue("dashboard-month-filter", chartMonth.value);
            applyDashboardFilters();
        });
        chartMonth.dataset.bound = "true";
    }

    updateRevenueChartTabs();
}

function updateRevenueChartTabs() {
    document.querySelectorAll("[data-chart-view]").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.chartView === activeRevenueChartView);
    });

    const chartMonth = document.getElementById("revenue-chart-month-filter");
    if (chartMonth) chartMonth.classList.toggle("visible", activeRevenueChartView === "month");

    syncRevenueChartYear(getValue("dashboard-year-filter"));
    syncRevenueChartMonth(getValue("dashboard-month-filter"));
}

function syncRevenueChartYear(year) {
    const chartYear = document.getElementById("revenue-chart-year-filter");
    if (chartYear) chartYear.value = year;
}

function syncRevenueChartMonth(month) {
    const chartMonth = document.getElementById("revenue-chart-month-filter");
    if (chartMonth) chartMonth.value = month;
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

function addPendingStatusOption(id) {
    const select = document.getElementById(id);
    if (!select || [...select.options].some(option => option.value === PENDING_STATUS_FILTER)) return;

    const option = document.createElement("option");
    option.value = PENDING_STATUS_FILTER;
    option.textContent = "Pending Customers";
    select.insertBefore(option, select.options[1] || null);
}

function applyDashboardFilters(dashboardData = {}) {
    const representative = getValue("dashboard-representative-filter");
    const place = getValue("dashboard-place-filter");
    const status = getValue("dashboard-status-filter");
    const year = getValue("dashboard-year-filter");
    const month = getValue("dashboard-month-filter");

    const filtered = dashboardCustomers.filter(customer => {
        const date = getRecordDate(customer);
        const matchesRepresentative = !representative || customer.representative === representative;
        const matchesPlace = !place || customer.place === place;
        const matchesStatus = matchesStatusFilter(customer, status);
        const matchesYear = !year || (date && String(date.getFullYear()) === year);
        const matchesMonth = month === "" || (date && String(date.getMonth()) === month);
        return matchesRepresentative && matchesPlace && matchesStatus && matchesYear && matchesMonth;
    });
    const filteredPlaces = dashboardPlaces.filter(placeItem => {
        const date = getPlacePlanningDate(placeItem);
        const matchesRepresentative = !representative || placeItem.representative === representative;
        const matchesPlace = !place || placeItem.place === place;
        const matchesYear = !year || (date && String(date.getFullYear()) === year);
        const matchesMonth = month === "" || (date && String(date.getMonth()) === month);
        return matchesRepresentative && matchesPlace && matchesYear && matchesMonth;
    });

    const pendingCustomers = filtered.filter(customer => !isCompleteStatus(customer.orderStatus));
    const totalRevenue = sumRevenue(filtered);

    setText("customers-count", filtered.length);
    setText("items-count", dashboardData.productsCount ?? dashboardItems.length);
    setText("orders-count", dashboardData.totalOrders ?? dashboardOrders.length);
    setText("pending-count", pendingCustomers.length);
    setText("status-total-count", `${filtered.length} Cases`);
    setText("filtered-revenue", formatCurrency(totalRevenue));

    renderAppointmentList(filtered, filteredPlaces);
    renderRepresentativeRevenue(filtered);
    renderStatusSummary(filtered);
    // For monthly revenue list, exclude month filter to show all 12 months
    const filteredWithoutMonth = dashboardCustomers.filter(customer => {
        const date = getRecordDate(customer);
        const matchesRepresentative = !representative || customer.representative === representative;
        const matchesPlace = !place || customer.place === place;
        const matchesStatus = matchesStatusFilter(customer, status);
        const matchesYear = !year || (date && String(date.getFullYear()) === year);
        return matchesRepresentative && matchesPlace && matchesStatus && matchesYear;
    });
    const monthlyYear = year;

    renderRevenueChart(filtered, filteredWithoutMonth, monthlyYear, month);
    renderMonthlyRevenueList(filteredWithoutMonth, monthlyYear);
}

function renderAppointmentList(customers, places) {
    const list = document.getElementById("appointment-list");
    if (!list) return;

    const today = startOfDay(new Date());
    const customerAppointments = customers
        .filter(customer => {
            const date = getRecordDate(customer);
            return date && startOfDay(date) >= today && !isCompleteStatus(customer.orderStatus);
        })
        .map(customer => ({
            type: "Customer",
            title: customer.place || customer.town || "No place",
            detail: `${customer.name || "Customer"} - ${customer.town || "No town"} - ${customer.representative || "No representative"}`,
            date: getRecordDate(customer)
        }));

    const placeNotes = places
        .flatMap(placeItem => [
            {
                type: "Discussion",
                title: placeItem.place || placeItem.town || "No place",
                detail: `${placeItem.town || "No town"} - ${placeItem.representative || "No representative"}`,
                date: placeItem.discussionDate
            },
            {
                type: "Decided",
                title: placeItem.place || placeItem.town || "No place",
                detail: `${placeItem.town || "No town"} - ${placeItem.representative || "No representative"}`,
                date: placeItem.decidedDate
            }
        ])
        .filter(note => note.date && startOfDay(note.date) >= today);

    const appointments = [...customerAppointments, ...placeNotes]
        .sort((a, b) => a.date - b.date)
        .slice(0, 8);

    setText("meeting-count", appointments.length);

    if (!appointments.length) {
        list.innerHTML = `<div class="empty-state">No upcoming meetings for the selected filters.</div>`;
        return;
    }

    list.innerHTML = appointments.map(customer => `
        <div class="appointment-item">
            <div>
                <strong>${escapeHtml(customer.title)}</strong>
                <span>${escapeHtml(customer.type)} - ${escapeHtml(customer.detail)}</span>
            </div>
            <time>${formatDate(customer.date)}</time>
        </div>
    `).join("");
}

function renderRepresentativeRevenue(customers) {
    const list = document.getElementById("representative-revenue-list");
    if (!list) return;

    const totals = groupSum(customers, customer => customer.representative || "Unassigned", customer => customer.totalAmount);
    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    if (!rows.length) {
        list.innerHTML = `<div class="empty-state">No revenue for the selected filters.</div>`;
        return;
    }

    list.innerHTML = rows.map(([name, amount]) => `
        <div class="metric-row">
            <span>${escapeHtml(name)}</span>
            <strong>${formatCurrency(amount)}</strong>
        </div>
    `).join("");
}

function renderStatusSummary(customers) {
    const list = document.getElementById("status-summary-list");
    if (!list) return;

    const totals = groupCount(customers, customer => customer.orderStatus || "No Status");
    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    if (!rows.length) {
        list.innerHTML = `<div class="empty-state">No statuses for the selected filters.</div>`;
        return;
    }

    list.innerHTML = rows.map(([name, count]) => `
        <div class="metric-row">
            <span>${escapeHtml(name)}</span>
            <strong>${count}</strong>
        </div>
    `).join("");
}

function renderMonthlyRevenueList(customers, selectedYear) {
    const list = document.getElementById("monthly-revenue-list");
    if (!list) return;

    const yearCustomers = customers.filter(customer => {
        const year = getRecordYear(customer);
        return year && String(year) === String(selectedYear);
    });

    const monthlyTotals = Array(12).fill(0);

    yearCustomers.forEach(customer => {
        const date = getRecordDate(customer);
        if (date) monthlyTotals[date.getMonth()] += customer.totalAmount;
    });

    const rows = monthlyTotals
        .map((amount, index) => ({ month: MONTH_NAMES[index], amount }))
        .filter(row => row.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    if (!rows.length) {
        setText("best-month", "");
        list.innerHTML = `<div class="empty-state">${selectedYear ? "No monthly revenue for the selected filters." : "Select a year to view monthly revenue."}</div>`;
        return;
    }

    setText("best-month", "");
    list.innerHTML = rows.map(row => `
        <div class="metric-row">
            <span>${row.month}</span>
            <strong>${formatCurrency(row.amount)}</strong>
        </div>
    `).join("");
}

function renderRevenueChart(customers, monthlyCustomers, selectedYear, selectedMonth) {
    if (activeRevenueChartView === "month") {
        renderMonthlyRevenueChart(monthlyCustomers, selectedYear, selectedMonth);
        return;
    }

    renderYearlyRevenueChart(customers);
}

function renderYearlyRevenueChart(customers) {
    const yearly = groupSum(customers.filter(customer => getRecordYear(customer)), getRecordYear, customer => customer.totalAmount);
    const labels = Object.keys(yearly).sort();
    const yearValues = labels.map(label => yearly[label]);

    setText("revenue-chart-title", "Revenue by Year");

    yearlyRevenueChart = renderChart(yearlyRevenueChart, "#bar-chart", {
        series: [{ name: "Yearly Revenue", data: yearValues }],
        chart: { type: "bar", height: 350, toolbar: { show: false } },
        colors: ["#0f766e"],
        dataLabels: { enabled: false },
        xaxis: { categories: labels },
        yaxis: { labels: { formatter: value => "Rs " + Math.round(value) } },
        noData: { text: "No yearly revenue data" }
    });
}

function renderMonthlyRevenueChart(customers, selectedYear, selectedMonth) {
    const monthLabel = selectedMonth === "" ? "" : ` - ${MONTH_NAMES[Number(selectedMonth)]}`;
    setText("revenue-chart-title", selectedYear ? `${selectedYear}${monthLabel} Monthly Revenue` : "Monthly Revenue");

    if (!selectedYear) {
        yearlyRevenueChart = renderChart(yearlyRevenueChart, "#bar-chart", {
            series: [],
            chart: { type: "bar", height: 350, toolbar: { show: false } },
            xaxis: { categories: MONTH_NAMES },
            noData: { text: "Select a year to view monthly revenue" }
        });
        return;
    }

    const monthlyRevenue = getMonthlyRevenue(customers, selectedYear, selectedMonth);

    yearlyRevenueChart = renderChart(yearlyRevenueChart, "#bar-chart", {
        series: [{ name: `${selectedYear} Monthly Revenue`, data: monthlyRevenue.values }],
        chart: { type: "area", height: 350, toolbar: { show: false } },
        colors: ["#d59f32"],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 3 },
        xaxis: { categories: monthlyRevenue.labels },
        yaxis: { labels: { formatter: value => "Rs " + Math.round(value) } },
        noData: { text: "No monthly revenue data" }
    });
}

function getMonthlyRevenue(customers, selectedYear, selectedMonth = "") {
    const monthly = Array(12).fill(0);
    if (!selectedYear) return { labels: MONTH_NAMES, values: monthly };

    customers.forEach(customer => {
        const year = getRecordYear(customer);
        if (!year || String(year) !== String(selectedYear)) return;
        const date = getRecordDate(customer);
        if (date) monthly[date.getMonth()] += customer.totalAmount;
    });

    if (selectedMonth !== "") {
        const monthIndex = Number(selectedMonth);
        return {
            labels: [MONTH_NAMES[monthIndex]],
            values: [monthly[monthIndex]]
        };
    }

    return { labels: MONTH_NAMES, values: monthly };
}

function renderChart(existingChart, selector, options) {
    const element = document.querySelector(selector);
    if (!element) return existingChart;

    if (existingChart) {
        existingChart.destroy();
    }

    const chart = new ApexCharts(element, options);
    chart.render();
    return chart;
}

function normalizeCustomerRecord(customer) {
    return {
        town: customer.town || customer.Town || "",
        place: customer.place || customer.Place || "",
        representative: customer.representative || customer.Representative || "",
        customerID: customer.customerID || customer.customerId || customer["Customer ID"] || "",
        name: customer.name || customer.Name || "",
        appointmentDate: customer.appointmentDate || customer["Appointment Date"] || "",
        orderStatus: customer.orderStatus || customer["Order Status"] || "",
        totalAmount: parseAmount(customer.totalAmount || customer["Total Amount"]),
        advancedPayment: parseAmount(customer.advancedPayment || customer["Advanced Payment"]),
        remainingBalance: parseAmount(customer.remainingBalance || customer["Remaining Balance"])
    };
}

function normalizePlaceRecord(placeItem) {
    return {
        town: placeItem.town || placeItem.Town || "",
        place: placeItem.place || placeItem.Place || "",
        representative: placeItem.representative || placeItem.Representative || "",
        discussionDate: parseDate(placeItem.discussionDate || placeItem["Discussion Date"]),
        decidedDate: parseDate(placeItem.decidedDate || placeItem["Decided Date"])
    };
}

function parseAmount(value) {
    const parsed = Number(String(value ?? "0").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}

function getRecordDate(customer) {
    return parseDate(customer.appointmentDate);
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getPlacePlanningDate(placeItem) {
    return placeItem.decidedDate || placeItem.discussionDate;
}

function getRecordYear(customer) {
    const date = getRecordDate(customer);
    return date ? date.getFullYear() : "";
}

function matchesStatusFilter(customer, status) {
    if (!status) return true;
    if (status === PENDING_STATUS_FILTER) return !isCompleteStatus(customer.orderStatus);
    return customer.orderStatus === status;
}

function isCompleteStatus(status) {
    const normalized = String(status || "").toLowerCase();
    return ["complete", "completed", "delivered", "done", "closed"].includes(normalized);
}

function sumRevenue(customers) {
    return customers.reduce((total, customer) => total + customer.totalAmount, 0);
}

function groupSum(items, keyFn, valueFn) {
    return items.reduce((groups, item) => {
        const key = keyFn(item);
        if (!key) return groups;
        groups[key] = (groups[key] || 0) + Number(valueFn(item) || 0);
        return groups;
    }, {});
}

function groupCount(items, keyFn) {
    return items.reduce((groups, item) => {
        const key = keyFn(item) || "Unknown";
        groups[key] = (groups[key] || 0) + 1;
        return groups;
    }, {});
}

function unique(values) {
    return [...new Set(values.filter(Boolean))].sort();
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : "";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
}

function setSelectValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function formatCurrency(value) {
    return "Rs " + Math.round(Number(value || 0)).toLocaleString("en-US");
}

function formatDate(date) {
    if (!date) return "";
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
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

loadDashboard();
startDashboardAutoRefresh();
