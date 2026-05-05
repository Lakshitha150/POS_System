const dashboardUser = JSON.parse(localStorage.getItem("user"));

if (!dashboardUser) {
    window.location.href = "loginRegister.html";
}

if (dashboardUser.role !== "admin") {
    console.log("Cashier mode - limited access");
}
const DASHBOARD_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

async function loadDashboard() {

    try {
        const [customers, items, orders, dashboardData] = await Promise.all([
            window.getCustomers(),
            window.getProducts(),
            window.getOrders(),
            getDashboardData()
        ]);

        const pendingCustomers = customers.filter(customer => {
            const status = String(customer.orderStatus || customer["Order Status"] || "").toLowerCase();
            return status && status !== "delivered";
        });

        setText("customers-count", dashboardData.customersCount ?? customers.length);
        setText("items-count", dashboardData.productsCount ?? items.length);
        setText("orders-count", dashboardData.totalOrders ?? orders.length);
        setText("pending-count", dashboardData.pendingOrders ?? pendingCustomers.length);

        // ======================
        // TOP PRODUCTS CHART
        // ======================
        const topProducts = Array.isArray(dashboardData.topProducts) && dashboardData.topProducts.length
            ? dashboardData.topProducts
            : items.slice(0, 5).map(item => ({
                name: item.pro_name || item.productName || item["Product Name"] || item.name || "Item",
                count: Number(item.quantity || item.Quantity || 0)
            }));
        let labels = topProducts.map(p => p.name);
        let values = topProducts.map(p => p.count);

        renderBarChart(labels, values);
    } catch (error) {
        console.error("Dashboard load failed:", error);
    }
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

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
}


// ======================
// CHART UPDATE
// ======================
function renderBarChart(labels, values) {

    const options = {
        series: [{
            name: "Sales",
            data: values
        }],
        chart: {
            type: "bar",
            height: 350
        },
        xaxis: {
            categories: labels
        }
    };

    document.querySelector("#bar-chart").innerHTML = "";

    new ApexCharts(document.querySelector("#bar-chart"), options).render();
}

loadDashboard();
