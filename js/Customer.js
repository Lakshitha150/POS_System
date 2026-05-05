const CUSTOMER_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

let customerDataList = [];

document.addEventListener("DOMContentLoaded", function () {

    const table = document.getElementById("customer-table-list");
    const form = document.getElementById("customer-form");
    const popup = document.getElementById("customerRegisterForm");
    const title = document.getElementById("registerTitle");
    const btn = document.getElementById("customer-submit");

    let isUpdate = false;
    let currentPatientId = null;

    // ======================
    // TOAST
    // ======================
    function toast(msg, type = "success") {
        const t = document.getElementById("toast");
        t.className = "toast " + type + " show";
        t.innerText = msg;

        setTimeout(() => t.classList.remove("show"), 3000);
    }

    // ======================
    // OPEN FORM
    // ======================
    document.getElementById("add-customer").onclick = () => {
        popup.style.display = "block";
        title.innerText = "Add Patient";
    };

    document.getElementById("customerRegisterForm-close").onclick = () => {
        popup.style.display = "none";
        form.reset();
        isUpdate = false;
        currentPatientId = null;
        btn.innerText = "Submit";
    };

    // ======================
    // LOAD CUSTOMERS
    // ======================
    async function loadCustomers() {
        customerDataList = await window.getCustomers();

        table.innerHTML = "";

        if (!customerDataList.length) {
            table.innerHTML = `<tr><td colspan="17">No patients found. Check the Google Apps Script deployment.</td></tr>`;
            return;
        }

        customerDataList.forEach(c => renderRow(normalizeCustomer(c)));
    }

    function normalizeCustomer(c) {
        return {
            town: c.town || c.Town || "",
            representative: c.representative || c.Representative || "",
            patientID: c.patientID || c.patientId || c["Patient ID"] || c.custId || c.customerID || "",
            name: c.name || c.Name || c.custName || c.customerName || "",
            age: c.age || c.Age || "",
            birthday: formatDate(c.birthday || c.Birthday || ""),
            contactNo: c.contactNo || c.contact || c["Contact No"] || c["Contact Number"] || c.custContact || "",
            appointmentDate: formatDate(c.appointmentDate || c["Appointment Date"] || ""),
            prescription: c.prescription || c.Prescription || "",
            frameType: c.frameType || c["Frame Type"] || "",
            lensType: c.lensType || c["Lens Type"] || "",
            totalAmount: c.totalAmount || c["Total Amount"] || "",
            advancedPayment: c.advancedPayment || c["Advanced Payment"] || "",
            remainingBalance: c.remainingBalance || c["Remaining Balance"] || "",
            orderStatus: c.orderStatus || c["Order Status"] || ""
        };
    }

    function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toISOString().slice(0, 10);
    }

    // ======================
    // RENDER ROW
    // ======================
    function renderRow(c) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${c.town}</td>
            <td>${c.representative}</td>
            <td>${c.patientID}</td>
            <td>${c.name}</td>
            <td>${c.age}</td>
            <td>${c.birthday}</td>
            <td>${c.contactNo}</td>
            <td>${c.appointmentDate}</td>
            <td>${c.prescription}</td>
            <td>${c.frameType}</td>
            <td>${c.lensType}</td>
            <td>${c.totalAmount}</td>
            <td>${c.advancedPayment}</td>
            <td>${c.remainingBalance}</td>
            <td>${c.orderStatus}</td>
        `;

        // UPDATE
        const updateBtn = document.createElement("button");
        updateBtn.innerText = "Update";
        updateBtn.onclick = () => {
            document.getElementById("town").value = c.town;
            document.getElementById("representative").value = c.representative;
            document.getElementById("patientID").value = c.patientID;
            document.getElementById("patientName").value = c.name;
            document.getElementById("age").value = c.age;
            document.getElementById("birthday").value = c.birthday;
            document.getElementById("contactNo").value = c.contactNo;
            document.getElementById("appointmentDate").value = c.appointmentDate;
            document.getElementById("prescription").value = c.prescription;
            document.getElementById("frameType").value = c.frameType;
            document.getElementById("lensType").value = c.lensType;
            document.getElementById("totalAmount").value = c.totalAmount;
            document.getElementById("advancedPayment").value = c.advancedPayment;
            document.getElementById("remainingBalance").value = c.remainingBalance;
            document.getElementById("orderStatus").value = c.orderStatus;

            popup.style.display = "block";
            title.innerText = "Update Patient";

            isUpdate = true;
            currentPatientId = c.patientID;
            btn.innerText = "Update";
        };

        // DELETE
        const deleteBtn = document.createElement("button");
        deleteBtn.innerText = "Delete";
        deleteBtn.onclick = async () => {
            if (!confirm("Delete this patient record?")) return;

            await fetch(CUSTOMER_API_URL, {
                method: "POST",
                body: JSON.stringify({
                    type: "deleteCustomer",
                    data: { patientID: c.patientID }
                })
            });

            toast("Patient Deleted");
            loadCustomers();
        };

        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.role !== "admin") {
            updateBtn.style.display = "none";
            deleteBtn.style.display = "none";
        }

        const actionTd = document.createElement("td");
        actionTd.appendChild(updateBtn);

        const actionTd2 = document.createElement("td");
        actionTd2.appendChild(deleteBtn);

        row.appendChild(actionTd);
        row.appendChild(actionTd2);

        table.appendChild(row);
    }

    // ======================
    // SUBMIT
    // ======================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const totalAmount = Number(document.getElementById("totalAmount").value) || 0;
        const advancedPayment = Number(document.getElementById("advancedPayment").value) || 0;
        const remainingBalance = document.getElementById("remainingBalance");

        if (!remainingBalance.value) {
            remainingBalance.value = totalAmount - advancedPayment;
        }

        const customer = {
            town: document.getElementById("town").value,
            representative: document.getElementById("representative").value,
            patientID: document.getElementById("patientID").value,
            name: document.getElementById("patientName").value,
            age: document.getElementById("age").value,
            birthday: document.getElementById("birthday").value,
            contactNo: document.getElementById("contactNo").value,
            appointmentDate: document.getElementById("appointmentDate").value,
            prescription: document.getElementById("prescription").value,
            frameType: document.getElementById("frameType").value,
            lensType: document.getElementById("lensType").value,
            totalAmount: totalAmount,
            advancedPayment: advancedPayment,
            remainingBalance: Number(remainingBalance.value) || 0,
            orderStatus: document.getElementById("orderStatus").value,
            originalPatientID: currentPatientId
        };

        const type = isUpdate ? "updateCustomer" : "addCustomer";

        await fetch(CUSTOMER_API_URL, {
            method: "POST",
            body: JSON.stringify({
                type,
                data: customer
            })
        });

        toast(isUpdate ? "Updated" : "Added");

        popup.style.display = "none";
        form.reset();
        isUpdate = false;
        currentPatientId = null;
        btn.innerText = "Submit";

        loadCustomers();
    });

    loadCustomers();
});
