import React, { useState } from "react";
import "./styles/LoginPopup.css";

const LoginPopup = ({ onLogin, onClose }) => {
  const [role, setRole] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (["Admin", "User"].includes(role)) {
      onLogin(role);
      onClose();
    } else {
      alert("❌ Invalid role! Use 'Admin' or 'User'");
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-box shadow">
        <h5 className="text-center mb-3">🔐 Select Role</h5>
        <form onSubmit={handleSubmit}>
          <select
            className="form-select mb-3"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Choose Role</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
          <div className="d-flex justify-content-between">
            <button type="submit" className="btn btn-primary btn-sm">Login</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPopup;
