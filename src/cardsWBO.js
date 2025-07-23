// Updated CardView with Admin Backoffice Features
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
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;

      let parts = [];
      if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
      if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
      if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);

      setDisplayTime(parts.join(" "));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [statusStartedAt, fallbackTime]);

  return <span>⏱ {displayTime}</span>;
}

const CardViewBO = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("User");
  const [showLogin, setShowLogin] = useState(false);
  const [pendingColourUpdate, setPendingColourUpdate] = useState(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [newStaff, setNewStaff] = useState({ name: "", code: "", role: "User" });

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

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/employees`);
      setStaffList(res.data || []);
    } catch (err) {
      console.error("Error fetching staff");
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (userRole === "Admin") fetchStaff();
  }, [userRole]);

  const cancelOrder = async (orderId, reason = "") => {
    try {
      await axios.put(`${BASE_URL}/api/orders/${orderId}`, {
        current_status: "Cancelled",
        cancel_reason: reason,
        userRole,
      });

      await logAuditTrail({
        transaction_id: orderId,
        fromStatus: "Any",
        toStatus: "Cancelled",
        employee: "Admin",
        userRole,
        reason,
      });

      alert("Order cancelled.");
      fetchOrders();
    } catch (err) {
      console.error("❌ Failed to cancel order:", err);
      alert("Error cancelling order.");
    }
  };

  const addStaff = async () => {
    await axios.post(`${BASE_URL}/api/employees`, newStaff);
    setNewStaff({ name: "", code: "", role: "User" });
    fetchStaff();
  };

  const removeStaff = async (code) => {
    if (!window.confirm("Remove this staff member?")) return;
    await axios.delete(`${BASE_URL}/api/employees/${code}`);
    fetchStaff();
  };

  const logAuditTrail = async (logData) => {
    try {
      await axios.post(`${BASE_URL}/api/audit-logs`, logData);
    } catch (err) {
      console.warn("⚠️ Failed to log audit:", err.message);
    }
  };
const updateStatus = async (order, newStatus, colourCode, currentEmp) => {
  const category = order.category;
  const fromStatus = order.current_status;
  const toStatus = newStatus;
  let updatedColourCode = colourCode;
  let employeeName = "Unassigned";

  // Rules
  const isFromWaitingToMixing =
    fromStatus === "Waiting" &&
    toStatus === "Mixing" &&
    ["New Mix", "Mix More", "Colour Code"].includes(category);

  const isMixingToSpraying = fromStatus === "Mixing" && toStatus === "Spraying";
  const isSprayingToRemix = fromStatus === "Spraying" && toStatus === "Re-Mixing";
  const isRemixToSpraying = fromStatus === "Re-Mixing" && toStatus === "Spraying";
  const isSprayingToReadyNewMix =
    fromStatus === "Spraying" &&
    toStatus === "Ready" &&
    category === "New Mix";
  const isSprayingToReadyOthers =
    fromStatus === "Spraying" &&
    toStatus === "Ready" &&
    ["Mix More", "Colour Code"].includes(category);

  const shouldPromptEmp =
    isFromWaitingToMixing ||
    isMixingToSpraying ||
    isSprayingToRemix ||
    isRemixToSpraying ||
    isSprayingToReadyOthers;

  // If it's Ready (New Mix), and colour code is still missing — show modal
  if (isSprayingToReadyNewMix && (!colourCode || colourCode === "Pending")) {
    setPendingColourUpdate({
      orderId: order.transaction_id,
      newStatus: toStatus,
      employeeName: currentEmp,
    });
    return;
  }

  // Always prompt if employee verification is needed
  if (shouldPromptEmp) {
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
    // Use existing employee assignment
    employeeName = order.assigned_employee || "Unassigned";
  }

  // Update backend
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
      {/* Queue System Header */}
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

          {/* Waiting and Active Orders */}
          <div className="row">
            <div className="col-md-4">
              <h6 className="bg-primary text-white p-2">⏳ Waiting Orders: {waitingCount}</h6>
              {orders.filter(o => o.current_status === "Waiting" && !o.archived).map(renderWaitingCard)}
            </div>
            <div className="col-md-8">
              <h6 className="bg-success text-white p-2">🚀 Active Orders: {activeCount}</h6>
              {orders.filter(o => !["Waiting", "Ready", "Complete"].includes(o.current_status)).map(renderActiveCard)}
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Colour Code Modal */}
      {pendingColourUpdate && (
        <ColourCodeModal
          onSubmit={({ colourCode, employeeCode }) => {
            const fullOrder = orders.find(o => o.transaction_id === pendingColourUpdate.orderId);
            updateStatus(fullOrder, pendingColourUpdate.newStatus, colourCode, employeeCode);
            setPendingColourUpdate(null);
          }}
          onCancel={() => setPendingColourUpdate(null)}
        />
      )}

      {/* Staff Manager */}
      {userRole === "Admin" && (
        <div className="card mt-4">
          <div className="card-header bg-info text-white">👥 Staff Manager</div>
          <div className="card-body">
            <table className="table table-sm">
              <thead><tr><th>Name</th><th>Code</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {staffList.map(emp => (
                  <tr key={emp.code}>
                    <td>{emp.employee_name}</td>
                    <td>{emp.code}</td>
                    <td>{emp.role}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeStaff(emp.code)}
                      >🗑 Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardViewBO;
