import React, { useState } from "react";
import "./styles/ColourCodeModal.css";

const ColourCodeModal = ({ onSubmit, onCancel }) => {
  const [code, setCode] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");

  const handleSubmit = (e) => {
    if (e) e.preventDefault(); // prevent page reload on Enter

    if (!code.trim()) {
      alert("❌ Colour Code is required!");
      return;
    }
    if (!employeeCode.trim()) {
      alert("❌ Employee Code is required!");
      return;
    }

    onSubmit({ colourCode: code.trim(), employeeCode: employeeCode.trim() });
  };

  return (
    <div className="modal d-block" tabIndex="-1" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow">
          <div className="modal-header bg-dark text-white">
            <h5 className="modal-title">🎨 Enter Colour & Employee Code</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Colour Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 5W (HV4L)"
                  autoFocus
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Employee Code</label>
                <input
                  type="password"
                  className="form-control"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ColourCodeModal;
