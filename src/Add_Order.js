import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://queue-backendser.onrender.com";

const AddOrder = () => {
  const [showForm, setShowForm] = useState(false);
  const [orderType, setOrderType] = useState("Paid");
  const [transactionID, setTransactionID] = useState("");
  const [transSuffix, setTransSuffix] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [category, setCategory] = useState("New Mix");
  const [paintType, setPaintType] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [paintQuantity, setPaintQuantity] = useState("");
  const [startTime, setStartTime] = useState("");
  const [eta, setEta] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [showToast, setShowToast] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("Admin");
  const [contactSuggestions, setContactSuggestions] = useState([]);

  const triggerToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const formatDateDDMMYYYY = () => {
    const date = new Date();
    return `${String(date.getDate()).padStart(2, "0")}${String(
      date.getMonth() + 1
    ).padStart(2, "0")}${date.getFullYear()}`;
  };



  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/orders`)
      .then((res) => {
        const orders = res.data;
        setActiveCount(orders.filter((o) => o.current_status === "In Progress").length);
        setWaitingCount(orders.filter((o) => o.current_status === "Waiting").length);
      })
      .catch(() => triggerToast("❌ Could not fetch job count", "danger"));
  }, []);

  useEffect(() => {
    const baseTimes = {
      "New Mix": 30,
      "Mix More": 15,
      "Colour Code": 30,
    };
    const base = baseTimes[category] || 15;
    const jobPosition = activeCount + waitingCount + 1;
    setEta(jobPosition * base);
  }, [category, activeCount, waitingCount]);

  useEffect(() => {
  const lastContact = localStorage.getItem("last_contact");
  if (lastContact) {
    setClientContact(lastContact);
    const saved = localStorage.getItem(`client_${lastContact}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setClientName(parsed.name);
    }
  }
}, []);


  const validateContact = (input) => /^\d{10}$/.test(input);

  const handleContactChange = (value) => {
  setClientContact(value);

  // Suggestion logic
  const keys = Object.keys(localStorage);
  const matches = keys.filter(k => k.startsWith("client_") && k.includes(value));
  const suggestions = matches.map(k => k.replace("client_", ""));
  setContactSuggestions(suggestions);

  // Auto-fill name if exact match
  if (/^\d{10}$/.test(value)) {
    const stored = localStorage.getItem(`client_${value}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setClientName(parsed.name);
    }
  }
};

const handleContactSuggestionClick = (number) => {
  setClientContact(number);
  const stored = localStorage.getItem(`client_${number}`);
  if (stored) {
    const parsed = JSON.parse(stored);
    setClientName(parsed.name);
  }
  setContactSuggestions([]);
};


  const handleSearch = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/orders/search`);
      const filtered = res.data.filter(
        (order) =>
          order.transaction_id.includes(searchTerm) ||
          order.client_contact.includes(searchTerm)
      );
      setSearchResults(filtered);
    } catch {
      triggerToast("❌ Could not search orders", "danger");
    }
  };

  const printReceipt = (order) => {
    const win = window.open("", "_blank", "width=600,height=400");
    if (!win) {
      triggerToast("❌ Printing blocked", "danger");
      return;
    }

    const formatLine = (label, value) => `${label.padEnd(15)}: ${value}`;
    const receipt = `
=============================================
      PROCUSHION QUEUE SYSTEM - RECEIPT
=============================================
${formatLine("Order No.", `#${order.transaction_id}`)}
${formatLine("Client", order.customer_name)}
${formatLine("Contact", order.client_contact)}
${formatLine("Car Details", order.paint_type)}
${formatLine("Colour Code", order.colour_code)} ${
      order.colour_code === "Pending" ? "(To be assigned)" : ""
    }
${formatLine("Category", order.category)}

Track ID       : TRK-${order.transaction_id}

----------------------------------------
  WhatsApp Support: 083 579 6982
----------------------------------------

     Thank you for your order!
========================================
`;

    win.document.write(`
      <html><head><title>Receipt</title>
      <style>body{font-family:monospace;white-space:pre;font-size:12px;margin:0;padding:10px;}</style>
      </head><body>${receipt}</body></html>
    `);
    win.document.close();
    win.print();
  };




 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  const today = formatDateDDMMYYYY();
  const startTime = new Date().toISOString();

  let suffix;

  if (orderType === "Order") {
    suffix = Math.floor(1000 + Math.random() * 9000);
  } else {
    if (!/^\d{4}$/.test(transSuffix)) {
      triggerToast("❌ Paid orders require a 4-digit Transaction ID", "danger");
      setLoading(false);
      return;
    }
    suffix = transSuffix;
  }

  const fullTransactionID =
    orderType === "Paid"
      ? `${today}-PO-${suffix}`
      : `${today}-ORD-${suffix}`;

// Check for duplicate Transaction ID if it's a Paid order
if (orderType === "Paid") {
  try {
    const checkRes = await axios.get(`${BASE_URL}/api/orders/check-id/${fullTransactionID}`);
    if (checkRes.data.exists) {
      triggerToast("❌ This Transaction ID is already used. Please enter a different 4-digit ID.", "danger");
      setLoading(false);
      return;
    }
  } catch (error) {
    console.error("❌ Error checking transaction ID:", error.message);
    triggerToast("❌ Could not verify Transaction ID. Try again.", "danger");
    setLoading(false);
    return;
  }
}

  // ✅ Basic Validation
  if (!validateContact(clientContact)) {
    triggerToast("⚠️ Enter *10-digit* phone number, not name", "danger");
    setLoading(false);
    return;
  }
  if (!clientName.trim()) {
    triggerToast("❌ Client name required", "danger");
    setLoading(false);
    return;
  }
  if (!paintType.trim()) {
    triggerToast("❌ Car Details required", "danger");
    setLoading(false);
    return;
  }

  if (!colorCode.trim() && category !== "New Mix") {
    triggerToast("❌ Colour Code required", "danger");
    setLoading(false);
    return;
  }

  if (!paintQuantity) {
    triggerToast("❌ Select paint quantity", "danger");
    setLoading(false);
    return;
  }

  try {
    const existingOrders = await axios.get(`${BASE_URL}/api/orders`);

    let finalTransactionID = fullTransactionID;
    let isDuplicate = existingOrders.data.some(
      (o) => o.transaction_id === finalTransactionID
    );

    if (isDuplicate && orderType === "Order") {
      let retries = 0;
      let newSuffix;
      do {
        newSuffix = Math.floor(1000 + Math.random() * 9000);
        finalTransactionID = `${today}-ORD-${newSuffix}`;
        isDuplicate = existingOrders.data.some(
          (o) => o.transaction_id === finalTransactionID
        );
        retries++;
      } while (isDuplicate && retries < 5);

      if (isDuplicate) {
        triggerToast("⚠️ Could not generate unique Transaction ID", "danger");
        setLoading(false);
        return;
      }
    } else if (isDuplicate) {
      triggerToast("⚠️ Duplicate Transaction ID. Please use a different 4-digit ID.", "danger");
      setLoading(false);
      return;
    }

    // ✅ Correct position: after retry logic
    const newOrder = {
      transaction_id: finalTransactionID,
      customer_name: clientName,
      client_contact: clientContact,
      paint_type: paintType,
      colour_code: category === "New Mix" ? "Pending" : colorCode || "N/A",
      category,
      paint_quantity: paintQuantity,
      current_status: "Waiting",
      order_type: orderType,
      start_time: startTime,
    };

    console.log("🛠 Order being sent to backend: ", newOrder);

    await axios.post(`${BASE_URL}/api/orders`, newOrder);
    triggerToast("✅ Order placed successfully");

    localStorage.setItem(`client_${clientContact}`, JSON.stringify({ name: clientName }));

    setShowForm(false);
    setTimeout(() => printReceipt(newOrder), 300);

    // Reset
    setTransSuffix("");
    setClientName("");
    setClientContact("");
    setPaintType("");
    setColorCode("");
    setPaintQuantity("");
    setCategory("New Mix");
    setOrderType("Walk-in");
    setStartTime(new Date().toISOString());

  } catch (error) {
    console.error("Order error:", error);
    triggerToast("❌ Could not place order - Check for duplicate", "danger");
  } finally {
    setLoading(false);
  }

  setContactSuggestions([]);
};


  const formatMinutesToHours = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0
      ? `${hrs}hr${hrs > 1 ? "s" : ""} ${mins > 0 ? `${mins}min` : ""}`.trim()
      : `${mins}min`;
  };

  const formFields = [
    { label: "Order Type", type: "select", value: orderType, onChange: (val) => setOrderType(val), options: ["Paid", "Order"], required: true },
    {
      label: "Transaction ID",
      type: "text",
      value: transSuffix,
      onChange: (val) => {
        const digits = val.replace(/\D/g, "").slice(0, 4);
        setTransSuffix(digits);
      },
      disabled: orderType === "Order",
      required: orderType !== "Order",
      placeholder: "Enter 4-digit ID"
    },
    { label: "Cell Number", type: "text", name: "clientContact", value: clientContact, onChange: handleContactChange, required: true },
    { label: "Client Name", type: "text", value: clientName, onChange: (val) => setClientName(val), required: true },
    { label: "Category", type: "select", value: category, onChange: (val) => setCategory(val), options: ["New Mix", "Mix More", "Colour Code"], required: true },
    { label: "Car Details", type: "text", value: paintType, onChange: (val) => setPaintType(val), required: true },
    { label: "Colour Code", type: "text", value: colorCode, onChange: (val) => setColorCode(val), disabled: category === "New Mix" },
    { label: "Paint Quantity", type: "select", value: paintQuantity, onChange: (val) => setPaintQuantity(val), options: ["250ml", "500ml", "750ml", "1L", "1.25L", "1.5L", "2L", "2.5L", "3L", "4L", "5L", "10L"], required: true },
    { label: "ETA", type: "text", value: formatMinutesToHours(eta), onChange: () => {}, disabled: true }
  ];

   return (
    <div className="container mt-4">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">📝 Add New Order</h5>
        </div>

<div className="card-body">
          {userRole === "Admin" && (
                <button
                  className="btn btn-outline-dark mb-3"
                  onClick={() => window.location.href = "/admin-orders"}
                >
                  🧾 Go to Admin Orders
                </button>
              )}
          
           <button
            className="btn btn-primary mb-3"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? "🔽 Hide Form" : "➕ Add New Order"}
          </button>



         <div className="mb-4">
            <label className="form-label">🔎 Search Existing Order</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Transaction ID or Contact"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-outline-secondary" onClick={handleSearch}>
                Search
              </button>
            </div>
            
    {eta && (
  <div className="mt-2">
    <div className="progress" style={{ height: "6px", backgroundColor: "var(--bs-secondary-bg, #f1f3f5)" }}>
      <div
        className="progress-bar"
        role="progressbar"
        style={{
          width: `${Math.min((parseInt(eta) / 320) * 100, 100)}%`,
          backgroundColor: "var(--bs-info, #0dcaf0)"
        }}
        aria-valuenow={parseInt(eta)}
        aria-valuemin={0}
        aria-valuemax={320}
      ></div>
    </div>
    <div className="text-muted small mt-1">
      Visual preview based on current queue position
    </div>
  </div>
)}
            {searchResults.length > 0 && (
              <div className="mt-3">
                <small className="text-muted">{searchResults.length} result(s):</small>
                <ul className="list-group mt-2">
                  {searchResults.map((order) => (
                   <li
                      key={order.transaction_id}
                      className="list-group-item"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div>
                        <strong>🆔 {order.transaction_id}</strong><br />
                        {order.customer_name} — {order.current_status}<br />
                        <small className="text-muted">🚗 {order.paint_type}</small><br />
                        <small className="text-muted">👨‍🔧 {order.assigned_employee || "Unassigned"}</small><br />
                        <small className="text-muted">🧪 {order.paint_quantity ?? "0.00ML"}</small><br />
                        <small className="text-muted">📂 {order.category}</small>
                      </div>

                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        {showForm && (
  <form onSubmit={handleSubmit}>
    <div className="row">
      {formFields.map((field, idx) => (
        <div key={idx} className={`col-md-${field.col || 6} mb-3`}>
          <label className="form-label">{field.label}</label>
          {field.type === "select" ? (
            <select
              className="form-select"
              value={field.value}
              onChange={(e) => field.onChange?.(e.target.value)}
              required={field.required}
            >
              <option value="">Select</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                type={field.type}
                name={field.name}
                className="form-control"
                value={field.value}
                onChange={(e) => {
                  if (typeof field.onChange === "function") {
                    field.onChange(e.target?.value ?? "");
                  }
                }}
                required={field.required}
                disabled={field.disabled}
                placeholder={field.placeholder}
              />

              {/* 👇 Contact suggestions appear only under the contact field */}
              {field.name === "clientContact" && contactSuggestions.length > 0 && (
                <ul className="list-group mt-1">
                  {contactSuggestions.map((num) => (
                    <li
                      key={num}
                      className="list-group-item list-group-item-action"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleContactSuggestionClick(num)}
                    >
                      {num}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ))}
    </div>

    <button type="submit" className="btn btn-success w-100 mt-3" disabled={loading}>
      {loading ? "Processing..." : "➕ Add Order"}
    </button>
  </form>
)}
        </div>
      </div>

      

                {selectedOrder && (
  <div className="modal d-block" tabIndex="-1" onClick={() => setSelectedOrder(null)}>
    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">🧾 Order Details</h5>
          <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
        </div>
        <div className="modal-body">
          <p><strong>Transaction ID:</strong> {selectedOrder.transaction_id}</p>
          <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
          <p><strong>Contact:</strong> {selectedOrder.client_contact}</p>
          <p><strong>Paint:</strong> {selectedOrder.paint_type}</p>
          <p><strong>Category:</strong> {selectedOrder.category}</p>
          <p><strong>Quantity:</strong> {selectedOrder.paint_quantity}</p>
          <p><strong>Colour Code:</strong> {selectedOrder.colour_code}</p>
          <p><strong>Status:</strong> {selectedOrder.current_status}</p>
          <p><strong>Order Type:</strong> {selectedOrder.order_type}</p>
          <p><strong>Assigned To:</strong> {selectedOrder.assigned_employee || "Unassigned"}</p>
          <p><strong>ETA:</strong> {selectedOrder.eta || "N/A"}</p>
        </div>
      </div>
    </div>
  </div>
)}
   

    <ToastContainer className="position-fixed top-0 start-50 translate-middle-x p-3" style={{ zIndex: 9999 }}>
        <Toast
          bg={toastType}
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={toastType === "danger" ? null : 4000}
          autohide={toastType !== "danger"}
        >
          <Toast.Header closeButton={true} className="text-white" style={{ backgroundColor: toastType === "danger" ? "#dc3545" : "#198754" }}>
            <strong className="me-auto">
              {toastType === "danger" ? "⚠️ Error" : "✅ Success"}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white fs-6 fw-bold text-center">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};
;

export default AddOrder;
