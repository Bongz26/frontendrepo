import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/queueStyles.css";
import "./styles/queueSortStyles.css";
import LoginPopup from "./LoginPopup";
import ColourCodeModal from "./ColourCodeModal";

const BASE_URL = process.env.REACT_APP_API_URL || "https://queue-backendser.onrender.com";

// Custom hook for toast notifications
const useToast = () => {
  const [toast, setToast] = useState({ message: "", type: "success", show: false });

  const triggerToast = (message, type = "success") => {
    setToast({ message, type, show: true });
  };

  return { toast, triggerToast, setToast };
};

// ElapsedTime component
const ElapsedTime = ({ statusStartedAt, fallbackTime }) => {
  const [displayTime, setDisplayTime] = useState("");

  useEffect(() => {
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
};

const CardViewBOC = () => {
  const [state, setState] = useState({
    orders: [],
    archivedOrders: [],
    deletedOrders: [],
    userRole: "User",
    showLogin: false,
    pendingColourUpdate: null,
    recentlyUpdatedId: null,
    selectedOrder: null,
    staffList: [],
    showAddStaff: false,
    showEditStaff: null,
    showArchivedOrders: false,
    showDeletedOrders: false,
    newStaff: { employee_name: "", code: "", role: "" },
    orderNote: "",
    filterStatus: "All",
    filterCategory: "All",
    showCancelConfirm: null,
    cancelReason: "",
    loading: false,
  });

  const { toast, triggerToast, setToast } = useToast();

  // Fetch functions
  const fetchOrders = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await axios.get(`${BASE_URL}/api/orders`);
      setState((prev) => ({ ...prev, orders: response.data }));
    } catch (err) {
      console.error("Error fetching orders:", err);
      triggerToast("Error fetching orders.", "danger");
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/staff`);
      setState((prev) => ({ ...prev, staffList: response.data }));
    } catch (err) {
      console.error("Error fetching staff:", err);
      triggerToast("Error fetching staff list.", "danger");
    }
  }, []);

  const fetchArchivedOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/orders/archived`);
      setState((prev) => ({ ...prev, archivedOrders: response.data }));
    } catch (err) {
      console.error("Error fetching archived orders:", err);
      triggerToast("Error fetching archived orders.", "danger");
    }
  }, []);

  const fetchDeletedOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/orders/deleted`);
      setState((prev) => ({ ...prev, deletedOrders: response.data }));
    } catch (err) {
      console.error("Error fetching deleted orders:", err);
      triggerToast("Error fetching deleted orders.", "danger");
    }
  }, []);

  // Handlers
  const addStaff = async () => {
    try {
      await axios.post(`${BASE_URL}/api/staff`, state.newStaff);
      setState((prev) => ({
        ...prev,
        newStaff: { employee_name: "", code: "", role: "" },
        showAddStaff: false,
      }));
      fetchStaff();
      triggerToast("Staff added successfully!", "success");
    } catch (err) {
      console.error("Error adding staff:", err);
      triggerToast("Error adding staff.", "danger");
    }
  };

  const editStaff = async (code) => {
    try {
      await axios.put(`${BASE_URL}/api/staff/${code}`, state.showEditStaff);
      setState((prev) => ({ ...prev, showEditStaff: null }));
      fetchStaff();
      triggerToast("Staff updated successfully!", "success");
    } catch (err) {
      console.error("Error editing staff:", err);
      triggerToast("Error editing staff.", "danger");
    }
  };

  const removeStaff = async (code) => {
    try {
      await axios.delete(`${BASE_URL}/api/staff/${code}`);
      setState((prev) => ({
        ...prev,
        staffList: prev.staffList.filter((emp) => emp.code !== code),
      }));
      triggerToast("Staff removed successfully!", "success");
    } catch (err) {
      console.error("Error removing staff:", err);
      triggerToast("Error removing staff.", "danger");
    }
  };

  const cancelOrder = async (orderId) => {
    if (state.userRole !== "Admin") {
      triggerToast("Only Admins can cancel orders!", "danger");
      return;
    }

    if (!state.cancelReason || state.cancelReason.trim() === "") {
      triggerToast("A reason is required to cancel an order!", "danger");
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/api/orders/${orderId}`, {
        data: { userRole: state.userRole, note: state.cancelReason },
      });
      fetchOrders();
      fetchDeletedOrders();
      setState((prev) => ({
        ...prev,
        selectedOrder: null,
        showCancelConfirm: null,
        cancelReason: "",
      }));
      triggerToast("Order cancelled successfully!", "success");
    } catch (err) {
      console.error("Error cancelling order:", err);
      triggerToast(err.response?.data?.error || "Error cancelling order.", "danger");
    }
  };

  const updateNote = async (order) => {
    try {
      await axios.put(`${BASE_URL}/api/orders/${order.transaction_id}`, {
        current_status: order.current_status,
        assigned_employee: order.assigned_employee || null,
        colour_code: order.colour_code || "Pending",
        note: state.orderNote || null,
        userRole: state.userRole,
        old_status: order.current_status,
      });
      setState((prev) => ({ ...prev, orderNote: "", selectedOrder: null }));
      fetchOrders();
      triggerToast("Note updated successfully!", "success");
    } catch (err) {
      console.error("Error updating note:", err);
      triggerToast(err.response?.data?.error || "Error updating note.", "danger");
    }
  };

  const updateStatus = async (order, newStatus, colourCode, currentEmp) => {
    const { category, current_status: fromStatus } = order;
    const toStatus = newStatus;
    let updatedColourCode = colourCode;
    let employeeName = currentEmp || "Unassigned";

    const isFromWaitingToMixing =
      fromStatus === "Waiting" && toStatus === "Mixing" && ["New Mix", "Mix More", "Colour Code"].includes(category);
    const isMixingToSpraying = fromStatus === "Mixing" && toStatus === "Spraying";
    const isSprayingToRemix = fromStatus === "Spraying" && toStatus === "Re-Mixing";
    const isRemixToSpraying = fromStatus === "Re-Mixing" && toStatus === "Spraying";
    const isSprayingToReadyNewMix = fromStatus === "Spraying" && toStatus === "Ready" && category === "New Mix";
    const isSprayingToReadyOthers = fromStatus === "Spraying" && toStatus === "Ready" && ["Mix More", "Colour Code"].includes(category);
    const shouldPromptEmp =
      isFromWaitingToMixing || isMixingToSpraying || isSprayingToRemix || isRemixToSpraying || isSprayingToReadyOthers;

    if (isSprayingToReadyNewMix && (!colourCode || colourCode === "Pending")) {
      setState((prev) => ({
        ...prev,
        pendingColourUpdate: {
          orderId: order.transaction_id,
          newStatus: toStatus,
          employeeName: currentEmp,
        },
      }));
      return;
    }

    if (shouldPromptEmp) {
      const empCodeFromPrompt = prompt("🔍 Enter Employee Code:");
      if (!empCodeFromPrompt) {
        triggerToast("Employee Code required!", "danger");
        return;
      }
      try {
        const res = await axios.get(`${BASE_URL}/api/employees?code=${empCodeFromPrompt}`);
        if (!res.data?.employee_name) {
          triggerToast("Invalid employee code!", "danger");
          return;
        }
        employeeName = res.data.employee_name;
      } catch {
        triggerToast("Unable to verify employee!", "danger");
        return;
      }
    }

    try {
      await axios.put(`${BASE_URL}/api/orders/${order.transaction_id}`, {
        current_status: toStatus,
        assigned_employee: employeeName,
        colour_code: updatedColourCode,
        note: state.orderNote || order.note,
        userRole: state.userRole,
        old_status: fromStatus,
      });
      setState((prev) => ({ ...prev, recentlyUpdatedId: order.transaction_id }));
      setTimeout(() => setState((prev) => ({ ...prev, recentlyUpdatedId: null })), 2000);
      setTimeout(fetchOrders, 500);
      setState((prev) => ({ ...prev, orderNote: "" }));
      triggerToast("Status updated successfully!", "success");
    } catch (err) {
      console.error("Error updating status:", err);
      triggerToast("Error updating status!", "danger");
    }
  };

  // Styling for categories and selected order
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
      case "ready":
        return "card-category-ready";
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
      case "ready":
        return "modal-category-ready";
      default:
        return "modal-category-default";
    }
  };

  // Card rendering functions
  const renderOrderCard = (order, isArchived = false, isDeleted = false) => (
    <div
      key={order.transaction_id}
      className={`card mb-2 px-3 py-2 shadow-sm border-0 ${
        state.recentlyUpdatedId === order.transaction_id ? "flash-row" : ""
      } ${getCategoryClass(order.current_status)} ${
        state.selectedOrder?.transaction_id === order.transaction_id ? "selected-order" : ""
      }`}
      style={{ fontSize: "0.85rem", lineHeight: "1.4", cursor: "pointer" }}
      onClick={() => setState((prev) => ({ ...prev, selectedOrder: order }))}
    >
      <div className="d-flex justify-content-between">
        <div>
          <strong>🆔 {order.transaction_id}</strong> • <span className="text-muted">{order.category}</span>
          <br />
          <span>{order.customer_name}</span> <small className="text-muted">({order.client_contact})</small>
          <br />
          <small className="text-muted">🎨 {order.paint_type} — {order.paint_quantity}</small>
          <br />
          <small className="text-muted">Col Code: {order.colour_code || "N/A"}</small>
          <br />
          <small className="text-muted">PO Type: {order.po_type || "N/A"}</small>
          <br />
          <small className="text-muted">Note: {order.note || "No note"}</small>
        </div>
        <div className="text-end">
          <small className="text-muted">
            <ElapsedTime statusStartedAt={order.status_started_at} fallbackTime={order.start_time} /> in {order.current_status}
          </small>
          <br />
          <span
            className={`badge ${
              order.current_status === "Waiting" ? "bg-primary" :
              order.current_status === "Mixing" ? "bg-info" :
              order.current_status === "Spraying" ? "bg-success" :
              order.current_status === "Re-Mixing" ? "bg-warning" :
              order.current_status === "Ready" ? "bg-secondary" :
              "bg-dark"
            } mb-1`}
          >
            {order.current_status}
          </span>
          <br />
          <small>👨‍🔧 {order.assigned_employee || "Unassigned"}</small>
          {!isArchived && !isDeleted && (
            <>
              <br />
              <select
                className="form-select form-select-sm mt-1"
                style={{ minWidth: "130px" }}
                onClick={(e) => e.stopPropagation()}
                value={order.current_status}
                onChange={(e) =>
                  updateStatus(order, e.target.value, order.colour_code, order.assigned_employee)
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
                {order.current_status === "Ready" && state.userRole === "Admin" && (
                  <option value="Complete">Complete</option>
                )}
              </select>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderArchivedCard = (order) => renderOrderCard(order, true);
  const renderDeletedCard = (order) => renderOrderCard(order, false, true);

  // Initial data fetch
  useEffect(() => {
    fetchOrders();
    if (state.userRole === "Admin") {
      const fetchWithRetry = async (fetchFn, name, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            await fetchFn();
            console.log(`${name} fetched successfully`);
            break;
          } catch (err) {
            console.error(`Attempt ${i + 1} failed for ${name}:`, err);
            if (i === retries - 1) triggerToast(`Failed to fetch ${name} after ${retries} attempts`, "danger");
          }
        }
      };
      fetchWithRetry(fetchStaff, "staff");
      fetchWithRetry(fetchArchivedOrders, "archived orders");
    }
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchStaff, fetchArchivedOrders, state.userRole]);

  // Order filtering
  const waitingCount = state.orders.filter((o) => o.current_status === "Waiting").length;
  const activeCount = state.orders.filter((o) => !["Waiting", "Ready", "Complete"].includes(o.current_status)).length;
  const readyCount = state.orders.filter((o) => o.current_status === "Ready").length;
  const filteredOrders = state.orders.filter(
    (o) =>
      (state.userRole === "Admin" ? !["Complete"].includes(o.current_status) : !["Ready", "Complete"].includes(o.current_status)) &&
      (state.filterStatus === "All" || o.current_status === state.filterStatus) &&
      (state.filterCategory === "All" || o.category === state.filterCategory)
  );

  return (
    <div className="container mt-4">
      <style>
        {`
          .selected-order {
            background-color: #fff3cd !important;
            border: 2px solid #ffca2c !important;
          }
          .card-category-ready {
            background-color: #e9ecef;
          }
          .modal-category-ready {
            border-left: 5px solid #6c757d;
          }
        `}
      </style>

      <div className="card mb-3 shadow-sm border-0">
        <div className="card-header bg-dark text-white d-flex justify-content-between">
          <h5 className="mb-0">🎨 Queue System View</h5>
          <div>
            <span className="me-2">Role: {state.userRole}</span>
            <button className="btn btn-light btn-sm" onClick={() => setState((prev) => ({ ...prev, showLogin: true }))}>
              Login as Admin
            </button>
          </div>
        </div>
        <div className="card-body">
          {state.showLogin && (
            <LoginPopup
              onLogin={(role) => setState((prev) => ({ ...prev, userRole: role, showLogin: false }))}
              onClose={() => setState((prev) => ({ ...prev, showLogin: false }))}
            />
          )}

          <button
            className="btn btn-outline-secondary mb-3"
            onClick={fetchOrders}
            disabled={state.loading}
          >
            {state.loading ? "Refreshing..." : "🔄 Refresh"}
          </button>

          {state.userRole === "Admin" ? (
            <>
              <div className="mb-3">
                <button
                  className="btn btn-outline-info me-2"
                  onClick={() => {
                    setState((prev) => ({ ...prev, showArchivedOrders: !prev.showArchivedOrders }));
                    if (!state.showArchivedOrders) fetchArchivedOrders();
                  }}
                >
                  {state.showArchivedOrders ? "Hide Archived Orders" : "Show Archived Orders"}
                </button>
                <button
                  className="btn btn-outline-danger"
                  onClick={() => {
                    setState((prev) => ({ ...prev, showDeletedOrders: !prev.showDeletedOrders }));
                    if (!state.showDeletedOrders) fetchDeletedOrders();
                  }}
                >
                  {state.showDeletedOrders ? "Hide Deleted Orders" : "Show Deleted Orders"}
                </button>
              </div>

              <div className="d-flex justify-content-end mb-3">
                <select
                  className="form-select form-select-sm me-2"
                  value={state.filterStatus}
                  onChange={(e) => setState((prev) => ({ ...prev, filterStatus: e.target.value }))}
                  style={{ display: "inline-block", width: "auto" }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Mixing">Mixing</option>
                  <option value="Spraying">Spraying</option>
                  <option value="Re-Mixing">Re-Mixing</option>
                  <option value="Ready">Ready</option>
                </select>
                <select
                  className="form-select form-select-sm"
                  value={state.filterCategory}
                  onChange={(e) => setState((prev) => ({ ...prev, filterCategory: e.target.value }))}
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
                📋 Waiting Orders ({waitingCount})
              </h6>
              {filteredOrders.filter((o) => o.current_status === "Waiting").length > 0 ? (
                filteredOrders
                  .filter((o) => o.current_status === "Waiting")
                  .map((order) => renderOrderCard(order))
              ) : (
                <p>No waiting orders match the selected filters.</p>
              )}

              <h6 className="bg-success text-white p-2 mt-3">
                🚀 Active Orders ({activeCount})
              </h6>
              {filteredOrders.filter((o) => !["Waiting", "Ready", "Complete"].includes(o.current_status)).length > 0 ? (
                filteredOrders
                  .filter((o) => !["Waiting", "Ready", "Complete"].includes(o.current_status))
                  .map((order) => renderOrderCard(order))
              ) : (
                <p>No active orders match the selected filters.</p>
              )}

              <h6 className="bg-secondary text-white p-2 mt-3">
                ✅ Ready Orders ({readyCount})
              </h6>
              {filteredOrders.filter((o) => o.current_status === "Ready").length > 0 ? (
                filteredOrders
                  .filter((o) => o.current_status === "Ready")
                  .map((order) => renderOrderCard(order))
              ) : (
                <p>No ready orders match the selected filters.</p>
              )}

              {state.showArchivedOrders && (
                <div className="mt-4">
                  <h6 className="bg-warning text-white p-2">📁 Archived Orders</h6>
                  {state.archivedOrders.length > 0 ? (
                    state.archivedOrders.map(renderArchivedCard)
                  ) : (
                    <p>No archived orders found.</p>
                  )}
                </div>
              )}

              {state.showDeletedOrders && (
                <div className="mt-4">
                  <h6 className="bg-danger text-white p-2">🗑 Deleted Orders</h6>
                  {state.deletedOrders.length > 0 ? (
                    state.deletedOrders.map(renderDeletedCard)
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
                    onClick={() => setState((prev) => ({ ...prev, showAddStaff: !prev.showAddStaff }))}
                  >
                    {state.showAddStaff ? "Cancel" : "Add Staff"}
                  </button>
                </div>
                <div className="card-body">
                  {state.showAddStaff && (
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Employee Name"
                        value={state.newStaff.employee_name}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            newStaff: { ...prev.newStaff, employee_name: e.target.value },
                          }))
                        }
                      />
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Employee Code"
                        value={state.newStaff.code}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            newStaff: { ...prev.newStaff, code: e.target.value },
                          }))
                        }
                      />
                      <select
                        className="form-control mb-2"
                        value={state.newStaff.role}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            newStaff: { ...prev.newStaff, role: e.target.value },
                          }))
                        }
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
                  {state.showEditStaff && (
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Employee Name"
                        value={state.showEditStaff.employee_name}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            showEditStaff: { ...prev.showEditStaff, employee_name: e.target.value },
                          }))
                        }
                      />
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Employee Code"
                        value={state.showEditStaff.code}
                        disabled
                      />
                      <select
                        className="form-control mb-2"
                        value={state.showEditStaff.role}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            showEditStaff: { ...prev.showEditStaff, role: e.target.value },
                          }))
                        }
                      >
                        <option value="">Select Role</option>
                        <option value="Admin">Admin</option>
                        <option value="Staff">Staff</option>
                      </select>
                      <button
                        className="btn btn-primary me-2"
                        onClick={() => editStaff(state.showEditStaff.code)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setState((prev) => ({ ...prev, showEditStaff: null }))}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {state.staffList.length > 0 ? (
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
                        {state.staffList.map((emp) => (
                          <tr key={emp.code}>
                            <td>{emp.employee_name}</td>
                            <td>{emp.code}</td>
                            <td>{emp.role}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-warning me-2"
                                onClick={() => setState((prev) => ({ ...prev, showEditStaff: emp }))}
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
                {state.orders
                  .filter((o) => o.current_status === "Waiting" && !o.archived)
                  .map((order) => renderOrderCard(order))}
              </div>
              <div className="col-md-8">
                <h6 className="bg-success text-white p-2">
                  🚀 Active Orders: {activeCount}
                </h6>
                {state.orders
                  .filter((o) => !["Waiting", "Ready", "Complete"].includes(o.current_status))
                  .map((order) => renderOrderCard(order))}
              </div>
            </div>
          )}
        </div>
      </div>

      {state.selectedOrder && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setState((prev) => ({ ...prev, selectedOrder: null }))}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-content ${getModalCategoryClass(state.selectedOrder.category)}`}>
              <div className="modal-header">
                <h5 className="modal-title">🧾 Order Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setState((prev) => ({ ...prev, selectedOrder: null }))}
                ></button>
              </div>
              <div className="modal-body">
                <p><strong>Transaction ID:</strong> {state.selectedOrder.transaction_id}</p>
                <p><strong>Customer:</strong> {state.selectedOrder.customer_name}</p>
                <p><strong>Contact:</strong> {state.selectedOrder.client_contact}</p>
                <p><strong>Paint:</strong> {state.selectedOrder.paint_type}</p>
                <p><strong>Category:</strong> {state.selectedOrder.category}</p>
                <p><strong>Quantity:</strong> {state.selectedOrder.paint_quantity}</p>
                <p><strong>Colour Code:</strong> {state.selectedOrder.colour_code}</p>
                <p><strong>Status:</strong> {state.selectedOrder.current_status}</p>
                <p><strong>Order Type:</strong> {state.selectedOrder.order_type}</p>
                <p><strong>PO Type:</strong> {state.selectedOrder.po_type || "N/A"}</p>
                <p><strong>Assigned To:</strong> {state.selectedOrder.assigned_employee || "Unassigned"}</p>
                <p><strong>Note:</strong> {state.selectedOrder.note || "No note"}</p>
                <div>
                  <textarea
                    className="form-control mb-2"
                    value={state.orderNote}
                    onChange={(e) => setState((prev) => ({ ...prev, orderNote: e.target.value }))}
                    placeholder="Add or edit note"
                  />
                  <button
                    className="btn btn-primary me-2"
                    onClick={() => updateNote(state.selectedOrder)}
                  >
                    Save Note
                  </button>
                  {state.userRole === "Admin" && (
                    <button
                      className="btn btn-danger"
                      onClick={() => setState((prev) => ({ ...prev, showCancelConfirm: state.selectedOrder.transaction_id }))}
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

      {state.showCancelConfirm && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setState((prev) => ({ ...prev, showCancelConfirm: null }))}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Order Cancellation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setState((prev) => ({ ...prev, showCancelConfirm: null }))}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to cancel order <strong>{state.showCancelConfirm}</strong>?</p>
                <textarea
                  className="form-control mb-2"
                  value={state.cancelReason}
                  onChange={(e) => setState((prev) => ({ ...prev, cancelReason: e.target.value }))}
                  placeholder="Enter reason for cancellation"
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setState((prev) => ({ ...prev, showCancelConfirm: null }))}
                >
                  Close
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => cancelOrder(state.showCancelConfirm)}
                  disabled={!state.cancelReason.trim()}
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.pendingColourUpdate && (
        <ColourCodeModal
          onSubmit={({ colourCode, employeeCode }) => {
            const fullOrder = state.orders.find((o) => o.transaction_id === state.pendingColourUpdate.orderId);
            updateStatus(fullOrder, state.pendingColourUpdate.newStatus, colourCode, employeeCode);
            setState((prev) => ({ ...prev, pendingColourUpdate: null }));
          }}
          onCancel={() => setState((prev) => ({ ...prev, pendingColourUpdate: null }))}
        />
      )}

      <ToastContainer
        className="position-fixed top-0 start-50 translate-middle-x p-3"
        style={{ zIndex: 9999 }}
      >
        <Toast
          bg={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
          show={toast.show}
          delay={toast.type === "danger" ? null : 4000}
          autohide={toast.type !== "danger"}
        >
          <Toast.Header
            closeButton={true}
            className="text-white"
            style={{
              backgroundColor: toast.type === "danger" ? "#dc3545" : "#198754",
            }}
          >
            <strong className="me-auto">
              {toast.type === "danger" ? "⚠️ Error" : "✅ Success"}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white fs-6 fw-bold text-center">
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default CardViewBOC;
