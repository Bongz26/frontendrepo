
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./styles/queueStyles.css";
import "./styles/queueSortStyles.css";
import LoginPopup from "./LoginPopup";
import ColourCodeModal from "./ColourCodeModal";

const BASE_URL = process.env.REACT_APP_API_URL || "https://queue-backendser.onrender.com";

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
  const updateStatus = async (orderId, newStatus, colourCode, currentEmp) => {
    let employeeName = currentEmp || "Unassigned";
    let updatedColourCode = colourCode;

    if (["Re-Mixing", "Mixing", "Spraying"].includes(newStatus)|| (newStatus === "Ready" && order.category !== "New Mix")) {
      const employeeCode = prompt("🔍 Enter Employee Code:");
      if (!employeeCode) return alert("❌ Employee Code required!");

      try {
        const res = await axios.get(`${BASE_URL}/api/employees?code=${employeeCode}`);
        if (!res.data?.employee_name) return alert("❌ Invalid code!");
        employeeName = res.data.employee_name;
      } catch {
        return alert("❌ Unable to verify employee!");
      }
    }

    if (newStatus === "Ready" && (!updatedColourCode || updatedColourCode.trim() === "" || updatedColourCode === "Pending")) {
      setPendingColourUpdate({ orderId, newStatus, employeeName });
      return;
    }

    try {
      await axios.put(`${BASE_URL}/api/orders/${orderId}`, {
        current_status: newStatus,
        assigned_employee: employeeName,
        colour_code: updatedColourCode,
        userRole
      });

      setRecentlyUpdatedId(orderId);
      setTimeout(() => setRecentlyUpdatedId(null), 2000);
      setTimeout(fetchOrders, 500);
    } catch (err) {
      alert("❌ Error updating status!");
      console.error(err);
    }
  };

    const calculateETA = (order) => {
    const waitingOrders = orders.filter(o => o.current_status === "Waiting");
    const position = waitingOrders.findIndex(o => o.transaction_id === order.transaction_id) + 1;
    const base = order.category === "New Mix" ? 160 : order.category === "Colour Code" ? 90 : 45;
    return `${position * base} minutes`;
  };

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
        <small className="text-muted">ETA: {calculateETA(order)}</small><br />
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
        <span className="badge bg-secondary mb-1">{order.current_status}</span><br />
        <small>👨‍🔧 {order.assigned_employee || "Unassigned"}</small><br />
        <select
          className="form-select form-select-sm mt-1"
          style={{ minWidth: "130px" }}
          onClick={(e) => e.stopPropagation()}
          value={order.current_status}
          onChange={(e) =>
            updateStatus(
              order.transaction_id,
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
                {orders.filter(o => o.current_status === "Waiting")
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
          onSubmit={(code) => {
            updateStatus(
              pendingColourUpdate.orderId,
              pendingColourUpdate.newStatus,
              code,
              pendingColourUpdate.employeeName
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
