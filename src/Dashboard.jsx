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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filterError, setFilterError] = useState("");

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/audit_logs`, {
        params: { start_date: startDate, end_date: endDate, status: selectedStatus === "All" ? "" : selectedStatus },
      });
      setAuditLogs(response.data);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setFilterError(err.response?.data?.error || "Failed to fetch audit logs.");
    }
  }, [startDate, endDate, selectedStatus]);

  const handleFilterSubmit = async () => {
    setFilterError("");
    try {
      await fetchReportData(startDate, endDate, selectedStatus, selectedCategory, includeDeleted);
      await fetchAuditLogs();
    } catch (err) {
      setFilterError(err.response?.data?.error || "Failed to fetch report data.");
    }
  };

  const downloadCSV = () => {
    if (!reportData) return;

    const headers = ["Metric,Value"];
    const statusRows = Object.entries(reportData.statusSummary).map(
      ([status, count]) => `Status: ${status},${count}`
    );
    const categoryRows = Object.entries(reportData.categorySummary).map(
      ([category, count]) => `Category: ${category},${count}`
    );
    const historyRows = Object.entries(reportData.historySummary).map(
      ([action, count]) => `History: ${action},${count}`
    );
    const deletedRows = reportData.deletedSummary
      ? Object.entries(reportData.deletedSummary).map(([status, count]) => `Deleted Status: ${status},${count}`)
      : [];
    const auditLogRows = auditLogs.map(
      (log) => `Audit Log,${log.order_id},${log.action},${log.from_status || ""},${log.to_status || ""},${log.employee_name || ""},${log.timestamp},${log.remarks || ""}`
    );

    const csvContent = [
      headers,
      ...statusRows,
      ...categoryRows,
      ...historyRows,
      ...deletedRows,
      "Audit Log,Order ID,Action,From Status,To Status,Employee,Timestamp,Remarks",
      ...auditLogRows,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `order_report_${startDate || "all"}_${endDate || "all"}_${selectedStatus}_${selectedCategory}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  React.useEffect(() => {
    if (!reportData || !window.Chart) return;

    const statusChart = new window.Chart(document.getElementById("statusChart"), {
      type: "bar",
      data: {
        labels: Object.keys(reportData.statusSummary),
        datasets: [{
          label: "Order Status Count",
          data: Object.values(reportData.statusSummary),
          backgroundColor: ["#36A2EB", "#FF6384", "#4BC0C0", "#FFCE56", "#9966FF", "#C9CB3F"],
          borderColor: ["#2A87D0", "#E05570", "#3BA8A8", "#E0B447", "#7A52CC", "#A8AA2E"],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Count" } },
          x: { title: { display: true, text: "Status" } },
        },
      },
    });

    const categoryChart = new window.Chart(document.getElementById("categoryChart"), {
      type: "pie",
      data: {
        labels: Object.keys(reportData.categorySummary),
        datasets: [{
          label: "Order Category Count",
          data: Object.values(reportData.categorySummary),
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
          borderColor: ["#E05570", "#2A87D0", "#E0B447", "#3BA8A8"],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
      },
    });

    const historyChart = new window.Chart(document.getElementById("historyChart"), {
      type: "doughnut",
      data: {
        labels: Object.keys(reportData.historySummary),
        datasets: [{
          label: "History Action Count",
          data: Object.values(reportData.historySummary),
          backgroundColor: ["#9966FF", "#FF9F40", "#FF6384", "#36A2EB"],
          borderColor: ["#7A52CC", "#E08E38", "#E05570", "#2A87D0"],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
      },
    });

    const deletedChart = reportData.deletedSummary && Object.keys(reportData.deletedSummary).length > 0
      ? new window.Chart(document.getElementById("deletedChart"), {
          type: "bar",
          data: {
            labels: Object.keys(reportData.deletedSummary),
            datasets: [{
              label: "Deleted Orders Status Count",
              data: Object.values(reportData.deletedSummary),
              backgroundColor: ["#FF6384", "#36A2EB", "#4BC0C0", "#FFCE56"],
              borderColor: ["#E05570", "#2A87D0", "#3BA8A8", "#E0B447"],
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true, title: { display: true, text: "Count" } },
              x: { title: { display: true, text: "Deleted Status" } },
            },
          },
        })
      : null;

    return () => {
      statusChart.destroy();
      categoryChart.destroy();
      historyChart.destroy();
      if (deletedChart) deletedChart.destroy();
    };
  }, [reportData]);

  return (
    <div className="modal d-block" tabIndex="-1" onClick={onClose}>
      <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header bg-purple text-white">
            <h5 className="modal-title">📊 Order Report</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="card mb-3 shadow-sm">
              <div className="card-body">
                <h6 className="card-title">Filter Report</h6>
                <div className="row">
                  <div className="col-md-3">
                    <label className="form-label">Start Date:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">End Date:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Status:</label>
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
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Category:</label>
                    <select
                      className="form-control"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="New Mix">New Mix</option>
                      <option value="Colour Code">Colour Code</option>
                      <option value="Detailing">Detailing</option>
                      <option value="Re-Mix">Re-Mix</option>
                    </select>
                  </div>
                </div>
                <div className="form-check mt-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                  />
                  <label className="form-check-label">Include Deleted Orders</label>
                </div>
                <button className="btn btn-primary mt-3" onClick={handleFilterSubmit}>
                  Apply Filters
                </button>
                {reportData && (
                  <button className="btn btn-success mt-3 ms-2" onClick={downloadCSV}>
                    Download CSV
                  </button>
                )}
                {filterError && <div className="alert alert-danger mt-2">{filterError}</div>}
              </div>
            </div>
            {reportData ? (
              <div className="row">
                <div className="col-md-3">
                  <h6 className="text-center">Order Status Summary</h6>
                  <canvas id="statusChart" height="200"></canvas>
                  <table className="table table-sm table-bordered mt-3">
                    <thead className="table-light">
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
                </div>
                <div className="col-md-3">
                  <h6 className="text-center">Order Category Summary</h6>
                  <canvas id="categoryChart" height="200"></canvas>
                  <table className="table table-sm table-bordered mt-3">
                    <thead className="table-light">
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
                </div>
                <div className="col-md-3">
                  <h6 className="text-center">Order History Summary</h6>
                  <canvas id="historyChart" height="200"></canvas>
                  <table className="table table-sm table-bordered mt-3">
                    <thead className="table-light">
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
                </div>
                {reportData.deletedSummary && Object.keys(reportData.deletedSummary).length > 0 && (
                  <div className="col-md-3">
                    <h6 className="text-center">Deleted Orders Summary</h6>
                    <canvas id="deletedChart" height="200"></canvas>
                    <table className="table table-sm table-bordered mt-3">
                      <thead className="table-light">
                        <tr>
                          <th>Status</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(reportData.deletedSummary).map(([status, count]) => (
                          <tr key={status}>
                            <td>{status}</td>
                            <td>{count}</td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {auditLogs.length > 0 && (
                  <div className="col-12 mt-4">
                    <h6>Audit Log Details</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Order ID</th>
                            <th>Action</th>
                            <th>From Status</th>
                            <th>To Status</th>
                            <th>Employee</th>
                            <th>Timestamp</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.map((log) => (
                            <tr key={log.log_id}>
                              <td>{log.order_id}</td>
                              <td>{log.action}</td>
                              <td>{log.from_status || "N/A"}</td>
                              <td>{log.to_status || "N/A"}</td>
                              <td>{log.employee_name || "N/A"}</td>
                              <td>{new Date(log.timestamp).toLocaleString()}</td>
                              <td>{log.remarks || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted">No report data available. Apply filters to generate a report.</p>
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

  const handleLogin = (role) => {
    setUserRole(role);
    setShowLogin(false);
  };

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

  const fetchReportData = useCallback(async (startDate = "", endDate = "", status = "All", category = "All", includeDeleted = false) => {
    try {
      console.log("Fetching report data from /api/orders/report");
      const response = await axios.get(`${BASE_URL}/api/orders/report`, {
        params: {
          start_date: startDate,
          end_date: endDate,
          status: status === "All" ? "" : status,
          category: category === "All" ? "" : category,
          include_deleted: includeDeleted,
        },
      });
      setReportData(response.data);
      setShowReportModal(true);
      setError("");
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError(err.response?.data?.error || "Failed to fetch report data.");
      throw err;
    }
  }, []);

  const updateStatus = async (orderId, status, colourCode, employeeCode, remarks) => {
    if (userRole !== "Admin" && userRole !== "Staff") {
      setError("Only Admin or Staff can update status.");
      return;
    }
    try {
      const employee = staffList.find((emp) => emp.employee_code === employeeCode);
      const employeeName = employee ? employee.employee_name : "";
      console.log("Updating status for order:", { orderId, status, colourCode, employeeCode, employeeName, remarks });

      const response = await axios.put(`${BASE_URL}/api/orders/${orderId}/status`, {
        status,
        employeeCode,
        colourCode,
        employeeName,
        userRole,
        remarks,
      });
      setOrders(orders.map((order) => (order.id === orderId ? response.data : order)));
      setRecentlyUpdatedId(orderId);
      setTimeout(() => setRecentlyUpdatedId(null), 3000);
      setError("");
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update order status.");
    }
  };

  const updateNote = async (orderId, note) => {
    if (userRole !== "Admin" && userRole !== "Staff") {
      setError("Only Admin or Staff can update notes.");
      return;
    }
    try {
      const response = await axios.put(`${BASE_URL}/api/orders/${orderId}/note`, {
        note,
        employeeName: staffList.find((emp) => emp.employee_code === employeeCodeInput)?.employee_name || "",
        userRole,
      });
      setOrders(orders.map((order) => (order.id === orderId ? response.data : order)));
      setError("");
    } catch (err) {
      console.error("Error updating note:", err);
      setError("Failed to update order note.");
    }
  };

  const cancelOrder = async (orderId, reason) => {
    if (userRole !== "Admin") {
      setError("Only Admin can cancel orders.");
      return;
    }
    try {
      const response = await axios.put(`${BASE_URL}/api/orders/${orderId}/cancel`, {
        reason,
        employeeName: staffList.find((emp) => emp.employee_code === employeeCodeInput)?.employee_name || "",
        userRole,
      });
      setOrders(orders.filter((order) => order.id !== orderId));
      setError("");
    } catch (err) {
      console.error("Error cancelling order:", err);
      setError("Failed to cancel order.");
    }
  };

  const addStaff = async (employee_name, code, role) => {
    if (userRole !== "Admin") {
      setError("Only Admin can add staff.");
      return;
    }
    try {
      const response = await axios.post(`${BASE_URL}/api/staff`, { employee_name, code, role });
      setStaffList([...staffList, response.data]);
      setError("");
    } catch (err) {
      console.error("Error adding staff:", err);
      setError("Failed to add staff.");
    }
  };

  const updateStaff = async (id, employee_name, code, role) => {
    if (userRole !== "Admin") {
      setError("Only Admin can update staff.");
      return;
    }
    try {
      const response = await axios.put(`${BASE_URL}/api/staff/${id}`, { employee_name, code, role });
      setStaffList(staffList.map((staff) => (staff.employee_id === id ? response.data : staff)));
      setError("");
    } catch (err) {
      console.error("Error updating staff:", err);
      setError("Failed to update staff.");
    }
  };

  const deleteStaff = async (id) => {
    if (userRole !== "Admin") {
      setError("Only Admin can delete staff.");
      return;
    }
    try {
      await axios.delete(`${BASE_URL}/api/staff/${id}`);
      setStaffList(staffList.filter((staff) => staff.employee_id !== id));
      setError("");
    } catch (err) {
      console.error("Error deleting staff:", err);
      setError("Failed to delete staff.");
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStaff();
    fetchArchivedOrders();
    fetchDeletedOrders();
  }, [fetchOrders, fetchStaff, fetchArchivedOrders, fetchDeletedOrders]);

  const filteredOrders = orders.filter((order) => {
    const statusMatch = filterStatus === "All" || order.current_status === filterStatus;
    const categoryMatch = filterCategory === "All" || order.category === filterCategory;
    return statusMatch && categoryMatch;
  });

  return (
    <div className="container mt-4">
      {showLogin && <LoginPopup onLogin={handleLogin} />}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Order Management (Role: {userRole})</h2>
        <button className="btn btn-primary" onClick={() => setShowLogin(true)}>
          Login
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Loading...</div>}
      <div className="mb-3">
        <label className="form-label">Filter by Status:</label>
        <select
          className="form-control"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Waiting">Waiting</option>
          <option value="Mixing">Mixing</option>
          <option value="Spraying">Spraying</option>
          <option value="Re-Mixing">Re-Mixing</option>
          <option value="Ready">Ready</option>
          <option value="Complete">Complete</option>
        </select>
        <label className="form-label mt-2">Filter by Category:</label>
        <select
          className="form-control"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="All">All</option>
          <option value="New Mix">New Mix</option>
          <option value="Colour Code">Colour Code</option>
          <option value="Detailing">Detailing</option>
          <option value="Re-Mix">Re-Mix</option>
        </select>
      </div>
      <div className="mb-3">
        <button
          className="btn btn-info me-2"
          onClick={() => {
            setShowArchivedOrders(true);
            setShowDeletedOrders(false);
          }}
        >
          View Archived Orders
        </button>
        <button
          className="btn btn-warning me-2"
          onClick={() => {
            setShowDeletedOrders(true);
            setShowArchivedOrders(false);
          }}
        >
          View Deleted Orders
        </button>
        <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
          View Report
        </button>
      </div>
      {showAddStaff && (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">Add Staff</h5>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Employee Name"
                value={newStaff.employee_name}
                onChange={(e) => setNewStaff({ ...newStaff, employee_name: e.target.value })}
              />
              <input
                type="text"
                className="form-control mt-2"
                placeholder="Employee Code"
                value={newStaff.code}
                onChange={(e) => setNewStaff({ ...newStaff, code: e.target.value })}
              />
              <input
                type="text"
                className="form-control mt-2"
                placeholder="Role"
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
              />
              <button
                className="btn btn-primary mt-2"
                onClick={() => {
                  addStaff(newStaff.employee_name, newStaff.code, newStaff.role);
                  setNewStaff({ employee_name: "", code: "", role: "" });
                  setShowAddStaff(false);
                }}
              >
                Add
              </button>
              <button className="btn btn-secondary mt-2 ms-2" onClick={() => setShowAddStaff(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditStaff && (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">Edit Staff</h5>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Employee Name"
                value={showEditStaff.employee_name}
                onChange={(e) => setShowEditStaff({ ...showEditStaff, employee_name: e.target.value })}
              />
              <input
                type="text"
                className="form-control mt-2"
                placeholder="Employee Code"
                value={showEditStaff.employee_code}
                onChange={(e) => setShowEditStaff({ ...showEditStaff, employee_code: e.target.value })}
              />
              <input
                type="text"
                className="form-control mt-2"
                placeholder="Role"
                value={showEditStaff.role}
                onChange={(e) => setShowEditStaff({ ...showEditStaff, role: e.target.value })}
              />
              <button
                className="btn btn-primary mt-2"
                onClick={() => {
                  updateStaff(showEditStaff.employee_id, showEditStaff.employee_name, showEditStaff.employee_code, showEditStaff.role);
                  setShowEditStaff(null);
                }}
              >
                Update
              </button>
              <button className="btn btn-secondary mt-2 ms-2" onClick={() => setShowEditStaff(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showCancelConfirm && (
        <div className="modal d-block" tabIndex="-1">
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Cancellation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCancelConfirm(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to cancel order {showCancelConfirm.transaction_id}?</p>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Reason for cancellation"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <input
                  type="text"
                  className="form-control mt-2"
                  placeholder="Employee Code"
                  value={employeeCodeInput}
                  onChange={(e) => setEmployeeCodeInput(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    cancelOrder(showCancelConfirm.id, cancelReason);
                    setShowCancelConfirm(null);
                    setCancelReason("");
                    setEmployeeCodeInput("");
                  }}
                >
                  Confirm
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCancelConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showReportModal && (
        <ReportModal onClose={() => setShowReportModal(false)} reportData={reportData} fetchReportData={fetchReportData} />
      )}
      {showArchivedOrders && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setShowArchivedOrders(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Archived Orders</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowArchivedOrders(false)}
                ></button>
              </div>
              <div className="modal-body">
                {archivedOrders.length > 0 ? (
                  archivedOrders.map((order) => (
                    <div key={order.id} className={`card mb-2 card-category-${order.category?.toLowerCase().replace(" ", "-") || "default"}`}>
                      <div className="card-body">
                        <h5 className="card-title">{order.customer_name}</h5>
                        <p><strong>Transaction ID:</strong> {order.transaction_id}</p>
                        <p><strong>Status:</strong> {order.current_status}</p>
                        <p><strong>Category:</strong> {order.category}</p>
                        <p><strong>Start Time:</strong> {new Date(order.start_time).toLocaleString()}</p>
                        <p><strong>Note:</strong> {order.note || "N/A"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No archived orders found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeletedOrders && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setShowDeletedOrders(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Deleted Orders</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeletedOrders(false)}
                ></button>
              </div>
              <div className="modal-body">
                {deletedOrders.length > 0 ? (
                  deletedOrders.map((order) => (
                    <div key={order.transaction_id} className={`card mb-2 card-category-${order.category?.toLowerCase().replace(" ", "-") || "default"}`}>
                      <div className="card-body">
                        <h5 className="card-title">{order.customer_name}</h5>
                        <p><strong>Transaction ID:</strong> {order.transaction_id}</p>
                        <p><strong>Status:</strong> {order.current_status}</p>
                        <p><strong>Category:</strong> {order.category}</p>
                        <p><strong>Start Time:</strong> {new Date(order.start_time).toLocaleString()}</p>
                        <p><strong>Note:</strong> {order.note || "N/A"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No deleted orders found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="row">
        {userRole === "Admin" && (
          <div className="col-md-4">
            <div className="card mb-3">
              <div className="card-body">
                <h5 className="card-title">Staff Management</h5>
                <button className="btn btn-primary mb-3" onClick={() => setShowAddStaff(true)}>
                  Add Staff
                </button>
                {staffList.map((staff) => (
                  <div key={staff.employee_id} className="card mb-2">
                    <div className="card-body">
                      <p><strong>Name:</strong> {staff.employee_name}</p>
                      <p><strong>Code:</strong> {staff.employee_code}</p>
                      <p><strong>Role:</strong> {staff.role}</p>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => setShowEditStaff(staff)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteStaff(staff.employee_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className={userRole === "Admin" ? "col-md-8" : "col-12"}>
          <h3>Orders</h3>
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`card mb-3 ${recentlyUpdatedId === order.id ? "border-success" : ""} card-category-${order.category?.toLowerCase().replace(" ", "-") || "default"}`}
            >
              <div className="card-body">
                <h5 className="card-title">{order.customer_name}</h5>
                <p><strong>Transaction ID:</strong> {order.transaction_id}</p>
                <p><strong>Status:</strong> {order.current_status}</p>
                <p><strong>Category:</strong> {order.category}</p>
                <p><strong>Paint Type:</strong> {order.paint_type}</p>
                <p><strong>Colour Code:</strong> {order.colour_code}</p>
                <p><strong>Client Contact:</strong> {order.client_contact}</p>
                <p><strong>Start Time:</strong> <ElapsedTime statusStartedAt={order.start_time} /></p>
                <p><strong>Estimated Completion:</strong> {order.estimated_completion ? new Date(order.estimated_completion).toLocaleString() : "N/A"}</p>
                <p><strong>Assigned Employee:</strong> {order.assigned_employee || "N/A"}</p>
                <p><strong>Note:</strong> {order.note || "N/A"}</p>
                {(userRole === "Admin" || userRole === "Staff") && (
                  <>
                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Update Status
                    </button>
                    <button
                      className="btn btn-sm btn-secondary me-2"
                      onClick={() => {
                        setSelectedOrder(order);
                        setOrderNote(order.note || "");
                      }}
                    >
                      Update Note
                    </button>
                    {userRole === "Admin" && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setShowCancelConfirm(order)}
                      >
                        Cancel Order
                      </button>
                    )}
                  </>
                )}
              </div>
              {selectedOrder && selectedOrder.id === order.id && (
                <div className="card-footer">
                  <h6>Update Order</h6>
                  <select
                    className="form-control mb-2"
                    value={pendingColourUpdate?.status || order.current_status}
                    onChange={(e) =>
                      setPendingColourUpdate({
                        ...pendingColourUpdate,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="Waiting">Waiting</option>
                    <option value="Mixing">Mixing</option>
                    <option value="Spraying">Spraying</option>
                    <option value="Re-Mixing">Re-Mixing</option>
                    <option value="Ready">Ready</option>
                    <option value="Complete">Complete</option>
                  </select>
                  <input
                    type="text"
                    className={`form-control mb-2 ${colourCodeError ? "is-invalid" : ""}`}
                    placeholder="Colour Code"
                    value={colourCodeInput}
                    onChange={(e) => {
                      setColourCodeInput(e.target.value);
                      setColourCodeError("");
                    }}
                  />
                  {colourCodeError && <div className="invalid-feedback">{colourCodeError}</div>}
                  <select
                    className="form-control mb-2"
                    value={employeeCodeInput}
                    onChange={(e) => setEmployeeCodeInput(e.target.value)}
                  >
                    <option value="">Select Employee</option>
                    {staffList.map((staff) => (
                      <option key={staff.employee_id} value={staff.employee_code}>
                        {staff.employee_name} ({staff.employee_code})
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="form-control mb-2"
                    placeholder="Remarks"
                    value={pendingColourUpdate?.remarks || ""}
                    onChange={(e) =>
                      setPendingColourUpdate({
                        ...pendingColourUpdate,
                        remarks: e.target.value,
                      })
                    }
                  ></textarea>
                  <button
                    className="btn btn-primary me-2"
                    onClick={() => {
                      if (!employeeCodeInput) {
                        setColourCodeError("Employee code is required.");
                        return;
                      }
                      updateStatus(
                        order.id,
                        pendingColourUpdate?.status || order.current_status,
                        colourCodeInput,
                        employeeCodeInput,
                        pendingColourUpdate?.remarks || ""
                      );
                      setSelectedOrder(null);
                      setColourCodeInput("");
                      setEmployeeCodeInput("");
                      setPendingColourUpdate(null);
                    }}
                  >
                    Update
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedOrder(null);
                      setColourCodeInput("");
                      setEmployeeCodeInput("");
                      setPendingColourUpdate(null);
                    }}
                  >
                    Cancel
                  </button>
                  {orderNote !== null && (
                    <div className="mt-2">
                      <textarea
                        className="form-control mb-2"
                        placeholder="Update Note"
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                      ></textarea>
                      <button
                        className="btn btn-primary me-2"
                        onClick={() => {
                          updateNote(order.id, orderNote);
                          setSelectedOrder(null);
                          setOrderNote("");
                        }}
                      >
                        Update Note
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardR;
