import React from "react";
import "./QueueDashboard.css";

const QueueDashboard = ({ waitingOrders, activeOrders }) => {
  return (
    <div className="queue-container">
      {/* Waiting List */}
      <section className="waiting-list">
        <h2>Waiting List</h2>
        <div className="waiting-feed">
          {waitingOrders.map((order) => (
            <div key={order.id} className="waiting-card">
              <span className="name">{order.customer}</span>
              <span className="ticket">#{order.ticket}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Active Orders */}
      <section className="active-orders">
        <h2>Active Orders</h2>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Employee</th>
              <th>Start Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {activeOrders.map((order) => (
              <tr key={order.id} className={order.recentlyUpdated ? "pulse" : ""}>
                <td>{order.customer}</td>
                <td>{order.assignedTo}</td>
                <td>{order.startTime}</td>
                <td>
                  <span className={`badge ${order.status}`}>{order.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default QueueDashboard;