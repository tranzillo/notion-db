// src/components/standalone/DownloadInfoForm.jsx
import React, { useState } from 'react';

export default function DownloadInfoForm({ onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    useCase: ''
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Proceed directly to download without submitting info
  const handleSkip = () => {
    // Trigger the actual download
    initiateDownload();
    // Close the modal
    onClose();
  };

  // Check if the form has any data filled in
  const hasFormData = () => {
    return formData.name.trim() !== '' || 
           formData.email.trim() !== '' || 
           formData.organization.trim() !== '' || 
           formData.useCase.trim() !== '';
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      // Check if there's actually any data to submit
      if (hasFormData()) {
        // Only submit if at least one field has data
        const response = await fetch('/.netlify/functions/record-download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: formData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.warn('Form submission had an issue:', errorData);
          // Continue with download anyway
        }
      } else {
        console.log('No form data provided, skipping submission');
      }

      // Always trigger the download, regardless of form submission result
      initiateDownload();
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error during form submission:', error);
      // Still allow download even if submission fails
      initiateDownload();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to initiate the actual download
  const initiateDownload = () => {
    const downloadUrl = '/download/gapmap-data.zip';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'gapmap-data.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="download-modal-backdrop">
      <div className="download-modal">
        <button className="close-modal" onClick={onClose} aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2>Getting Your Data</h2>
        
        {showForm ? (
          <>
            <p>Help us improve Gap Map by sharing a bit about yourself. This information helps us understand who's using our data and how we can better serve the research community.</p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name (optional)"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Your email (optional)"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="organization">Organization</label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="Your organization (optional)"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="useCase">How will you use this data?</label>
                <textarea
                  id="useCase"
                  name="useCase"
                  rows="3"
                  value={formData.useCase}
                  onChange={handleChange}
                  placeholder="Tell us briefly how you plan to use this data (optional)"
                ></textarea>
              </div>
              <div className="form-group">
                <p class="license-info">This data is provided under the <a href="/license.txt" target="_blank">MIT License</a>.</p>
              </div>

              {formError && (
                <div className="form-error">
                  {formError}
                </div>
              )}
              
              <div className="form-actions">
                {/* <button 
                  type="button" 
                  className="skip-button"
                  onClick={handleSkip}
                >
                  Skip & Download
                </button> */}
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : hasFormData() ? 'Submit & Download' : 'Download'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="download-progress">
            <p>Your download is starting...</p>
            <div className="progress-indicator"></div>
          </div>
        )}
      </div>
    </div>
  );
}