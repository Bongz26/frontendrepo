
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
  }, [fetchOrders]);

  const updateStatus = async (orderId, newStatus, colourCode, currentEmp) => {
    let employeeName = currentEmp || "Unassigned";
    let updatedColourCode = colourCode;

    if (["Re-Mixing", "Mixing", "Spraying", "Ready"].includes(newStatus)) {
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
        <span className="text-muted">{order.category}</span>
        <br />
        <span>{order.customer_name}</span>{" "}
        <small className="text-muted">({order.client_contact})</small>
      </div>
      <div className="text-end">
        <small className="text-muted">ETA: {calculateETA(order)}</small>
        <br />
        <select
          className="form-select form-select-sm mt-1"
          style={{ minWidth: "120px" }}
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
    className={`card mb-3 shadow-sm ${
      recentlyUpdatedId === order.transaction_id ? "flash-row" : ""
    }`}
  >
    <div className="card-header d-flex justify-content-between align-items-center bg-secondary text-white">
      <span>🆔 {order.transaction_id}</span>
      <span>{order.category}</span>
    </div>
    <div className="card-body row">
      <div className="col-md-6">
        <p><strong>Customer:</strong> {order.customer_name}</p>
        <p><strong>Vehicle:</strong> {order.paint_type}</p>
        <p><strong>Quantity:</strong> {order.paint_quantity}</p>
      </div>
      <div className="col-md-6">
        <p><strong>Status:</strong> {order.current_status}</p>
        <p><strong>Assigned:</strong> {order.assigned_employee || "Unassigned"}</p>
        <p><strong>Col. Code:</strong> {order.colour_code}</p>
      </div>
      <div className="col-12">
        <label className="form-label">Update Status</label>
        <select
          className="form-select"
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


  return (
    <div className="container mt-4">
      <div className="card mb-3 shadow-sm border-0">
        <div className="card-header bg-dark text-white d-flex justify-content-between">
          <h5 className="mb-0">🎨 Paints Form View</h5>
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
                <h6 className="bg-primary text-white p-2">⏳ Waiting Orders</h6>
                {orders.filter(o => o.current_status === "Waiting")
                        .map(renderWaitingCard)}
          </div>

            {/* Active Orders (Table View) */}
              <div className="col-md-8">
            <h6 className="bg-success text-white p-2">🚀 Active Orders: {activeCount}</h6>
            {orders
              .filter(o => !["Waiting", "Ready", "Complete"].includes(o.current_status))
              .map(renderActiveCard)}
              </div>
             </div>
        </div>
      </div>

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
