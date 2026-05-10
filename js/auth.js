window.AUTH_API_URL = window.AUTH_API_URL || window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
        return null;
    }
}

function getSessionToken() {
    return localStorage.getItem("sessionToken") || "";
}

function getUserPrivilege(user = getStoredUser()) {
    return String((user && (user.privilege || user.role)) || "").toLowerCase();
}

function getUserDisplayName(user = getStoredUser()) {
    if (!user) return "";
    return user.name || user.username || "";
}

function clearAuthState() {
    localStorage.removeItem("user");
    localStorage.removeItem("sessionToken");
}

function buildAuthedUrl(params) {
    const url = new URL(window.AUTH_API_URL);
    const token = getSessionToken();

    if (typeof params === "string") {
        const searchParams = new URLSearchParams(params);
        searchParams.forEach((value, key) => url.searchParams.set(key, value));
    } else if (params && typeof params === "object") {
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.set(key, params[key]);
            }
        });
    }

    if (token && !url.searchParams.has("token")) {
        url.searchParams.set("token", token);
    }

    return url.toString();
}

async function validateStoredSession() {
    const token = getSessionToken();
    if (!token) return { success: false, message: "Missing session token." };

    const response = await fetch(buildAuthedUrl({ type: "session" }));
    return await response.json();
}

async function requireLogin(redirectTo = "loginRegister.html") {
    const user = getStoredUser();
    const token = getSessionToken();
    const loginUrl = buildLoginUrl(redirectTo);

    if (!user || !token) {
        clearAuthState();
        window.location.href = loginUrl;
        return false;
    }

    try {
        const result = await validateStoredSession();
        if (!result || result.success !== true) {
            clearAuthState();
            window.location.href = loginUrl;
            return false;
        }

        localStorage.setItem("user", JSON.stringify(result.user || user));
        return true;
    } catch (error) {
        clearAuthState();
        window.location.href = loginUrl;
        return false;
    }
}

async function logout(redirectTo = "loginRegister.html") {
    const token = getSessionToken();

    try {
        if (token) {
            await fetch(window.AUTH_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({
                    type: "logout",
                    sessionToken: token
                })
            });
        }
    } catch (error) {
        console.warn("Logout request failed:", error);
    }

    clearAuthState();
    window.location.href = redirectTo;
}

function applyCurrentUserUI() {
    const user = getStoredUser();
    const name = getUserDisplayName(user) || "Guest";
    const privilege = getUserPrivilege(user) || "-";

    const nameTargets = document.querySelectorAll("[data-auth-name]");
    const privilegeTargets = document.querySelectorAll("[data-auth-privilege]");

    nameTargets.forEach(target => {
        target.textContent = name;
    });

    privilegeTargets.forEach(target => {
        target.textContent = privilege;
    });
}

function ensureRepresentativeValue(field, representativeName, isAdmin) {
    if (!field || !representativeName) return;

    if (field.tagName === "SELECT") {
        const hasOption = Array.from(field.options).some(option => option.value === representativeName);
        if (!hasOption) {
            const option = document.createElement("option");
            option.value = representativeName;
            option.textContent = representativeName;
            field.appendChild(option);
        }
    }

    if (!field.value || !isAdmin) {
        field.value = representativeName;
    }

    if (!isAdmin) {
        field.setAttribute("data-locked-representative", "true");
    }
}

function buildLoginUrl(targetPage) {
    const normalizedTarget = targetPage && targetPage !== "loginRegister.html" ? targetPage : getCurrentPageName();
    return "loginRegister.html?redirect=" + encodeURIComponent(normalizedTarget || "index.html");
}

function getCurrentPageName() {
    const pathname = window.location.pathname || "";
    const page = pathname.split("/").pop();
    return page || "index.html";
}

window.getStoredUser = getStoredUser;
window.getSessionToken = getSessionToken;
window.getUserPrivilege = getUserPrivilege;
window.getUserDisplayName = getUserDisplayName;
window.clearAuthState = clearAuthState;
window.buildAuthedUrl = buildAuthedUrl;
window.validateStoredSession = validateStoredSession;
window.requireLogin = requireLogin;
window.logout = logout;
window.applyCurrentUserUI = applyCurrentUserUI;
window.ensureRepresentativeValue = ensureRepresentativeValue;
window.buildLoginUrl = buildLoginUrl;
