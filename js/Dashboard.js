const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "loginRegister.html";
}

if (user.role !== "admin") {
    console.log("Cashier mode - limited access");
}
const API_URL = "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

async function loadDashboard() {

    const res = await fetch(API_URL + "?type=dashboard");
    const data = await res.json();

    // ======================
    // KPI VALUES
    // ======================
    document.getElementById("total-sales").innerText = "Rs " + data.totalSales;
    document.getElementById("total-orders").innerText = data.totalOrders;
    document.getElementById("total-profit").innerText = "Rs " + data.totalProfit;

    // ======================
    // TOP PRODUCTS CHART
    // ======================
    let labels = data.topProducts.map(p => p.name);
    let values = data.topProducts.map(p => p.count);

    renderBarChart(labels, values);
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