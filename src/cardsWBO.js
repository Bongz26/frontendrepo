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
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState(null);
  const [showArchivedOrders, setShowArchivedOrders] = useState(false);
  const [showDeletedOrders, setShowDeletedOrders] = useState(false);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [deletedOrders, setDeletedOrders] = useState([]);
  const [newStaff, setNewStaff] = useState({ employee_name: "", code: "", role: "" });
  const [orderNote, setOrderNote] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/orders`);
      setOrders(response.data.filter(order => !order.archived && !order.deleted));
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("Failed to load orders.");
      setLoading(false);
    }
  }, []);

  const fetchArchivedOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/orders/archived`);
      setArchivedOrders(response.data);
    } catch (err) {
      console.error("Failed to fetch archived orders:", err);
      setError("Failed to load archived orders.");
    }
  }, []);

  const fetchDeletedOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/orders/deleted`);
      setDeletedOrders(response.data);
    } catch (err) {
      console.error("Failed to fetch deleted orders:", err);
      setError("Failed to load deleted orders.");
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/staff`);
      setStaffList(response.data);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      setError("Failed to load staff list.");
    }
  }, []);

  const addStaff = async () => {
    try {
      await axios.post(`${BASE_URL}/api/staff`, newStaff);
      setNewStaff({ employee_name: "", code: "", role: "" });
      setShowAddStaff(false);
      fetchStaff();
    } catch (err) {
      console.error("Failed to add staff:", err);
      setError("Failed to add staff.");
    }
  };

  const editStaff = async (code) => {
    try {
      await axios.put(`${BASE_URL}/api/staff/${code}`, showEditStaff);
      setShowEditStaff(null);
      fetchStaff();
    } catch (err) {
      console.error("Failed to edit staff:", err);
      setError("Failed to edit staff.");
    }
  };

  const removeStaff = async (code) => {
    try {
      await axios.delete(`${BASE_URL}/api/staff/${code}`);
      setStaffList(staffList.filter(emp => emp.code !== code));
    } catch (err) {
      console.error("Failed to revoke staff:", err);
      setError("Failed to revoke staff.");
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await axios.delete(`${BASE_URL}/api/orders/${orderId}`);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      console.error("Failed to delete order:", err);
      setError("Failed to delete order.");
    }
  };

  const updateStatus = async (order, newStatus, colourCode = null, employeeCode = null, note = null) => {
    try {
      await axios.put(`${BASE_URL}/api/orders/${order.transaction_id}/status`, {
        status: newStatus,
        colour_code: colourCode,
        employee_code: employeeCode,
        note
      });
      fetchOrders();
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("Failed to update status.");
    }
  };

  const handleLogin = () => {
    setShowLogin(true);
  };

  const waitingCount = orders.filter(o => o.current_status === "Waiting").length;
  const activeCount = orders.filter(o => !["Waiting", "Ready", "Complete"].includes(o.current_status)).length;

  useEffect(() => {
    fetchOrders();
    fetchStaff();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchStaff]);

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

  const renderArchivedCard = (order) => (
    <div key={order.transaction_id} className="card mb-2 shadow-sm">
      <div className="card-body">
        <h6>{order.customer_name} - {order.paint_type}</h6>
        <p className="mb-0">Qty: {order.paint_quantity} | Category: {order.category}</p>
        <small>Status: Archived</small>
      </div>
    </div>
  );

  const renderDeletedCard = (order) => (
    <div key={order.transaction_id} className="card mb-2 shadow-sm">
      <div className="card-body">
        <h6>{order.customer_name} - {order.paint_type}</h6>
        <p className="mb-0">Qty: {order.paint_quantity} | Category: {order.category}</p>
        <small>Status: Deleted</small>
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
          {userRole === "Admin" && (
            <div className="mb-3">
              <button
                className="btn btn-outline-info me-2"
                onClick={() => {
                  setShowArchivedOrders(!showArchivedOrders);
                  if (!showArchivedOrders) fetchArchivedOrders();
                }}
              >
                {showArchivedOrders ? "Hide Archived Orders" : "Show Archived Orders"}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  setShowDeletedOrders(!showDeletedOrders);
                  if (!showDeletedOrders) fetchDeletedOrders();
                }}
              >
                {showDeletedOrders ? "Hide Deleted Orders" : "Show Deleted Orders"}
              </button>
            </div>
          )}
          {/* Waiting and Active Orders */}
          <div className="row">
            <div className="col-md-4">
              <h6 className="bg-primary text-white p-2">⏳ Waiting Orders: {waitingCount}</h6>
              {orders.filter(o => o.current_status === "Waiting").map(renderWaitingCard)}
            </div>
            <div className="col-md-8">
              <h6 className="bg-success text-white p-2">🚀 Active Orders: {activeCount}</h6>
              {orders.filter(o => !["Waiting", "Ready", "Complete"].includes(o.current_status)).map(renderActiveCard)}
            </div>
          </div>
          {/* Archived Orders */}
          {showArchivedOrders && userRole === "Admin" && (
            <div className="mt-4">
              <h6 className="bg-warning text-white p-2">📁 Archived Orders</h6>
              {archivedOrders.map(renderArchivedCard)}
            </div>
          )}
          {/* Deleted Orders */}
          {showDeletedOrders && userRole === "Admin" && (
            <div className="mt-4">
              <h6 className="bg-danger text-white p-2">🗑 Deleted Orders</h6>
              {deletedOrders.map(renderDeletedCard)}
            </div>
          )}
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
                <p><strong>Note:</strong> {selectedOrder.note || "No note"}</p>
                {userRole === "Admin" && (
                  <div>
                    <textarea
                      className="form-control mb-2"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="Add or edit note"
                    />
                    <button
                      className="btn btn-primary me-2"
                      onClick={() => updateStatus(selectedOrder, selectedOrder.current_status, selectedOrder.colour_code, selectedOrder.assigned_employee, orderNote)}
                    >
                      Save Note
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteOrder(selectedOrder.transaction_id)}
                    >
                      Delete Order
                    </button>
                  </div>
                )}
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
            updateStatus(fullOrder, pendingColourUpdate.newStatus, colourCode, employeeCode, orderNote);
            setPendingColourUpdate(null);
          }}
          onCancel={() => setPendingColourUpdate(null)}
        />
      )}
      {/* Staff Manager */}
      {userRole === "Admin" && (
        <div className="card mt-4">
          <div className="card-header bg-info text-white">
            👥 Staff Manager
            <button
              className="btn btn-light btn-sm ms-2"
              onClick={() => setShowAddStaff(!showAddStaff)}
            >
              {showAddStaff ? "Cancel" : "Add Staff"}
            </button>
          </div>
          <div className="card-body">
            {showAddStaff && (
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Employee Name"
                  value={newStaff.employee_name}
                  onChange={(e) => setNewStaff({ ...newStaff, employee_name: e.target.value })}
                />
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Employee Code"
                  value={newStaff.code}
                  onChange={(e) => setNewStaff({ ...newStaff, code: e.target.value })}
                />
                <select
                  className="form-control mb-2"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                </select>
                <button className="btn btn-primary" onClick={addStaff}>Add Staff</button>
              </div>
            )}
            {showEditStaff && (
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Employee Name"
                  value={showEditStaff.employee_name}
                  onChange={(e) => setShowEditStaff({ ...showEditStaff, employee_name: e.target.value })}
                />
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Employee Code"
                  value={showEditStaff.code}
                  disabled
                />
                <select
                  className="form-control mb-2"
                  value={showEditStaff.role}
                  onChange={(e) => setShowEditStaff({ ...showEditStaff, role: e.target.value })}
                >
                  <option value="">Select Role</option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                </select>
                <button className="btn btn-primary me-2" onClick={() => editStaff(showEditStaff.code)}>
                  Save
                </button>
                <button className="btn btn-secondary" onClick={() => setShowEditStaff(null)}>
                  Cancel
                </button>
              </div>
            )}
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(emp => (
                  <tr key={emp.code}>
                    <td>{emp.employee_name}</td>
                    <td>{emp.code}</td>
                    <td>{emp.role}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => setShowEditStaff(emp)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeStaff(emp.code)}
                      >
                        🗑 Revoke
                      </button>
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
