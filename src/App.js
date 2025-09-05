import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard"; // Adjust path if needed
import CardView from "./testcards"; 
import CardViewBO from "./cardsWBO"
import TrackOrderPage from "./TrackOrderPage";
import AddOrder from "./Add_Order";
import AdminOrders from "./AdminOrders";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/queueStyles.css";
import QueueDashboard from "./components/QueueDashboard";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/add-order" element={<AddOrder />} />
        <Route path="/add-" element={<AddOrderC />} />
        <Route path="/test-cards" element={<CardView />} />
        <Route path="/proqueue" element={<CardViewBO />} />
        <Route path="/admin-orders" element={<AdminOrders userRole="Admin" />} />
         <Route path="/test-queue" element={<QueueDashboard waitingOrders={[]} activeOrders={[]} />} />
      </Routes>
    </Router>
  );
};

export default App;
