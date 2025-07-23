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

const CardView = () => {
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

  // Existing logic continues here (renderWaitingCard, renderActiveCard, updateStatus, etc)
  // You can append the rest of your large component logic here without changes.

  return (
    <div className="container mt-4">
      {/* Existing UI content remains unchanged */}

      {/* Staff Manager for Admins */}
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
                      <button className="btn btn-sm btn-danger" onClick={() => removeStaff(emp.code)}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h6 className="mt-3">➕ Add New Staff</h6>
            <input className="form-control mb-1" placeholder="Name" value={newStaff.name}
                   onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
            <input className="form-control mb-1" placeholder="Code" value={newStaff.code}
                   onChange={(e) => setNewStaff({ ...newStaff, code: e.target.value })} />
            <select className="form-select mb-2" value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
            <button className="btn btn-primary" onClick={addStaff}>Add Staff</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardView;
