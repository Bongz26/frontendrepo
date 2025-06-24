import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";

const BASE_URL = "https://queue-backendser.onrender.com";

const AddOrderPage = () => {
  const [orderType, setOrderType] = useState("Paid");
  const [transactionID, setTransactionID] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [category, setCategory] = useState("New Mix");
  const [paintType, setPaintType] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [paintQuantity, setPaintQuantity] = useState("");
  const [startTime, setStartTime] = useState("");

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
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString();
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

  useEffect(() => {
    const detectAutofill = () => {
      const contactInput = document.querySelector("input[name='clientContact']");
      if (contactInput) {
        const filledValue = contactInput.value;
        if (/^\d{10}$/.test(filledValue)) {
          const stored = localStorage.getItem(`client_${filledValue}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            setClientContact(filledValue);
            setClientName(parsed.name);
          }
        }
      }
    };

    window.addEventListener("load", detectAutofill);
    setTimeout(detectAutofill, 500);

    return () => window.removeEventListener("load", detectAutofill);
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateContact(clientContact)) {
      triggerToast("❌ Contact number must be exactly 10 digits!", "danger");
      return;
    }

    if (!paintType.trim()) {
      triggerToast("❌ Car Details cannot be empty!", "danger");
      return;
    }

    if (!colorCode.trim() && category !== "New Mix") {
      triggerToast("❌ Colour Code cannot be empty!", "danger");
      return;
    }

    if (!paintQuantity || !["250ml", "500ml", "750ml", "1L", "1.25L", "1.5L", "2L", "2.5L", "3L", "4L", "5L", "10L"].includes(paintQuantity)) {
      triggerToast("❌ Please select a valid paint quantity!", "danger");
      return;
    }

    if (transactionID.length !== 13 && orderType !== 'Order') {
      triggerToast("❌ Paid orders must have a 4-digit Transaction ID!", "danger");
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
      start_time: startTime
    };

    try {
      await axios.post(`${BASE_URL}/api/orders`, newOrder);
      triggerToast("✅ Order placed successfully!", "success");
      printReceipt(newOrder);

      const clientData = { name: clientName, contact: clientContact };
      localStorage.setItem(`client_${clientContact}`, JSON.stringify(clientData));

      setTransactionID(formatDateDDMMYYYY() + "-");
      setClientName("");
      setClientContact("");
      setPaintType("");
      setColorCode("");
      setPaintQuantity("");
      setCategory("New Mix");
      setOrderType("Walk-in");
      setStartTime(new Date().toISOString());
    } catch (error) {
      console.error("🚨 Error adding order:", error.message);
      triggerToast("❌ Error adding order! Check Transaction ID / Network.", "danger");
    }
  };

  const printReceipt = (order) => {
    const printWindow = window.open("", "_blank", "width=600,height=400");
    if (!printWindow) {
      triggerToast("❌ Printing blocked! Enable pop-ups.", "danger");
      return;
    }

    const formatLine = (label, value) => `${label.padEnd(15)}: ${value}`;

    const receiptContent = `
=============================================
         PROCUSHION QUEUE SYSTEM - RECEIPT
=============================================
${formatLine("Order No.", `#${order.transaction_id}`)}
${formatLine("Client", order.customer_name)}
${formatLine("Contact", order.client_contact)}
${formatLine("Car Details", order.paint_type)}
${formatLine("Colour Code", order.colour_code)} ${order.colour_code === "Pending" ? "(To be assigned)" : ""}
${formatLine("Category", order.category)}

Track ID       : TRK-${order.transaction_id}

----------------------------------------
  WhatsApp Support: 083 579 6982
----------------------------------------

     Thank you for your order!
========================================
`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: monospace;
              white-space: pre;
              font-size: 12px;
              margin: 0;
              padding: 10px;
            }
          </style>
        </head>
        <body>${receiptContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container mt-4">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">📝 Add New Order</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* All input fields, same as before */}
              {/* ... Truncated here for brevity */}
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

export default AddOrderPage;
