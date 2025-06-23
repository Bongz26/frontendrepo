import React, { useState } from "react";
import "./styles/ColourCodeModal.css";

const ColourCodeModal = ({ onSubmit, onCancel }) => {
  const [code, setCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      alert("❌ Colour Code is required! CCM");
      return;
    }
    onSubmit(code.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box shadow">
        <h5 className="mb-3">🎨 Enter Colour Code CCM</h5>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="e.g. VW-1234"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          <div className="d-flex justify-content-between">
            <button type="submit" className="btn btn-primary btn-sm">Submit</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColourCodeModal;
