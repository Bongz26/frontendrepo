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
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-GB").replace(/\//g, "");

    if (orderType === "Order") {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      setTransSuffix(`${randomDigits}`);
    } else if (orderType === "Paid") {
      setTransSuffix("");
    }

    setStartTime(today.toISOString());
  }, [orderType]);

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
      "New Mix": 160,
      "Mix More": 30,
      "Colour Code": 90,
    };
    const base = baseTimes[category] || 15;
    const jobPosition = activeCount + waitingCount + 1;
    setEta(jobPosition * base);
  }, [category, activeCount, waitingCount]);

  const validateContact = (input) => /^\d{10}$/.test(input);

  const handleContactChange = (value) => {
    setClientContact(value);
    if (validateContact(value)) {
      const stored = localStorage.getItem(`client_${value}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setClientName(parsed.name);
      }
    }
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
    const fullTransactionID =
      orderType === "Paid"
        ? `${today}-PO-${transSuffix}`
        : `${today}-${transSuffix}`;

    if (!validateContact(clientContact)) {
      triggerToast("⚠️ Enter *10-digit* phone number, not name", "danger");
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
    if (orderType !== "Order" && transSuffix.length !== 4) {
      triggerToast("❌ Paid orders require a 4-digit Transaction ID", "danger");
      setLoading(false);
      return;
    }

    const newOrder = {
      transaction_id: fullTransactionID,
      customer_name: clientName,
      client_contact: clientContact,
      paint_type: paintType,
      colour_code: category === "New Mix" ? "Pending" : colorCode || "N/A",
      category,
      paint_quantity: paintQuantity,
      current_status: "Waiting",
      order_type: orderType,
      start_time: startTime,
      eta,
    };

    try {
      await axios.post(`${BASE_URL}/api/orders`, newOrder);
      triggerToast("✅ Order placed successfully");
      setTimeout(() => printReceipt(newOrder), 300);

      setTransSuffix("");
      setClientName("");
      setClientContact("");
      setPaintType("");
      setColorCode("");
      setPaintQuantity("");
      setCategory("New Mix");
      setOrderType("Walk-in");
      setStartTime(new Date().toISOString());
    } catch {
      triggerToast("❌ Could not place order - Check for duplicate", "danger");
    } finally {
      setLoading(false);
    }
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
    { label: "Client Contact", type: "text", name: "clientContact", value: clientContact, onChange: handleContactChange, required: true },
    { label: "Client Name", type: "text", value: clientName, onChange: (val) => setClientName(val), required: true },
    { label: "Category", type: "select", value: category, onChange: (val) => setCategory(val), options: ["New Mix", "Mix More", "Colour Code"], required: true },
    { label: "Car Details", type: "text", value: paintType, onChange: (val) => setPaintType(val), required: true },
    { label: "Colour Code", type: "text", value: colorCode, onChange: (val) => setColorCode(val), disabled: category === "New Mix" },
    { label: "Paint Quantity", type: "select", value: paintQuantity, onChange: (val) => setPaintQuantity(val), options: ["250ml", "500ml", "750ml", "1L", "1.25L", "1.5L", "2L", "2.5L", "3L", "4L", "5L", "10L"], required: true },
    { label: "ETA", type: "text", value: formatMinutesToHours(eta), onChange: () => {}, disabled: true }
  ];

  return (
    <div className="container mt-4">
      {/* ... other code ... (form, search, etc.) */}

      {/* Toast: Better visibility - centered and bold */}
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

export default AddOrder;
