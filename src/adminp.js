import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toast, ToastContainer, Modal, Button, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://queue-backendser.onrender.com";

const AdminOrders = ({ userRole }) => {
    const [readyOrders, setReadyOrders] = useState([]);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("success");
    const [showToast, setShowToast] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [employeeCode, setEmployeeCode] = useState("");
    const [codeError, setCodeError] = useState("");

    useEffect(() => {
        fetchReadyOrders();
    }, []);

    const triggerToast = (message, type = "success") => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const fetchReadyOrders = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/orders/admin`);
            setReadyOrders(response.data);
        } catch (error) {
            console.error("Error fetching orders:", error);
            triggerToast("❌ Error fetching ready orders.", "danger");
        }
    };

    const handleMarkAsPaidClick = (orderId) => {
        if (userRole !== "Admin") {
            triggerToast("❌ Only Admins can mark orders as Paid!", "danger");
            return;
        }
        setSelectedOrderId(orderId);
        setShowCodeModal(true);
    };

    const handleCodeSubmit = async () => {
        if (!employeeCode.trim()) {
            setCodeError("Employee code is required");
            return;
        }

        try {
            // Verify employee code with the backend
            const response = await axios.get(`${BASE_URL}/api/employees`, {
                params: { code: employeeCode.trim() }
            });

            // If employee code is valid, proceed with marking order as paid
            await axios.put(`${BASE_URL}/api/orders/mark-paid/${selectedOrderId}`, { userRole });
            triggerToast(`✅ Order has been Completed! Verified by: ${response.data.employee_name}`);
            fetchReadyOrders();
            setShowCodeModal(false);
            setEmployeeCode("");
            setCodeError("");
        } catch (error) {
            if (error.response?.status === 404) {
                setCodeError("Invalid employee code");
            } else {
                triggerToast("❌ Error marking order as Complete.", "danger");
                setCodeError("Error verifying employee code");
            }
        }
    };

    const handleModalClose = () => {
        setShowCodeModal(false);
        setEmployeeCode("");
        setCodeError("");
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">💰 Incomplete Orders</h5>
                    <Link
                        to="/add-order"
                        className="btn btn-light fw-bold rounded-pill px-4 py-2"
                        style={{ fontSize: "1rem" }}
                    >
                        ← Back To Add Order
                    </Link>
                </div>
                <div className="card-body">
                    {readyOrders.length > 0 ? (
                        <table className="table table-bordered">
                            <thead className="table-light">
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Customer</th>
                                    <th>Customer No.</th>
                                    <th>Quantity</th>
                                    <th>Paint Details</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {readyOrders.map((order) => (
                                    <tr key={order.transaction_id}>
                                        <td>{order.transaction_id}</td>
                                        <td>{order.customer_name}</td>
                                        <td>{order.client_contact}</td>
                                        <td>{order.paint_quantity || "0.00"}</td>
                                        <td>{order.paint_type}</td>
                                        <td>
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => handleMarkAsPaidClick(order.transaction_id)}
                                                disabled={showCodeModal} // Disable while modal is open
                                            >
                                                {order.order_type === "Order" ? "💰 Mark as Paid" : "✅ Mark as Complete"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-muted">No unpaid orders found.</p>
                    )}
                </div>
            </div>

            {/* Employee Code Modal */}
            <Modal show={showCodeModal} onHide={handleModalClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Action</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="employeeCode">
                            <Form.Label>Enter Employee Code</Form.Label>
                            <Form.Control
                                type="text"
                                value={employeeCode}
                                onChange={(e) => setEmployeeCode(e.target.value)}
                                isInvalid={!!codeError}
                                placeholder="Enter your employee code"
                                autoFocus
                            />
                            <Form.Control.Feedback type="invalid">
                                {codeError}
                            </Form.Control.Feedback>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleModalClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleCodeSubmit}>
                        Confirm
                    </Button>
                </Modal.Footer>
            </Modal>

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
