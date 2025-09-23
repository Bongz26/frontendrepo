import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./styles/queueStyles.css";
import "./styles/queueSortStyles.css";
import LoginPopup from "./LoginPopup";

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

const ReportModal = ({ onClose, reportData, fetchReportData }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const handleFilterSubmit = () => {
    fetchReportData(startDate, endDate, selectedStatus);
  };

  return (
    <div className="modal d-block" tabIndex="-1" onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header bg-purple text-white">
            <h5 className="modal-title">📊 Order Report</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label>Start Date:</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <label className="mt-2">End Date:</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <label className="mt-2">Status:</label>
              <select
                className="form-control"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Waiting">Waiting</option>
                <option value="Mixing">Mixing</option>
                <option value="Spraying">Spraying</option>
                <option value="Re-Mixing">Re-Mixing</option>
                <option value="Ready">Ready</option>
                <option value="Complete">Complete</option>
              </select>
              <button className="btn btn-primary mt-3" onClick={handleFilterSubmit}>
                Apply Filters
              </button>
            </div>
            {reportData ? (
              <>
                <h6>Order Status Summary</h6>
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData.statusSummary).map(([status, count]) => (
                      <tr key={status}>
                        <td>{status}</td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h6 className="mt-3">Order Category Summary</h6>
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData.categorySummary).map(([category, count]) => (
                      <tr key={category}>
                        <td>{category}</td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h6 className="mt-3">Order History Summary</h6>
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData.historySummary).map(([action, count]) => (
                      <tr key={action}>
                        <td>{action}</td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p>No report data available.</p>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardR = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("User");
  const [showLogin, setShowLogin] = useState(false);
  const [pendingColourUpdate, setPendingColourUpdate] = useState(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState(null);
  const [showArchivedOrders, setShowArchivedOrders] = useState(false);
  const [showDeletedOrders, setShowDeletedOrders] = useState(false);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [deletedOrders, setDeletedOrders] = useState([]);
  const [newStaff, setNewStaff] = useState({ employee_name: "", code: "", role: "" });
  const [orderNote, setOrderNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [colourCodeInput, setColourCodeInput] = useState("");
  const [employeeCodeInput, setEmployeeCodeInput] = useState("");
  const [colourCodeError, setColourCodeError] = useState("");

  const handleLogin = () => setShowLogin(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Fetching orders from /api/orders");
      const response = await axios.get(`${BASE_URL}/api/orders`);
      setOrders(response.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Error fetching orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      console.log("Fetching staff from /api/staff");
      const response = await axios.get(`${BASE_URL}/api/staff`);
      setStaffList(response.data);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setError("Error fetching staff list.");
    }
  }, []);

  const fetchArchivedOrders = useCallback(async () => {
    try {
      console.log("Fetching archived orders from /api/orders/archived");
      const response = await axios.get(`${BASE_URL}/api/orders/archived`);
      setArchivedOrders(response.data);
    } catch (err) {
      console.error("Error fetching archived orders:", err);
      setError("Error fetching archived orders.");
    }
  }, []);

  const fetchDeletedOrders = useCallback(async () => {
    try {
      console.log("Fetching deleted orders from /api/orders/deleted");
      const response = await axios.get(`${BASE_URL}/api/orders/deleted`);
      setDeletedOrders(response.data);
    } catch (err) {
      console.error("Error fetching deleted orders:", err);
      setError("Error fetching deleted orders.");
    }
  }, []);

  const fetchReportData = useCallback(async (startDate = "", endDate = "", status = "All") => {
    try {
      console.log("Fetching report data from /api/orders/report");
      const response = await axios.get(`${BASE_URL}/api/orders/report`, {
        params: { start_date: startDate, end_date: endDate, status: status === "All" ? "" : status },
      });
      setReportData(response.data);
      setShowReportModal(true);
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError("Error fetching report data.");
    }
  }, []);

  const addStaff = async () => {
    try {
      await axios.post(`${BASE_URL}/api/staff`, newStaff);
      setNewStaff({ employee_name: "", code: "", role: "" });
      setShowAddStaff(false);
      fetchStaff();
    } catch (err) {
      console.error("Error adding staff:", err);
      setError("Error adding staff.");
    }
  };

  const editStaff = async (code) => {
    try {
      await axios.put(`${BASE_URL}/api/staff/${code}`, showEditStaff);
      setShowEditStaff(null);
      fetchStaff();
    } catch (err) {
      console.error("Error editing staff:", err);
      setError("Error editing staff.");
    }
  };

  const removeStaff = async (code) => {
    try {
      await axios.delete(`${BASE_URL}/api/staff/${code}`);
      setStaffList(staffList.filter(emp => emp.code !== code));
    } catch (err) {
      console.error("Error removing staff:", err);
      setError("Error removing staff.");
    }
  };

  const cancelOrder = async (orderId) => {
    if (userRole !== "Admin") {
      alert("❌ Only Admins can cancel orders!");
      return;
    }

    if (!cancelReason || cancelReason.trim() === "") {
      alert("❌ A reason is required to cancel an order!");
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/api/orders/${orderId}`, {
        data: { userRole, note: cancelReason }
      });
      fetchOrders();
      fetchDeletedOrders();
      setSelectedOrder(null);
      setShowCancelConfirm(null);
      setCancelReason("");
      alert("✅ Order cancelled successfully!");
    } catch (err) {
      console.error("Error cancelling order:", err);
      setError(err.response?.data?.error || "Error cancelling order.");
      alert(err.response?.data?.error || "Error cancelling order!");
    }
  };

  const updateNote = async (order) => {
    try {
      await axios.put(`${BASE_URL}/api/orders/${order.transaction_id}`, {
        current_status: order.current_status,
        assigned_employee: order.assigned_employee || null,
        colour_code: order.colour_code || "Pending",
        note: orderNote || null,
        userRole,
        old_status: order.current_status
      });
      setOrderNote("");
      setSelectedOrder(null);
      fetchOrders();
      alert("✅ Note updated successfully!");
    } catch (err) {
      console.error("Error updating note:", err);
      setError(err.response?.data?.error || "Error updating note.");
      alert(err.response?.data?.error || "Error updating note!");
    }
  };

  const updateStatus = async (order, newStatus, colourCode, currentEmp) => {
    const category = order.category;
    const fromStatus = order.current_status;
    const toStatus = newStatus;
    let updatedColourCode = colourCode;
    let employeeName = currentEmp || "Unassigned";

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

    if (isSprayingToReadyNewMix && (!colourCode || colourCode === "Pending")) {
      setPendingColourUpdate({
        orderId: order.transaction_id,
        newStatus: toStatus,
      });
      return;
    }

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
    }

    try {
      await axios.put(`${BASE_URL}/api/orders/${order.transaction_id}`, {
        current_status: toStatus,
        assigned_employee: employeeName,
        colour_code: updatedColourCode || "Pending",
        note: orderNote || order.note,
        userRole,
        old_status: fromStatus,
      });
      setRecentlyUpdatedId(order.transaction_id);
      setTimeout(() => setRecentlyUpdatedId(null), 2000);
      setTimeout(fetchOrders, 500);
      setOrderNote("");
    } catch (err) {
      console.error("Error updating status:", err);
      alert("❌ Error updating status!");
    }
  };

  const handleColourCodeSubmit = async () => {
    if (!colourCodeInput || colourCodeInput.trim() === "") {
      setColourCodeError("Colour Code is required!");
      return;
    }
    if (!employeeCodeInput || employeeCodeInput.trim() === "") {
      setColourCodeError("Employee Code is required!");
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/employees?code=${employeeCodeInput}`);
      if (!res.data?.employee_name) {
        setColourCodeError("Invalid Employee Code!");
        return;
      }
      const employeeName = res.data.employee_name;
      const fullOrder = orders.find(o => o.transaction_id === pendingColourUpdate.orderId);
      await updateStatus(
        fullOrder,
        pendingColourUpdate.newStatus,
        colourCodeInput,
        employeeName
      );
      setColourCodeInput("");
      setEmployeeCodeInput("");
      setColourCodeError("");
      setPendingColourUpdate(null);
    } catch (err) {
      console.error("Error validating employee code:", err);
      setColourCodeError("Unable to verify employee code!");
    }
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
          <small className="text-muted">
            <ElapsedTime
              statusStartedAt={order.status_started_at}
              fallbackTime={order.start_time}
            />{" "}
            in {order.current_status}
          </small>
          <br />
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
            {order.current_status === "Waiting" && <option value="Mixing">Mixing</option>}
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
      } ${getCategoryClass(order.current_status)}`}
      style={{ fontSize: "0.85rem", lineHeight: "1.4", cursor: "pointer" }}
      onClick={() => setSelectedOrder(order)}
    >
      <div className="d-flex justify-content-between">
        <div>
          <strong>🆔 {order.transaction_id}</strong> •{" "}
          <span className="text-muted">{order.category}</span>
          <br />
          {order.customer_name}{" "}
          <small className="text-muted">({order.client_contact})</small>
          <br />
          🎨 <span className="text-muted">{order.paint_type}</span> —{" "}
          {order.paint_quantity}
          <br />
          <small className="text-muted">Col Code: {order.colour_code || "N/A"}</small>
          <br />
          <small className="text-muted">Note: {order.note || "No note"}</small>
        </div>
        <div className="text-end">
          <small className="text-muted">
            <ElapsedTime
              statusStartedAt={order.status_started_at}
              fallbackTime={order.start_time}
            />{" "}
            in {order.current_status}
          </small>
          <br />
          <span
            className={`badge ${
              order.current_status === "Mixing" ? "bg-info" :
              order.current_status === "Spraying" ? "bg-success" :
              order.current_status === "Re-Mixing" ? "bg-warning" :
              "bg-secondary"
            } mb-1`}
          >
            {order.current_status}
          </span>
          <br />
          <small>👨‍🔧 {order.assigned_employee || "Unassigned"}</small>
          <br />
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
            {order.current_status === "Re-Mixing" && (
              <option value="Spraying">Spraying</option>
            )}
            {order.current_status === "Ready" && userRole === "Admin" && (
              <option value="Complete">Complete</option>
            )}
          </select>
        </div>
      </div>
    </div>
  );

  const renderUnifiedOrderCard = (order) => (
    <div
      key={order.transaction_id}
      className={`card mb-2 px-3 py-2 shadow-sm border-0 ${
        recentlyUpdatedId === order.transaction_id ? "flash-row" : ""
      } ${getCategoryClass(order.current_status)}`}
      style={{ fontSize: "0.85rem", lineHeight: "1.4", cursor: "pointer" }}
      onClick={() => setSelectedOrder(order)}
    >
      <div className="d-flex justify-content-between">
        <div>
          <strong>🆔 {order.transaction_id}</strong> •{" "}
          <span className="text-muted">{order.category}</span>
          <br />
          <span>{order.customer_name}</span>{" "}
          <small className="text-muted">({order.client_contact})</small>
          <br />
          <small className="text-muted">Col Code: {order.colour_code || "N/A"}</small>
          <br />
          <small className="text-muted">Note: {order.note || "No note"}</small>
        </div>
        <div className="text-end">
          <small className="text-muted">
            <ElapsedTime
              statusStartedAt={order.status_started_at}
              fallbackTime={order.start_time}
            />{" "}
            in {order.current_status}
          </small>
          <br />
          <span
            className={`badge ${
              order.current_status === "Waiting" ? "bg-primary" :
              order.current_status === "Mixing" ? "bg-info" :
              order.current_status === "Spraying" ? "bg-success" :
              order.current_status === "Re-Mixing" ? "bg-warning" :
              "bg-secondary"
            } mb-1`}
          >
            {order.current_status}
          </span>
          <br />
          <small>👨‍🔧 {order.assigned_employee || "Unassigned"}</small>
          <br />
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
            {order.current_status === "Waiting" && <option value="Mixing">Mixing</option>}
            {order.current_status === "Mixing" && <option value="Spraying">Spraying</option>}
            {order.current_status === "Spraying" && (
              <>
                <option value="Re-Mixing">Back to Mixing</option>
                <option value="Ready">Ready</option>
              </>
            )}
            {order.current_status === "Re-Mixing" && (
              <option value="Spraying">Spraying</option>
            )}
            {order.current_status === "Ready" && userRole === "Admin" && (
              <option value="Complete">Complete</option>
            )}
          </select>
        </div>
      </div>
    </div>
  );

  const renderArchivedCard = (order) => (
    <div
      key={order.transaction_id}
      className="card mb-2 shadow-sm px-3 py-2 border-0"
      style={{ fontSize: "0.85rem", lineHeight: "1.4" }}
    >
      <div className="d-flex justify-content-between">
        <div>
          <strong>🆔 {order.transaction_id}</strong> •{" "}
          <span className="text-muted">{order.category}</span>
          <br />
          {order.customer_name}{" "}
          <small className="text-muted">({order.client_contact})</small>
          <br />
          <small className="text-muted">Col Code: {order.colour_code || "N/A"}</small>
          <br />
          <small className="text-muted">Note: {order.note || "No note"}</small>
        </div>
        <div className="text-end">
          <span className="badge bg-warning mb-1">Archived</span>
          <br />
          <small>👨‍🔧 {order.assigned_employee || "Unassigned"}</small>
        </div>
      </div>
    </div>
  );

  const renderDeletedCard = (order) => (
    <div
      key={order.transaction_id}
      className="card mb-2 shadow-sm px-3 py-2 border-0"
      style={{ fontSize: "0.85rem", lineHeight: "1.4" }}
    >
      <div className="d-flex justify-content-between">
        <div>
          <strong>🆔 {order.transaction_id}</strong> •{" "}
          <span className="text-muted">{order.category}</span>
          <br />
          {order.customer_name}{" "}
          <small className="text-muted">({order.client_contact})</small>
          <br />
          <small className="text-muted">Col Code: {order.colour_code || "N/A"}</small>
          <br />
          <small className="text-muted">Note: {order.note || "No note"}</small>
        </div>
        <div className="text-end">
          <span className="badge bg-danger mb-1">Deleted</span>
          <br />
          <small>👨‍🔧 {order.assigned_employee || "Unassigned"}</small>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    fetchOrders();
    if (userRole === "Admin") {
      const fetchWithRetry = async (fetchFn, name, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            await fetchFn();
            console.log(`${name} fetched successfully`);
            break;
          } catch (err) {
            console.error(`Attempt ${i + 1} failed for ${name}:`, err);
            if (i === retries - 1) setError(`Failed to fetch ${name} after ${retries} attempts`);
          }
        }
      };
      fetchWithRetry(fetchStaff, "staff");
      fetchWithRetry(fetchArchivedOrders, "archived orders");
    }
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchStaff, fetchArchivedOrders, userRole]);

  const waitingCount = orders.filter(o => o.current_status === "Waiting").length;
  const activeCount = orders.filter(o =>
    !["Waiting", "Ready", "Complete"].includes(o.current_status)
  ).length;
  const filteredOrders = orders.filter(o => 
    !["Ready", "Complete"].includes(o.current_status) &&
    (filterStatus === "All" || o.current_status === filterStatus) &&
    (filterCategory === "All" || o.category === filterCategory)
  );

  return (
    <div className="container mt-4">
      <div className="card mb-3 shadow-sm border-0">
        <div className="card-header bg-dark text-white d-flex justify-content-between">
          <h5 className="mb-0">🎨 Queue System View</h5>
          <div>
            <span className="me-2">Role: {userRole}</span>
            <button className="btn btn-light btn-sm me-2" onClick={handleLogin}>
              Login as Admin
            </button>
            {userRole === "Admin" && (
              <button
                className="btn btn-purple btn-sm"
                onClick={() => fetchReportData()}
              >
                📊 View Report
              </button>
            )}
          </div>
        </div>
        <div className="card-body">
          {showLogin && (
            <LoginPopup
              onLogin={(role) => {
                setUserRole(role);
              }}
              onClose={() => setShowLogin(false)}
            />
          )}
          {showReportModal && (
            <ReportModal
              onClose={() => setShowReportModal(false)}
              reportData={reportData}
              fetchReportData={fetchReportData}
            />
          )}
          {error && <div className="alert alert-danger">{error}</div>}
          <button
            className="btn btn-outline-secondary mb-3"
            onClick={fetchOrders}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>

          {userRole === "Admin" ? (
            <>
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

              <div className="d-flex justify-content-end mb-3">
                <select
                  className="form-select form-select-sm me-2"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ display: "inline-block", width: "auto" }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Mixing">Mixing</option>
                  <option value="Spraying">Spraying</option>
                  <option value="Re-Mixing">Re-Mixing</option>
                </select>
                <select
                  className="form-select form-select-sm"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ display: "inline-block", width: "auto" }}
                >
                  <option value="All">All Categories</option>
                  <option value="New Mix">New Mix</option>
                  <option value="Mix More">Mix More</option>
                  <option value="Colour Code">Colour Code</option>
                  <option value="Detailing">Detailing</option>
                </select>
              </div>

              <h6 className="bg-primary text-white p-2">
                📋 All Orders ({filteredOrders.length})
              </h6>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(renderUnifiedOrderCard)
              ) : (
                <p>No orders match the selected filters.</p>
              )}

              {showArchivedOrders && (
                <div className="mt-4">
                  <h6 className="bg-warning text-white p-2">📁 Archived Orders</h6>
                  {archivedOrders.length > 0 ? (
                    archivedOrders.map(renderArchivedCard)
                  ) : (
                    <p>No archived orders found.</p>
                  )}
                </div>
              )}

              {showDeletedOrders && (
                <div className="mt-4">
                  <h6 className="bg-danger text-white p-2">🗑 Deleted Orders</h6>
                  {deletedOrders.length > 0 ? (
                    deletedOrders.map(renderDeletedCard)
                  ) : (
                    <p>No deleted orders found.</p>
                  )}
                </div>
              )}

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
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, employee_name: e.target.value })
                        }
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
                      <button className="btn btn-primary" onClick={addStaff}>
                        Add Staff
                      </button>
                    </div>
                  )}
                  {showEditStaff && (
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Employee Name"
                        value={showEditStaff.employee_name}
                        onChange={(e) =>
                          setShowEditStaff({ ...showEditStaff, employee_name: e.target.value })
                        }
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
                        onChange={(e) =>
                          setShowEditStaff({ ...showEditStaff, role: e.target.value })
                        }
                      >
                        <option value="">Select Role</option>
                        <option value="Admin">Admin</option>
                        <option value="Staff">Staff</option>
                      </select>
                      <button
                        className="btn btn-primary me-2"
                        onClick={() => editStaff(showEditStaff.code)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowEditStaff(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {staffList.length > 0 ? (
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
                  ) : (
                    <p>No staff found.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="row">
              <div className="col-md-4">
                <h6 className="bg-primary text-white p-2">
                  ⏳ Waiting Orders: {waitingCount}
                </h6>
                {orders
                  .filter(o => o.current_status === "Waiting" && !o.archived)
                  .map(renderWaitingCard)}
              </div>
              <div className="col-md-8">
                <h6 className="bg-success text-white p-2">
                  🚀 Active Orders: {activeCount}
                </h6>
                {orders
                  .filter(o =>
                    !["Waiting", "Ready", "Complete"].includes(o.current_status)
                  )
                  .map(renderActiveCard)}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setSelectedOrder(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-content ${getModalCategoryClass(selectedOrder.category)}`}>
              <div className="modal-header">
                <h5 className="modal-title">🧾 Order Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedOrder(null)}
                ></button>
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
                <p><strong>Assigned To:</strong>{" "}
                  {selectedOrder.assigned_employee || "Unassigned"}</p>
                <p><strong>Note:</strong> {selectedOrder.note || "No note"}</p>
                <div>
                  <textarea
                    className="form-control mb-2"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Add or edit note"
                  />
                  <button
                    className="btn btn-primary me-2"
                    onClick={() => updateNote(selectedOrder)}
                  >
                    Save Note
                  </button>
                  {userRole === "Admin" && (
                    <button
                      className="btn btn-danger"
                      onClick={() => setShowCancelConfirm(selectedOrder.transaction_id)}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setShowCancelConfirm(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Order Cancellation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCancelConfirm(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to cancel order <strong>{showCancelConfirm}</strong>?</p>
                <textarea
                  className="form-control mb-2"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation"
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCancelConfirm(null)}
                >
                  Close
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => cancelOrder(showCancelConfirm)}
                  disabled={!cancelReason.trim()}
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingColourUpdate && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setPendingColourUpdate(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enter Colour Code and Employee</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setColourCodeInput("");
                    setEmployeeCodeInput("");
                    setColourCodeError("");
                    setPendingColourUpdate(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Colour Code"
                  value={colourCodeInput}
                  onChange={(e) => {
                    setColourCodeInput(e.target.value);
                    setColourCodeError("");
                  }}
                />
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Employee Code"
                  value={employeeCodeInput}
                  onChange={(e) => {
                    setEmployeeCodeInput(e.target.value);
                    setColourCodeError("");
                  }}
                />
                {colourCodeError && (
                  <div className="alert alert-danger">{colourCodeError}</div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setColourCodeInput("");
                    setEmployeeCodeInput("");
                    setColourCodeError("");
                    setPendingColourUpdate(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleColourCodeSubmit}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardR;
