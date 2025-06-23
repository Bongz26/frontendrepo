import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "https://queue-backendser.onrender.com";

const AdminOrders = ({ userRole }) => {
    const [readyOrders, setReadyOrders] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchReadyOrders();
    }, []);

    const fetchReadyOrders = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/orders/admin`);
            setReadyOrders(response.data);
        } catch (error) {
            setError("Error fetching ready orders.");
        }
    };

    const markAsPaid = async (orderId) => {
        if (userRole !== "Admin") {
            alert("❌ Only Admins can mark orders as Paid!");
            return;
        }

        try {
            await axios.put(`${BASE_URL}/api/orders/mark-paid/${orderId}`, { userRole });
            alert("✅ Order marked as Paid!");
            fetchReadyOrders();
        } catch (error) {
            setError("Error marking order as Paid.");
        }
    };

    return (
        <div className="container mt-4">
            <h2> Unpaid Orders </h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>Customer</th>
                        <th>Customer No.</th>
                        <th>Amount</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {readyOrders.map(order => (
                        <tr key={order.transaction_id}>
                            <td>{order.transaction_id}</td>
                            <td>{order.customer_name}</td>
                            <td>{order.client_contact}</td>
                            <td>{order.paint_quantity}</td>
                            <td>
                                <button onClick={() => markAsPaid(order.transaction_id)} className="btn btn-success">
                                    Mark as Paid
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminOrders;
