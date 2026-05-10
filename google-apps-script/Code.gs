const SPREADSHEET_ID = "1z9stN8WtqIDOJ1BG4vKPMfpKNNj7KQVAWLIYMj857fU";

const SHEETS = {
  products: "Products",
  customers: "Customers",
  places: "Place",
  orders: "Orders"
};

function doGet(e) {
  const parameters = (e && e.parameter) || {};
  const type = getRequestType(parameters);

  if (type === "ping") return json({ success: true, message: "POS API is running" });
  if (type === "debug") return json({
    success: true,
    parameters: parameters,
    sheets: getSpreadsheet().getSheets().map(sheet => sheet.getName())
  });
  if (type === "products" || type === "product") return json(readSheetObjects(SHEETS.products));
  if (type === "customers" || type === "customer") return json(readSheetObjects(SHEETS.customers));
  if (type === "places" || type === "place") return json(readSheetObjects(SHEETS.places));
  if (type === "orders" || type === "order") return json(readSheetObjects(SHEETS.orders));
  if (type === "orderid") return text("ORD-" + Date.now());
  if (type === "dashboard") return json(getDashboardData());

  if (hasCustomerFields(parameters)) {
    return json(addCustomerRecords([parameters]));
  }

  return HtmlService
    .createHtmlOutputFromFile(String(parameters.page || "index"))
    .setTitle("Optical Camp Customer Entry")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const payload = parsePostPayload(e);

  if (Array.isArray(payload)) return json(addCustomerRecords(payload));

  const type = getRequestType(payload);
  const data = payload.data || payload.record || payload.customer || payload;

  const product = normalizeProductInput(data);
  const customer = normalizeCustomerInput(data);

  if (type === "addproduct") return json(addRow(SHEETS.products, productRow(product)));
  if (type === "updateproduct") return json(updateRow(SHEETS.products, ["pro_id", "productID", "Product ID"], data.originalProId || product.pro_id, productRow(product)));
  if (type === "deleteproduct") return json(deleteRow(SHEETS.products, ["pro_id", "productID", "Product ID"], product.pro_id));

  if (type === "addcustomer") return json(addRow(SHEETS.customers, customerRow(customer)));
  if (type === "updatecustomer") return json(updateRow(SHEETS.customers, ["customerID", "Customer ID"], data.originalCustomerID || customer.customerID, customerRow(customer)));
  if (type === "deletecustomer") return json(deleteRow(SHEETS.customers, ["customerID", "Customer ID"], customer.customerID));
  if (type === "addcustomers" || type === "uploadcustomers") {
    const records = payload.records || payload.customers || data;
    return json(addCustomerRecords(Array.isArray(records) ? records : [records]));
  }

  if (type === "order") return json(addRow(SHEETS.orders, orderRow(data)));

  if (hasCustomerFields(data)) {
    return json(addCustomerRecords([data]));
  }

  return json({ success: false, message: "Invalid request" });
}

function uploadCustomerRecords(records) {
  return addCustomerRecords(records);
}

function parsePostPayload(e) {
  const contents = (e && e.postData && e.postData.contents) || "{}";

  try {
    const payload = JSON.parse(contents);
    return payload || {};
  } catch (error) {
    return (e && e.parameter) || {};
  }
}

function getRequestType(source) {
  return String((source && (source.type || source.action || source.route)) || "").toLowerCase();
}

function hasCustomerFields(source) {
  if (!source || Array.isArray(source)) return false;

  const keys = Object.keys(source).map(normalizeHeader);
  const customerKeys = [
    "customerid",
    "customername",
    "name",
    "contactno",
    "contact",
    "phonenumber",
    "mobilenumber",
    "appointmentdate",
    "prescription",
    "frametype",
    "lenstype",
    "town",
    "place"
  ];

  return customerKeys.some(key => keys.indexOf(key) !== -1);
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
    town: item.town || item.Town,
    place: item.place || item.Place,
    representative: item.representative || item.Representative,
    discussionDate: item.discussionDate || item["Discussion Date"],
    decidedDate: item.decidedDate || item["Decided Date"],
    customerID: item.customerID || item.customerId || item["Customer ID"],
    name: item.name || item.Name,
    age: item.age || item.Age,
    birthday: item.birthday || item.Birthday,
    contactNo: item.contactNo || item["Contact No"] || item.Contact,
    appointmentDate: item.appointmentDate || item["Appointment Date"],
    prescription: item.prescription || item.Prescription,
    frameType: item.frameType || item["Frame Type"],
    lensType: item.lensType || item["Lens Type"],
    totalAmount: item.totalAmount || item["Total Amount"],
    advancedPayment: item.advancedPayment || item["Advanced Payment"],
    remainingBalance: item.remainingBalance || item["Remaining Balance"],
    orderStatus: item.orderStatus || item["Order Status"],
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

function addCustomerRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { success: false, message: "No customer records received", saved: 0 };
  }

  const rows = records
    .filter(record => record && typeof record === "object")
    .map(record => customerRow(normalizeCustomerInput(record)));

  if (rows.length === 0) {
    return { success: false, message: "No valid customer records received", saved: 0 };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getSheet(SHEETS.customers);
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    return { success: true, saved: rows.length };
  } finally {
    lock.releaseLock();
  }
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

