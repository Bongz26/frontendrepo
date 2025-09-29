import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Toast, ToastContainer, Collapse } from "react-bootstrap";
import { Link } from "react-router-dom";
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
    readyOrders: [],
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
    filterPoType: "All",
    showCancelConfirm: null,
    cancelReason: "",
    loading: false,
    showOnlyReady: false,
    showReady: true,
    showWaiting: true,
    showActive: true,
    showComplete: true,
    completeOrders: [],
    // Edit order states
    showEditModal: false,
    editingOrder: null,
    editFormData: {
      customer_name: "",
      client_contact: "",
      paint_type: "",
      paint_quantity: "",
      colour_code: "",
      category: "",
      po_type: "",
      note: ""
    },
  });

  const { toast, triggerToast, setToast } = useToast();

  // Set default filter to "Ready" for Admins
  useEffect(() => {
    if (state.userRole === "Admin") {
      setState((prev) => ({ ...prev, filterStatus: "Ready" }));
    }
  }, [state.userRole]);

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

  const fetchReadyOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/orders/admin`);
      setState((prev) => ({ ...prev, readyOrders: response.data }));
    } catch (err) {
      console.error("Error fetching ready orders:", err);
      triggerToast("❌ Error fetching ready orders.", "danger");
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

  const fetchCompleteOrders = useCallback(async () => {
    try {
      // For now, we'll use a mock approach since the backend doesn't have a complete orders endpoint
      // In a real implementation, you'd add this endpoint to your backend
      console.log("Note: Complete orders endpoint not available in backend yet");
      setState((prev) => ({ ...prev, completeOrders: [] }));
    } catch (err) {
      console.error("Error fetching complete orders:", err);
      triggerToast("Error fetching complete orders.", "danger");
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
      fetchReadyOrders();
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
      fetchReadyOrders();
      triggerToast("Note updated successfully!", "success");
    } catch (err) {
      console.error("Error updating note:", err);
      triggerToast(err.response?.data?.error || "Error updating note.", "danger");
    }
  };

  const markAsPaid = async (orderId) => {
    if (state.userRole !== "Admin") {
      triggerToast("❌ Only Admins can mark orders as Paid!", "danger");
      return;
    }

    try {
      await axios.put(`${BASE_URL}/api/orders/mark-paid/${orderId}`, { userRole: state.userRole });
      triggerToast("✅ Order has been Completed!");
      fetchOrders();
      fetchReadyOrders();
    } catch (err) {
      console.error("Error marking order as Complete:", err);
      triggerToast("❌ Error marking order as Complete.", "danger");
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
    let shouldPromptEmp =
      isFromWaitingToMixing || isMixingToSpraying || isSprayingToRemix || isRemixToSpraying || isSprayingToReadyOthers;

    // For reverts from Ready, prompt for employee
    if (fromStatus === "Ready") {
      shouldPromptEmp = true;
    }

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
      setTimeout(() => {
        fetchOrders();
        fetchReadyOrders();
      }, 500);
      setState((prev) => ({ ...prev, orderNote: "" }));
      triggerToast("Status updated successfully!", "success");
    } catch (err) {
      console.error("Error updating status:", err);
      triggerToast("Error updating status!", "danger");
    }
  };

  // Handle revert from Ready
  const handleRevert = async (order, newStatus) => {
    if (!newStatus) return;

    const reason = prompt(`Reason for reverting to ${newStatus}:`);
    if (!reason?.trim()) {
      triggerToast("Reason required!", "danger");
      return;
    }

    setState((prev) => ({ ...prev, selectedOrder: order }));

    const newNote = `${order.note ? order.note + "\n" : ""}Revert from Ready to ${newStatus}: ${reason}`;
    setState((prev) => ({ ...prev, orderNote: newNote }));

    await updateStatus(order, newStatus, order.colour_code, order.assigned_employee);

    setState((prev) => ({ ...prev, orderNote: "", selectedOrder: null }));
  };

  // Edit order functionality
  const handleEditOrder = (order) => {
    console.log("Editing order:", order);
    console.log("Order transaction_id:", order.transaction_id);
    
    setState((prev) => ({
      ...prev,
      editingOrder: order,
      editFormData: {
        customer_name: order.customer_name || "",
        client_contact: order.client_contact || "",
        paint_type: order.paint_type || "",
        paint_quantity: order.paint_quantity || "",
        colour_code: order.colour_code || "",
        category: order.category || "",
        po_type: order.po_type || "",
        note: order.note || ""
      },
      showEditModal: true
    }));
  };

  const handleEditFormChange = (field, value) => {
    setState((prev) => ({
      ...prev,
      editFormData: {
        ...prev.editFormData,
        [field]: value
      }
    }));
  };

  const handleSaveEdit = async () => {
    if (!state.editingOrder) return;

    try {
      // Prepare the data according to what the backend expects
      const updateData = {
        current_status: state.editingOrder.current_status, // Keep current status
        assigned_employee: state.editingOrder.assigned_employee || null, // Keep current employee
        colour_code: state.editFormData.colour_code || "Pending",
        note: state.editFormData.note || null,
        userRole: state.userRole,
        old_status: state.editingOrder.current_status,
        po_type: state.editFormData.po_type || null
      };

      // Ensure colour_code is not empty string for Ready orders
      if (state.editingOrder.current_status === "Ready" && updateData.colour_code === "Pending") {
        updateData.colour_code = state.editFormData.colour_code || "Pending";
      }

      console.log("Updating order with data:", updateData);
      console.log("Order ID:", state.editingOrder.transaction_id);
      console.log("Order ID type:", typeof state.editingOrder.transaction_id);
      console.log("Order ID length:", state.editingOrder.transaction_id?.length);

      // Validate required fields based on backend requirements
      if (state.editingOrder.current_status !== "Waiting" && !updateData.assigned_employee) {
        triggerToast("❌ Employee must be assigned for this order status!", "danger");
        return;
      }

      if (state.editingOrder.current_status === "Ready" && (!updateData.colour_code || updateData.colour_code.trim() === "")) {
        triggerToast("❌ Colour Code is required for Ready orders!", "danger");
        return;
      }

      // Validate PO Type for Paid orders
      if (state.editingOrder.order_type === "Paid" && updateData.po_type && !["Nexa", "Carvello"].includes(updateData.po_type)) {
        triggerToast("❌ PO Type must be 'Nexa' or 'Carvello' for Paid orders!", "danger");
        return;
      }

      // Validate order ID
      if (!state.editingOrder.transaction_id || state.editingOrder.transaction_id.trim() === "") {
        triggerToast("❌ Invalid order ID!", "danger");
        return;
      }

      // Try with URL encoding first, then without if that fails
      let fullUrl = `${BASE_URL}/api/orders/${encodeURIComponent(state.editingOrder.transaction_id)}`;
      console.log("Encoded order ID:", encodeURIComponent(state.editingOrder.transaction_id));
      console.log("Full URL:", fullUrl);
      console.log("Request data:", updateData);
      
      try {
        const response = await axios.put(fullUrl, updateData);
        console.log("Success response:", response.data);
      } catch (firstError) {
        console.log("First attempt failed, trying without encoding...");
        console.log("First error:", firstError.response?.data);
        console.log("First error status:", firstError.response?.status);
        fullUrl = `${BASE_URL}/api/orders/${state.editingOrder.transaction_id}`;
        console.log("Retry URL:", fullUrl);
        const response = await axios.put(fullUrl, updateData);
        console.log("Retry success response:", response.data);
      }
      triggerToast("✅ Order updated successfully!");
      setState((prev) => ({
        ...prev,
        showEditModal: false,
        editingOrder: null,
        editFormData: {
          customer_name: "",
          client_contact: "",
          paint_type: "",
          paint_quantity: "",
          colour_code: "",
          category: "",
          po_type: "",
          note: ""
        }
      }));
      fetchOrders();
      fetchReadyOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error headers:", error.response?.headers);
      triggerToast(`❌ Error updating order: ${error.response?.data?.error || error.message}`, "danger");
    }
  };

  const handleCloseEditModal = () => {
    setState((prev) => ({
      ...prev,
      showEditModal: false,
      editingOrder: null,
      editFormData: {
        customer_name: "",
        client_contact: "",
        paint_type: "",
        paint_quantity: "",
        colour_code: "",
        category: "",
        po_type: "",
        note: ""
      }
    }));
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

  // Card rendering function
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
              <div className="d-flex gap-1 mt-1">
                <select
                  className="form-select form-select-sm"
                  style={{ minWidth: "130px" }}
                  onClick={(e) => e.stopPropagation()}
                  value={order.current_status}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateStatus(order, e.target.value, order.colour_code, order.assigned_employee);
                  }}
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
                {state.userRole === "Admin" && (
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditOrder(order);
                    }}
                    title="Edit Order"
                  >
                    ✏️
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderReadyOrderRow = (order) => (
    <tr
      key={order.transaction_id}
      className={state.selectedOrder?.transaction_id === order.transaction_id ? "selected-order" : ""}
      style={{ cursor: "pointer" }}
      onClick={() => setState((prev) => ({ ...prev, selectedOrder: order }))}
    >
      <td>{order.transaction_id}</td>
      <td>{order.customer_name}</td>
      <td>{order.client_contact}</td>
      <td>{order.paint_quantity || "0.00"}</td>
      <td>{order.paint_type}</td>
      <td>{order.po_type || "N/A"}</td>
      <td>{order.note || "No note"}</td>
      <td>{order.assigned_employee || "Unassigned"}</td>
      <td>
        <ElapsedTime statusStartedAt={order.status_started_at} fallbackTime={order.start_time} />
      </td>
      <td>
        <select
          className="form-select form-select-sm me-2"
          style={{ display: "inline-block", width: "auto" }}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            handleRevert(order, e.target.value);
          }}
        >
          <option value="">Revert to...</option>
          <option value="Spraying">Spraying</option>
          <option value="Re-Mixing">Re-Mixing</option>
        </select>
      </td>
      <td>
        <button
          className="btn btn-warning btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEditOrder(order);
          }}
          title="Edit Order"
        >
          ✏️ Edit
        </button>
      </td>
      <td>
        <button
          className="btn btn-success btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            markAsPaid(order.transaction_id);
          }}
        >
          {order.order_type === "Order" ? "💰 Mark as Paid" : "✅ Mark as Complete"}
        </button>
      </td>
    </tr>
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
      fetchWithRetry(fetchReadyOrders, "ready orders");
      fetchWithRetry(fetchArchivedOrders, "archived orders");
      fetchWithRetry(fetchCompleteOrders, "complete orders");
    }
    const interval = setInterval(() => {
      fetchOrders();
      if (state.userRole === "Admin") {
        fetchReadyOrders();
        fetchCompleteOrders();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchReadyOrders, fetchStaff, fetchArchivedOrders, fetchCompleteOrders, state.userRole]);

  // Order filtering
  const waitingCount = state.orders.filter((o) => o.current_status === "Waiting").length;
  const activeCount = state.orders.filter((o) => !["Waiting", "Ready", "Complete"].includes(o.current_status)).length;
  const readyCount = state.readyOrders.length;
  const completeCount = state.completeOrders.length;
  const filteredOrders = state.orders.filter(
    (o) =>
      (state.userRole === "Admin" ? !["Complete"].includes(o.current_status) : !["Ready", "Complete"].includes(o.current_status)) &&
      (state.filterStatus === "All" || o.current_status === state.filterStatus) &&
      (state.filterCategory === "All" || o.category === state.filterCategory) &&
      (state.filterPoType === "All" || o.po_type === state.filterPoType)
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
          .selected-order td {
            background-color: #fff3cd !important;
          }
        `}
      </style>

      <div className="card mb-3 shadow-sm border-0">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">🎨 Queue System Dashboard</h5>
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

          <div className="d-flex justify-content-between mb-3">
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                fetchOrders();
                if (state.userRole === "Admin") {
                  fetchReadyOrders();
                  fetchCompleteOrders();
                }
              }}
              disabled={state.loading}
            >
              {state.loading ? "Refreshing..." : "🔄 Refresh"}
            </button>
            <Link
              to="/add-"
              className="btn btn-light fw-bold rounded-pill px-4 py-2"
              style={{ fontSize: "1rem" }}
            >
              ← Back To Add Order
            </Link>
          </div>

          {state.userRole === "Admin" && (
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
                className="btn btn-outline-danger me-2"
                onClick={() => {
                  setState((prev) => ({ ...prev, showDeletedOrders: !prev.showDeletedOrders }));
                  if (!state.showDeletedOrders) fetchDeletedOrders();
                }}
              >
                {state.showDeletedOrders ? "Hide Deleted Orders" : "Show Deleted Orders"}
              </button>
              <button
                className="btn btn-outline-secondary me-2"
                onClick={() => setState((prev) => ({ ...prev, showOnlyReady: !prev.showOnlyReady }))}
              >
                {state.showOnlyReady ? "Show All Orders" : "Show Only Ready Orders"}
              </button>
              <button
                className="btn btn-outline-success"
                onClick={() => {
                  setState((prev) => ({ ...prev, showComplete: !prev.showComplete }));
                  if (!state.showComplete) fetchCompleteOrders();
                }}
              >
                {state.showComplete ? "Hide Complete Orders" : "Show Complete Orders"}
              </button>
            </div>
          )}

          {state.userRole === "Admin" && (
            <>
              {/* Order Summary Dashboard */}
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="card bg-primary text-white">
                    <div className="card-body text-center">
                      <h5 className="card-title">📋 Waiting</h5>
                      <h2 className="card-text">{waitingCount}</h2>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-info text-white">
                    <div className="card-body text-center">
                      <h5 className="card-title">🚀 Active</h5>
                      <h2 className="card-text">{activeCount}</h2>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-secondary text-white">
                    <div className="card-body text-center">
                      <h5 className="card-title">✅ Ready</h5>
                      <h2 className="card-text">{readyCount}</h2>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-success text-white">
                    <div className="card-body text-center">
                      <h5 className="card-title">🎉 Complete</h5>
                      <h2 className="card-text">{completeCount}</h2>
                    </div>
                  </div>
                </div>
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
                  className="form-select form-select-sm me-2"
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
                <select
                  className="form-select form-select-sm"
                  value={state.filterPoType}
                  onChange={(e) => setState((prev) => ({ ...prev, filterPoType: e.target.value }))}
                  style={{ display: "inline-block", width: "auto" }}
                >
                  <option value="All">All PO Types</option>
                  <option value="Nexa">Nexa</option>
                  <option value="Carvello">Carvello</option>
                </select>
              </div>

              <h6 className="bg-secondary text-white p-2">
                ✅ Ready Orders ({readyCount})
                <button
                  className="btn btn-sm btn-outline-light ms-2"
                  onClick={() => setState((prev) => ({ ...prev, showReady: !prev.showReady }))}
                >
                  {state.showReady ? "Hide" : "Show"}
                </button>
              </h6>
              <Collapse in={state.showReady}>
                <div>
                  {state.readyOrders.length > 0 ? (
                    <div className="card shadow-sm border-0 mb-3">
                      <div className="card-body p-0">
                        <table className="table table-bordered mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Transaction ID</th>
                              <th>Customer</th>
                              <th>Customer No.</th>
                              <th>Quantity</th>
                              <th>Paint Details</th>
                              <th>PO Type</th>
                              <th>Note</th>
                              <th>Assigned To</th>
                              <th>Time in Status</th>
                              <th>Revert</th>
                              <th>Edit</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.readyOrders
                              .filter(
                                (o) =>
                                  (state.filterCategory === "All" || o.category === state.filterCategory) &&
                                  (state.filterPoType === "All" || o.po_type === state.filterPoType)
                              )
                              .map((order) => renderReadyOrderRow(order))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted">No ready orders found.</p>
                  )}
                </div>
              </Collapse>

              <h6 className="bg-success text-white p-2 mt-3">
                ✅ Complete Orders ({completeCount})
                <button
                  className="btn btn-sm btn-outline-light ms-2"
                  onClick={() => setState((prev) => ({ ...prev, showComplete: !prev.showComplete }))}
                >
                  {state.showComplete ? "Hide" : "Show"}
                </button>
              </h6>
              <Collapse in={state.showComplete}>
                <div>
                  {state.completeOrders.length > 0 ? (
                    <div className="card shadow-sm border-0 mb-3">
                      <div className="card-body p-0">
                        <table className="table table-bordered mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Transaction ID</th>
                              <th>Customer</th>
                              <th>Customer No.</th>
                              <th>Quantity</th>
                              <th>Paint Details</th>
                              <th>Category</th>
                              <th>PO Type</th>
                              <th>Colour Code</th>
                              <th>Completed By</th>
                              <th>Completion Time</th>
                              <th>Edit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.completeOrders
                              .filter(
                                (o) =>
                                  (state.filterCategory === "All" || o.category === state.filterCategory) &&
                                  (state.filterPoType === "All" || o.po_type === state.filterPoType)
                              )
                              .map((order) => (
                                <tr key={order.transaction_id}>
                                  <td>{order.transaction_id}</td>
                                  <td>{order.customer_name}</td>
                                  <td>{order.client_contact}</td>
                                  <td>{order.paint_quantity || "0.00"}</td>
                                  <td>{order.paint_type}</td>
                                  <td>{order.category}</td>
                                  <td>{order.po_type || "N/A"}</td>
                                  <td>{order.colour_code || "N/A"}</td>
                                  <td>{order.assigned_employee || "N/A"}</td>
                                  <td>
                                    {order.completed_at ? new Date(order.completed_at).toLocaleString() : "N/A"}
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-warning btn-sm"
                                      onClick={() => handleEditOrder(order)}
                                      title="Edit Order"
                                    >
                                      ✏️ Edit
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted">No complete orders found.</p>
                  )}
                </div>
              </Collapse>

              {!state.showOnlyReady && (
                <>
                  <h6 className="bg-primary text-white p-2 mt-3">
                    📋 Waiting Orders ({waitingCount})
                    <button
                      className="btn btn-sm btn-outline-light ms-2"
                      onClick={() => setState((prev) => ({ ...prev, showWaiting: !prev.showWaiting }))}
                    >
                      {state.showWaiting ? "Hide" : "Show"}
                    </button>
                  </h6>
                  <Collapse in={state.showWaiting}>
                    <div>
                      {filteredOrders.filter((o) => o.current_status === "Waiting").length > 0 ? (
                        filteredOrders
                          .filter((o) => o.current_status === "Waiting")
                          .map((order) => renderOrderCard(order))
                      ) : (
                        <p>No waiting orders match the selected filters.</p>
                      )}
                    </div>
                  </Collapse>

                  <h6 className="bg-success text-white p-2 mt-3">
                    🚀 Active Orders ({activeCount})
                    <button
                      className="btn btn-sm btn-outline-light ms-2"
                      onClick={() => setState((prev) => ({ ...prev, showActive: !prev.showActive }))}
                    >
                      {state.showActive ? "Hide" : "Show"}
                    </button>
                  </h6>
                  <Collapse in={state.showActive}>
                    <div>
                      {filteredOrders.filter((o) => !["Waiting", "Ready", "Complete"].includes(o.current_status)).length > 0 ? (
                        filteredOrders
                          .filter((o) => !["Waiting", "Ready", "Complete"].includes(o.current_status))
                          .map((order) => renderOrderCard(order))
                      ) : (
                        <p>No active orders match the selected filters.</p>
                      )}
                    </div>
                  </Collapse>
                </>
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
          )}

          {state.userRole !== "Admin" && (
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
                <p><strong>Colour Code:</strong> {state.selectedOrder.colour_code || "N/A"}</p>
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
                  {state.userRole === "Admin" && state.selectedOrder.current_status === "Ready" && (
                    <button
                      className="btn btn-success me-2"
                      onClick={() => markAsPaid(state.selectedOrder.transaction_id)}
                    >
                      {state.selectedOrder.order_type === "Order" ? "💰 Mark as Paid" : "✅ Mark as Complete"}
                    </button>
                  )}
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
          onSubmit={async ({ colourCode, employeeCode }) => {
            try {
              const res = await axios.get(`${BASE_URL}/api/employees?code=${employeeCode}`);
              if (!res.data?.employee_name) {
                triggerToast("Invalid employee code!", "danger");
                return;
              }
              const employeeName = res.data.employee_name;
              const fullOrder = state.orders.find((o) => o.transaction_id === state.pendingColourUpdate.orderId) ||
                               state.readyOrders.find((o) => o.transaction_id === state.pendingColourUpdate.orderId);
              updateStatus(fullOrder, state.pendingColourUpdate.newStatus, colourCode, employeeName);
              setState((prev) => ({ ...prev, pendingColourUpdate: null }));
            } catch {
              triggerToast("Unable to verify employee!", "danger");
            }
          }}
          onCancel={() => setState((prev) => ({ ...prev, pendingColourUpdate: null }))}
        />
      )}

      {/* Edit Order Modal */}
      {state.showEditModal && (
        <div className="modal d-block" tabIndex="-1" onClick={handleCloseEditModal}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">✏️ Edit Order - {state.editingOrder?.transaction_id}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseEditModal}
                ></button>
              </div>
              <div className="modal-body">
                {/* Display read-only order info */}
                <div className="alert alert-info mb-3">
                  <strong>Order Details (Read-only):</strong><br/>
                  <strong>Customer:</strong> {state.editingOrder?.customer_name}<br/>
                  <strong>Contact:</strong> {state.editingOrder?.client_contact}<br/>
                  <strong>Paint Type:</strong> {state.editingOrder?.paint_type}<br/>
                  <strong>Quantity:</strong> {state.editingOrder?.paint_quantity}<br/>
                  <strong>Category:</strong> {state.editingOrder?.category}
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">PO Type</label>
                    <select
                      className="form-select"
                      value={state.editFormData.po_type}
                      onChange={(e) => handleEditFormChange('po_type', e.target.value)}
                    >
                      <option value="">Select PO Type</option>
                      <option value="Nexa">Nexa</option>
                      <option value="Carvello">Carvello</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Colour Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={state.editFormData.colour_code}
                      onChange={(e) => handleEditFormChange('colour_code', e.target.value)}
                      placeholder="Enter colour code"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={state.editFormData.note}
                    onChange={(e) => handleEditFormChange('note', e.target.value)}
                    placeholder="Enter any additional notes"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseEditModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        className="position-fixed top-0 start-50 translate-middle-x p-3"
        style={{ zIndex: 9999 }}
      >
        <Toast
          bg={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
          show={toast.show}
          delay={toast.type === "danger" ? null : 3500}
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
