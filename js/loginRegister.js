const LOGIN_EMAIL = "123@gmail.com";
const LOGIN_PASSWORD = "123";

document.getElementById("reg").addEventListener("click", (event) => {
    event.preventDefault();
    showToast("Registration is disabled for now. Use 123@gmail.com / 123.", "error");
});

const loginButton = document.getElementById("log");
const loadingOverlay = document.getElementById("loadingOverlay");

loginButton.addEventListener("click", () => {
    const email = document.getElementById("email-login").value.trim();
    const password = document.getElementById("password-login").value;

    loadingOverlay.style.display = "flex";

    setTimeout(() => {
        if (email === LOGIN_EMAIL && password === LOGIN_PASSWORD) {
            localStorage.setItem("user", JSON.stringify({
                email: email,
                role: "admin"
            }));

            showToast("Logged in successfully!", "success");
            window.location.href = "index.html";
            return;
        }

        loadingOverlay.style.display = "none";
        showToast("Invalid email or password.", "error");
    }, 500);
});

function showToast(message, type) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");
    toastMessage.innerText = message;

    toast.className = "toast";
    if (type === "success") {
        toast.classList.add("show", "toast-success");
    } else if (type === "error") {
        toast.classList.add("show", "toast-error");
    }

    setTimeout(() => {
        toast.className = toast.className.replace("show", "");
    }, 3000);
}
