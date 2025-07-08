import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://queue-backendser.onrender.com";

const AdminOrders = ({ userRole }) => {
    const [readyOrders, setReadyOrders] = useState([]);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("success");
    const [showToast, setShowToast] = useState(false);

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
            triggerToast("❌ Error fetching ready orders.", "danger");
        }
    };

    const markAsPaid = async (orderId) => {
        if (userRole !== "Admin") {
            triggerToast("❌ Only Admins can mark orders as Paid!", "danger");
            return;
        }

        try {
            await axios.put(`${BASE_URL}/api/orders/mark-paid/${orderId}`, { userRole });
            triggerToast("✅ Order has been Completed!");
            fetchReadyOrders();
        } catch (error) {
            triggerToast("❌ Error marking order as Complete.", "danger");
        }
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
                                              onClick={() => markAsPaid(order.transaction_id)}
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
