// src/components/standalone/ContributeForm.jsx
import React, { useState } from 'react';

export default function ContributeForm({ fields = [], resourceTypeOptions = [] }) {
  const [activeTab, setActiveTab] = useState('bottleneck');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form data state
  const [bottleneckData, setBottleneckData] = useState({
    title: '',
    content: '',
    fieldId: '',
    rank: 3
  });

  const [fcData, setFcData] = useState({
    title: '',
    content: '',
    bottleneckTitle: '',
    resources: '',
    rank: 3
  });

  const [resourceData, setResourceData] = useState({
    title: '',
    url: '',
    content: '',
    resourceTypes: resourceTypeOptions.length > 0 ? [resourceTypeOptions[0]] : ['Publication'] // Changed to array
  });

  // Handle tab change
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setFormError('');
  };

  // Handle multi-select change for resource types
  const handleResourceTypeChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setResourceData({ ...resourceData, resourceTypes: selectedOptions });
  };

  // Form submission handlers
  const handleBottleneckSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/.netlify/functions/submit-contribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'bottleneck',
          data: {
            bottleneck_name: bottleneckData.title,
            bottleneck_description: bottleneckData.content,
            fieldId: bottleneckData.fieldId,
            bottleneck_rank: bottleneckData.rank
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit');
      }

      // Redirect to success page
      window.location.href = '/success';
    } catch (error) {
      console.error('Error submitting bottleneck:', error);
      setFormError(error.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleFCSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/.netlify/functions/submit-contribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'capability',
          data: {
            fc_name: fcData.title,
            fc_description: fcData.content,
            bottleneckTitle: fcData.bottleneckTitle,
            resources: fcData.resources
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit');
      }

      // Redirect to success page
      window.location.href = '/success';
    } catch (error) {
      console.error('Error submitting foundational capability:', error);
      setFormError(error.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle resource submission - updated for multiple resource types
  const handleResourceSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/.netlify/functions/submit-contribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'resource',
          data: {
            resource_title: resourceData.title,
            resource_url: resourceData.url,
            content: resourceData.content,
            resourceTypes: resourceData.resourceTypes // Changed from resourceType to resourceTypes
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit');
      }

      // Redirect to success page
      window.location.href = '/success';
    } catch (error) {
      console.error('Error submitting resource:', error);
      setFormError(error.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contribute-form">
      <div className="contribute-form__tabs">
        <button
          className={`contribute-form__tab ${activeTab === 'bottleneck' ? 'active' : ''}`}
          onClick={() => handleTabChange('bottleneck')}
        >
          Bottleneck
        </button>
        <button
          className={`contribute-form__tab ${activeTab === 'capability' ? 'active' : ''}`}
          onClick={() => handleTabChange('capability')}
        >
          Foundational Capability
        </button>
        <button
          className={`contribute-form__tab ${activeTab === 'resource' ? 'active' : ''}`}
          onClick={() => handleTabChange('resource')}
        >
          Resource
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
              <label htmlFor="bottleneck-title">Bottleneck Name *</label>
              <input
                type="text"
                id="bottleneck-title"
                value={bottleneckData.title}
                onChange={(e) => setBottleneckData({ ...bottleneckData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bottleneck-field">Field *</label>
              <select
                id="bottleneck-field"
                value={bottleneckData.fieldId}
                onChange={(e) => setBottleneckData({ ...bottleneckData, fieldId: e.target.value })}
                required
              >
                <option value="">Select a field</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.field_name}
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
                onChange={(e) => setBottleneckData({ ...bottleneckData, rank: parseInt(e.target.value) })}
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
                onChange={(e) => setBottleneckData({ ...bottleneckData, content: e.target.value })}
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

        {/* Foundational Capability Form */}
        {activeTab === 'capability' && (
          <form onSubmit={handleFCSubmit}>
            <div className="form-group">
              <label htmlFor="fc-title">Foundational Capability Name *</label>
              <input
                type="text"
                id="fc-title"
                value={fcData.title}
                onChange={(e) => setFcData({ ...fcData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="fc-bottleneck">Related Bottleneck *</label>
              <input
                type="text"
                id="fc-bottleneck"
                value={fcData.bottleneckTitle}
                onChange={(e) => setFcData({ ...fcData, bottleneckTitle: e.target.value })}
                placeholder="Enter the name of an existing bottleneck or suggest a new one"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="fc-content">Description *</label>
              <textarea
                id="fc-content"
                rows="8"
                value={fcData.content}
                onChange={(e) => setFcData({ ...fcData, content: e.target.value })}
                placeholder="Describe the proposed foundational capability. How would it address the bottleneck? What makes it feasible?"
                required
              ></textarea>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Foundational Capability'}
              </button>
            </div>
          </form>
        )}

        {/* Resource Form - Updated for multi-select */}
        {activeTab === 'resource' && (
          <form onSubmit={handleResourceSubmit}>
            <div className="form-group">
              <label htmlFor="resource-title">Resource Title *</label>
              <input
                type="text"
                id="resource-title"
                value={resourceData.title}
                onChange={(e) => setResourceData({ ...resourceData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="resource-type">Resource Type(s) * (Hold Ctrl/Cmd to select multiple)</label>
              <select
                id="resource-type"
                multiple
                value={resourceData.resourceTypes}
                onChange={handleResourceTypeChange}
                required
                size={Math.min(5, resourceTypeOptions.length)} // Show up to 5 options at once
                className="multi-select"
              >
                {resourceTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <div className="help-text">
                Selected: {resourceData.resourceTypes.join(', ')}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="resource-url">URL *</label>
              <input
                type="url"
                id="resource-url"
                value={resourceData.url}
                onChange={(e) => setResourceData({ ...resourceData, url: e.target.value })}
                placeholder="https://example.com/article"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="resource-content">Summary</label>
              <textarea
                id="resource-content"
                rows="6"
                value={resourceData.content}
                onChange={(e) => setResourceData({ ...resourceData, content: e.target.value })}
                placeholder="Provide a brief summary of this resource and its relevance"
              ></textarea>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Resource'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}