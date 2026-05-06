function showSection(sectionId) {
    ["DashboardForm", "CustomerForm", "ProductsForm", "OrdersForm"].forEach(id => {
        document.getElementById(id).style.display = id === sectionId ? "block" : "none";
    });
}

function hideAppLoader() {
    const loader = document.getElementById("app-loader");
    if (!loader) return;

    loader.classList.add("hidden");
    setTimeout(() => loader.remove(), 500);
}

function setActiveNav(buttonId) {
    document.querySelectorAll(".navigation ul li").forEach(item => {
        item.classList.remove("hovered");
    });

    const button = document.getElementById(buttonId);
    if (button) {
        button.closest("li").classList.add("hovered");
    }
}

function closeMobileNavigation() {
    if (!window.matchMedia("(max-width: 900px)").matches) return;

    document.getElementById("navigation").classList.remove("active");
    document.querySelector(".main").classList.remove("active");
}

function openSection(sectionId, buttonId) {
    showSection(sectionId);
    setActiveNav(buttonId);
    closeMobileNavigation();
    if (typeof window.updateCustomerTableScroll === "function") {
        window.updateCustomerTableScroll();
    }
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.className = "toast " + type + " show";
    toast.innerText = message;
    setTimeout(() => toast.classList.remove("show"), 3000);
}

document.getElementById("Dashboard-button").addEventListener("click", function () {
    openSection("DashboardForm", "Dashboard-button");
});

document.getElementById("CustomerForm-button").addEventListener("click", function () {
    openSection("CustomerForm", "CustomerForm-button");
    if (typeof window.showAllCustomers === "function") window.showAllCustomers();
});

document.getElementById("ProductsForm-button").addEventListener("click", function () {
    openSection("ProductsForm", "ProductsForm-button");
});

document.getElementById("OrdersForm-button").addEventListener("click", function () {
    openSection("OrdersForm", "OrdersForm-button");
});

document.querySelector(".toggle").addEventListener("click", function () {
    document.getElementById("navigation").classList.toggle("active");
    document.querySelector(".main").classList.toggle("active");
});

document.getElementById("Settings-button").addEventListener("click", function () {
    showToast("Settings are not configured yet.");
});

document.getElementById("Help-button").addEventListener("click", function () {
    showToast("Use Customers to record free eye checks, prescription, frame, lens, payment, and order status.");
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
    openSection("CustomerForm", "CustomerForm-button");
    if (typeof window.showAllCustomers === "function") window.showAllCustomers();
});

document.getElementById("product").addEventListener("click", function (){
    openSection("ProductsForm", "ProductsForm-button");
});

document.getElementById("orders").addEventListener("click", function (){
    openSection("OrdersForm", "OrdersForm-button");
});

const navigationUser = JSON.parse(localStorage.getItem("user"));

if (navigationUser && navigationUser.role !== "admin") {
    document.getElementById("CustomerForm-button").style.display = "none";
}

setTimeout(hideAppLoader, 3000);
