// src/components/standalone/ContributeForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import AutocompleteInput from './AutocompleteInput';

// Component for displaying required field indicator
const RequiredTag = ({ show = true, hasError = false }) => {
  if (!show) return null;
  return (
    <span 
      className={`required-tag ${hasError ? 'required-tag--error' : ''}`}
      aria-label="required field"
      style={hasError ? {
        color: '#d32f2f',
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
      } : {}}
    >
      Required
    </span>
  );
};

// Component for input wrapper similar to input-with-button structure
const InputWrapper = ({ children, className = '', required = false, hasError = false }) => {
  return (
    <div className={`form-input-wrapper ${className}`}>
      {children}
      <RequiredTag show={required} hasError={hasError} />
    </div>
  );
};

// Component for input-with-button wrapper that includes required tag
const InputWithButtonWrapper = ({ children, required = false, hasError = false }) => {
  return (
    <div className="input-with-button-wrapper">
      <div className="input-with-button">
        {children}
      </div>
      <RequiredTag show={required} hasError={hasError} />
    </div>
  );
};

export default function ContributeForm({
  fields = [],
  resourceTypeOptions = [],
  bottlenecks = [],
  capabilities = [],
  resources = []
}) {
  const [selectedContentType, setSelectedContentType] = useState(null);
  const [showForms, setShowForms] = useState({
    gap: false,
    capability: false,
    resource: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [errorFields, setErrorFields] = useState([]);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    comment: ''
  });

  // Extract names for autocomplete
  const bottleneckNames = bottlenecks.map(b => b.bottleneck_name || '').filter(Boolean);
  const capabilityNames = capabilities.map(c => c.fc_name || '').filter(Boolean);
  const resourceNames = resources.map(r => r.resource_title || '').filter(Boolean);

  // Form data state for all content types
  const [bottleneckData, setBottleneckData] = useState({
    title: '',
    content: '',
    fieldName: '',
    rank: 3,
    relatedCapability: '',
    isAddedViaAssociation: false
  });

  const [fcData, setFcData] = useState({
    title: '',
    content: '',
    relatedGap: '',
    relatedResources: [], // Array for multiple resources
    isAddedViaAssociation: false
  });

  const [resourceData, setResourceData] = useState({
    title: '',
    url: '',
    content: '',
    relatedCapability: '',
    resourceType: resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication',
    isExistingResource: false
  });

  // Array to store multiple resources in forms
  const [formResources, setFormResources] = useState([]);
  const [originalFormResources, setOriginalFormResources] = useState({});

  // Track which capability added which resources for proper ordering
  const [resourceGroups, setResourceGroups] = useState({});

  // State for initial resource when starting with resource
  const [initialResourceState, setInitialResourceState] = useState(null);

  // Track content states: 'new', 'existing', 'edited', or null
  const [gapState, setGapState] = useState(null);
  const [capabilityState, setCapabilityState] = useState(null);

  // Track original content for edit detection
  const [originalGapData, setOriginalGapData] = useState(null);
  const [originalCapabilityData, setOriginalCapabilityData] = useState(null);
  const [originalResourceData, setOriginalResourceData] = useState(null);

  // Track the order in which forms are added
  const [formOrder, setFormOrder] = useState([]);

  // Track which form is the root dependency (cannot be removed, only reset)
  const [rootForm, setRootForm] = useState(null);

  // Helper function to determine if a related item is required
  const isRelatedItemRequired = (state, isOnlyForm, hasRelatedItem = false) => {
    // If the field already has a related item, it was required at some point
    // Keep it visually required to indicate it cannot be completely emptied
    if (hasRelatedItem) return true;

    // If state is null (form just added, no user input yet), require related item by default
    // This ensures the field is required from the start for the first form in the flow
    if (state === null) return true;

    // If new, always require related item
    if (state === 'new') return true;
    // If existing and only form, require related item
    if (state === 'existing' && isOnlyForm) return true;
    // If edited or existing with other forms, don't require
    return false;
  };

  // Unified function to determine if a field is required (for both validation and display)
  const isFieldRequired = (fieldType) => {
    const isOnlyForm = formOrder.length === 1;
    const isFirstInFlow = formOrder[0] === fieldType.split('-')[0]; // Check if this form type is first

    switch (fieldType) {
      // User data fields - always required
      case 'contributor-name':
      case 'contributor-email':
        return true;

      // Gap fields
      case 'bottleneck-title':
        return showForms.gap;
      case 'bottleneck-content':
        return showForms.gap;
      case 'bottleneck-field':
        return showForms.gap;
      case 'related-capability':
        // Don't show required if field is already locked (has value)
        if (bottleneckData.relatedCapability) return false;
        // For NEW gaps, always require related capability
        if (showForms.gap && gapState === 'new') return true;
        // Otherwise, check if gap is first form in the flow
        const gapIsFirst = formOrder[0] === 'gap';
        return showForms.gap && gapIsFirst && isRelatedItemRequired(gapState, isOnlyForm, false);

      // Capability fields  
      case 'fc-title':
        return showForms.capability;
      case 'fc-content':
        return showForms.capability;
      case 'fc-related-gap':
        // Don't show required if field is already locked (has value)
        if (fcData.relatedGap) return false;
        // For NEW capabilities, always require related gap
        if (showForms.capability && capabilityState === 'new') return true;
        // Otherwise, check if capability is first form in the flow
        const capIsFirst = formOrder[0] === 'capability';
        return showForms.capability && capIsFirst && isRelatedItemRequired(capabilityState, isOnlyForm, false);
      case 'related-resources':
        // Special case: hide required if any resources already added
        if (fcData.relatedResources.length > 0) return false;
        // For NEW capabilities, always require related resources
        if (showForms.capability && capabilityState === 'new') return true;
        // Otherwise, check if capability is first form in the flow
        const capIsFirstForResources = formOrder[0] === 'capability';
        return showForms.capability && capIsFirstForResources && isRelatedItemRequired(capabilityState, isOnlyForm, false);

      // Resource fields
      case 'resource-title':
        return selectedContentType === 'resource' || showForms.resource;
      case 'resource-url':
        return selectedContentType === 'resource' || showForms.resource;
      case 'resource-type':
        return selectedContentType === 'resource' || showForms.resource;
      case 'related-capability-resource':
        // Don't show required if field is already locked (has value)
        if (resourceData.relatedCapability) return false;
        // For NEW resources, always require related capability
        if (showForms.resource && initialResourceState === 'new') return true;
        // Otherwise, check if resource is first form in the flow
        const resourceIsFirst = formOrder[0] === 'resource';
        return showForms.resource && resourceIsFirst && isRelatedItemRequired(initialResourceState, isOnlyForm, false);

      // Dynamic resource fields (for multiple resources)
      default:
        if (fieldType.startsWith('resource-title-') || fieldType.startsWith('resource-url-') || fieldType.startsWith('resource-type-')) {
          return showForms.resource;
        }
        return false;
    }
  };

  // Helper to check if a field has an error
  const hasError = (fieldId) => errorFields.includes(fieldId);

  // Helper to get error styling - removed as we now style the required tag
  const getErrorStyle = (fieldId) => {
    return {};
  };

  // Clear error for a specific field when user interacts with it
  const clearFieldError = (fieldId) => {
    if (hasError(fieldId)) {
      setErrorFields(prev => prev.filter(id => id !== fieldId));
      // Clear general form error if all field errors are resolved
      if (errorFields.length === 1) {
        setFormError('');
      }
    }
  };

  // Track input values for related content
  const [pendingCapability, setPendingCapability] = useState('');
  const [pendingResource, setPendingResource] = useState('');
  const [pendingGap, setPendingGap] = useState('');

  // Refs for autocomplete inputs
  const capabilityInputRef = useRef(null);
  const resourceInputRef = useRef(null);
  const gapInputRef = useRef(null);

  // Function to reset all form data
  const resetAllForms = () => {
    setBottleneckData({
      title: '',
      content: '',
      fieldName: '',
      rank: 3,
      relatedCapability: '',
      isAddedViaAssociation: false
    });
    setFcData({
      title: '',
      content: '',
      relatedGap: '',
      relatedResources: [],
      isAddedViaAssociation: false
    });
    setResourceData({
      title: '',
      url: '',
      content: '',
      relatedCapability: '',
      resourceType: resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication',
      isExistingResource: false
    });
    setFormResources([]);
    setOriginalFormResources({});
    setResourceGroups({});
    setGapState(null);
    setCapabilityState(null);
    setInitialResourceState(null);
    setOriginalGapData(null);
    setOriginalCapabilityData(null);
    setOriginalResourceData(null);
    setPendingCapability('');
    setPendingResource('');
    setPendingGap('');
    setFormOrder([]);
    setRootForm(null);
    setErrorFields([]);
  };

  // Function to handle content type selection
  const handleContentTypeSelect = (contentType) => {
    setSelectedContentType(contentType);
    setFormError('');

    // Reset forms visibility
    setShowForms({
      gap: false,
      capability: false,
      resource: false
    });

    // Show only the selected form initially and add to form order
    if (contentType === 'gap') {
      setShowForms({ gap: true, capability: false, resource: false });
      setFormOrder(['gap']);
      setRootForm('gap');
    } else if (contentType === 'capability') {
      setShowForms({ gap: false, capability: true, resource: false });
      setFormOrder(['capability']);
      setRootForm('capability');
    } else if (contentType === 'resource') {
      setShowForms({ gap: false, capability: false, resource: true });
      setFormOrder(['resource']);
      setRootForm('resource');
    }
  };

  // Function to remove a form group with cascading removal
  const removeFormGroup = (formType) => {
    // Remove from form order
    setFormOrder(prev => prev.filter(type => type !== formType));

    // Reset the data for that form
    if (formType === 'gap') {
      const gapTitle = bottleneckData.title;
      setBottleneckData({
        title: '',
        content: '',
        fieldId: '',
        rank: 3,
        relatedCapability: '',
        isAddedViaAssociation: false
      });
      setGapState(null);
      setOriginalGapData(null);

      // Remove from capability's related gap if present
      if (fcData.relatedGap === gapTitle) {
        setFcData({ ...fcData, relatedGap: '' });
      }

      // If gap had a related capability, check if we should cascade remove it
      if (bottleneckData.relatedCapability && showForms.capability && fcData.title === bottleneckData.relatedCapability) {
        // Check if capability has other dependencies
        const hasOtherDependencies = resourceData.relatedCapability === fcData.title || formResources.length > 0;
        if (!hasOtherDependencies) {
          // Cascade remove the capability
          removeFormGroup('capability');
        }
      }

    } else if (formType === 'capability') {
      const capabilityTitle = fcData.title;
      setFcData({
        title: '',
        content: '',
        relatedGap: '',
        relatedResources: [],
        isAddedViaAssociation: false
      });
      setCapabilityState(null);
      setOriginalCapabilityData(null);

      // Remove from bottleneck's related capability if present
      if (bottleneckData.relatedCapability === capabilityTitle) {
        setBottleneckData({ ...bottleneckData, relatedCapability: '' });
      }

      // Remove from resource's related capability if present
      if (resourceData.relatedCapability === capabilityTitle) {
        setResourceData({ ...resourceData, relatedCapability: '' });
      }

      // Check if we should cascade remove the gap
      if (fcData.relatedGap && showForms.gap && bottleneckData.title === fcData.relatedGap) {
        // Check if gap was added via association from capability
        if (bottleneckData.isAddedViaAssociation) {
          // Cascade remove the gap
          setBottleneckData({
            title: '',
            content: '',
            fieldId: '',
            rank: 3,
            relatedCapability: '',
            isAddedViaAssociation: false
          });
          setGapState(null);
          setOriginalGapData(null);
          setShowForms(prev => ({ ...prev, gap: false }));
          setFormOrder(prev => prev.filter(type => type !== 'gap'));
        }
      }

      // Remove all related resources since capability is being removed
      const resourceIdsToRemove = resourceGroups[capabilityTitle] || [];
      setFormResources(prev => prev.filter(r => !resourceIdsToRemove.includes(r.id)));

      // Remove resource group tracking
      setResourceGroups(prev => {
        const updated = { ...prev };
        delete updated[capabilityTitle];
        return updated;
      });

      // Remove original resource data for these resources
      setOriginalFormResources(prev => {
        const updated = { ...prev };
        resourceIdsToRemove.forEach(id => delete updated[id]);
        return updated;
      });

      // Remove individual resource form sections for this capability
      setFormOrder(prev => prev.filter(type => {
        if (!type.startsWith('resource-')) return true;
        const resourceId = parseInt(type.substring(9));
        return !resourceIdsToRemove.includes(resourceId);
      }));

      // Hide resource form if no more resources
      if (formResources.filter(r => !resourceIdsToRemove.includes(r.id)).length === 0) {
        setShowForms(prev => ({ ...prev, resource: false }));
      }

    } else if (formType === 'resource') {
      setResourceData({
        title: '',
        url: '',
        content: '',
        relatedCapability: '',
        resourceType: resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication',
        isExistingResource: false
      });
      setInitialResourceState(null);
      setOriginalResourceData(null);
      setFormResources([]);
      setOriginalFormResources({});
      setResourceGroups({});

      // If resource had a related capability that was added via association, check cascade
      if (resourceData.relatedCapability && showForms.capability && fcData.title === resourceData.relatedCapability && fcData.isAddedViaAssociation) {
        // Check if capability has other dependencies
        const hasOtherDependencies = bottleneckData.relatedCapability === fcData.title;
        if (!hasOtherDependencies) {
          // Cascade remove the capability
          removeFormGroup('capability');
        }
      }
    }

    // Update forms visibility
    setShowForms(prev => {
      const updated = { ...prev, [formType]: false };

      // Don't hide the root form
      if (formType === rootForm) {
        updated[rootForm] = true;
      }

      const allFormsHidden = !updated.gap && !updated.capability && !updated.resource;

      if (allFormsHidden && !rootForm) {
        // Only reset to initial state if there's no root form
        setSelectedContentType(null);
        return { gap: false, capability: false, resource: false };
      }

      return updated;
    });
  };

  // Handle when user enters a gap name (for initial gap form)
  const handleGapChange = (e) => {
    const gapName = e.target.value;

    // If selecting existing gap, populate all data
    if (bottleneckNames.includes(gapName)) {
      const gap = bottlenecks.find(b => b.bottleneck_name === gapName);
      if (gap) {
        setBottleneckData({
          title: gap.bottleneck_name,
          content: gap.bottleneck_description || '',
          fieldId: gap.field?.id || '',
          rank: gap.bottleneck_rank || 3,
          relatedCapability: bottleneckData.relatedCapability
        });
      }
    } else {
      // Just update title for new gaps
      setBottleneckData({ ...bottleneckData, title: gapName });
    }

    // Update state will happen via useEffect
  };


  // Add a capability to the gap
  const addCapabilityToGap = () => {
    if (!pendingCapability.trim()) {
      // Focus the input if empty
      if (capabilityInputRef.current) {
        capabilityInputRef.current.focus();
      }
      return;
    }
    if (bottleneckData.relatedCapability) return;

    setBottleneckData({ ...bottleneckData, relatedCapability: pendingCapability });

    // Check if this is an existing capability
    const existingCapability = capabilityNames.includes(pendingCapability);

    // Show the capability form and add to form order
    setShowForms(prev => ({ ...prev, capability: true }));
    setFormOrder(prev => {
      if (!prev.includes('capability')) {
        return [...prev, 'capability'];
      }
      return prev;
    });

    if (existingCapability) {
      // Populate existing capability data
      const capability = capabilities.find(c => c.fc_name === pendingCapability);
      if (capability) {
        const capabilityData = {
          title: capability.fc_name,
          content: capability.fc_description || '',
          relatedGap: bottleneckData.title,
          relatedResources: [],
          isAddedViaAssociation: true
        };
        setFcData(capabilityData);
        setOriginalCapabilityData(capabilityData);
        setCapabilityState('existing');
      }
    } else {
      // New capability
      setFcData({ ...fcData, title: pendingCapability, relatedGap: bottleneckData.title, relatedResources: [], isAddedViaAssociation: true });
      setCapabilityState('new');
    }

    setPendingCapability('');
  };

  // Handle when user enters a capability name (for initial capability form)
  const handleCapabilityChange = (e) => {
    const capabilityName = e.target.value;

    // If selecting existing capability, populate all data
    if (capabilityNames.includes(capabilityName)) {
      const capability = capabilities.find(c => c.fc_name === capabilityName);
      if (capability) {
        let relatedGapName = '';
        if (capability.bottlenecks && capability.bottlenecks.length > 0) {
          relatedGapName = capability.bottlenecks[0].name || '';
        }

        setFcData({
          title: capability.fc_name,
          content: capability.fc_description || '',
          relatedGap: relatedGapName,
          relatedResources: fcData.relatedResources
        });
      }
    } else {
      // Just update title for new capabilities
      setFcData({ ...fcData, title: capabilityName });
    }

    // Update state will happen via useEffect
  };


  // Dynamic state checking based on title and other fields
  const updateGapState = () => {
    if (!bottleneckData.title) {
      setGapState(null);
      setOriginalGapData(null);
      return;
    }

    const isExistingTitle = bottleneckNames.includes(bottleneckData.title);

    if (!isExistingTitle) {
      // Title doesn't exist - this is new content
      setGapState('new');
      setOriginalGapData(null);
    } else {
      // Title exists - get the original data from database
      const gap = bottlenecks.find(b => b.bottleneck_name === bottleneckData.title);
      if (!gap) return;

      const originalData = {
        title: gap.bottleneck_name,
        content: gap.bottleneck_description || '',
        fieldId: gap.field?.id || '',
        rank: gap.bottleneck_rank || 3
      };

      // Set original data if not already set
      if (!originalGapData || originalGapData.title !== bottleneckData.title) {
        setOriginalGapData({ ...originalData, relatedCapability: bottleneckData.relatedCapability });
        setGapState('existing'); // First time with existing item
        return;
      }

      // Compare current data with stored original data
      const isEdited =
        bottleneckData.content !== originalGapData.content ||
        bottleneckData.fieldId !== originalGapData.fieldId ||
        bottleneckData.rank !== originalGapData.rank;

      setGapState(isEdited ? 'edited' : 'existing');
    }
  };

  const updateCapabilityState = () => {
    if (!fcData.title) {
      setCapabilityState(null);
      setOriginalCapabilityData(null);
      return;
    }

    // If added via association, handle state differently
    if (fcData.isAddedViaAssociation) {
      // Only check for edits if we have original data
      if (originalCapabilityData) {
        // Only consider content changes as edits for capabilities added via association
        // Gap changes are associations, not edits to the capability itself
        const isEdited = fcData.content !== originalCapabilityData.content;

        setCapabilityState(isEdited ? 'edited' : 'existing');
      }
      return;
    }

    const isExistingTitle = capabilityNames.includes(fcData.title);

    if (!isExistingTitle) {
      // Title doesn't exist - this is new content
      setCapabilityState('new');
      setOriginalCapabilityData(null);
    } else {
      // Title exists - get the original data from database
      const capability = capabilities.find(c => c.fc_name === fcData.title);
      if (!capability) return;

      let relatedGapName = '';
      if (capability.bottlenecks && capability.bottlenecks.length > 0) {
        relatedGapName = capability.bottlenecks[0].name || '';
      }

      const originalData = {
        title: capability.fc_name,
        content: capability.fc_description || '',
        relatedGap: relatedGapName
      };

      // Set original data if not already set
      if (!originalCapabilityData || originalCapabilityData.title !== fcData.title) {
        setOriginalCapabilityData(originalData);
        setCapabilityState('existing'); // First time with existing item
        return;
      }

      // Compare current data with stored original data (don't include relatedResources)
      const isEdited =
        fcData.content !== originalCapabilityData.content ||
        fcData.relatedGap !== originalCapabilityData.relatedGap;

      setCapabilityState(isEdited ? 'edited' : 'existing');
    }
  };

  const updateInitialResourceState = () => {
    if (!resourceData.title) {
      setInitialResourceState(null);
      setOriginalResourceData(null);
      return;
    }

    const isExistingTitle = resourceNames.includes(resourceData.title);

    if (!isExistingTitle) {
      // Title doesn't exist - this is new content
      setInitialResourceState('new');
      setOriginalResourceData(null);
    } else {
      // Title exists - get the original data from database
      const resource = resources.find(r => r.resource_title === resourceData.title);
      if (!resource) return;

      const originalData = {
        title: resource.resource_title,
        url: resource.resource_url || '',
        content: resource.resource_description || '',
        resourceType: resource.resource_type || (resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication')
      };

      // Set original data if not already set
      if (!originalResourceData || originalResourceData.title !== resourceData.title) {
        setOriginalResourceData({ ...originalData, relatedCapability: resourceData.relatedCapability });
        setInitialResourceState('existing'); // First time with existing item
        return;
      }

      // Compare current data with stored original data
      const isEdited =
        resourceData.url !== originalResourceData.url ||
        resourceData.content !== originalResourceData.content ||
        resourceData.resourceType !== originalResourceData.resourceType;

      setInitialResourceState(isEdited ? 'edited' : 'existing');
    }
  };

  // Add a resource to the capability
  const addResourceToCapability = () => {
    if (!pendingResource.trim()) {
      // Focus the input if empty
      if (resourceInputRef.current) {
        resourceInputRef.current.focus();
      }
      return;
    }

    // Add resource to the capability's relatedResources array
    setFcData({ ...fcData, relatedResources: [...fcData.relatedResources, pendingResource] });

    // Check if this is an existing resource
    const existingResource = resources.find(r => r.resource_title === pendingResource);

    let newResource;
    if (existingResource) {
      // Use existing resource data
      newResource = {
        id: Date.now(), // Temporary ID for tracking
        title: existingResource.resource_title,
        url: existingResource.resource_url || '',
        content: existingResource.resource_description || '',
        relatedCapability: fcData.title,
        resourceType: existingResource.resource_type || (resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication'),
        state: 'existing',
        isExistingResource: true, // Flag to disable title editing
        isAddedViaAssociation: true // Flag to indicate this was added via related field
      };
      // Store original data for existing resources
      setOriginalFormResources(prev => ({
        ...prev,
        [newResource.id]: {
          url: newResource.url,
          content: newResource.content,
          resourceType: newResource.resourceType
        }
      }));
    } else {
      // Create new resource object
      newResource = {
        id: Date.now(), // Temporary ID for tracking
        title: pendingResource,
        url: '',
        content: '',
        relatedCapability: fcData.title,
        resourceType: resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication',
        state: 'new',
        isExistingResource: false,
        isAddedViaAssociation: true // Flag to indicate this was added via related field
      };
    }

    // Track which capability added this resource
    const capabilityId = fcData.title;

    // Add to resources array - ordering is now handled by formOrder
    setFormResources(prev => [...prev, newResource]);

    // Update resource groups tracking
    setResourceGroups(prev => ({
      ...prev,
      [capabilityId]: [...(prev[capabilityId] || []), newResource.id]
    }));

    // Show resource form if not visible and add this specific resource to form order
    setShowForms(prev => ({ ...prev, resource: true }));

    // Add this specific resource directly after the capability in the form order
    const resourceKey = `resource-${newResource.id}`;
    setFormOrder(prev => {
      const capabilityIndex = prev.indexOf('capability');
      if (capabilityIndex !== -1) {
        // Insert the new resource immediately after the capability
        const newOrder = [...prev];
        newOrder.splice(capabilityIndex + 1, 0, resourceKey);
        return newOrder;
      }
      return [...prev, resourceKey];
    });

    setPendingResource('');
  };

  // Add a capability to resource (for when starting with resource)
  const addCapabilityToResource = () => {
    if (!pendingCapability.trim()) {
      // Focus the input if empty
      if (capabilityInputRef.current) {
        capabilityInputRef.current.focus();
      }
      return;
    }

    setResourceData({ ...resourceData, relatedCapability: pendingCapability });

    // Check if this is an existing capability
    const existingCapability = capabilityNames.includes(pendingCapability);

    // Show the capability form and add to form order
    setShowForms(prev => ({ ...prev, capability: true }));
    setFormOrder(prev => {
      if (!prev.includes('capability')) {
        return [...prev, 'capability'];
      }
      return prev;
    });

    if (existingCapability) {
      // Populate existing capability data
      const capability = capabilities.find(c => c.fc_name === pendingCapability);
      if (capability) {
        let relatedGapName = '';
        if (capability.bottlenecks && capability.bottlenecks.length > 0) {
          relatedGapName = capability.bottlenecks[0].name || '';
        }

        const capabilityData = {
          title: capability.fc_name,
          content: capability.fc_description || '',
          relatedGap: relatedGapName,
          relatedResources: [resourceData.title],
          isAddedViaAssociation: true
        };
        setFcData(capabilityData);
        setOriginalCapabilityData({
          title: capability.fc_name,
          content: capability.fc_description || '',
          relatedGap: relatedGapName
        });
        setCapabilityState('existing');
      }
    } else {
      // New capability
      setFcData({
        title: pendingCapability,
        relatedGap: '',
        content: '',
        relatedResources: [resourceData.title],
        isAddedViaAssociation: true
      });
      setCapabilityState('new');
    }

    setPendingCapability('');
  };

  // Add a gap to capability
  const addGapToCapability = () => {
    if (!pendingGap.trim()) {
      // Focus the input if empty
      if (gapInputRef.current) {
        gapInputRef.current.focus();
      }
      return;
    }

    setFcData({ ...fcData, relatedGap: pendingGap });

    const existingGap = bottleneckNames.includes(pendingGap);

    // Show the gap form and add directly after capability in form order
    setShowForms(prev => ({ ...prev, gap: true }));
    setFormOrder(prev => {
      const capabilityIndex = prev.indexOf('capability');
      if (capabilityIndex !== -1) {
        if (!prev.includes('gap')) {
          // Insert the gap immediately after the capability
          const newOrder = [...prev];
          newOrder.splice(capabilityIndex + 1, 0, 'gap');
          return newOrder;
        } else {
          // Gap already exists - move it to be directly after capability
          const newOrder = prev.filter(item => item !== 'gap');
          const newCapabilityIndex = newOrder.indexOf('capability');
          newOrder.splice(newCapabilityIndex + 1, 0, 'gap');
          return newOrder;
        }
      } else if (!prev.includes('gap')) {
        // Fallback to adding at the end
        return [...prev, 'gap'];
      }
      return prev;
    });

    if (existingGap) {
      // Populate existing gap data
      const gap = bottlenecks.find(b => b.bottleneck_name === pendingGap);
      if (gap) {
        const gapData = {
          title: gap.bottleneck_name,
          content: gap.bottleneck_description || '',
          fieldId: gap.field?.id || '',
          rank: gap.bottleneck_rank || 3,
          relatedCapability: fcData.title,
          isAddedViaAssociation: true
        };
        setBottleneckData(gapData);
        setOriginalGapData(gapData);
        setGapState('existing');
      }
    } else {
      // New gap
      setBottleneckData({
        title: pendingGap,
        content: '',
        fieldId: '',
        rank: 3,
        relatedCapability: fcData.title,
        isAddedViaAssociation: true
      });
      setGapState('new');
    }

    setPendingGap('');
  };

  // Handle when user enters a resource (for initial resource form)
  const handleResourceChange = (e) => {
    const resourceTitle = e.target.value;

    // Check if this is an existing resource
    const existingResource = resources.find(r => r.resource_title === resourceTitle);

    if (existingResource) {
      // Populate all resource data from existing resource
      const newResourceData = {
        title: existingResource.resource_title,
        url: existingResource.resource_url || '',
        content: existingResource.resource_description || '',
        relatedCapability: resourceData.relatedCapability, // Keep existing related capability
        resourceType: existingResource.resource_type || (resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication'),
        isExistingResource: true // Flag to disable title editing
      };
      setResourceData(newResourceData);
      // Set original data for tracking edits
      setOriginalResourceData({
        title: existingResource.resource_title,
        url: existingResource.resource_url || '',
        content: existingResource.resource_description || '',
        resourceType: existingResource.resource_type || (resourceTypeOptions.length > 0 ? resourceTypeOptions[0] : 'Publication'),
        relatedCapability: resourceData.relatedCapability
      });
    } else {
      // New resource
      setResourceData({
        ...resourceData,
        title: resourceTitle,
        isExistingResource: false
      });
    }

    // Update state will happen via useEffect
  };

  // Monitor gap data changes and update state
  useEffect(() => {
    if (selectedContentType === 'gap' || showForms.gap) {
      updateGapState();
    }
  }, [bottleneckData.title, bottleneckData.content, bottleneckData.fieldName, bottleneckData.rank]);

  // Monitor capability data changes and update state
  useEffect(() => {
    if (selectedContentType === 'capability' || showForms.capability) {
      updateCapabilityState();
    }
  }, [fcData.title, fcData.content, fcData.relatedGap]);

  // Monitor resource data changes and update state
  useEffect(() => {
    if (selectedContentType === 'resource') {
      updateInitialResourceState();
    }
  }, [resourceData.title, resourceData.url, resourceData.content, resourceData.resourceType]);

  // Check URL for edit data on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const editData = params.get('edit');

    if (editData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(editData));

        // Set the content type and show appropriate forms
        if (decodedData.contentType === 'Bottleneck') {
          handleContentTypeSelect('gap');

          // Retrieve description from sessionStorage
          const description = sessionStorage.getItem(`edit_description_${decodedData.contentId}`) || '';

          setBottleneckData({
            title: decodedData.contentTitle || '',
            content: description,
            fieldName: decodedData.contentField || '',
            rank: 3,
            relatedCapability: ''
          });

          // Clear from sessionStorage after use
          sessionStorage.removeItem(`edit_description_${decodedData.contentId}`);
        }
        else if (decodedData.contentType === 'Foundational Capability') {
          handleContentTypeSelect('capability');

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
            relatedGap: relatedGapName,
            relatedResources: []
          });

          // Clear from sessionStorage after use
          sessionStorage.removeItem(`edit_description_${decodedData.contentId}`);
        }
        else if (decodedData.contentType === 'Resource') {
          handleContentTypeSelect('resource');

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
      } catch (error) {
        console.error('Error parsing edit data:', error);
      }
    }
  }, []);

  // Update user data fields
  const handleUserDataChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Unified form validation using the same logic as required attributes
  const validateForm = () => {
    const errors = [];
    const errorFields = [];

    // Helper function to check and add validation error
    const checkField = (fieldId, value, displayName) => {
      if (isFieldRequired(fieldId) && (!value || !value.toString().trim())) {
        errors.push(`${displayName} is required`);
        errorFields.push(fieldId);
      }
    };

    // User data validation
    checkField('contributor-name', userData.name, 'Your name');
    checkField('contributor-email', userData.email, 'Your email');

    // Gap validation
    if (showForms.gap) {
      checkField('bottleneck-title', bottleneckData.title, 'R&D Gap name');
      checkField('bottleneck-content', bottleneckData.content, 'R&D Gap description');
      checkField('bottleneck-field', bottleneckData.fieldName, 'Field selection');

      // Validate related capability using the same logic as display
      if (isFieldRequired('related-capability')) {
        checkField('related-capability', bottleneckData.relatedCapability, 'Related capability');
      }
    }

    // Capability validation
    if (showForms.capability) {
      checkField('fc-title', fcData.title, 'Foundational Capability name');
      checkField('fc-content', fcData.content, 'Foundational Capability description');

      // Validate related gap using the same logic as display
      if (isFieldRequired('fc-related-gap')) {
        checkField('fc-related-gap', fcData.relatedGap, 'Related R&D Gap');
      }

      // Validate related resources using the same logic as display
      if (isFieldRequired('related-resources') && fcData.relatedResources.length === 0) {
        errors.push('At least one related resource is required');
        errorFields.push('related-resources');
      }
    }

    // Resource validation
    if (showForms.resource) {
      // Multiple resources validation
      if (formResources.length > 0) {
        formResources.forEach((resource, index) => {
          checkField(`resource-title-${index}`, resource.title, `Resource ${index + 1} title`);
          checkField(`resource-url-${index}`, resource.url, `Resource ${index + 1} URL`);
        });
      }
      // Single resource validation (when starting with resource)
      else if (selectedContentType === 'resource') {
        checkField('resource-title', resourceData.title, 'Resource title');
        checkField('resource-url', resourceData.url, 'Resource URL');

        // Validate related capability using the same logic as display
        if (isFieldRequired('related-capability-resource')) {
          checkField('related-capability-resource', resourceData.relatedCapability, 'Related capability');
        }
      }
    }

    return { errors, errorFields };
  };

  // Unified form submission handler
  const handleUnifiedSubmit = async (e) => {
    e.preventDefault();

    // Clear any previous errors
    setFormError('');
    setErrorFields([]);

    // Force a re-render to clear error styles before validation
    await new Promise(resolve => setTimeout(resolve, 0));

    // Validate form
    const validation = validateForm();
    if (validation.errors.length > 0) {
      setFormError(validation.errors);
      setErrorFields(validation.errorFields);

      // Force update to ensure error styles are applied
      await new Promise(resolve => setTimeout(resolve, 0));

      // Scroll to error message at top of form
      setTimeout(() => {
        const errorElement = document.getElementById('form-error-message');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setErrorFields([]);

    try {
      // Build submission data based on what forms are shown
      const submissions = [];

      // Add gap data if shown
      if (showForms.gap && (gapState || selectedContentType === 'gap')) {
        submissions.push({
          name: userData.name,
          email: userData.email,
          title: bottleneckData.title,
          contentType: 'Bottleneck',
          field: bottleneckData.fieldName,
          rank: bottleneckData.rank,
          content: bottleneckData.content,
          relatedCapability: bottleneckData.relatedCapability,
          comment: userData.comment,
          state: gapState
        });
      }

      // Add capability data if shown
      if (showForms.capability && (capabilityState || selectedContentType === 'capability')) {
        submissions.push({
          name: userData.name,
          email: userData.email,
          title: fcData.title,
          contentType: 'Foundational Capability',
          content: fcData.content,
          relatedGap: fcData.relatedGap || bottleneckData.title,
          relatedResources: fcData.relatedResources,
          comment: userData.comment,
          state: capabilityState
        });
      }

      // Add resource data if shown
      if (showForms.resource) {
        // Handle multiple resources
        if (formResources.length > 0) {
          formResources.forEach(resource => {
            submissions.push({
              name: userData.name,
              email: userData.email,
              title: resource.title,
              contentType: 'Resource',
              resourceType: resource.resourceType,
              resource: resource.url,
              content: resource.content,
              relatedCapability: resource.relatedCapability || fcData.title,
              comment: userData.comment,
              state: resource.state
            });
          });
        } else if (selectedContentType === 'resource') {
          // Single resource when starting with resource
          submissions.push({
            name: userData.name,
            email: userData.email,
            title: resourceData.title,
            contentType: 'Resource',
            resourceType: resourceData.resourceType,
            resource: resourceData.url,
            content: resourceData.content,
            relatedCapability: resourceData.relatedCapability || fcData.title,
            comment: userData.comment,
            state: initialResourceState || 'new'
          });
        }
      }

      // Submit all data
      const response = await fetch('/.netlify/functions/submit-contribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: submissions.length === 1 ? submissions[0] : submissions,
          isMultiple: submissions.length > 1
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit');
      }

      // Redirect to success page
      window.location.href = '/success';
    } catch (error) {
      console.error('Error submitting contribution:', error);
      setFormError([error.message || 'An error occurred. Please try again.']);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contribute-form">
      {/* Error message display - above all form elements */}
      {selectedContentType && formError && formError.length > 0 && (
        <div className="contribute-form__error" role="alert" id="form-error-message">
          <h3>{errorFields.length > 0 ? 'Please complete the following required fields:' : 'Submission Error'}</h3>
          <ul>
            {formError.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* User info section - always visible */}
      <div className="contribute-form__user-info">
        <div className="contribute-form__user-info-fields">
          <div className="form-group">
            <label htmlFor="contributor-name">Your Name</label>
            <InputWrapper required={isFieldRequired('contributor-name')} hasError={hasError('contributor-name')}>
              <input
                type="text"
                id="contributor-name"
                name="name"
                value={userData.name}
                onChange={handleUserDataChange}
                onFocus={() => clearFieldError('contributor-name')}
                style={getErrorStyle('contributor-name')}
                required={isFieldRequired('contributor-name')}
                title="Your full name"
                aria-label="Your name"
                aria-invalid={hasError('contributor-name')}
              />
            </InputWrapper>
          </div>

          <div className="form-group">
            <label htmlFor="contributor-email">Your Email</label>
            <InputWrapper required={isFieldRequired('contributor-email')} hasError={hasError('contributor-email')}>
              <input
                type="email"
                id="contributor-email"
                name="email"
                value={userData.email}
                onChange={handleUserDataChange}
                onFocus={() => clearFieldError('contributor-email')}
                style={getErrorStyle('contributor-email')}
                required={isFieldRequired('contributor-email')}
                title="Your email address"
                aria-label="Your email"
                aria-invalid={hasError('contributor-email')}
              />
            </InputWrapper>
          </div>

          <div className="form-group">
            <label htmlFor="contributor-comment">Comments</label>
            <InputWrapper required={false}>
              <textarea
                id="contributor-comment"
                name="comment"
                rows="2"
                value={userData.comment}
                onChange={handleUserDataChange}
                placeholder="Any additional context or notes you'd like to share"
                title="Optional comments"
                aria-label="Additional comments"
              ></textarea>
            </InputWrapper>
          </div>
        </div>
      </div>

      {/* Content type selection buttons */}
      {!selectedContentType && (
        <div className="contribute-form__type-selection">
          <h3>What would you like to contribute?</h3>
          <div className="contribute-form__type-buttons">
            <button
              type="button"
              onClick={() => handleContentTypeSelect('gap')}
              className="contribute-form__type-button"
              title="Select R&D Gap as content type"
              aria-label="Select R&D Gap"
            >
              <h4>R&D Gap</h4>
              <p>Identify a critical research & development bottleneck</p>
            </button>
            <button
              type="button"
              onClick={() => handleContentTypeSelect('capability')}
              className="contribute-form__type-button"
              title="Select Foundational Capability as content type"
              aria-label="Select Foundational Capability"
            >
              <h4>Foundational Capability</h4>
              <p>Propose a capability to address existing R&D gaps</p>
            </button>
            <button
              type="button"
              onClick={() => handleContentTypeSelect('resource')}
              className="contribute-form__type-button"
              title="Select Resource as content type"
              aria-label="Select Resource"
            >
              <h4>Resource</h4>
              <p>Share research, tools, or materials that support capabilities</p>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic form content */}
      {selectedContentType && (
        <form onSubmit={handleUnifiedSubmit} className="contribute-form__unified" noValidate>

          {/* Render forms in the order they were added */}
          {formOrder.map((formType) => {
            if (formType === 'gap' && showForms.gap) {
              return (
                <div key="gap-form" className="contribute-form__section">
                  <button
                    type="button"
                    className="remove-section-button"
                    onClick={() => {
                      if (formType === rootForm) {
                        // Start over if this is the root form
                        resetAllForms();
                        setSelectedContentType(null);
                        setShowForms({ gap: false, capability: false, resource: false });
                        setFormError('');
                      } else {
                        // Remove just this form if it's not the root
                        removeFormGroup('gap');
                      }
                    }}
                    aria-label={formType === rootForm ? "Start over" : "Remove gap section"}
                  >
                    ×
                  </button>
                  <h3>
                    R&D Gap
                    {gapState && (
                      <span className={`state-label state-label--${gapState}`}>
                        ({gapState})
                      </span>
                    )}
                  </h3>
                  <input type="hidden" name="gapState" value={gapState || ''} />
                  <div className="form-group">
                    {bottleneckData.isAddedViaAssociation ? (
                      <>
                        <label htmlFor="bottleneck-title">R&D Gap Name</label>
                        <InputWrapper required={isFieldRequired('bottleneck-title')} hasError={hasError('bottleneck-title')}>
                          <input
                            type="text"
                            id="bottleneck-title"
                            value={bottleneckData.title}
                            disabled
                            readOnly
                            required={isFieldRequired('bottleneck-title')}
                            title="R&D Gap name"
                            aria-label="R&D Gap name"
                          />
                        </InputWrapper>
                      </>
                    ) : (
                      <>
                        <label htmlFor="bottleneck-title">R&D Gap Name</label>
                        <InputWrapper required={isFieldRequired('bottleneck-title')} hasError={hasError('bottleneck-title')}>
                          <AutocompleteInput
                            id="bottleneck-title"
                            value={bottleneckData.title}
                            onChange={handleGapChange}
                            onSuggestionSelect={(suggestion) => {
                              // Trigger change handler with suggestion
                              handleGapChange({ target: { value: suggestion } });
                            }}
                            suggestions={bottleneckNames}
                            required={isFieldRequired('bottleneck-title')}
                            style={getErrorStyle('bottleneck-title')}
                            title="Enter R&D Gap name"
                            aria-label="R&D Gap name"
                            aria-invalid={hasError('bottleneck-title')}
                          />
                        </InputWrapper>
                      </>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="bottleneck-field">Field</label>
                    <InputWrapper required={isFieldRequired('bottleneck-field')} hasError={hasError('bottleneck-field')}>
                      <select
                        id="bottleneck-field"
                        value={bottleneckData.fieldName}
                        onChange={(e) => {
                          setBottleneckData({ ...bottleneckData, fieldName: e.target.value });
                        }}
                        onFocus={() => clearFieldError('bottleneck-field')}
                        style={getErrorStyle('bottleneck-field')}
                        required={isFieldRequired('bottleneck-field')}
                        title="Select field for R&D Gap"
                        aria-label="Field selection"
                        aria-invalid={hasError('bottleneck-field')}
                      >
                        <option value="">Select a field</option>
                        {fields.map((field) => (
                          <option key={field.id} value={field.field_name}>
                            {field.field_name}
                          </option>
                        ))}
                      </select>
                    </InputWrapper>
                  </div>

                  <div className="form-group">
                    <label htmlFor="bottleneck-content">Description</label>
                    <InputWrapper required={isFieldRequired('bottleneck-content')} hasError={hasError('bottleneck-content')}>
                      <textarea
                        id="bottleneck-content"
                        rows="6"
                        value={bottleneckData.content}
                        onChange={(e) => {
                          setBottleneckData({ ...bottleneckData, content: e.target.value });
                        }}
                        onFocus={() => clearFieldError('bottleneck-content')}
                        placeholder="Describe the R&D Gap in detail. What makes it significant? What are the implications?"
                        style={getErrorStyle('bottleneck-content')}
                        required={isFieldRequired('bottleneck-content')}
                        title="Describe the R&D Gap"
                        aria-label="R&D Gap description"
                        aria-invalid={hasError('bottleneck-content')}
                      ></textarea>
                    </InputWrapper>
                  </div>

                  {/* Only show capability field if gap is the starting point */}
                  {selectedContentType === 'gap' && (
                    <div className="form-group">
                      <label htmlFor="related-capability">
                        Related Foundational Capability
                      </label>
                      <InputWithButtonWrapper required={isFieldRequired('related-capability')} hasError={hasError('related-capability')}>
                        {bottleneckData.relatedCapability ? (
                          <input
                            type="text"
                            id="related-capability"
                            value={bottleneckData.relatedCapability}
                            disabled
                            readOnly
                            title="Related capability"
                            aria-label="Related foundational capability"
                          />
                        ) : (
                          <AutocompleteInput
                            ref={capabilityInputRef}
                            id="related-capability"
                            value={pendingCapability}
                            onChange={(e) => setPendingCapability(e.target.value)}
                            onSuggestionSelect={(suggestion) => setPendingCapability(suggestion)}
                            suggestions={capabilityNames}
                            placeholder="Enter existing capability or suggest new one"
                            required={isFieldRequired('related-capability')}
                            style={getErrorStyle('related-capability')}
                            title="Enter related capability"
                            aria-label="Related foundational capability"
                            aria-invalid={hasError('related-capability')}
                          />
                        )}
                        {!bottleneckData.relatedCapability ? (
                          <button
                            type="button"
                            onClick={addCapabilityToGap}
                            className="add-button"
                            title="Add capability"
                            aria-label="Add related capability"
                          >
                            +
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const capabilityToRemove = bottleneckData.relatedCapability;
                              setBottleneckData({ ...bottleneckData, relatedCapability: '' });
                              setPendingCapability('');
                              // Remove the entire capability form group if it was added via association
                              if (showForms.capability && fcData.title === capabilityToRemove && fcData.isAddedViaAssociation) {
                                removeFormGroup('capability');
                              }
                            }}
                            className="remove-button"
                            title="Remove capability"
                            aria-label="Remove related capability"
                          >
                            ×
                          </button>
                        )}
                      </InputWithButtonWrapper>
                    </div>
                  )}
                </div>
              );
            }

            if (formType === 'capability' && showForms.capability) {
              return (
                <div key="capability-form" className="contribute-form__section">
                  <button
                    type="button"
                    className="remove-section-button"
                    onClick={() => {
                      if (formType === rootForm) {
                        // Start over if this is the root form
                        resetAllForms();
                        setSelectedContentType(null);
                        setShowForms({ gap: false, capability: false, resource: false });
                        setFormError('');
                      } else {
                        // Remove just this form if it's not the root
                        removeFormGroup('capability');
                      }
                    }}
                    aria-label={formType === rootForm ? "Start over" : "Remove capability section"}
                  >
                    ×
                  </button>
                  <h3>
                    Foundational Capability
                    {capabilityState && (
                      <span className={`state-label state-label--${capabilityState}`}>
                        ({capabilityState})
                      </span>
                    )}
                  </h3>
                  <input type="hidden" name="capabilityState" value={capabilityState || ''} />
                  <div className="form-group">
                    {fcData.isAddedViaAssociation ? (
                      <>
                        <label htmlFor="fc-title">Foundational Capability Name</label>
                        <InputWrapper required={isFieldRequired('fc-title')} hasError={hasError('fc-title')}>
                          <input
                            type="text"
                            id="fc-title"
                            value={fcData.title}
                            disabled
                            readOnly
                            required={isFieldRequired('fc-title')}
                            title="Foundational Capability name"
                            aria-label="Foundational Capability name"
                          />
                        </InputWrapper>
                      </>
                    ) : (
                      <>
                        <label htmlFor="fc-title">Foundational Capability Name</label>
                        <InputWrapper required={isFieldRequired('fc-title')} hasError={hasError('fc-title')}>
                          <AutocompleteInput
                            id="fc-title"
                            value={fcData.title}
                            onChange={handleCapabilityChange}
                            onSuggestionSelect={(suggestion) => {
                              // Trigger change handler with suggestion
                              handleCapabilityChange({ target: { value: suggestion } });
                            }}
                            suggestions={capabilityNames}
                            required={isFieldRequired('fc-title')}
                            style={getErrorStyle('fc-title')}
                            title="Enter Foundational Capability name"
                            aria-label="Foundational Capability name"
                            aria-invalid={hasError('fc-title')}
                          />
                        </InputWrapper>
                      </>
                    )}
                  </div>

                  {/* Show gap field unless gap was the initial starting point */}
                  {selectedContentType !== 'gap' && (
                    <div className="form-group">
                      <label htmlFor="fc-related-gap">
                        Related R&D Gap
                      </label>
                      <InputWithButtonWrapper required={isFieldRequired('fc-related-gap')} hasError={hasError('fc-related-gap')}>
                        {fcData.relatedGap ? (
                          <input
                            type="text"
                            id="fc-related-gap"
                            value={fcData.relatedGap}
                            disabled
                            readOnly
                            title="Related R&D Gap"
                            aria-label="Related R&D Gap"
                          />
                        ) : (
                          <AutocompleteInput
                            ref={gapInputRef}
                            id="fc-related-gap"
                            value={pendingGap}
                            onChange={(e) => setPendingGap(e.target.value)}
                            onSuggestionSelect={(suggestion) => setPendingGap(suggestion)}
                            suggestions={bottleneckNames}
                            placeholder="Enter the name of an existing R&D Gap or suggest a new one"
                            required={isFieldRequired('fc-related-gap')}
                            style={getErrorStyle('fc-related-gap')}
                            title="Enter related R&D Gap"
                            aria-label="Related R&D Gap"
                            aria-invalid={hasError('fc-related-gap')}
                          />
                        )}
                        {!fcData.relatedGap ? (
                          <button
                            type="button"
                            onClick={addGapToCapability}
                            className="add-button"
                              title="Add R&D Gap"
                            aria-label="Add related R&D Gap"
                          >
                            +
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const gapToRemove = fcData.relatedGap;
                              setFcData({ ...fcData, relatedGap: '' });
                              setPendingGap('');
                              // Remove the entire gap form group if it was added via association
                              if (showForms.gap && bottleneckData.title === gapToRemove && bottleneckData.isAddedViaAssociation) {
                                removeFormGroup('gap');
                              }
                            }}
                            className="remove-button"
                            title="Remove R&D Gap"
                            aria-label="Remove related R&D Gap"
                          >
                            ×
                          </button>
                        )}
                      </InputWithButtonWrapper>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="fc-content">Description</label>
                    <InputWrapper required={isFieldRequired('fc-content')} hasError={hasError('fc-content')}>
                      <textarea
                        id="fc-content"
                        rows="6"
                        value={fcData.content}
                        onChange={(e) => {
                          setFcData({ ...fcData, content: e.target.value });
                        }}
                        placeholder="Describe the proposed Foundational Capability. How would it address the R&D Gap?"
                        style={getErrorStyle('fc-content')}
                        required={isFieldRequired('fc-content')}
                        title="Describe the Foundational Capability"
                        aria-label="Foundational Capability description"
                        aria-invalid={hasError('fc-content')}
                      ></textarea>
                    </InputWrapper>
                  </div>

                  {/* Show resource field only if NOT starting from resource */}
                  {selectedContentType !== 'resource' && (
                    <div className="form-group">
                      <label htmlFor="related-resources">
                        Related Resources
                      </label>

                      {/* Input for adding new resources */}
                      <InputWithButtonWrapper required={isFieldRequired('related-resources')} hasError={hasError('related-resources')}>
                        <AutocompleteInput
                          ref={resourceInputRef}
                          id="related-resources"
                          value={pendingResource}
                          onChange={(e) => setPendingResource(e.target.value)}
                          onSuggestionSelect={(suggestion) => setPendingResource(suggestion)}
                          suggestions={resourceNames}
                          placeholder="Enter the name of an existing Resource or suggest a new one"
                          required={isFieldRequired('related-resources')}
                          style={getErrorStyle('related-resources')}
                          title="Enter resource to add"
                          aria-label="Related resources"
                          aria-invalid={hasError('related-resources')}
                        />
                        <button
                          type="button"
                          onClick={addResourceToCapability}
                          className="add-button"
                          title="Add resource"
                          aria-label="Add related resource"
                        >
                          +
                        </button>
                      </InputWithButtonWrapper>

                      {/* Show list of added resources */}
                      {fcData.relatedResources.length > 0 && (
                        <div className="related-resources-list" style={{ marginTop: '10px' }}>
                          {fcData.relatedResources.slice().reverse().map((resourceTitle, idx) => {
                            const actualIdx = fcData.relatedResources.length - 1 - idx;
                            return (
                              <div key={actualIdx} className="related-resource-item input-with-button">
                                <input
                                  type="text"
                                  name={`capability_resource_${actualIdx}`}
                                  value={resourceTitle}
                                  readOnly
                                  disabled
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Remove from relatedResources array
                                    const updatedResources = fcData.relatedResources.filter((_, i) => i !== actualIdx);
                                    setFcData({ ...fcData, relatedResources: updatedResources });

                                    // Find and remove the resource from formResources array
                                    const resourceToRemove = formResources.find(r => r.title === resourceTitle);
                                    if (resourceToRemove) {
                                      setFormResources(prev => prev.filter(resource => resource.id !== resourceToRemove.id));

                                      // Update resource groups
                                      setResourceGroups(prev => {
                                        const updated = { ...prev };
                                        if (updated[fcData.title]) {
                                          updated[fcData.title] = updated[fcData.title].filter(id => id !== resourceToRemove.id);
                                          if (updated[fcData.title].length === 0) {
                                            delete updated[fcData.title];
                                          }
                                        }
                                        return updated;
                                      });

                                      // Remove from original resources tracking
                                      setOriginalFormResources(prev => {
                                        const updated = { ...prev };
                                        delete updated[resourceToRemove.id];
                                        return updated;
                                      });
                                    }

                                    // Hide resource form if no resources left
                                    if (updatedResources.length === 0) {
                                      const remainingResources = formResources.filter(r => r.title !== resourceTitle);
                                      if (remainingResources.length === 0) {
                                        setShowForms(prev => ({ ...prev, resource: false }));
                                        setFormOrder(prev => prev.filter(type => type !== `resource-${fcData.title}`));
                                      }
                                    }
                                  }}
                                  className="remove-button"
                                  title="Remove resource"
                                  aria-label={`Remove resource: ${resourceTitle}`}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (formType.startsWith('resource-') && showForms.resource) {
              // Extract resource ID from formType (e.g., "resource-12345")
              const resourceId = parseInt(formType.substring(9)); // Remove "resource-" prefix
              const resource = formResources.find(r => r.id === resourceId);

              if (!resource) return null;

              const index = formResources.indexOf(resource);
              return (
                <div key={resource.id} className="contribute-form__section">
                  <button
                    type="button"
                    className="remove-section-button"
                    onClick={() => {
                      // Resources added from capability are never the selectedContentType
                      // Remove this specific resource
                      setFormResources(prev => prev.filter(r => r.id !== resource.id));

                      // Remove from original resources tracking
                      setOriginalFormResources(prev => {
                        const updated = { ...prev };
                        delete updated[resource.id];
                        return updated;
                      });

                      // Remove from capability's related resources
                      setFcData(prev => ({
                        ...prev,
                        relatedResources: prev.relatedResources.filter(r => r !== resource.title)
                      }));

                      // Update resource groups
                      setResourceGroups(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(capId => {
                          updated[capId] = updated[capId].filter(id => id !== resource.id);
                          if (updated[capId].length === 0) {
                            delete updated[capId];
                          }
                        });
                        return updated;
                      });

                      // Remove this specific resource from form order
                      setFormOrder(prev => prev.filter(type => type !== formType));

                      // Hide resource form if no resources left at all
                      const allRemainingResources = formResources.filter(r => r.id !== resource.id);
                      if (allRemainingResources.length === 0) {
                        setShowForms(prev => ({ ...prev, resource: false }));
                      }
                    }}
                    aria-label="Remove resource section">
                    ×
                  </button>
                  <h3>
                    Resource
                    <span className={`state-label state-label--${resource.state}`}>
                      ({resource.state})
                    </span>
                  </h3>
                  <input type="hidden" name={`resourceState_${index}`} value={resource.state} />

                  <div className="form-group">
                    <label htmlFor={`resource-title-${index}`}>Resource Title</label>
                    <InputWrapper required={isFieldRequired(`resource-title-${index}`)} hasError={hasError(`resource-title-${index}`)}>
                      {(resource.isExistingResource || resource.isAddedViaAssociation) ? (
                        <input
                          type="text"
                          id={`resource-title-${index}`}
                          value={resource.title}
                          disabled
                          readOnly
                          required={isFieldRequired(`resource-title-${index}`)}
                          title="Resource title"
                          aria-label="Resource title"
                        />
                      ) : (
                        <input
                          type="text"
                          id={`resource-title-${index}`}
                          value={resource.title}
                          onChange={(e) => {
                            const updatedResources = [...formResources];
                            updatedResources[index] = { ...resource, title: e.target.value };
                            setFormResources(updatedResources);
                            // Update state for existing resources that are edited
                            if (resource.isExistingResource && originalFormResources[resource.id]) {
                              updatedResources[index].state = 'edited';
                            }
                          }}
                          style={getErrorStyle(`resource-title-${index}`)}
                          required={isFieldRequired(`resource-title-${index}`)}
                          title="Enter resource title"
                          aria-label="Resource title"
                          aria-invalid={hasError(`resource-title-${index}`)}
                        />
                      )}
                    </InputWrapper>
                  </div>

                  <div className="form-group">
                    <label htmlFor={`resource-type-${index}`}>Resource Type</label>
                    <InputWrapper required={isFieldRequired(`resource-type-${index}`)} hasError={hasError(`resource-type-${index}`)}>
                      <select
                        id={`resource-type-${index}`}
                        value={resource.resourceType}
                        onChange={(e) => {
                          const updatedResources = [...formResources];
                          updatedResources[index] = { ...resource, resourceType: e.target.value };
                          setFormResources(updatedResources);
                          // Check if edited
                          if (resource.isExistingResource && originalFormResources[resource.id]) {
                            const isEdited = e.target.value !== originalFormResources[resource.id].resourceType ||
                              resource.url !== originalFormResources[resource.id].url ||
                              resource.content !== originalFormResources[resource.id].content;
                            updatedResources[index].state = isEdited ? 'edited' : 'existing';
                          }
                        }}
                        required={isFieldRequired(`resource-type-${index}`)}
                        style={getErrorStyle(`resource-type-${index}`)}
                        title="Select resource type"
                        aria-label="Resource type"
                        aria-invalid={hasError(`resource-type-${index}`)}
                      >
                        {resourceTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </InputWrapper>
                  </div>

                  <div className="form-group">
                    <label htmlFor={`resource-url-${index}`}>URL</label>
                    <InputWrapper required={isFieldRequired(`resource-url-${index}`)} hasError={hasError(`resource-url-${index}`)}>
                      <input
                        type="url"
                        id={`resource-url-${index}`}
                        value={resource.url}
                        onChange={(e) => {
                          const updatedResources = [...formResources];
                          updatedResources[index] = { ...resource, url: e.target.value };
                          setFormResources(updatedResources);
                          // Check if edited
                          if (resource.isExistingResource && originalFormResources[resource.id]) {
                            const isEdited = resource.resourceType !== originalFormResources[resource.id].resourceType ||
                              e.target.value !== originalFormResources[resource.id].url ||
                              resource.content !== originalFormResources[resource.id].content;
                            updatedResources[index].state = isEdited ? 'edited' : 'existing';
                          }
                        }}
                        placeholder="https://example.com/article"
                        style={getErrorStyle(`resource-url-${index}`)}
                        required={isFieldRequired(`resource-url-${index}`)}
                        title="Enter resource URL"
                        aria-label="Resource URL"
                        aria-invalid={hasError(`resource-url-${index}`)}
                      />
                    </InputWrapper>
                  </div>

                  <div className="form-group">
                    <label htmlFor={`resource-content-${index}`}>Description</label>
                    <textarea
                      id={`resource-content-${index}`}
                      rows="4"
                      value={resource.content}
                      onChange={(e) => {
                        const updatedResources = [...formResources];
                        updatedResources[index] = { ...resource, content: e.target.value };
                        setFormResources(updatedResources);
                        // Check if edited
                        if (resource.isExistingResource && originalFormResources[resource.id]) {
                          const isEdited = resource.resourceType !== originalFormResources[resource.id].resourceType ||
                            resource.url !== originalFormResources[resource.id].url ||
                            e.target.value !== originalFormResources[resource.id].content;
                          updatedResources[index].state = isEdited ? 'edited' : 'existing';
                        }
                      }}
                      placeholder="Provide a brief description of this resource and its relevance"
                      title="Resource description"
                      aria-label="Resource description"
                    ></textarea>
                  </div>
                </div>
              );
            }

            // Handle standalone resource form when starting with resource
            if (formType === 'resource' && selectedContentType === 'resource') {
              return (
                <React.Fragment key="standalone-resource">
                  <div className="contribute-form__section">
                    <button
                      type="button"
                      className="remove-section-button"
                      onClick={() => {
                        if (formType === rootForm) {
                          // Start over if this is the root form
                          resetAllForms();
                          setSelectedContentType(null);
                          setShowForms({ gap: false, capability: false, resource: false });
                          setFormError('');
                        } else {
                          // Remove just this form if it's not the root
                          removeFormGroup('resource');
                        }
                      }}
                      aria-label={formType === rootForm ? "Start over" : "Remove resource section"}
                    >
                      ×
                    </button>
                    <h3>
                      Resource
                      {initialResourceState && (
                        <span className={`state-label state-label--${initialResourceState}`}>
                          ({initialResourceState})
                        </span>
                      )}
                    </h3>
                    <input type="hidden" name="resourceState_0" value={initialResourceState || ''} />

                    <div className="form-group">
                      {resourceData.isExistingResource ? (
                        <>
                          <label htmlFor="resource-title">Resource Title</label>
                          <InputWrapper required={isFieldRequired('resource-title')} hasError={hasError('resource-title')}>
                            <input
                              type="text"
                              id="resource-title"
                              value={resourceData.title}
                              disabled
                              readOnly
                              required={isFieldRequired('resource-title')}
                              title="Resource title"
                              aria-label="Resource title"
                            />
                          </InputWrapper>
                        </>
                      ) : (
                        <>
                          <label htmlFor="resource-title">Resource Title</label>
                          <InputWrapper required={isFieldRequired('resource-title')} hasError={hasError('resource-title')}>
                            <AutocompleteInput
                              id="resource-title"
                              value={resourceData.title}
                              onChange={handleResourceChange}
                              onSuggestionSelect={(suggestion) => {
                                // Trigger change handler with suggestion
                                handleResourceChange({ target: { value: suggestion } });
                              }}
                              suggestions={resourceNames}
                              required={isFieldRequired('resource-title')}
                              style={getErrorStyle('resource-title')}
                              title="Enter resource title"
                              aria-label="Resource title"
                              aria-invalid={hasError('resource-title')}
                            />
                          </InputWrapper>
                        </>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="resource-type">Resource Type</label>
                      <InputWrapper required={isFieldRequired('resource-type')} hasError={hasError('resource-type')}>
                        <select
                          id="resource-type"
                          value={resourceData.resourceType}
                          onChange={(e) => {
                            setResourceData({ ...resourceData, resourceType: e.target.value });
                          }}
                          required={isFieldRequired('resource-type')}
                          style={getErrorStyle('resource-type')}
                          title="Select resource type"
                          aria-label="Resource type"
                          aria-invalid={hasError('resource-type')}
                        >
                          {resourceTypeOptions.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </InputWrapper>
                    </div>

                    <div className="form-group">
                      <label htmlFor="resource-url">URL</label>
                      <InputWrapper required={isFieldRequired('resource-url')} hasError={hasError('resource-url')}>
                        <input
                          type="url"
                          id="resource-url"
                          value={resourceData.url}
                          onChange={(e) => {
                            setResourceData({ ...resourceData, url: e.target.value });
                          }}
                          placeholder="https://example.com/article"
                          style={getErrorStyle('resource-url')}
                          required={isFieldRequired('resource-url')}
                          title="Enter resource URL"
                          aria-label="Resource URL"
                          aria-invalid={hasError('resource-url')}
                        />
                      </InputWrapper>
                    </div>

                    {/* Only show capability field if resource is the starting point */}
                    {selectedContentType === 'resource' && (
                      <div className="form-group">
                        <label htmlFor="related-capability">
                          Related Foundational Capability
                        </label>
                        <InputWithButtonWrapper required={isFieldRequired('related-capability-resource')} hasError={hasError('related-capability-resource')}>
                          {resourceData.relatedCapability ? (
                            <input
                              type="text"
                              id="related-capability"
                              value={resourceData.relatedCapability}
                              disabled
                              readOnly
                              title="Related capability"
                              aria-label="Related foundational capability"
                            />
                          ) : (
                            <AutocompleteInput
                              id="related-capability"
                              value={pendingCapability}
                              onChange={(e) => setPendingCapability(e.target.value)}
                              onSuggestionSelect={(suggestion) => setPendingCapability(suggestion)}
                              suggestions={capabilityNames}
                              placeholder="Enter the name of an existing Foundational Capability or suggest a new one"
                              required={isFieldRequired('related-capability-resource')}
                              style={getErrorStyle('related-capability-resource')}
                              title="Enter related capability"
                              aria-label="Related foundational capability"
                              aria-invalid={hasError('related-capability-resource')}
                            />
                          )}
                          {!resourceData.relatedCapability ? (
                            <button
                              type="button"
                              onClick={addCapabilityToResource}
                              className="add-button"
                                title="Add capability"
                              aria-label="Add related capability"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const capabilityToRemove = resourceData.relatedCapability;
                                setResourceData({ ...resourceData, relatedCapability: '' });
                                setPendingCapability('');
                                // Remove the entire capability form group if it was added via association
                                if (showForms.capability && fcData.title === capabilityToRemove && fcData.isAddedViaAssociation) {
                                  removeFormGroup('capability');
                                }
                              }}
                              className="remove-button"
                              title="Remove capability"
                              aria-label="Remove related capability"
                            >
                              ×
                            </button>
                          )}
                        </InputWithButtonWrapper>
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="resource-content">Description</label>
                      <textarea
                        id="resource-content"
                        rows="4"
                        value={resourceData.content}
                        onChange={(e) => {
                          setResourceData({ ...resourceData, content: e.target.value });
                        }}
                        placeholder="Provide a brief description of this resource and its relevance"
                        title="Resource description"
                        aria-label="Resource description"
                      ></textarea>
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            return null;
          })}

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
              title={isSubmitting ? 'Submitting form' : 'Submit form for review'}
              aria-label="Submit contribution for review"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetAllForms();
                setSelectedContentType(null);
                setShowForms({ gap: false, capability: false, resource: false });
                setFormError('');
              }}
              className="cancel-button"
              title="Clear form and start over"
              aria-label="Start over with a new contribution"
            >
              Start Over
            </button>
          </div>
        </form>
      )}
    </div>
  );
}