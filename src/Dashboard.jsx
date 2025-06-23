import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./styles/queueStyles.css";
import "./styles/queueSortStyles.css";
import LoginPopup from "./LoginPopup";
import ColourCodeModal from "./ColourCodeModal";

const BASE_URL = process.env.REACT_APP_API_URL || "https://queue-backendser.onrender.com";

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("User");
  const [showLogin, setShowLogin] = useState(false);
  const [pendingColourUpdate, setPendingColourUpdate] = useState(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);

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

  const renderOrderCard = (order) => (
    <div key={order.transaction_id} className={`card mb-3 shadow-sm ${recentlyUpdatedId === order.transaction_id ? "flash-row" : ""}`}>
      <div className="card-header d-flex justify-content-between align-items-center bg-secondary text-white">
        <span>🆔 {order.transaction_id}</span>
        <span>{order.category}</span>
      </div>
      <div className="card-body row">
        <div className="col-md-6">
          <p><strong>Customer:</strong> {order.customer_name}</p>
          <p><strong>Car Details.:</strong> {order.paint_type}</p>
          
        </div>
        <div className="col-md-6">
          <p><strong>Quantity:</strong> {order.paint_quantity}</p>
          <p><strong>Colour Code:</strong> {order.colour_code}</p>
        </div>
        <div className="col-12">
          <label className="form-label">Update Status</label>
          <select
            className="form-select"
            value={order.current_status}
            onChange={(e) =>
              updateStatus(order.transaction_id, e.target.value, order.colour_code, order.assigned_employee)
            }
          >
            <option value={order.current_status}>{order.current_status}</option>
            {order.current_status === "Waiting" && <option value="Mixing">Mixing</option>}
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
          <h5 className="mb-0">🎨 Queue Dashboard</h5>
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
                {orders.filter(o => o.current_status === "Waiting").map(renderOrderCard)}
            </div>        

            {/* Active Orders (Table View) */}
            <div className="col-md-8">  {/* Wider area for Active Orders Table */}
            <h6 className="bg-success text-white p-2">🚀 Active Orders</h6>
            <div className="table-responsive">
                <table className="table table-bordered table-hover table-sm">
                  <thead className="table-dark">
                    <tr>
                      <th>Transaction ID</th>
                      <th>Category</th>
                      <th>Col. Code</th>
                      <th>Car Details</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Customer</th>
                      <th>Order Type</th>
                      <th>Assigned To</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o =>
                      !["Waiting", "Ready", "Complete"].includes(o.current_status)
                    ).map(order => (
                      <tr key={order.transaction_id} className={recentlyUpdatedId === order.transaction_id ? "flash-row" : ""}>
                        <td>{order.transaction_id}</td>
                        <td>{order.category}</td>
                        <td>{order.colour_code}</td>
                        <td>{order.paint_type}</td>
                        <td>{order.paint_quantity}</td>
                        <td>{order.current_status}</td>
                        <td>{order.customer_name}</td>
                        <td>{order.order_type}</td>
                        <td>{order.assigned_employee || "Unassigned"}</td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={order.current_status}
                            onChange={(e) =>
                              updateStatus(order.transaction_id, e.target.value, order.colour_code, order.assigned_employee)
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

export default Dashboard;
