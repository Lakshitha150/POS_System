function showSection(sectionId) {
    ["DashboardForm", "CustomerForm", "ProductsForm", "OrdersForm"].forEach(id => {
        document.getElementById(id).style.display = id === sectionId ? "block" : "none";
    });
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.className = "toast " + type + " show";
    toast.innerText = message;
    setTimeout(() => toast.classList.remove("show"), 3000);
}

document.getElementById("Dashboard-button").addEventListener("click", function () {
    showSection("DashboardForm");
});

document.getElementById("CustomerForm-button").addEventListener("click", function () {
    showSection("CustomerForm");
});

document.getElementById("ProductsForm-button").addEventListener("click", function () {
    showSection("ProductsForm");
});

document.getElementById("OrdersForm-button").addEventListener("click", function () {
    showSection("OrdersForm");
});

document.querySelector(".toggle").addEventListener("click", function () {
    document.getElementById("navigation").classList.toggle("active");
    document.querySelector(".main").classList.toggle("active");
});

document.getElementById("Settings-button").addEventListener("click", function () {
    showToast("Settings are not configured yet.");
});

document.getElementById("Help-button").addEventListener("click", function () {
    showToast("Use Patients to record free eye checks, prescription, frame, lens, payment, and order status.");
});

document.getElementById("SignOutForm-button").addEventListener("click", function () {
    const confirmLogout = confirm("Are you sure you want to log out?");

    if (!confirmLogout) {
        console.log("Logout canceled.");
        return;
    }

    localStorage.removeItem("user");
    window.location.href = "loginRegister.html";
});

document.getElementById("customer").addEventListener("click", function (){
    showSection("CustomerForm");
});

document.getElementById("product").addEventListener("click", function (){
    showSection("ProductsForm");
});

document.getElementById("orders").addEventListener("click", function (){
    showSection("OrdersForm");
});

const navigationUser = JSON.parse(localStorage.getItem("user"));

if (navigationUser && navigationUser.role !== "admin") {
    document.getElementById("CustomerForm-button").style.display = "none";
}
