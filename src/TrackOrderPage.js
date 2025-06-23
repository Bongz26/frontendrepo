import React, { useState } from "react";
import axios from "axios";

const TrackOrderPage = () => {
    const [trackID, setTrackID] = useState("");
    const [orderStatus, setOrderStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    const checkOrderStatus = async () => {
        try {
            const response = await axios.get(`https://75fd-105-247-140-128.ngrok-free.app/order-status/${trackID}`);
            setOrderStatus(response.data);
            setErrorMessage("");
        } catch (error) {
            setErrorMessage("Order not found. Please check your TrackID.");
            setOrderStatus(null);
        }
    };

    return (
        <div className="container mt-4">
            <h2>Track Your Order</h2>
            <input
                type="text"
                className="form-control"
                placeholder="Enter TrackID"
                value={trackID}
                onChange={(e) => setTrackID(e.target.value)}
            />
            <button className="btn btn-primary mt-3" onClick={checkOrderStatus}>Check Status</button>

            {orderStatus && (
                <div className="mt-4">
                    <h4>Status: {orderStatus.status}</h4>
                    <h4>Estimated Completion: {new Date(orderStatus.estimatedCompletion).toLocaleString()}</h4>
                </div>
            )}

            {errorMessage && <p className="text-danger mt-3">{errorMessage}</p>}
        </div>
    );
};

export default TrackOrderPage;