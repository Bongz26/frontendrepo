import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://queue-backendser.onrender.com";

const AddOrder = () => {
  const [orderType, setOrderType] = useState("Paid");
  const [transactionID, setTransactionID] = useState("");
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

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const formatDateDDMMYYYY = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  };

  useEffect(() => {
    if (orderType === "Order") {
      setTransactionID(`${formatDateDDMMYYYY()}-PO_${Math.floor(1000 + Math.random() * 9000)}`);
    } else {
      setTransactionID(`${formatDateDDMMYYYY()}-`);
    }
    setStartTime(new Date().toISOString());
  }, [orderType]);

  const validateContact = (input) => /^\d{10}$/.test(input);

  const handleContactChange = (e) => {
    const input = e.target.value;
    setClientContact(input);
    if (validateContact(input)) {
      const stored = localStorage.getItem(`client_${input}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setClientName(parsed.name);
      }
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/orders`);
      const filtered = res.data.filter(
        (order) =>
          order.transaction_id.includes(searchTerm) ||
          order.client_contact.includes(searchTerm)
      );
      setSearchResults(filtered);
    } catch (err) {
      triggerToast("❌ Search failed", "danger");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateContact(clientContact)) {
      triggerToast("❌ Contact number must be 10 digits!", "danger");
      return;
    }
    if (!paintType.trim()) {
      triggerToast("❌ Car Details required!", "danger");
      return;
    }
    if (!colorCode.trim() && category !== "New Mix") {
      triggerToast("❌ Colour Code required!", "danger");
      return;
    }
    if (
      !paintQuantity ||
      !["250ml", "500ml", "750ml", "1L", "1.25L", "1.5L", "2L", "2.5L", "3L", "4L", "5L", "10L"].includes(paintQuantity)
    ) {
      triggerToast("❌ Invalid paint quantity!", "danger");
      return;
    }
    if (transactionID.length !== 13 && orderType !== "Order") {
      triggerToast("❌ Paid orders need 4-digit Transaction ID!", "danger");
      return;
    }

    const newOrder = {
      transaction_id: transactionID,
      customer_name: clientName,
      client_contact: clientContact,
      paint_type: paintType,
      colour_code: category === "New Mix" ? "Pending" : colorCode || "N/A",
      category,
      paint_quantity: paintQuantity,
      current_status: "Waiting",
      order_type: orderType,
      start_time: startTime,
      eta: eta || "Pending"
    };

    try {
      await axios.post(`${BASE_URL}/api/orders`, newOrder);
      triggerToast("✅ Order placed successfully!");
      printReceipt(newOrder);

      localStorage.setItem(
        `client_${clientContact}`,
        JSON.stringify({ name: clientName, contact: clientContact })
      );

      setTransactionID(formatDateDDMMYYYY() + "-");
      setClientName("");
      setClientContact("");
      setPaintType("");
      setColorCode("");
      setPaintQuantity("");
      setCategory("New Mix");
      setOrderType("Walk-in");
      setStartTime(new Date().toISOString());
      setEta("");
    } catch (err) {
      console.error("Order error:", err.message);
      triggerToast("❌ Could not place order!", "danger");
    }
  };

  const printReceipt = (order) => {
    const win = window.open("", "_blank", "width=600,height=400");
    if (!win) {
      triggerToast("❌ Printing blocked by browser", "danger");
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
${formatLine("Colour Code", order.colour_code)} ${order.colour_code === "Pending" ? "(To be assigned)" : ""}
${formatLine("Category", order.category)}
${formatLine("ETA", order.eta)}
Track ID       : TRK-${order.transaction_id}

----------------------------------------
  WhatsApp Support: 083 579 6982
----------------------------------------

   Thank you for your order!
========================================
`;
    win.document.write(`
      <html><head><title>Receipt</title>
      <style>body { font-family: monospace; white-space: pre; font-size: 12px; margin: 0; padding: 10px; }</style>
      </head><body>${receipt}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="container mt-4">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">📝 Add New Order</h5>
        </div>
        <div className="card-body">
          {/* Search */}
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
              <button className="btn btn-outline-secondary" onClick={handleSearch}>Search</button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3">
                <small className="text-muted">{searchResults.length} result(s):</small>
                <ul className="list-group">
                  {searchResults.map((order) => (
                    <li key={order.transaction_id} className="list-group-item">
                      {order.transaction_id} — {order.customer_name} ({order.current_status})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Input fields */}
              {[
                {
                  label: "Order Type",
                  type: "select",
                  col: 6,
                  value: orderType,
                  onChange: setOrderType,
                  options: ["Paid", "Order"]
                },
                {
                  label: "Transaction ID",
                  type: "text",
                  col: 6,
                  value: transactionID,
                  onChange: (val) => {
                    const digits = val.replace(/\D/g, "").slice(-4);
                    setTransactionID(formatDateDDMMYYYY() + "-" + digits);
                  },
                  disabled: orderType === "Order"
                },
                {
                  label: "Client Contact",
                  name: "clientContact",
                  type: "text",
                  col: 6,
                  value: clientName,
                  onChange: setClientName,
                  required: true
                },
                {
                  label: "Category",
                  type: "select",
                  col: 6,
                  value: category,
                  onChange: setCategory,
                  options: ["New Mix", "Reorder Mix", "Colour Code"]
                },
                {
                  label: "Car Details",
                  type: "text",
                  col: 6,
                  value: paintType,
                  onChange: setPaintType,
                  required: true
                },
                {
                  label: "Colour Code",
                  type: "text",
                  col: 6,
                  value: colorCode,
                  onChange: setColorCode,
                  disabled: category === "New Mix"
                },
                {
                  label: "Paint Quantity",
                  type: "select",
                  col: 6,
                  value: paintQuantity,
                  onChange: setPaintQuantity,
                  options: ["250ml", "500ml", "750ml", "1L", "1.25L", "1.5L", "2L", "2.5L", "3L", "4L", "5L", "10L"],
                  required: true
                },
                {
                  label: "ETA (optional)",
                  type: "text",
                  col: 6,
                  value: eta,
                  onChange: setEta,
                  placeholder: "e.g. 30 minutes"
                }
              ].map((field, idx) => (
                <div key={idx} className={`col-md-${field.col || 6} mb-3`}>
                  <label className="form-label">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      className="form-select"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      required={field.required}
                    >
                      <option value="">Select</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name || undefined}
                      className="form-control"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      required={field.required}
                      disabled={field.disabled}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="btn btn-success w-100 mt-3">➕ Add Order</button>
          </form>
        </div>
      </div>

      <ToastContainer position="top-end" className="p-3">
        <Toast bg={toastType} onClose={() => setShowToast(false)} show={showToast} delay={3500} autohide>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default AddOrder;
