// src/components/standalone/ContributeForm.jsx
import React, { useState, useEffect } from 'react';
import { sanitizeFormData } from '../../lib/sanitizeInput.js';

export default function ContributeForm({ disciplines = [] }) {
  // Form submission type (bottleneck, solution, reference)
  const [submissionType, setSubmissionType] = useState('bottleneck');
  
  // Form fields - common fields across all types
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  
  // Type-specific fields
  const [rank, setRank] = useState(3); // 1-5 for bottlenecks
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [url, setUrl] = useState(''); // For references
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errors, setErrors] = useState({});

  // Reset form based on submission type
  useEffect(() => {
    // Reset type-specific fields when type changes
    setRank(3);
    setSelectedDiscipline('');
    setUrl('');
    setErrors({});
    setSubmitResult(null);
  }, [submissionType]);

  // Validate form fields
  const validateForm = () => {
    const newErrors = {};
    
    // Common validations
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!content.trim()) newErrors.content = 'Content is required';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Valid email is required if provided';
    }
    
    // Type-specific validations
    if (submissionType === 'bottleneck') {
      if (rank < 1 || rank > 5) newErrors.rank = 'Rank must be between 1 and 5';
      if (!selectedDiscipline) newErrors.discipline = 'Discipline is required for bottlenecks';
    }
    
    if (submissionType === 'reference') {
      if (!url.trim()) newErrors.url = 'URL is required for references';
      if (url && !/^https?:\/\/.+/.test(url)) {
        newErrors.url = 'URL must start with http:// or https://';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      // Build submission data based on type
      const formData = {
        type: submissionType,
        title,
        content,
        email,
      };
      
      // Add type-specific fields
      if (submissionType === 'bottleneck') {
        formData.rank = rank;
        formData.discipline = selectedDiscipline;
      } else if (submissionType === 'reference') {
        formData.url = url;
      }
      
      // Sanitize form data before sending
      const sanitizedData = sanitizeFormData(formData);
      
      // Submit to API
      const response = await fetch('/api/submit-to-notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show brief success message
        setSubmitResult({
          type: 'success',
          message: 'Submission successful! Redirecting...',
        });
        
        // Redirect to success page after a short delay
        setTimeout(() => {
          // Create URL with submission type information
          const successUrl = new URL('/contribute/success', window.location.origin);
          successUrl.searchParams.append('type', submissionType);
          
          // Add the submission ID if available from the Notion response
          if (result.id) {
            successUrl.searchParams.append('id', result.id);
          }
          
          // Redirect to the success page
          window.location.href = successUrl.toString();
        }, 1000);
      } else {
        setSubmitResult({
          type: 'error',
          message: result.error || 'Failed to submit your contribution. Please try again.',
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitResult({
        type: 'error',
        message: 'An unexpected error occurred. Please try again later.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contribute-form">
      {/* Form type selector */}
      <div className="contribute-form__type-selector">
        <label>What would you like to contribute?</label>
        <div className="contribute-form__type-buttons">
          <button
            type="button"
            className={`contribute-form__type-button ${submissionType === 'bottleneck' ? 'active' : ''}`}
            onClick={() => setSubmissionType('bottleneck')}
          >
            Bottleneck
          </button>
          <button
            type="button"
            className={`contribute-form__type-button ${submissionType === 'solution' ? 'active' : ''}`}
            onClick={() => setSubmissionType('solution')}
          >
            Solution
          </button>
          <button
            type="button"
            className={`contribute-form__type-button ${submissionType === 'reference' ? 'active' : ''}`}
            onClick={() => setSubmissionType('reference')}
          >
            Reference
          </button>
        </div>
      </div>

      {/* Submission result message */}
      {submitResult && (
        <div className={`contribute-form__result ${submitResult.type}`}>
          {submitResult.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="contribute-form__form">
        {/* Common fields */}
        <div className="contribute-form__field">
          <label htmlFor="title">Title <span className="required">*</span></label>
          <input
            type="text"
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${submissionType === 'bottleneck' ? 'E.g., Lack of standardized metrics for AI safety' : 
                          submissionType === 'solution' ? 'E.g., Open-source safety benchmarks' : 
                          'E.g., AI Safety Metrics Initiative'}`}
            className={errors.title ? 'error' : ''}
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
        </div>

        <div className="contribute-form__field">
          <label htmlFor="content">Description <span className="required">*</span></label>
          <textarea
            id="content"
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${submissionType === 'bottleneck' ? 'Describe the scientific bottleneck...' : 
                          submissionType === 'solution' ? 'Describe your proposed solution...' : 
                          'Provide a brief summary of this reference...'}`}
            rows="6"
            className={errors.content ? 'error' : ''}
          />
          {errors.content && <span className="error-message">{errors.content}</span>}
        </div>

        {/* Type-specific fields */}
        {submissionType === 'bottleneck' && (
          <>
            <div className="contribute-form__field">
              <label htmlFor="rank">Urgency/Importance Rank (1-5) <span className="required">*</span></label>
              <div className="contribute-form__rank-slider">
                <input
                  type="range"
                  id="rank"
                  name="rank"
                  min="1"
                  max="5"
                  step="1"
                  value={rank}
                  onChange={(e) => setRank(parseInt(e.target.value))}
                  className="contribute-form__slider"
                />
                <div className="contribute-form__slider-labels">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
              <div className="contribute-form__rank-value">
                <strong>Selected: {rank}</strong> - 
                {rank === 1 && 'Low urgency/importance'}
                {rank === 2 && 'Moderate urgency/importance'}
                {rank === 3 && 'Average urgency/importance'}
                {rank === 4 && 'High urgency/importance'}
                {rank === 5 && 'Critical urgency/importance'}
              </div>
            </div>

            <div className="contribute-form__field">
              <label htmlFor="discipline">Discipline <span className="required">*</span></label>
              <select
                id="discipline"
                name="discipline"
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className={errors.discipline ? 'error' : ''}
              >
                <option value="">Select a discipline</option>
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.title}>
                    {discipline.title}
                  </option>
                ))}
                <option value="Other">Other (please specify in description)</option>
              </select>
              {errors.discipline && <span className="error-message">{errors.discipline}</span>}
            </div>
          </>
        )}

        {submissionType === 'reference' && (
          <div className="contribute-form__field">
            <label htmlFor="url">URL <span className="required">*</span></label>
            <input
              type="url"
              id="url"
              name="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className={errors.url ? 'error' : ''}
            />
            {errors.url && <span className="error-message">{errors.url}</span>}
          </div>
        )}

        {/* Contact information (optional) */}
        <div className="contribute-form__field">
          <label htmlFor="email">Your Email (optional)</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        {/* Submit button */}
        <div className="contribute-form__actions">
          <button 
            type="submit" 
            className="contribute-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Contribution'}
          </button>
        </div>
      </form>
    </div>
  );
}