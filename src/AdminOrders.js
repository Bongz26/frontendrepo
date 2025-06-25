import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://queue-backendser.onrender.com";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  useEffect(() => {
    axios.get(`${BASE_URL}/api/orders`)
      .then((res) => {
        setOrders(res.data);
        setFilteredOrders(res.data);
      })
      .catch(() => triggerToast("❌ Could not fetch orders", "danger"));
  }, []);

  useEffect(() => {
    const results = orders.filter(order =>
      order.transaction_id.includes(searchTerm) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.assigned_employee?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOrders(results);
  }, [searchTerm, orders]);

  return (
    <div className="container mt-4">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">📋 Admin Orders</h5>
        </div>
        <div className="card-body">
          {/* Search Bar */}
          <div className="mb-4">
            <label className="form-label">🔎 Search Orders</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Transaction ID, Customer Name, or Employee"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <ul className="list-group mt-2">
              {filteredOrders.map((order) => (
                <li key={order.transaction_id} className="list-group-item d-flex justify-content-between">
                  <div>
                    <strong>{order.transaction_id}</strong><br />
                    {order.customer_name} — {order.current_status}<br />
                    <small className="text-muted">Car: {order.paint_type}</small><br />
                    <small className="text-muted">👨‍🔧 Assigned: {order.assigned_employee || "Not Assigned"}</small><br />
                    <small className="text-muted">💰 Amount: R{order.amount || "0.00"}</small><br />
                    <small className="text-muted">📂 Category: {order.category}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No orders found.</p>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3">
        <Toast bg={toastType} onClose={() => setShowToast(false)} show={showToast} delay={3500} autohide>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default AdminOrders;
