import React from "react";
import "./Modal.css";

interface ModalProps{
	// isOpen: boolean;
  onClose: () => void;
}

 const  Modal: React.FC<ModalProps> = ( { onClose }) =>{
  return (
    <div className="modalBackground">
      <div className="modalContainer">
        <div className="titleCloseBtn">
          <button
            onClick={
              onClose
            }
          >
            X
          </button>
        </div>
        <div className="title">Do you want to save the search results?
        </div>
        <div className="body">
          <p>The next page looks amazing. Hope you want to go there!</p>
        </div>
        <div className="footer">
          <button
            onClick={onClose}
            id="cancelBtn"
          >
            Cancel
          </button>
          <button>Continue</button>
        </div>
      </div>
    </div>
  );
}


export default Modal;
