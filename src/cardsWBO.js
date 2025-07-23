// Updated CardView with Admin Backoffice Features
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./styles/queueStyles.css";
import "./styles/queueSortStyles.css";
import LoginPopup from "./LoginPopup";
import ColourCodeModal from "./ColourCodeModal";

const BASE_URL = process.env.REACT_APP_API_URL || "https://queue-backendser.onrender.com";

const CardViewBO = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingColourUpdate, setPendingColourUpdate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [staffList, setStaffList] = useState([]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/orders`);
      setOrders(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("Failed to load orders.");
      setLoading(false);
    }
  }, []);

  const removeStaff = async (code) => {
    try {
      await axios.delete(`${BASE_URL}/staff/${code}`);
      setStaffList(staffList.filter(emp => emp.code !== code));
    } catch (err) {
      console.error("Failed to revoke staff:", err);
    }
  };

  const updateStatus = async (order, newStatus, colourCode = null, employeeCode = null) => {
    try {
      await axios.put(`${BASE_URL}/api/orders/${order.transaction_id}/status`, {
        status: newStatus,
        colour_code: colourCode,
        employee_code: employeeCode
      });
      fetchOrders();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleLogin = () => {
    setShowLogin(true);
  };

  const waitingCount = orders.filter(o => o.current_status === "Waiting" && !o.archived).length;
  const activeCount = orders.filter(o => !["Waiting", "Ready", "Complete"].includes(o.current_status)).length;

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const getModalCategoryClass = (category) => {
    switch ((category || "").toLowerCase()) {
      case "new mix":
        return "modal-border-newmix";
      case "mix more":
        return "modal-border-mixmore";
      case "colour code":
        return "modal-border-colour";
      default:
        return "modal-border-default";
    }
  };

  const renderWaitingCard = (order) => (
    <div key={order.transaction_id} className="card mb-2 shadow-sm" onClick={() => setSelectedOrder(order)}>
      <div className="card-body">
        <h6>{order.customer_name} - {order.paint_type}</h6>
        <p className="mb-0">Qty: {order.paint_quantity} | Category: {order.category}</p>
      </div>
    </div>
  );

  const renderActiveCard = (order) => (
    <div key={order.transaction_id} className="card mb-2 shadow-sm" onClick={() => setSelectedOrder(order)}>
      <div className="card-body">
        <h6>{order.customer_name} - {order.paint_type}</h6>
        <p className="mb-0">Qty: {order.paint_quantity} | Category: {order.category}</p>
        <small>Status: {order.current_status}</small>
      </div>
    </div>
  );

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
