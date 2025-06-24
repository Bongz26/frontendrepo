import React, { useState, useEffect } from "react";
import axios from "axios";

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
      alert("❌ Contact number must be exactly 10 digits!");
      return;
    }

    if (!paintType.trim()) {
      alert("❌ Car Details cannot be empty!");
      return;
    }

    if (!colorCode.trim() && category !== "New Mix") {
      alert("❌ Colour Code cannot be empty!");
      return;
    }

    if (!paintQuantity || !["250ml", "500ml", "750ml", "1L", "1.25L", "1.5L", "2L", "2.5L", "3L", "4L", "5L", "10L"].includes(paintQuantity)) {
      alert("❌ Please select a valid paint quantity!");
      return;
    }

    if (transactionID.length !== 13 && orderType !== 'Order') {
      alert("❌ Paid orders must have a 4-digit Transaction ID!");
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
      alert("✅ Order placed successfully!");
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
      alert("❌ Error adding order! Please check your TransactionID / Network Connection.");
    }
  };

  const printReceipt = (order) => {
    const printWindow = window.open("", "_blank", "width=600,height=400");
    if (!printWindow) {
      alert("❌ Printing blocked! Enable pop-ups in your browser.");
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
        <body>
          ${receiptContent}
        </body>
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
              <div className="col-md-6 mb-3">
                <label className="form-label">Order Type</label>
                <select className="form-select" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                  <option>Paid</option>
                  <option>Order</option>
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Transaction ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={transactionID}
                  onChange={(e) => {
                    if (orderType === "Paid") {
                      const userDigits = e.target.value.replace(/\D/g, "").slice(-4);
                      setTransactionID(formatDateDDMMYYYY() + "-" + userDigits);
                    }
                  }}
                  disabled={orderType === "Order"}
                  placeholder="Enter 4-digit ID for Paid"
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Client Contact</label>
                <input
                  type="text"
                  name="clientContact"
                  className="form-control"
                  value={clientContact}
                  onChange={handleContactChange}
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Client Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>New Mix</option>
                  <option>Reorder Mix</option>
                  <option>Colour Code</option>
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Car Details</label>
                <input
                  type="text"
                  className="form-control"
                  value={paintType}
                                   onChange={(e) => setPaintType(e.target.value)}
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Colour Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  disabled={category === "New Mix"}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Paint Quantity</label>
                <select className="form-select" value={paintQuantity} onChange={(e) => setPaintQuantity(e.target.value)} required>
                  <option value="">Select Quantity</option>
                  {["250ml", "500ml", "750ml", "1L", "1.25L", "1.5L", "2L", "2.5L", "3L", "4L", "5L", "10L"].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-success w-100 mt-3">➕ Add Order</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddOrderPage;
