const PRODUCT_API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbw5mmiP6dK0fN-V1T6rkl-dua0D_kXBNeDezkrPN3N-c6BeFjjBwOf0fJR_5k8wO4Xq/exec";

let productDataList = [];

$(document).ready(function () {

    const $table = $("#product-table-list");
    const $form = $("#product-form");
    const $popup = $("#productRegisterForm");
    const $title = $("#title");
    const $btn = $("#product-submit");

    let isUpdate = false;
    let currentId = null;

    // ======================
    // TOAST
    // ======================
    function toast(msg, type = "success") {
        const $t = $("#toast");
        $t.removeClass("success error");
        $t.addClass(type);
        $t.text(msg).addClass("show");

        setTimeout(() => $t.removeClass("show"), 3000);
    }

    // ======================
    // OPEN / CLOSE FORM
    // ======================
    $("#add-product").on("click", () => {
        $popup.show();
        $title.text("Add Product");
    });

    $("#productRegisterForm-close").on("click", () => {
        $popup.hide();
        $form[0].reset();
        isUpdate = false;
        currentId = null;
        $btn.text("Submit");
    });

    // ======================
    // LOAD PRODUCTS
    // ======================
    async function loadProducts() {
        productDataList = await window.getProducts();

        $table.empty();

        productDataList.forEach(p => renderRow(p));
    }

    // ======================
    // RENDER ROW
    // ======================
    function renderRow(p) {
        const row = $("<tr>");

        row.append(`<td>${p.pro_id}</td>`);
        row.append(`<td>${p.pro_name}</td>`);
        row.append(`<td>${p.price}</td>`);
        row.append(`<td>${p.category}</td>`);
        row.append(`<td>${p.quantity}</td>`);

        // UPDATE
        const updateBtn = $("<button>")
            .text("Update")
            .addClass("action-button")
            .on("click", () => {
                $("#productID").val(p.pro_id);
                $("#productName").val(p.pro_name);
                $("#price").val(p.price);
                $("#category").val(p.category);
                $("#quantity").val(p.quantity);

                isUpdate = true;
                currentId = p.pro_id;

                $popup.show();
                $title.text("Update Product");
                $btn.text("Update");
            });

        // DELETE
        const deleteBtn = $("<button>")
            .text("Delete")
            .addClass("action-button")
            .on("click", async () => {
                if (!confirm("Delete this product?")) return;

                await fetch(PRODUCT_API_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        type: "deleteProduct",
                        data: { pro_id: p.pro_id }
                    })
                });

                toast("Deleted Successfully");
                loadProducts();
            });

        row.append($("<td>").append(updateBtn));
        row.append($("<td>").append(deleteBtn));

        $table.append(row);
    }

    // ======================
    // SUBMIT (ADD / UPDATE)
    // ======================
    $form.on("submit", async function (e) {
        e.preventDefault();

        const product = {
            pro_id: $("#productID").val(),
            pro_name: $("#productName").val(),
            price: $("#price").val(),
            category: $("#category").val(),
            quantity: $("#quantity").val()
        };

        let type = isUpdate ? "updateProduct" : "addProduct";

        await fetch(PRODUCT_API_URL, {
            method: "POST",
            body: JSON.stringify({
                type,
                data: product
            })
        });

        toast(isUpdate ? "Updated Successfully" : "Added Successfully");

        $popup.hide();
        $form[0].reset();
        isUpdate = false;
        currentId = null;
        $btn.text("Submit");

        loadProducts();
    });

    // INIT
    loadProducts();
});
