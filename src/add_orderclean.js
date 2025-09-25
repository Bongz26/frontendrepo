import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://queue-backendser.onrender.com";

const AddOrderC = () => {
  const [showForm, setShowForm] = useState(false);
  const [orderType, setOrderType] = useState("Paid");
  const [poOption, setPoOption] = useState("");
  const [transSuffix, setTransSuffix] = useState("");
  const [orderCount, setOrderCount] = useState(1);
  const [orders, setOrders] = useState([
    {
      category: "New Mix",
      paintType: "",
      colorCode: "",
      paintQuantity: "",
    },
  ]);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
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
  const [nameSuggestions, setNameSuggestions] = useState([]);
  // Added sorting states
  const [sortBy, setSortBy] = useState("transaction_id");
  const [sortOrder, setSortOrder] = useState("DESC");

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
        setActiveCount(
          orders.filter((o) => o.current_status === "In Progress").length
        );
        setWaitingCount(
          orders.filter((o) => o.current_status === "Waiting").length
        );
      })
      .catch(() => triggerToast("❌ Could not fetch job count", "danger"));
  }, []);

  useEffect(() => {
    const baseTimes = {
      "New Mix": 30,
      "Mix More": 15,
      "Colour Code": 30,
    };
    const base = baseTimes[orders[0]?.category] || 15;
    const jobPosition = activeCount + waitingCount + 1;
    setEta(jobPosition * base);
  }, [orders, activeCount, waitingCount]);

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
    setNameSuggestions([]);
    const keys = Object.keys(localStorage);
    const matches = keys.filter((k) =>
      k.startsWith("client_") && k.includes(value)
    );
    const suggestions = matches.map((k) => k.replace("client_", ""));
    setContactSuggestions(suggestions);
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
    setNameSuggestions([]);
  };

  const handleNameChange = (value) => {
    setClientName(value);
    setContactSuggestions([]);
    const keys = Object.keys(localStorage);
    const matches = keys.filter((k) => {
      const stored = localStorage.getItem(k);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.name.toLowerCase().includes(value.toLowerCase());
      }
      return false;
    });
    const suggestions = matches.map((k) => ({
      number: k.replace("client_", ""),
      name: JSON.parse(localStorage.getItem(k)).name,
    }));
    setNameSuggestions(suggestions);
  };

  const handleNameSuggestionClick = (number, name) => {
    setClientContact(number);
    setClientName(name);
    setNameSuggestions([]);
    setContactSuggestions([]);
  };

  const handleOrderCountChange = (value) => {
    const count = parseInt(value) || 1;
    if (count < 1 || count > 10) {
      triggerToast("❌ Number of orders must be between 1 and 10", "danger");
      return;
    }
    setOrderCount(count);
    setOrders((prev) => {
      const newOrders = [...prev];
      while (newOrders.length < count) {
        newOrders.push({
          category: "New Mix",
          paintType: "",
          colorCode: "",
          paintQuantity: "",
        });
      }
      return newOrders.slice(0, count);
    });
  };

  const handleOrderChange = (index, field, value) => {
    setOrders((prev) => {
      const newOrders = [...prev];
      newOrders[index] = { ...newOrders[index], [field]: value };
      return newOrders;
    });
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/orders/search`, {
        params: { q: searchTerm, sortBy, sortOrder },
      });
      setSearchResults(res.data);
    } catch (error) {
      console.error("Search error:", error);
      triggerToast("❌ Could not search orders", "danger");
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
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
${formatLine("PO Type", order.po_type || "N/A")}
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
    const count = orderCount;

    if (count < 1 || count > 10) {
      triggerToast("❌ Number of orders must be between 1 and 10", "danger");
      setLoading(false);
      return;
    }

    let suffix;
    let baseTransactionID;

    if (orderType === "Order") {
      suffix = Math.floor(1000 + Math.random() * 9000);
      baseTransactionID = `${today}-ORD-${suffix}`;
    } else {
      if (!/^\d{4}$/.test(transSuffix)) {
        triggerToast("❌ Paid orders require a 4-digit Transaction ID", "danger");
        setLoading(false);
        return;
      }
      if (!poOption) {
        triggerToast("❌ Please select a PO option (Nexa or Carvello) for Paid orders", "danger");
        setLoading(false);
        return;
      }
      suffix = transSuffix;
      baseTransactionID = `${today}-PO-${suffix}`;
    }

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

    for (let i = 0; i < count; i++) {
      const order = orders[i];
      if (!order.paintType.trim()) {
        triggerToast(`❌ Car Details required for order ${i + 1}`, "danger");
        setLoading(false);
        return;
      }
      if (!order.colorCode.trim() && order.category !== "New Mix") {
        triggerToast(`❌ Colour Code required for order ${i + 1}`, "danger");
        setLoading(false);
        return;
      }
      if (!order.paintQuantity) {
        triggerToast(`❌ Select paint quantity for order ${i + 1}`, "danger");
        setLoading(false);
        return;
      }
    }

    try {
      const existingOrders = await axios.get(`${BASE_URL}/api/orders`);
      const ordersToCreate = [];

      for (let i = 0; i < count; i++) {
        const order = orders[i];
        let finalTransactionID = count > 1 ? `${baseTransactionID}-${i + 1}` : baseTransactionID;

        let isDuplicate = existingOrders.data.some(
          (o) => o.transaction_id === finalTransactionID
        );

        if (isDuplicate && orderType === "Order") {
          let retries = 0;
          let newSuffix;
          do {
            newSuffix = Math.floor(1000 + Math.random() * 9000);
            baseTransactionID = `${today}-ORD-${newSuffix}`;
            finalTransactionID = count > 1 ? `${baseTransactionID}-${i + 1}` : baseTransactionID;
            isDuplicate = existingOrders.data.some(
              (o) => o.transaction_id === finalTransactionID
            );
            retries++;
          } while (isDuplicate && retries < 5);

          if (isDuplicate) {
            triggerToast(`⚠️ Could not generate unique Transaction ID for order ${i + 1}`, "danger");
            setLoading(false);
            return;
          }
        } else if (isDuplicate) {
          triggerToast(`⚠️ Transaction ID ${finalTransactionID} already exists. Please use a different 4-digit ID.`, "danger");
          setLoading(false);
          return;
        }

        if (orderType === "Paid") {
          const checkRes = await axios.get(`${BASE_URL}/api/orders/check-id/${finalTransactionID}`);
          if (checkRes.data.exists) {
            triggerToast(`❌ Transaction ID ${finalTransactionID} is already used. Please enter a different 4-digit ID.`, "danger");
            setLoading(false);
            return;
          }
        }

        const newOrder = {
          transaction_id: finalTransactionID,
          customer_name: clientName,
          client_contact: clientContact,
          paint_type: order.paintType,
          colour_code: order.category === "New Mix" ? "Pending" : order.colorCode || "N/A",
          category: order.category,
          paint_quantity: order.paintQuantity,
          current_status: "Waiting",
          order_type: orderType,
          po_type: orderType === "Paid" ? poOption : null,
          start_time: startTime,
        };

        ordersToCreate.push(newOrder);
      }

      for (const order of ordersToCreate) {
        await axios.post(`${BASE_URL}/api/orders`, order);
        localStorage.setItem(
          `client_${clientContact}`,
          JSON.stringify({ name: clientName })
        );
        setTimeout(() => printReceipt(order), 300);
      }

      triggerToast(`✅ ${count} order${count > 1 ? "s" : ""} placed successfully`);
      setShowForm(false);
      setTransSuffix("");
      setPoOption("");
      setOrderCount(1);
      setOrders([
        { category: "New Mix", paintType: "", colorCode: "", paintQuantity: "" },
      ]);
      setClientName("");
      setClientContact("");
      setStartTime(new Date().toISOString());
    } catch (error) {
      console.error("Order error:", error);
      triggerToast(
        `❌ Could not place order(s): ${
          error.response?.data?.message || "Check for duplicate"
        }`,
        "danger"
      );
    } finally {
      setLoading(false);
    }

    setContactSuggestions([]);
    setNameSuggestions([]);
  };

  const formatMinutesToHours = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0
      ? `${hrs}hr${hrs > 1 ? "s" : ""} ${mins > 0 ? `${mins}min` : ""}`.trim()
      : `${mins}min`;
  };

  const formFields = [
    {
      label: "Order Type",
      type: "select",
      value: orderType,
      onChange: (val) => setOrderType(val),
      options: ["Paid", "Order"],
      required: true,
    },
    ...(orderType === "Paid"
      ? [
          {
            label: "PO Option (Required)",
            type: "radio",
            value: poOption,
            onChange: (val) => setPoOption(val),
            options: ["Nexa", "Carvello"],
            required: true,
          },
        ]
      : []),
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
      placeholder: "Enter 4-digit ID",
    },
    {
      label: "Number of Orders",
      type: "number",
      value: orderCount,
      onChange: handleOrderCountChange,
      required: true,
      placeholder: "Enter number of orders (1-10)",
    },
    {
      label: "Cell Number",
      type: "text",
      name: "clientContact",
      value: clientContact,
      onChange: handleContactChange,
      required: true,
    },
    {
      label: "Client Name",
      type: "text",
      name: "clientName",
      value: clientName,
      onChange: handleNameChange,
      required: true,
    },
  ];

  const orderFields = [
    {
      label: "Category",
      type: "select",
      name: "category",
      options: ["New Mix", "Mix More", "Colour Code"],
      required: true,
    },
    { label: "Car Details", type: "text", name: "paintType", required: true },
    {
      label: "Colour Code",
      type: "text",
      name: "colorCode",
      disabled: (order) => order.category === "New Mix",
    },
    {
      label: "Paint Quantity",
      type: "select",
      name: "paintQuantity",
      options: [
        "250ml",
        "500ml",
        "750ml",
        "1L",
        "1.25L",
        "1.5L",
        "2L",
        "2.5L",
        "3L",
        "4L",
        "5L",
        "10L",
      ],
      required: true,
    },
  ];

  const renderField = (field) => {
    if (field.type === "radio") {
      return (
        <div className="form-check-group mt-2">
          {field.options.map((opt) => (
            <div key={opt} className="form-check">
              <input
                className="form-check-input"
                type="radio"
                id={`${field.label}-${opt}`}
                value={opt}
                checked={field.value === opt}
                onChange={(e) => field.onChange(e.target.value)}
                required={field.required}
              />
              <label className="form-check-label" htmlFor={`${field.label}-${opt}`}>
                {opt}
              </label>
            </div>
          ))}
        </div>
      );
    }
    if (field.type === "select") {
      return (
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
      );
    }
    return (
      <>
        <input
          type={field.type}
          name={field.name}
          className="form-control"
          value={field.value}
          onChange={(e) => field.onChange?.(e.target.value ?? "")}
          required={field.required}
          disabled={field.disabled}
          placeholder={field.placeholder}
          min={field.type === "number" ? 1 : undefined}
          max={field.type === "number" ? 10 : undefined}
        />
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
        {field.name === "clientName" && nameSuggestions.length > 0 && (
          <ul className="list-group mt-1">
            {nameSuggestions.map(({ number, name }) => (
              <li
                key={number}
                className="list-group-item list-group-item-action"
                style={{ cursor: "pointer" }}
                onClick={() => handleNameSuggestionClick(number, name)}
              >
                {name} ({number})
              </li>
            ))}
          </ul>
        )}
      </>
    );
  };

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
              onClick={() => (window.location.href = "/admin-orders")}
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
            <div className="input-group mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Transaction ID, Contact, or Client Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              <button
                className="btn btn-outline-secondary"
                onClick={handleSearch}
              >
                Search
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            </div>
            {/* Added sorting controls */}
            <div className="row mb-2">
              <div className="col-md-6">
                <label className="form-label">Sort By</label>
                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="transaction_id">Transaction ID</option>
                  <option value="customer_name">Customer Name</option>
                  <option value="client_contact">Contact</option>
                  <option value="start_time">Start Time</option>
                  <option value="current_status">Status</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Sort Order</label>
                <select
                  className="form-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="DESC">Descending</option>
                  <option value="ASC">Ascending</option>
                </select>
              </div>
            </div>
            {eta && (
              <div className="mt-2">
                <div
                  className="progress"
                  style={{
                    height: "6px",
                    backgroundColor: "var(--bs-secondary-bg, #f1f3f5)",
                  }}
                >
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{
                      width: `${Math.min((parseInt(eta) / 320) * 100, 100)}%`,
                      backgroundColor: "var(--bs-info, #0dcaf0)",
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
            {searchResults.length > 0 ? (
              <div className="mt-3">
                <small className="text-muted">
                  {searchResults.length} result(s):
                </small>
                <ul className="list-group mt-2">
                  {searchResults.map((order) => (
                    <li
                      key={order.transaction_id}
                      className="list-group-item"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div>
                        <strong>🆔 {order.transaction_id}</strong>
                        <br />
                        {order.customer_name} — {order.current_status}
                        <br />
                        <small className="text-muted">
                          🚗 {order.paint_type}
                        </small>
                        <br />
                        <small className="text-muted">
                          👨‍🔧 {order.assigned_employee || "Unassigned"}
                        </small>
                        <br />
                        <small className="text-muted">
                          🧪 {order.paint_quantity ?? "0.00ML"}
                        </small>
                        <br />
                        <small className="text-muted">
                          📂 {order.category}
                        </small>
                        <br />
                        <small className="text-muted">
                          📋 PO Type: {order.po_type || "N/A"}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : searchTerm && (
              <div className="mt-3">
                <small className="text-muted">No orders found</small>
              </div>
            )}
          </div>
          {showForm && (
            <form onSubmit={handleSubmit}>
              <div className="row">
                {formFields.map((field, idx) => (
                  <div key={idx} className={`col-md-${field.col || 6} mb-3`}>
                    <label className="form-label">{field.label}</label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
              {orders.map((order, index) => (
                <div key={index} className="border p-3 mb-3 rounded">
                  <h6>Order {index + 1}</h6>
                  <div className="row">
                    {orderFields.map((field, idx) => (
                      <div key={idx} className="col-md-6 mb-3">
                        <label className="form-label">{field.label}</label>
                        {field.type === "select" ? (
                          <select
                            className="form-select"
                            value={order[field.name]}
                            onChange={(e) =>
                              handleOrderChange(index, field.name, e.target.value)
                            }
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
                          <input
                            type={field.type}
                            className="form-control"
                            value={order[field.name]}
                            onChange={(e) =>
                              handleOrderChange(index, field.name, e.target.value)
                            }
                            required={field.required}
                            disabled={field.disabled && field.disabled(order)}
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="submit"
                className="btn btn-success w-100 mt-3"
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : `➕ Add ${orderCount > 1 ? `${orderCount} Orders` : "Order"}`}
              </button>
            </form>
          )}
        </div>
      </div>
      {selectedOrder && (
        <div
          className="modal d-block"
          tabIndex="-1"
          onClick={() => setSelectedOrder(null)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🧾 Order Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedOrder(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Transaction ID:</strong> {selectedOrder.transaction_id}
                </p>
                <p>
                  <strong>Customer:</strong> {selectedOrder.customer_name}
                </p>
                <p>
                  <strong>Contact:</strong> {selectedOrder.client_contact}
                </p>
                <p>
                  <strong>Paint:</strong> {selectedOrder.paint_type}
                </p>
                <p>
                  <strong>Category:</strong> {selectedOrder.category}
                </p>
                <p>
                  <strong>Quantity:</strong> {selectedOrder.paint_quantity}
                </p>
                <p>
                  <strong>Colour Code:</strong> {selectedOrder.colour_code}
                </p>
                <p>
                  <strong>Status:</strong> {selectedOrder.current_status}
                </p>
                <p>
                  <strong>Order Type:</strong> {selectedOrder.order_type}
                </p>
                <p>
                  <strong>PO Type:</strong> {selectedOrder.po_type || "N/A"}
                </p>
                <p>
                  <strong>Assigned To:</strong>{" "}
                  {selectedOrder.assigned_employee || "Unassigned"}
                </p>
                <p>
                  <strong>ETA:</strong> {selectedOrder.eta || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer
        className="position-fixed top-0 start-50 translate-middle-x p-3"
        style={{ zIndex: 9999 }}
      >
        <Toast
          bg={toastType}
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={toastType === "danger" ? null : 4000}
          autohide={toastType !== "danger"}
        >
          <Toast.Header
            closeButton={true}
            className="text-white"
            style={{
              backgroundColor:
                toastType === "danger" ? "#dc3545" : "#198754",
            }}
          >
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

export default AddOrderC;
