import React, { useState, useEffect } from "react";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";
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
            triggerToast("✅ Order marked as Paid!");
            fetchReadyOrders();
        } catch (error) {
            triggerToast("❌ Error marking order as Paid.", "danger");
        }
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">💰 Unpaid Orders</h5>
                </div>
                <div className="card-body">
                    {readyOrders.length > 0 ? (
                        <table className="table table-bordered">
                            <thead className="table-light">
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Customer</th>
                                    <th>Customer No.</th>
                                    <th>Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {readyOrders.map((order) => (
                                    <tr key={order.transaction_id}>
                                        <td>{order.transaction_id}</td>
                                        <td>{order.customer_name}</td>
                                        <td>{order.client_contact}</td>
                                        <td>R{order.amount || "0.00"}</td>
                                        <td>
                                            <button 
                                                onClick={() => markAsPaid(order.transaction_id)} 
                                                className="btn btn-success"
                                            >
                                                ✅ Mark as Paid
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
