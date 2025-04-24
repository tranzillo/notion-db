// src/components/standalone/ContributeForm.jsx
import React, { useState, useRef, useEffect } from 'react';
import AutocompleteInput from './AutocompleteInput';

export default function ContributeForm({
  fields = [],
  resourceTypeOptions = [],
  bottlenecks = [],
  capabilities = []
}) {
  const [activeTab, setActiveTab] = useState('bottleneck');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    comment: ''
  });

  // Extract names for autocomplete
  const bottleneckNames = bottlenecks.map(b => b.bottleneck_name || '').filter(Boolean);
  const capabilityNames = capabilities.map(c => c.fc_name || '').filter(Boolean);
  const resourceNames = [];

  // Form data state for tab-specific fields
  const [bottleneckData, setBottleneckData] = useState({
    title: '',
    content: '',
    fieldId: '',
    rank: 3
  });

  const [fcData, setFcData] = useState({
    title: '',
    content: '',
    relatedGap: '',
  });

  const [resourceData, setResourceData] = useState({
    title: '',
    url: '',
    content: '',
    relatedCapability: '',
    resourceType: resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication'
  });

  // Check URL for edit data on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const editData = params.get('edit');

    if (editData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(editData));

        // Set the active tab based on content type
        if (decodedData.contentType === 'Bottleneck') {
          setActiveTab('bottleneck');

          // Retrieve description from sessionStorage
          const description = sessionStorage.getItem(`edit_description_${decodedData.contentId}`) || '';

          setBottleneckData({
            title: decodedData.contentTitle || '',
            content: description,
            fieldId: decodedData.contentField || '',
            rank: 3
          });

          // Clear from sessionStorage after use
          sessionStorage.removeItem(`edit_description_${decodedData.contentId}`);
        }
        else if (decodedData.contentType === 'Foundational Capability') {
          setActiveTab('capability');

          // Retrieve description from sessionStorage
          const description = sessionStorage.getItem(`edit_description_${decodedData.contentId}`) || '';

          // Find the first related gap name if available
          let relatedGapName = '';
          if (decodedData.relatedGaps && decodedData.relatedGaps.length > 0) {
            const firstGap = decodedData.relatedGaps[0];
            relatedGapName = firstGap.name || '';
          }

          setFcData({
            title: decodedData.contentTitle || '',
            content: description,
            relatedGap: relatedGapName
          });

          // Clear from sessionStorage after use
          sessionStorage.removeItem(`edit_description_${decodedData.contentId}`);
        }
        else if (decodedData.contentType === 'Resource') {
          setActiveTab('resource');
          
          // Retrieve description from sessionStorage
          const description = sessionStorage.getItem(`edit_description_${decodedData.contentId}`) || '';
          
          setResourceData({
            title: decodedData.contentTitle || '',
            url: decodedData.contentUrl || '',
            content: description,
            relatedCapability: decodedData.relatedCapability || '',
            resourceType: decodedData.resourceType || resourceTypeOptions[0]
          });
          
          // Clear from sessionStorage after use
          sessionStorage.removeItem(`edit_description_${decodedData.contentId}`);
        }
        // Handle Resource type similarly
      } catch (error) {
        console.error('Error parsing edit data:', error);
      }
    }
  }, []);

  // Handle tab change
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setFormError('');
  };

  // Update user data fields
  const handleUserDataChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
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
          data: {
            name: userData.name,
            email: userData.email,
            title: bottleneckData.title,
            contentType: 'Bottleneck',
            field: bottleneckData.fieldId,
            rank: bottleneckData.rank,
            content: bottleneckData.content,
            comment: userData.comment
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
          data: {
            name: userData.name,
            email: userData.email,
            title: fcData.title,
            contentType: 'Foundational Capability',
            content: fcData.content,
            relatedGap: fcData.relatedGap,
            comment: userData.comment
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
          data: {
            name: userData.name,
            email: userData.email,
            title: resourceData.title,
            contentType: 'Resource',
            resourceType: resourceData.resourceType,
            resource: resourceData.url,
            content: resourceData.content,
            relatedCapability: resourceData.relatedCapability,
            comment: userData.comment
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
      {/* User info section - always visible regardless of active tab */}
      <div className="contribute-form__user-info">
        <div className="contribute-form__user-info-fields">
          <div className="form-group">
            <label htmlFor="contributor-name">Your Name *</label>
            <input
              type="text"
              id="contributor-name"
              name="name"
              value={userData.name}
              onChange={handleUserDataChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="contributor-email">Your Email *</label>
            <input
              type="email"
              id="contributor-email"
              name="email"
              value={userData.email}
              onChange={handleUserDataChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="contributor-comment">Comments</label>
            <textarea
              id="contributor-comment"
              name="comment"
              rows="2"
              value={userData.comment}
              onChange={handleUserDataChange}
              placeholder="Any additional context or notes you'd like to share"
            ></textarea>
          </div>
        </div>
      </div>

      <div className="contribute-form__tabs">
        <button
          className={`contribute-form__tab ${activeTab === 'bottleneck' ? 'active' : ''}`}
          onClick={() => handleTabChange('bottleneck')}
          type="button"
        >
          R&D Gap
        </button>
        <button
          className={`contribute-form__tab ${activeTab === 'capability' ? 'active' : ''}`}
          onClick={() => handleTabChange('capability')}
          type="button"
        >
          Foundational Capability
        </button>
        <button
          className={`contribute-form__tab ${activeTab === 'resource' ? 'active' : ''}`}
          onClick={() => handleTabChange('resource')}
          type="button"
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
              <AutocompleteInput
                id="bottleneck-title"
                label="R&D Gap Name"
                value={bottleneckData.title}
                onChange={(e) => setBottleneckData({ ...bottleneckData, title: e.target.value })}
                suggestions={bottleneckNames}
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
            {/* 
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
            </div> */}

            <div className="form-group">
              <label htmlFor="bottleneck-content">Description *</label>
              <textarea
                id="bottleneck-content"
                rows="8"
                value={bottleneckData.content}
                onChange={(e) => setBottleneckData({ ...bottleneckData, content: e.target.value })}
                placeholder="Describe the R&D gap in detail. What makes it significant? What are the implications?"
                required
              ></textarea>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}

        {/* Foundational Capability Form */}
        {activeTab === 'capability' && (
          <form onSubmit={handleFCSubmit}>
            <div className="form-group">
              <AutocompleteInput
                id="fc-title"
                label="Foundational Capability Name"
                value={fcData.title}
                onChange={(e) => setFcData({ ...fcData, title: e.target.value })}
                suggestions={capabilityNames}
                required
              />
            </div>

            <div className="form-group">
              <AutocompleteInput
                id="fc-related-gap"
                label="Related R&D Gap"
                value={fcData.relatedGap}
                onChange={(e) => setFcData({ ...fcData, relatedGap: e.target.value })}
                suggestions={bottleneckNames}
                placeholder="Enter the name of an existing R&D gap or suggest a new one"
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
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}

        {/* Resource Form */}
        {activeTab === 'resource' && (
          <form onSubmit={handleResourceSubmit}>
            <div className="form-group">
              <AutocompleteInput
                id="resource-title"
                label="Resource Title"
                value={resourceData.title}
                onChange={(e) => setResourceData({ ...resourceData, title: e.target.value })}
                suggestions={resourceNames}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="resource-type">Resource Type *</label>
              <select
                id="resource-type"
                value={resourceData.resourceType}
                onChange={(e) => setResourceData({ ...resourceData, resourceType: e.target.value })}
                required
              >
                {resourceTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
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
              <AutocompleteInput
                id="related-capability"
                label="Related Foundational Capability"
                value={resourceData.relatedCapability}
                onChange={(e) => setResourceData({ ...resourceData, relatedCapability: e.target.value })}
                suggestions={capabilityNames}
                placeholder="Enter the name of a related foundational capability"
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
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}