import React, { useState } from 'react';

export default function ContributeFormSimple({ disciplines = [] }) {
  const [activeTab, setActiveTab] = useState('bottleneck');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form data state
  const [bottleneckData, setBottleneckData] = useState({
    title: '',
    content: '',
    disciplineId: '',
    rank: 3
  });
  
  // Reset form when switching tabs
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setFormError('');
    setSuccessMessage('');
  };
  
  // Form submission handlers
  const handleBottleneckSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    setSuccessMessage('');
    
    try {
      // Use the simplified function instead
      const response = await fetch('/.netlify/functions/submit-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'bottleneck',
          data: bottleneckData
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to submit');
      }
      
      // Show success message instead of redirecting
      setSuccessMessage('Submission successful! Response: ' + JSON.stringify(responseData));
      
      // Clear form
      setBottleneckData({
        title: '',
        content: '',
        disciplineId: '',
        rank: 3
      });
      
    } catch (error) {
      console.error('Error submitting bottleneck:', error);
      setFormError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="contribute-form">
      <div className="contribute-form__info">
        <p>
          <strong>SIMPLIFIED TEST VERSION:</strong> This form uses a simplified submission function for testing.
          Submissions are not actually sent to Notion in this test version.
        </p>
      </div>

      <div className="contribute-form__tabs">
        <button
          className={`contribute-form__tab ${activeTab === 'bottleneck' ? 'active' : ''}`}
          onClick={() => handleTabChange('bottleneck')}
        >
          Test Bottleneck Submit
        </button>
      </div>
      
      {formError && (
        <div className="contribute-form__error">
          {formError}
        </div>
      )}
      
      {successMessage && (
        <div className="contribute-form__success">
          {successMessage}
        </div>
      )}
      
      <div className="contribute-form__content">
        {/* Bottleneck Form */}
        {activeTab === 'bottleneck' && (
          <form onSubmit={handleBottleneckSubmit}>
            <div className="form-group">
              <label htmlFor="bottleneck-title">Bottleneck Title *</label>
              <input
                type="text"
                id="bottleneck-title"
                value={bottleneckData.title}
                onChange={(e) => setBottleneckData({...bottleneckData, title: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bottleneck-discipline">Discipline *</label>
              <select
                id="bottleneck-discipline"
                value={bottleneckData.disciplineId}
                onChange={(e) => setBottleneckData({...bottleneckData, disciplineId: e.target.value})}
                required
              >
                <option value="">Select a discipline</option>
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.title}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="bottleneck-rank">
                Urgency Rank: {bottleneckData.rank}
              </label>
              <input
                type="range"
                id="bottleneck-rank"
                min="0"
                max="5"
                step="1"
                value={bottleneckData.rank}
                onChange={(e) => setBottleneckData({...bottleneckData, rank: parseInt(e.target.value)})}
              />
              <div className="range-labels">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="bottleneck-content">Description *</label>
              <textarea
                id="bottleneck-content"
                rows="8"
                value={bottleneckData.content}
                onChange={(e) => setBottleneckData({...bottleneckData, content: e.target.value})}
                placeholder="Describe the bottleneck in detail. What makes it significant? What are the implications?"
                required
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Test Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}