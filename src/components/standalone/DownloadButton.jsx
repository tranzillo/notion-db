// src/components/standalone/DownloadButton.jsx
import React, { useState } from 'react';
import DownloadInfoForm from './DownloadInfoForm';

export default function DownloadButton({ className = '', buttonText = 'Download Dataset (.zip)' }) {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <button 
        className={`download-button ${className}`}
        onClick={handleOpenModal}
      >
        {buttonText}
      </button>

      {showModal && (
        <DownloadInfoForm onClose={handleCloseModal} />
      )}
    </>
  );
}