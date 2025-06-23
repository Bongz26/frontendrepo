import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard"; // Adjust path if needed
import TrackOrderPage from "./TrackOrderPage";
import AddOrder from "./Add_Order";
import AdminOrders from "./AdminOrders";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/queueStyles.css";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/add-order" element={<AddOrder />} />
        <Route path="/admin-orders" element={<AdminOrders userRole="Admin" />} />
      </Routes>
    </Router>
  );
};

export default App;
