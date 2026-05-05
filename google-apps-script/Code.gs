const SHEETS = {
  products: "Products",
  customers: "Customers",
  orders: "Orders"
};

function doGet(e) {
  const type = String(e.parameter.type || "").toLowerCase();

  if (type === "products") return json(readSheetObjects(SHEETS.products));
  if (type === "customers") return json(readSheetObjects(SHEETS.customers));
  if (type === "orderid") return text("ORD-" + Date.now());
  if (type === "dashboard") return json(getDashboardData());

  return json({ message: "Invalid request" });
}

function doPost(e) {
  const payload = JSON.parse((e.postData && e.postData.contents) || "{}");
  const type = String(payload.type || "").toLowerCase();
  const data = payload.data || {};

  if (type === "addproduct") return json(addRow(SHEETS.products, productRow(data)));
  if (type === "updateproduct") return json(updateRow(SHEETS.products, ["pro_id", "productID", "Product ID"], data.originalProId || data.pro_id, productRow(data)));
  if (type === "deleteproduct") return json(deleteRow(SHEETS.products, ["pro_id", "productID", "Product ID"], data.pro_id));

  if (type === "addcustomer") return json(addRow(SHEETS.customers, customerRow(data)));
  if (type === "updatecustomer") return json(updateRow(SHEETS.customers, ["custContact", "customerNumber", "Contact Number", "Mobile Number"], data.originalCustContact || data.custContact, customerRow(data)));
  if (type === "deletecustomer") return json(deleteRow(SHEETS.customers, ["custContact", "customerNumber", "Contact Number", "Mobile Number"], data.custContact));

  if (type === "order") return json(addRow(SHEETS.orders, orderRow(data)));

  return json({ success: false, message: "Invalid request" });
}

function readSheetObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  return values.slice(1)
    .filter(row => row.some(cell => cell !== ""))
    .map(row => {
      const item = {};
      headers.forEach((header, index) => item[header] = row[index]);
      return normalizeItem(item);
    });
}

function normalizeItem(item) {
  return {
    ...item,
    custId: item.custId || item.customerID || item["Customer ID"],
    custName: item.custName || item.customerName || item.Name || item["Full Name"],
    custAddress: item.custAddress || item.customerAddress || item.Address,
    custContact: item.custContact || item.customerNumber || item.Contact || item["Contact Number"] || item["Mobile Number"],
    pro_id: item.pro_id || item.productID || item["Product ID"],
    pro_name: item.pro_name || item.productName || item.Product || item["Product Name"],
    price: item.price || item.Price,
    category: item.category || item.Category,
    quantity: item.quantity || item.Quantity
  };
}

function addRow(sheetName, row) {
  getSheet(sheetName).appendRow(row);
  return { success: true };
}

function updateRow(sheetName, keys, value, row) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const keyIndex = findHeaderIndex(headers, keys);

  if (keyIndex === -1) return { success: false, message: "Missing column: " + keys.join(" / ") };

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyIndex]) === String(value)) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true };
    }
  }

  return { success: false, message: "Row not found" };
}

function deleteRow(sheetName, keys, value) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const keyIndex = findHeaderIndex(headers, keys);

  if (keyIndex === -1) return { success: false, message: "Missing column: " + keys.join(" / ") };

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][keyIndex]) === String(value)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, message: "Row not found" };
}

function findHeaderIndex(headers, keys) {
  const keyList = Array.isArray(keys) ? keys : [keys];
  const normalizedHeaders = headers.map(normalizeHeader);

  for (let i = 0; i < keyList.length; i++) {
    const index = normalizedHeaders.indexOf(normalizeHeader(keyList[i]));
    if (index !== -1) return index;
  }

  return -1;
}

function normalizeHeader(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function productRow(data) {
  return [data.pro_id, data.pro_name, data.price, data.category, data.quantity];
}

function customerRow(data) {
  return [data.custId, data.custName, data.custAddress, data.custContact];
}

function orderRow(data) {
  return [
    data.order_id,
    data.contact,
    JSON.stringify(data.items || []),
    data.subtotal,
    data.discount,
    data.total,
    data.cash,
    data.balance,
    new Date()
  ];
}

function getDashboardData() {
  const products = readSheetObjects(SHEETS.products);
  const orders = readSheetObjects(SHEETS.orders);

  return {
    totalSales: 0,
    totalOrders: orders.length,
    totalProfit: 0,
    topProducts: products.slice(0, 5).map(product => ({
      name: product.pro_name,
      count: Number(product.quantity || 0)
    }))
  };
}

function getSheet(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const candidates = [
    name,
    name.toLowerCase(),
    name.toUpperCase(),
    name.slice(0, -1),
    name.toLowerCase().slice(0, -1)
  ];

  for (let i = 0; i < candidates.length; i++) {
    const sheet = spreadsheet.getSheetByName(candidates[i]);
    if (sheet) return sheet;
  }

  throw new Error("Sheet not found: " + name);
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function text(data) {
  return ContentService
    .createTextOutput(String(data))
    .setMimeType(ContentService.MimeType.TEXT);
}
