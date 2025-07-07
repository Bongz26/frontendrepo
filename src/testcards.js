
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./styles/queueStyles.css";
import "./styles/queueSortStyles.css";
import LoginPopup from "./LoginPopup";
import ColourCodeModal from "./ColourCodeModal";

const BASE_URL = process.env.REACT_APP_API_URL || "https://queue-backendser.onrender.com";
  
 function ElapsedTime({ statusStartedAt, fallbackTime }) {
  const [displayTime, setDisplayTime] = React.useState("");

  React.useEffect(() => {
    const validTime = statusStartedAt || fallbackTime;
    if (!validTime) return;

    const updateElapsed = () => {
      const start = new Date(validTime).getTime();
      const now = Date.now();
      const diffMs = now - start;

      if (diffMs < 0) {
        setDisplayTime("0 min");
        return;
      }

      const totalMinutes = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMinutes / 1440); // 1440 min/day
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;

      let parts = [];
      if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
      if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
      if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);

      setDisplayTime(parts.join(" "));
    };

    updateElapsed(); // Run immediately
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [statusStartedAt, fallbackTime]);

  return <span>⏱ {displayTime}</span>;
}



const CardView = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("User");
  const [showLogin, setShowLogin] = useState(false);
  const [pendingColourUpdate, setPendingColourUpdate] = useState(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null); // For modal
  const handleLogin = () => setShowLogin(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${BASE_URL}/api/orders`);
      setOrders(response.data);
    } catch {
      setError("Error fetching orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  fetchOrders();
  const interval = setInterval(fetchOrders, 30000); // every 30s
  return () => clearInterval(interval);
}, [fetchOrders]);

const getModalCategoryClass = (cat) => {
  switch (cat?.toLowerCase()) {
    case "mixing":
      return "modal-category-mixing";
    case "spraying":
      return "modal-category-spraying";
    case "re-mixing":
      return "modal-category-remix";
    case "detailing":
      return "modal-category-detailing";
    default:
      return "modal-category-default";
  }
};


const logAuditTrail = async (logData) => {
  try {
    await axios.post(`${BASE_URL}/api/audit-logs`, logData);
    console.log("📘 Audit logged:", logData);
  } catch (err) {
    console.warn("⚠️ Failed to log audit:", err.message);
  }
};

const updateStatus = async (order, newStatus, colourCode, currentEmp) => {
  let employeeName = "Unassigned"; // Start safe
  let updatedColourCode = colourCode;

  const category = order.category;
  const fromStatus = order.current_status;
  const toStatus = newStatus;

  const isNewMix = category === "New Mix";

  // 🟨 Rule 3: New Mix → Ready → needs modal
  const isNewMixAndReady =
    isNewMix &&
    ["Mixing", "Spraying", "Re-Mixing"].includes(fromStatus) &&
    toStatus === "Ready";

  const isColourMissing =
    !updatedColourCode ||
    updatedColourCode.trim() === "" ||
    updatedColourCode === "Pending";

  // 👇 Check if we need to pop up the ColourCodeModal
  if (isNewMixAndReady && isColourMissing) {
    setPendingColourUpdate({
      orderId: order.transaction_id,
      newStatus,
      employeeName: currentEmp,
    });
    return;
  }

  // 🔐 Rules 1 & 2
  const shouldPromptEmp = (() => {
    const eligibleCats = ["New Mix", "Mix More", "Colour Code"];

    if (eligibleCats.includes(category) && toStatus === "Mixing") return true;
    if (
      eligibleCats.includes(category) &&
      ["Mixing", "Spraying", "Re-Mixing"].includes(fromStatus)
    ) {
      return true;
    }

    return false;
  })();

  if (shouldPromptEmp) {
    if (currentEmp === "Unassigned") {
      // Prompt user if not already provided
      const empCodeFromPrompt = prompt("🔍 Enter Employee Code:");
      if (!empCodeFromPrompt) return alert("❌ Employee Code required!");

      try {
        const res = await axios.get(`${BASE_URL}/api/employees?code=${empCodeFromPrompt}`);
        if (!res.data?.employee_name) return alert("❌ Invalid employee code!");
        employeeName = res.data.employee_name;
      } catch {
        return alert("❌ Unable to verify employee!");
      }
    } else {
      // Employee code came from modal or was passed in
      try {
        const res = await axios.get(`${BASE_URL}/api/employees?code=${currentEmp}`);
        if (!res.data?.employee_name) return alert("❌ Invalid employee code!");
        employeeName = res.data.employee_name;
      } catch {
        return alert("❌ Unable to verify employee!");
      }
    }
  } else {
    // If no prompt required, use existing employee name
    employeeName = order.assigned_employee || "Unassigned";
  }

  // ✅ Final update
  try {
    await axios.put(`${BASE_URL}/api/orders/${order.transaction_id}`, {
      current_status: toStatus,
      assigned_employee: employeeName,
      colour_code: updatedColourCode,
      userRole,
      old_status: fromStatus,
    });

    await logAuditTrail({
      transaction_id: order.transaction_id,
      fromStatus,
      toStatus,
      employee: employeeName,
      userRole,
    });

    setRecentlyUpdatedId(order.transaction_id);
    setTimeout(() => setRecentlyUpdatedId(null), 2000);
    setTimeout(fetchOrders, 500);
  } catch (err) {
    alert("❌ Error updating status!");
    console.error(err);
  }
};
   /* const calculateETA = (order) => {
    const waitingOrders = orders.filter(o => o.current_status === "Waiting");
    const position = waitingOrders.findIndex(o => o.transaction_id === order.transaction_id) + 1;
    const base = order.category === "New Mix" ? 160 : order.category === "Colour Code" ? 90 : 45;
    return `${position * base} minutes`;
  };
*/
const getCategoryClass = (cat) => {
  switch (cat?.toLowerCase()) {
    case "mixing":
      return "card-category-mixing";
    case "spraying":
      return "card-category-spraying";
    case "re-mixing":
      return "card-category-remix";
    case "detailing":
      return "card-category-detailing";
    default:
      return "card-category-default";
  }
};


const renderWaitingCard = (order) => (
  <div
    key={order.transaction_id}
    className={`card mb-2 px-3 py-2 shadow-sm border-0 ${
      recentlyUpdatedId === order.transaction_id ? "flash-row" : ""
    }`}
    style={{ fontSize: "0.85rem", lineHeight: "1.4", cursor: "pointer" }}
    onClick={() => setSelectedOrder(order)}
  >
    <div className="d-flex justify-content-between">
      <div>
        <strong>{order.transaction_id}</strong> •{" "}
        <span className="text-muted">{order.category}</span><br />
        <span>{order.customer_name}</span>{" "}
        <small className="text-muted">({order.client_contact})</small>
      </div>
      <div className="text-end">
       <small className="text-muted">
           <ElapsedTime statusStartedAt={order.status_started_at} 
                        fallbackTime={order.start_time}/> in {order.current_status}
      </small><br />
        <select
          className="form-select form-select-sm mt-1"
          style={{ minWidth: "120px" }}
          onClick={(e) => e.stopPropagation()}
          value={order.current_status}

          onChange={(e) =>
            updateStatus(
              order,
              e.target.value,
              order.colour_code,
              order.assigned_employee
            )
          }
        >
          <option value={order.current_status}>{order.current_status}</option>
          {order.current_status === "Waiting" && (
            <option value="Mixing">Mixing</option>
          )}
        </select>
      </div>
    </div>
  </div>
);


const renderActiveCard = (order) => (
  <div
    key={order.transaction_id}
    className={`card mb-2 shadow-sm px-3 py-2 border-0 ${
          recentlyUpdatedId === order.transaction_id ? "flash-row" : ""
    } ${getCategoryClass(order.category)}`}
    style={{ fontSize: "0.85rem", lineHeight: "1.4", cursor: "pointer" }}
    onClick={() => setSelectedOrder(order)}
  >
    <div className="d-flex justify-content-between">
      <div>
        <strong>🆔 {order.transaction_id}</strong> •{" "}
        <span className="text-muted">{order.category}</span><br />
        {order.customer_name} <small className="text-muted">({order.client_contact})</small><br />
        🎨 <span className="text-muted">{order.paint_type}</span> — {order.paint_quantity}<br />
        <small className="text-muted">Col Code: {order.colour_code || "N/A"}</small>
      </div>

          <div className="text-end">
           <small className="text-muted">
              <ElapsedTime statusStartedAt={order.status_started_at} 
                        fallbackTime={order.start_time}/> in {order.current_status}
          </small><br />
          <span className="badge bg-secondary mb-1">{order.current_status}</span><br />
          <small>👨‍🔧 {order.assigned_employee || "Unassigned"}</small><br />
          <select
            className="form-select form-select-sm mt-1"
        style={{ minWidth: "130px" }}
        onClick={(e) => e.stopPropagation()}
        value={order.current_status}
        onChange={(e) =>
          updateStatus(
            order,
            e.target.value,
            order.colour_code,
            order.assigned_employee
          )
        }
      >
          <option value={order.current_status}>{order.current_status}</option>
          {order.current_status === "Mixing" && <option value="Spraying">Spraying</option>}
          {order.current_status === "Spraying" && (
            <>
              <option value="Re-Mixing">Back to Mixing</option>
              <option value="Ready">Ready</option>
            </>
          )}
          {order.current_status === "Re-Mixing" && <option value="Spraying">Spraying</option>}
          {order.current_status === "Ready" && userRole === "Admin" && (
            <option value="Complete">Complete</option>
          )}
        </select>
      </div>
    </div>
  </div>
);

  const waitingCount = orders.filter(o => o.current_status === "Waiting").length;
  const activeCount = orders.filter(o =>
    !["Waiting", "Ready", "Complete"].includes(o.current_status)
  ).length;

  return (
    <div className="container mt-4">
      <div className="card mb-3 shadow-sm border-0">
        <div className="card-header bg-dark text-white d-flex justify-content-between">
          <h5 className="mb-0">🎨 Queue System View</h5>
          <button className="btn btn-light btn-sm" onClick={handleLogin}>Login as Admin</button>
        </div>
        <div className="card-body">
          {showLogin && (
            <LoginPopup
              onLogin={(role) => setUserRole(role)}
              onClose={() => setShowLogin(false)}
            />
          )}
          {error && <div className="alert alert-danger">{error}</div>}
          <button className="btn btn-outline-secondary mb-3" onClick={fetchOrders} disabled={loading}>
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
      
                {/* Waiting Orders (Card View) */}
          <div className="row">
              <div className="col-md-4">  {/* Narrower column for Waiting Orders */}
                <h6 className="bg-primary text-white p-2">⏳ Waiting Orders: {waitingCount}</h6>
                {orders.filter(o => o.current_status === "Waiting" && !o.archived)
                        .map(renderWaitingCard)}
          </div>

           
              <div className="col-md-8">
            <h6 className="bg-success text-white p-2">🚀 Active Orders: {activeCount}</h6>
            {orders
              .filter(o => !["Waiting", "Ready", "Complete"].includes(o.current_status))
              .map(renderActiveCard)}
              </div>
             </div>
        </div>
      </div>

{/* Order Details Modal */}
      {selectedOrder && (
  <div className="modal d-block" tabIndex="-1" onClick={() => setSelectedOrder(null)}>
    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <div className={`modal-content ${getModalCategoryClass(selectedOrder.category)}`}>
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
          {/*  <p><strong>ETA:</strong> {calculateETA(selectedOrder)}</p>*/}
        </div>
      </div>
    </div>
  </div>
)}
      {pendingColourUpdate && (



   <ColourCodeModal
      onSubmit={({ colourCode, employeeCode }) => {
        console.log("✅ updateStatus called from modal", colourCode, employeeCode); 
        console.log("Updating order with:", {
          id: pendingColourUpdate.orderId,
          newStatus: pendingColourUpdate.newStatus,
          colourCode,
          employeeCode
    });

    const fullOrder = orders.find(
      o => o.transaction_id === pendingColourUpdate.orderId
        );

    updateStatus(
        fullOrder,
        pendingColourUpdate.newStatus,
        colourCode,
        employeeCode
      );

    setPendingColourUpdate(null);
  }}
  onCancel={() => setPendingColourUpdate(null)}
/>

)}
    </div>
  );
};

export default CardView;
