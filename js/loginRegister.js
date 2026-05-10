const LOGIN_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

document.getElementById("reg").addEventListener("click", (event) => {
    event.preventDefault();
    showToast("Registration is disabled. Add users in the Login Access sheet.", "error");
});

const loginButton = document.getElementById("log");
const loadingOverlay = document.getElementById("loadingOverlay");

loginButton.addEventListener("click", async () => {
    const username = document.getElementById("email-login").value.trim();
    const password = document.getElementById("password-login").value;

    if (!username || !password) {
        showToast("Enter username and password.", "error");
        return;
    }

    loadingOverlay.style.display = "flex";

    try {
        const result = await loginWithSheet(username, password);

        if (!result || result.success !== true) {
            throw new Error((result && result.message) || "Login failed.");
        }

        localStorage.setItem("user", JSON.stringify(result.user || {}));
        localStorage.setItem("sessionToken", result.token || "");

        showToast("Logged in successfully!", "success");
        window.location.href = "index.html";
    } catch (error) {
        showToast(error.message || "Invalid username or password.", "error");
        loadingOverlay.style.display = "none";
    }
});

function loginWithSheet(username, password) {
    return fetch(LOGIN_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
            type: "login",
            username: username,
            password: password
        })
    }).then(async (response) => {
        let data = null;

        try {
            data = await response.json();
        } catch (error) {
            throw new Error("Login service returned an invalid response.");
        }

        if (!response.ok) {
            throw new Error((data && data.message) || "Login request failed.");
        }

        return data;
    });
}

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
