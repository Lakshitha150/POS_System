document.getElementById("Dashboard-button").addEventListener("click", function () {
    document.getElementById("CustomerForm").style.display = "none";
    document.getElementById("DashboardForm").style.display = "block";
    document.getElementById("ProductsForm").style.display = "none";
    document.getElementById("OrdersForm").style.display = "none";
});

document.getElementById("CustomerForm-button").addEventListener("click", function () {
    document.getElementById("CustomerForm").style.display = "block";
    document.getElementById("DashboardForm").style.display = "none";
    document.getElementById("ProductsForm").style.display = "none";
    document.getElementById("OrdersForm").style.display = "none";
});

document.getElementById("ProductsForm-button").addEventListener("click", function () {
    document.getElementById("CustomerForm").style.display = "none";
    document.getElementById("DashboardForm").style.display = "none";
    document.getElementById("ProductsForm").style.display = "block";
    document.getElementById("OrdersForm").style.display = "none";
});

document.getElementById("OrdersForm-button").addEventListener("click", function () {
  document.getElementById("CustomerForm").style.display = "none";
  document.getElementById("DashboardForm").style.display = "none";
  document.getElementById("ProductsForm").style.display = "none";
  document.getElementById("OrdersForm").style.display = "block";
});

document.getElementById("SignOutForm-button").addEventListener("click", function () {

    const confirmLogout = confirm("Are you sure you want to log out?");

    if (confirmLogout) {
        // clear session
        localStorage.removeItem("user");

        // redirect to login page
        window.location.href = "loginRegister.html";
    }

});
    
    // If the user confirms, proceed with logout
    if (confirmLogout) {
        document.getElementById("CustomerForm").style.display = "none";
        document.getElementById("DashboardForm").style.display = "none";
        document.getElementById("ProductsForm").style.display = "none";
        document.getElementById("OrdersForm").style.display = "none";
        
        // Redirect to the login page
        window.location.href = "loginRegister.html";
    } else {
        // Optionally handle if the user cancels the logout
        console.log("Logout canceled.");
    }
});

document.getElementById("customer").addEventListener("click", function (){
    document.getElementById("DashboardForm").style.display = "none";
    document.getElementById("CustomerForm").style.display = "block";
});

document.getElementById("product").addEventListener("click", function (){
    document.getElementById("DashboardForm").style.display = "none";
    document.getElementById("ProductsForm").style.display = "block";
});

document.getElementById("orders").addEventListener("click", function (){
    document.getElementById("DashboardForm").style.display = "none";
    document.getElementById("OrdersForm").style.display = "block";
});

const user = JSON.parse(localStorage.getItem("user"));

if (user.role !== "admin") {
    document.getElementById("CustomerForm-button").style.display = "none";
}
  
