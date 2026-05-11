const LOGIN_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";
const REMEMBER_KEY = "rememberLogin";
const SAVED_USERNAME_KEY = "savedUsername";

const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("log");
const loadingOverlay = document.getElementById("loadingOverlay");
const usernameInput = document.getElementById("email-login");
const passwordInput = document.getElementById("password-login");
const rememberCheckbox = document.getElementById("remember-login");
const destinationInputs = document.querySelectorAll("input[name='login-destination']");
const DESTINATION_KEY = "loginDestination";
const DEFAULT_DESTINATION = "Fill_APP.html";

restoreRememberedLogin();
redirectIfRememberedSessionExists();

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();
    loginButton.click();
});

loginButton.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const destination = getPreferredDestination();

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

        if (rememberCheckbox.checked) {
            localStorage.setItem(REMEMBER_KEY, "true");
            localStorage.setItem(SAVED_USERNAME_KEY, username);
            localStorage.setItem(DESTINATION_KEY, destination);
        } else {
            localStorage.removeItem(REMEMBER_KEY);
            localStorage.removeItem(SAVED_USERNAME_KEY);
            localStorage.setItem(DESTINATION_KEY, destination);
        }

        showToast("Logged in successfully!", "success");
        window.location.href = destination;
    } catch (error) {
        showToast(error.message || "Invalid username or password.", "error");
        loadingOverlay.style.display = "none";
    }
});

function restoreRememberedLogin() {
    const remembered = localStorage.getItem(REMEMBER_KEY) === "true";
    const savedUsername = localStorage.getItem(SAVED_USERNAME_KEY) || "";
    const savedDestination = getRedirectTargetFromUrl() || localStorage.getItem(DESTINATION_KEY) || DEFAULT_DESTINATION;

    rememberCheckbox.checked = remembered;
    if (savedUsername) {
        usernameInput.value = savedUsername;
    }

    destinationInputs.forEach(input => {
        input.checked = input.value === savedDestination;
    });
}

function redirectIfRememberedSessionExists() {
    const remembered = localStorage.getItem(REMEMBER_KEY) === "true";
    const sessionToken = localStorage.getItem("sessionToken");

    if (!remembered || !sessionToken) {
        return;
    }

    loadingOverlay.style.display = "flex";

    validateSession(sessionToken)
        .then(function(result) {
            if (result && result.success === true) {
                window.location.href = getPreferredDestination();
                return;
            }

            clearRememberedSession();
            loadingOverlay.style.display = "none";
        })
        .catch(function() {
            clearRememberedSession();
            loadingOverlay.style.display = "none";
        });
}

function validateSession(token) {
    const url = LOGIN_API_URL + "?type=session&token=" + encodeURIComponent(token);
    return fetch(url).then(async (response) => {
        const data = await response.json();
        return data;
    });
}

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

function clearRememberedSession() {
    localStorage.removeItem("user");
    localStorage.removeItem("sessionToken");
}

function getRedirectTargetFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const target = params.get("redirect");
        if (target === "index.html" || target === "Fill_APP.html") {
            return target;
        }
    } catch (error) {
        return "";
    }

    return "";
}

function getPreferredDestination() {
    const redirectTarget = getRedirectTargetFromUrl();
    if (redirectTarget) return redirectTarget;

    const selected = Array.from(destinationInputs).find(input => input.checked);
    return (selected && selected.value) || localStorage.getItem(DESTINATION_KEY) || DEFAULT_DESTINATION;
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
