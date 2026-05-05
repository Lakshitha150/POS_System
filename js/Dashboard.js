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
        const res = await fetch(DASHBOARD_API_URL + "?type=dashboard");
        const data = await res.json();

        // ======================
        // KPI VALUES
        // ======================
        const totalSales = document.getElementById("total-sales");
        const totalOrders = document.getElementById("total-orders");
        const totalProfit = document.getElementById("total-profit");

        if (totalSales) totalSales.innerText = "Rs " + data.totalSales;
        if (totalOrders) totalOrders.innerText = data.totalOrders;
        if (totalProfit) totalProfit.innerText = "Rs " + data.totalProfit;

        // ======================
        // TOP PRODUCTS CHART
        // ======================
        const topProducts = Array.isArray(data.topProducts) ? data.topProducts : [];
        let labels = topProducts.map(p => p.name);
        let values = topProducts.map(p => p.count);

        renderBarChart(labels, values);
    } catch (error) {
        console.error("Dashboard load failed:", error);
    }
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