function normalizeProductInput(data) {
  return {
    pro_id: data.pro_id || data.productID || data.productId || data.id || data["Product ID"],
    pro_name: data.pro_name || data.productName || data.name || data.product || data.Product || data["Product Name"],
    price: data.price || data.Price,
    category: data.category || data.Category,
    quantity: data.quantity || data.qty || data.Quantity
  };
}

function customerRow(data) {
  return [
    data.town,
    data.place,
    data.representative,
    data.customerID,
    data.name,
    data.age,
    data.birthday,
    data.contactNo,
    data.appointmentDate,
    data.prescription,
    data.frameType,
    data.lensType,
    data.totalAmount,
    data.advancedPayment,
    data.remainingBalance,
    data.orderStatus
  ];
}

function normalizeCustomerInput(data) {
  return {
    town: data.town || data.Town,
    place: data.place || data.Place,
    representative: data.representative || data.Representative,
    customerID: data.customerID || data.customerId || data.custId || data["Customer ID"] || ("C-" + Date.now()),
    name: data.name || data.Name || data.customerName || data.custName || data["Full Name"],
    age: data.age || data.Age,
    birthday: data.birthday || data.Birthday,
    contactNo: data.contactNo || data.contact || data.phoneNumber || data.mobileNumber || data.custContact || data.customerNumber || data["Contact No"] || data.Contact || data["Contact Number"] || data["Mobile Number"],
    appointmentDate: data.appointmentDate || data["Appointment Date"],
    prescription: data.prescription || data.Prescription,
    frameType: data.frameType || data["Frame Type"],
    lensType: data.lensType || data["Lens Type"],
    totalAmount: data.totalAmount || data["Total Amount"],
    advancedPayment: data.advancedPayment || data["Advanced Payment"],
    remainingBalance: data.remainingBalance || data["Remaining Balance"],
    orderStatus: data.orderStatus || data["Order Status"] || "Pending"
  };
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
  const customers = safeReadSheetObjects(SHEETS.customers);
  const products = safeReadSheetObjects(SHEETS.products);
  const orders = safeReadSheetObjects(SHEETS.orders);
  const pendingOrders = customers.filter(customer => {
    const status = String(customer.orderStatus || customer["Order Status"] || "").toLowerCase();
    return status && status !== "delivered";
  }).length;

  return {
    customersCount: customers.length,
    productsCount: products.length,
    totalSales: 0,
    totalOrders: orders.length,
    totalProfit: 0,
    pendingOrders: pendingOrders,
    topProducts: products.slice(0, 5).map(product => ({
      name: product.pro_name,
      count: Number(product.quantity || 0)
    }))
  };
}

function safeReadSheetObjects(sheetName) {
  try {
    return readSheetObjects(sheetName);
  } catch (error) {
    return [];
  }
}

function getSheet(name) {
  const spreadsheet = getSpreadsheet();
  const candidates = [
    name,
    name.toLowerCase(),
    name.toUpperCase(),
    name.slice(0, -1),
    name.toLowerCase().slice(0, -1)
  ];

  if (name === SHEETS.customers) {
    candidates.push("Customers", "customers", "CUSTOMERS");
  }

  if (name === SHEETS.products) {
    candidates.push("Inventory", "inventory", "Frames", "frames", "Lenses", "lenses", "Frames & Lenses");
  }

  if (name === SHEETS.places) {
    candidates.push("Place", "place", "PLACE", "Places", "places", "PLACES");
  }

  for (let i = 0; i < candidates.length; i++) {
    const sheet = spreadsheet.getSheetByName(candidates[i]);
    if (sheet) return sheet;
  }

  throw new Error("Sheet not found: " + name);
}

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  return SpreadsheetApp.getActiveSpreadsheet();
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
