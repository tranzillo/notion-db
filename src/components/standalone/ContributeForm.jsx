import React, { useState } from 'react';

export default function ContributeForm({ disciplines = [] }) {
  const [activeTab, setActiveTab] = useState('bottleneck');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Form data state
  const [bottleneckData, setBottleneckData] = useState({
    title: '',
    content: '',
    disciplineId: '',
    rank: 3
  });
  
  const [solutionData, setSolutionData] = useState({
    title: '',
    content: '',
    bottleneckTitle: '',
    references: '',
    rank: 3
  });
  
  const [referenceData, setReferenceData] = useState({
    title: '',
    url: '',
    content: ''
  });
  
  // Reset form when switching tabs
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setFormError('');
  };
  
  // Form submission handlers
  const handleBottleneckSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const response = await fetch('/api/submit-contribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'bottleneck',
          data: bottleneckData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit');
      }
      
      // Redirect to success page
      window.location.href = '/contribution-success';
    } catch (error) {
      console.error('Error submitting bottleneck:', error);
      setFormError(error.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  const handleSolutionSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const response = await fetch('/api/submit-contribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'solution',
          data: solutionData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit');
      }
      
      // Redirect to success page
      window.location.href = '/contribution-success';
    } catch (error) {
      console.error('Error submitting solution:', error);
      setFormError(error.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  const handleReferenceSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const response = await fetch('/api/submit-contribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'reference',
          data: referenceData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit');
      }
      
      // Redirect to success page
      window.location.href = '/contribution-success';
    } catch (error) {
      console.error('Error submitting reference:', error);
      setFormError(error.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="contribute-form">
      <div className="contribute-form__info">
        <p>
          Your contribution will be reviewed by our team before being added to the BottleNexus database.
          All submissions are stored in a central queue for review.
        </p>
      </div>

      <div className="contribute-form__tabs">
        <button
          className={`contribute-form__tab ${activeTab === 'bottleneck' ? 'active' : ''}`}
          onClick={() => handleTabChange('bottleneck')}
        >
          Submit Bottleneck
        </button>
        <button
          className={`contribute-form__tab ${activeTab === 'solution' ? 'active' : ''}`}
          onClick={() => handleTabChange('solution')}
        >
          Submit Solution
        </button>
        <button
          className={`contribute-form__tab ${activeTab === 'reference' ? 'active' : ''}`}
          onClick={() => handleTabChange('reference')}
        >
          Submit Reference
        </button>
      </div>
      
      {formError && (
        <div className="contribute-form__error">
          {formError}
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
                {isSubmitting ? 'Submitting...' : 'Submit Bottleneck'}
              </button>
            </div>
          </form>
        )}
        
        {/* Solution Form */}
        {activeTab === 'solution' && (
          <form onSubmit={handleSolutionSubmit}>
            <div className="form-group">
              <label htmlFor="solution-title">Solution Title *</label>
              <input
                type="text"
                id="solution-title"
                value={solutionData.title}
                onChange={(e) => setSolutionData({...solutionData, title: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="solution-bottleneck">Related Bottleneck *</label>
              <input
                type="text"
                id="solution-bottleneck"
                value={solutionData.bottleneckTitle}
                onChange={(e) => setSolutionData({...solutionData, bottleneckTitle: e.target.value})}
                placeholder="Enter the name of an existing bottleneck or suggest a new one"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="solution-rank">
                Feasibility Rank: {solutionData.rank}
              </label>
              <input
                type="range"
                id="solution-rank"
                min="0"
                max="5"
                step="1"
                value={solutionData.rank}
                onChange={(e) => setSolutionData({...solutionData, rank: parseInt(e.target.value)})}
              />
              <div className="range-labels">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="solution-content">Description *</label>
              <textarea
                id="solution-content"
                rows="8"
                value={solutionData.content}
                onChange={(e) => setSolutionData({...solutionData, content: e.target.value})}
                placeholder="Describe the proposed solution. How would it address the bottleneck? What makes it feasible?"
                required
              ></textarea>
            </div>
            
            <div className="form-group">
              <label htmlFor="solution-references">References</label>
              <textarea
                id="solution-references"
                rows="4"
                value={solutionData.references}
                onChange={(e) => setSolutionData({...solutionData, references: e.target.value})}
                placeholder="List any references that support this solution (one per line). Include URLs if available."
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Solution'}
              </button>
            </div>
          </form>
        )}
        
        {/* Reference Form */}
        {activeTab === 'reference' && (
          <form onSubmit={handleReferenceSubmit}>
            <div className="form-group">
              <label htmlFor="reference-title">Reference Title *</label>
              <input
                type="text"
                id="reference-title"
                value={referenceData.title}
                onChange={(e) => setReferenceData({...referenceData, title: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="reference-url">URL *</label>
              <input
                type="url"
                id="reference-url"
                value={referenceData.url}
                onChange={(e) => setReferenceData({...referenceData, url: e.target.value})}
                placeholder="https://example.com/article"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="reference-content">Summary</label>
              <textarea
                id="reference-content"
                rows="6"
                value={referenceData.content}
                onChange={(e) => setReferenceData({...referenceData, content: e.target.value})}
                placeholder="Provide a brief summary of this reference and its relevance"
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Reference'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}