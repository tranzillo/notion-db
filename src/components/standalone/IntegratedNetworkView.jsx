// src/components/standalone/IntegratedNetworkView.jsx
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Centralized style configuration for easy management
const NETWORK_STYLES = {
    // Node sizes
    nodeRadius: {
        bottleneck: 20,
        capability: 15,
        resource: 10,
    },
    // Node colors
    nodeColors: {
        bottleneck: 'var(--primary-color)', // Default color if no field
        capability: 'var(--secondary-color)',
        resource: 'var(--tertiary-color)',
    },
    // Node stroke
    nodeStroke: {
        color: 'var(--secondary-color)',
        width: 0,
    },
    // Link styles
    link: {
        color: 'var(--tertiary-color)',
        opacity: 1,
        hoverOpacity: 1,
        hiddenOpacity: 0.1,
        width: 1, // Base width
    },
    // Text styles
    text: {
        fontSize: 16,
        offset: 8,
        color: 'var(--text-color)',
        // Zoom thresholds for progressive label visibility
        zoomThresholds: {
            bottleneck: 1.3,
            capability: 3,
            resource: 3.5
        },
        // NEW: Add threshold for when we're "very zoomed out"
        veryZoomedOutThreshold: 1,
        // Only show labels for hovered node when very zoomed out
        maxLabelsToShowWhenZoomedOut: 5,
        // Transition for fade in/out
        fadeTransition: 300
    },
    // Animation durations 
    animation: {
        tooltip: 300,
        tooltipHide: 300,
        zoom: 300,
    },
    // Force simulation parameters
    force: {
        baseDistance: 100,
        bottleneckToCapability: 80,
        capabilityToResource: 50,
        charge: -300,
        collisionRadius: 1.5, // Multiplier of node radius
        clusterStrength: 0.25,
    },
    // Tooltip styles
    tooltip: {
        background: 'var(--card-background)',
        zIndex: 1000,
    },
};

export default function IntegratedNetworkView({
    bottlenecks = [],
    capabilities = [],
    resources = [],
    fields = [],
    searchQuery = '',
    selectedFieldIds = [],
    selectedTag = '',
    privateTag = '',
    viewType = 'bottlenecks' // or 'capabilities'
}) {
    // Setup state and refs
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const simulationRef = useRef(null);
    const zoomRef = useRef(null);
    const tooltipRef = useRef(null);
    const visualizationRef = useRef(null); // Added ref for D3 visualization context
    const handleWindowMouseUpRef = useRef(null); // Store event handler in a ref

    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [isClient, setIsClient] = useState(false);
    const [data, setData] = useState({ nodes: [], links: [] });
    const [filteredData, setFilteredData] = useState({ nodes: [], links: [] });
    const [showBottlenecks, setShowBottlenecks] = useState(true);
    const [showCapabilities, setShowCapabilities] = useState(true);
    const [showResources, setShowResources] = useState(false);
    const [resourceLimit, setResourceLimit] = useState(100);
    const [clusterSeparation, setClusterSeparation] = useState(1.5);
    const [layoutStabilized, setLayoutStabilized] = useState(false);
    const [currentZoomScale, setCurrentZoomScale] = useState(1);
    const [animationsEnabled, setAnimationsEnabled] = useState(true); // New state for animations toggle
    const [hasSignaledReadiness, setHasSignaledReadiness] = useState(false);

    // Use refs instead of state for hover tracking to prevent render loops
    const hoveredNodeIdRef = useRef(null);
    const hoveredConnectedIdsRef = useRef(new Set());

    // Different default settings based on view type
    useEffect(() => {
        if (viewType === 'bottlenecks') {
            // Bottlenecks view presets
            setShowBottlenecks(true);
            setShowCapabilities(true);
            setShowResources(false);
            setClusterSeparation(1.5);
        } else {
            // Capabilities view presets
            setShowBottlenecks(true);
            setShowCapabilities(true);
            setShowResources(true);
            setResourceLimit(50);
            setClusterSeparation(1.8);
        }
    }, [viewType]);

    // Set isClient to true when component mounts on client-side
    useEffect(() => {
        setIsClient(true);

        // Clean up function that runs on unmount
        return () => {
            // Remove window event listener for mouseup using the ref
            if (handleWindowMouseUpRef.current) {
                window.removeEventListener('mouseup', handleWindowMouseUpRef.current);
            }

            cleanupVisualization();
        };
    }, []);

    // Thorough cleanup of visualization
    const cleanupVisualization = () => {
        // Remove window event listeners to prevent memory leaks
        if (handleWindowMouseUpRef.current) {
            window.removeEventListener('mouseup', handleWindowMouseUpRef.current);
        }

        // Stop any running simulation
        if (simulationRef.current) {
            simulationRef.current.stop();
            simulationRef.current = null;
        }

        // Remove tooltips (both ref and any in DOM)
        if (tooltipRef.current) {
            tooltipRef.current.remove();
            tooltipRef.current = null;
        }
        d3.selectAll('.network-tooltip').remove();

        // IMPORTANT: Save zoom transform before clearing, so we can restore it
        let savedTransform = null;
        if (svgRef.current && zoomRef.current) {
            try {
                // Get the current transform if it exists
                const currentTransform = d3.zoomTransform(d3.select(svgRef.current).node());
                if (currentTransform && currentTransform.k !== 1) {
                    savedTransform = currentTransform;
                }
            } catch (e) {
                console.log("No existing transform to save");
            }
        }

        // Critical: First remove event listeners to prevent memory leaks
        if (svgRef.current) {
            d3.select(svgRef.current).on('.zoom', null);
        }

        // Remove ALL svg content from DOM
        if (svgRef.current) {
            // Start completely fresh by replacing the SVG element itself
            const parent = svgRef.current.parentNode;
            if (parent) {
                // Create a fresh SVG element
                const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                newSvg.setAttribute('class', 'network-svg');
                newSvg.setAttribute('width', dimensions.width);
                newSvg.setAttribute('height', dimensions.height);

                // Replace the old with the new
                parent.replaceChild(newSvg, svgRef.current);
                svgRef.current = newSvg;
            } else {
                // Fallback: just clear contents if replacement fails
                d3.select(svgRef.current).selectAll('*').remove();
            }
        }

        // Remove ANY stray D3 elements in the document that might be causing duplicates
        d3.selectAll('.nodes').remove();
        d3.selectAll('.links').remove();

        // Reset hover state refs
        if (hoveredNodeIdRef) hoveredNodeIdRef.current = null;
        if (hoveredConnectedIdsRef) hoveredConnectedIdsRef.current = new Set();

        return savedTransform; // Return saved transform for possible restoration
    };

    // Update dimensions on window resize
    useEffect(() => {
        if (!isClient) return;

        const updateDimensions = () => {
            // Safety check for containerRef.current
            if (!containerRef.current) return;

            const container = containerRef.current;
            const rect = container.getBoundingClientRect();

            // Only update if dimensions have actually changed and are non-zero
            if (rect.width > 0 && rect.height > 0 &&
                (dimensions.width !== rect.width || dimensions.height !== rect.height)) {
                setDimensions({
                    width: rect.width,
                    height: rect.height
                });
            }
        };

        // Initial dimension calculation
        updateDimensions();

        // Set up resize observer for more reliable size tracking
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Also listen for window resize as a fallback
        window.addEventListener('resize', updateDimensions);

        // Cleanup
        return () => {
            if (containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateDimensions);
        };
    }, [isClient, dimensions.width, dimensions.height]);

    // Format data for D3 (build complete dataset)
    useEffect(() => {
        if (!isClient) return;

        const nodes = [];
        const links = [];

        // Create a map of field IDs to field colors
        const fieldColorMap = new Map();
        fields.forEach(field => {
            const colorClass = field.colorClass || '';
            const colorIndex = colorClass.split('-').pop() || '0';
            fieldColorMap.set(field.id, `var(--field-color-${colorIndex})`);
        });

        // Add bottlenecks as nodes, colored by field
        if (showBottlenecks) {
            bottlenecks.forEach(bottleneck => {
                // Get field color for this bottleneck
                let fieldColor = NETWORK_STYLES.nodeColors.bottleneck; // Default color if no field
                let fieldId = null;
                let fieldName = 'Uncategorized';

                if (bottleneck.field && bottleneck.field.id) {
                    fieldId = bottleneck.field.id;
                    fieldColor = fieldColorMap.get(fieldId) || fieldColor;
                    fieldName = bottleneck.field.field_name || 'Uncategorized';
                }

                nodes.push({
                    id: `bottleneck-${bottleneck.id}`,
                    dataId: bottleneck.id,
                    name: bottleneck.bottleneck_name,
                    description: bottleneck.bottleneck_description,
                    type: 'bottleneck',
                    radius: NETWORK_STYLES.nodeRadius.bottleneck,
                    color: fieldColor,
                    fieldId: fieldId,
                    fieldName: fieldName,
                    tags: bottleneck.tags || [],
                    privateTags: bottleneck.privateTags || [],
                    slug: bottleneck.slug || bottleneck.id // Add slug for navigation
                });
            });
        }

        // Add capabilities as nodes and link to bottlenecks if both are enabled
        if (showCapabilities) {
            capabilities.forEach(capability => {
                nodes.push({
                    id: `capability-${capability.id}`,
                    dataId: capability.id,
                    name: capability.fc_name,
                    description: capability.fc_description,
                    type: 'capability',
                    radius: NETWORK_STYLES.nodeRadius.capability,
                    color: NETWORK_STYLES.nodeColors.capability,
                    tags: capability.tags || [],
                    privateTags: capability.privateTags || [],
                    slug: capability.slug || capability.id // Add slug for navigation
                });

                // Link to bottlenecks if bottlenecks are enabled
                if (showBottlenecks && capability.bottlenecks && Array.isArray(capability.bottlenecks)) {
                    capability.bottlenecks.forEach(bottleneck => {
                        if (bottleneck && bottleneck.id) {
                            links.push({
                                source: `bottleneck-${bottleneck.id}`,
                                target: `capability-${capability.id}`,
                                value: 1
                            });
                        }
                    });
                }
            });
        }

        // Add resources as nodes and link to capabilities if both are enabled
        if (showResources && resources && Array.isArray(resources)) {
            // Apply the configurable resource limit
            const limitedResources = resourceLimit > 0
                ? resources.slice(0, resourceLimit)
                : resources;

            limitedResources.forEach(resource => {
                nodes.push({
                    id: `resource-${resource.id}`,
                    dataId: resource.id,
                    name: resource.resource_title,
                    url: resource.resource_url,
                    type: 'resource',
                    radius: NETWORK_STYLES.nodeRadius.resource,
                    color: NETWORK_STYLES.nodeColors.resource
                });

                // Link to capabilities if capabilities are enabled
                if (showCapabilities) {
                    capabilities.forEach(capability => {
                        if (capability.resources && Array.isArray(capability.resources)) {
                            capability.resources.forEach(capResource => {
                                if (capResource && capResource.id === resource.id) {
                                    links.push({
                                        source: `capability-${capability.id}`,
                                        target: `resource-${resource.id}`,
                                        value: 1
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }

        setData({ nodes, links });
    }, [isClient, fields, bottlenecks, capabilities, resources, showBottlenecks, showCapabilities, showResources, resourceLimit]);

    // React to prop changes
    useEffect(() => {
        // When the component's selected filters change, clean up any stray elements
        if (isClient) {
            // Thoroughly clean up any stray elements that might have been left behind
            d3.selectAll('.network-tooltip').remove();
        }
    }, [selectedFieldIds, searchQuery, selectedTag, privateTag, isClient]);

    //  Check for layout stabilization in the simulation
    useEffect(() => {
        // A new, simpler way to detect if the graph should be considered ready
        if (filteredData.nodes.length > 0 && !hasSignaledReadiness) {
          console.log("Graph has nodes, will signal ready soon");
          
          // Use a timeout to give D3 time to render
          const readyTimer = setTimeout(() => {
            console.log("DISPATCHING graph-view-ready event", {
              nodeCount: filteredData.nodes.length,
              hasSignaled: hasSignaledReadiness
            });
            
            // Dispatch event and update state
            window.dispatchEvent(new CustomEvent('graph-view-ready'));
            setHasSignaledReadiness(true);
          }, 1000); // Longer delay for more reliability
          
          return () => clearTimeout(readyTimer);
        }
      }, [filteredData.nodes.length, hasSignaledReadiness]);
      
      // Reset ready signal when data changes significantly
      useEffect(() => {
        setHasSignaledReadiness(false);
      }, [filteredData.nodes]); // Depend directly on nodes array

    // Apply filtering and search
    useEffect(() => {
        if (!data.nodes.length) return;

        // Start with the full dataset
        let filteredNodes = [...data.nodes];

        // Apply field filter
        if (selectedFieldIds.length > 0) {
            // Create a Map to ensure unique nodes by ID
            const uniqueNodesMap = new Map();

            // First add bottlenecks with selected fields
            filteredNodes.forEach(node => {
                if (node.type === 'bottleneck') {
                    if (node.fieldId && selectedFieldIds.includes(node.fieldId)) {
                        uniqueNodesMap.set(node.id, node);
                    }
                }
            });

            // Now add capabilities and resources that are connected to selected bottlenecks
            const selectedBottleneckIds = Array.from(uniqueNodesMap.values())
                .filter(node => node.type === 'bottleneck')
                .map(node => node.id);

            // Find connected capabilities
            const connectedCapabilityIds = new Set();
            data.links.forEach(link => {
                if (selectedBottleneckIds.includes(link.source) && link.target.startsWith('capability-')) {
                    connectedCapabilityIds.add(link.target);
                }
            });

            // Add connected capabilities to filtered nodes
            filteredNodes.forEach(node => {
                if (node.type === 'capability' && connectedCapabilityIds.has(node.id)) {
                    uniqueNodesMap.set(node.id, node);
                }
            });

            // Find connected resources
            const connectedResourceIds = new Set();
            data.links.forEach(link => {
                if (connectedCapabilityIds.has(link.source) && link.target.startsWith('resource-')) {
                    connectedResourceIds.add(link.target);
                }
            });

            // Add connected resources to filtered nodes
            filteredNodes.forEach(node => {
                if (node.type === 'resource' && connectedResourceIds.has(node.id)) {
                    uniqueNodesMap.set(node.id, node);
                }
            });

            // Replace filtered nodes with unique nodes
            filteredNodes = Array.from(uniqueNodesMap.values());
        }

        // Apply search query
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();

            // First, identify nodes that directly match the search
            const directMatchNodes = filteredNodes.filter(node =>
                node.name.toLowerCase().includes(lowerQuery) ||
                (node.description && node.description.toLowerCase().includes(lowerQuery))
            );

            // Get IDs of direct matches
            const directMatchIds = new Set(directMatchNodes.map(node => node.id));

            // Now add nodes that are connected to direct matches
            filteredNodes = filteredNodes.filter(node => {
                // If it's a direct match, include it
                if (directMatchIds.has(node.id)) return true;

                // If it's connected to a direct match, include it
                const isConnected = data.links.some(link =>
                    (directMatchIds.has(link.source) && link.target === node.id) ||
                    (directMatchIds.has(link.target) && link.source === node.id)
                );

                return isConnected;
            });
        }

        // Apply tag filter
        if (selectedTag) {
            // First identify nodes that have the selected tag
            const tagMatchNodes = filteredNodes.filter(node =>
                node.tags && node.tags.includes(selectedTag)
            );

            // Get IDs of tag matches
            const tagMatchIds = new Set(tagMatchNodes.map(node => node.id));

            // Include nodes that are connected to tag matches
            filteredNodes = filteredNodes.filter(node => {
                // If it has the tag, include it
                if (tagMatchIds.has(node.id)) return true;

                // If it's connected to a node with the tag, include it
                const isConnected = data.links.some(link =>
                    (tagMatchIds.has(link.source) && link.target === node.id) ||
                    (tagMatchIds.has(link.target) && link.source === node.id)
                );

                return isConnected;
            });
        }

        // Apply private tag filter
        if (privateTag) {
            // First identify nodes that have the selected private tag
            const privateTagMatchNodes = filteredNodes.filter(node =>
                node.privateTags && node.privateTags.includes(privateTag)
            );

            // Get IDs of private tag matches
            const privateTagMatchIds = new Set(privateTagMatchNodes.map(node => node.id));

            // Include nodes that are connected to private tag matches
            filteredNodes = filteredNodes.filter(node => {
                // If it has the private tag, include it
                if (privateTagMatchIds.has(node.id)) return true;

                // If it's connected to a node with the private tag, include it
                const isConnected = data.links.some(link =>
                    (privateTagMatchIds.has(link.source) && link.target === node.id) ||
                    (privateTagMatchIds.has(link.target) && link.source === node.id)
                );

                return isConnected;
            });
        }

        // Filter links to only include connections between visible nodes
        const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
        const filteredLinks = data.links.filter(link =>
            filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
        );

        setFilteredData({ nodes: filteredNodes, links: filteredLinks });
        setLayoutStabilized(false); // Reset stabilization to trigger reframing

    }, [data, searchQuery, selectedFieldIds, selectedTag, privateTag]);

    // Create/update the D3 visualization
    useEffect(() => {
        // Safety check - make sure we're on the client and have all required elements
        if (!isClient || !filteredData.nodes || filteredData.nodes.length === 0 || !svgRef.current || !containerRef.current) {
            return;
        }

        // Reset hover state refs when rebuilding visualization
        hoveredNodeIdRef.current = null;
        hoveredConnectedIdsRef.current = new Set();

        // Set layout as not stabilized since we're rebuilding
        setLayoutStabilized(false);

        // First, clean up any previous visualization to prevent duplicates
        // Get the saved transform if any exists
        const savedTransform = cleanupVisualization();

        const svgElement = svgRef.current;
        const containerElement = containerRef.current;

        // Wait for the next frame to ensure the DOM elements are properly rendered
        requestAnimationFrame(() => {
            try {
                // Add a root SVG - with a unique identifier for debugging
                const rootSvg = d3.select(svgElement)
                    .attr('width', dimensions.width)
                    .attr('height', dimensions.height)
                    .attr('data-network-instance', Date.now()) // Add timestamp for debugging
                    // Add cursor styles for panning
                    .style('cursor', 'grab')
                    .on('mousedown', function () {
                        // Change to grabbing cursor when actively panning
                        d3.select(this).style('cursor', 'grabbing');
                    })
                    .on('mouseup', function () {
                        // Change back to grab cursor when released
                        d3.select(this).style('cursor', 'grab');
                    });

                // Create a single group for zoom transformation with a clear ID
                const svg = rootSvg.append('g')
                    .attr('class', 'network-container')
                    .attr('data-group-type', 'main');

                // Create initial force simulation
                const simulation = d3.forceSimulation(filteredData.nodes)
                    .force('link', d3.forceLink(filteredData.links).id(d => d.id).distance(d => {
                        // Adjust link distance based on node types
                        const baseDistance = NETWORK_STYLES.force.baseDistance * clusterSeparation;
                        if (d.source.type === 'bottleneck' && d.target.type === 'capability') {
                            return NETWORK_STYLES.force.bottleneckToCapability * clusterSeparation;
                        }
                        if (d.source.type === 'capability' && d.target.type === 'resource') {
                            return NETWORK_STYLES.force.capabilityToResource * clusterSeparation;
                        }
                        return baseDistance;
                    }))
                    .force('charge', d3.forceManyBody().strength(NETWORK_STYLES.force.charge * clusterSeparation))
                    .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
                    .force('collision', d3.forceCollide().radius(d => d.radius * NETWORK_STYLES.force.collisionRadius * clusterSeparation));

                // Add field clustering force
                simulation.force('cluster', alpha => {
                    // Create field clusters
                    const fieldClusters = new Map();

                    // First, identify all unique fields from bottlenecks
                    const uniqueFields = new Set();
                    filteredData.nodes.forEach(node => {
                        if (node.type === 'bottleneck' && node.fieldId) {
                            uniqueFields.add(node.fieldId);
                        }
                    });

                    // Create a structured layout for fields by positioning them in a circle
                    const fieldCount = uniqueFields.size;

                    if (fieldCount > 0) {
                        // Position in a circle
                        const radius = Math.min(dimensions.width, dimensions.height) * 0.35;

                        // Generate positions in a circle
                        let i = 0;
                        uniqueFields.forEach(fieldId => {
                            const angle = (i / fieldCount) * 2 * Math.PI;
                            const x = dimensions.width / 2 + radius * Math.cos(angle);
                            const y = dimensions.height / 2 + radius * Math.sin(angle);

                            fieldClusters.set(fieldId, {
                                x, y,
                                nodes: [],
                                index: i
                            });
                            i++;
                        });
                    }

                    // Group bottlenecks by field
                    filteredData.nodes.forEach(node => {
                        if (node.type === 'bottleneck' && node.fieldId && fieldClusters.has(node.fieldId)) {
                            fieldClusters.get(node.fieldId).nodes.push(node);
                        }
                    });

                    // Apply clustering force - stronger force for structured layout
                    const clusterStrength = NETWORK_STYLES.force.clusterStrength * clusterSeparation;

                    filteredData.nodes.forEach(node => {
                        if (node.type === 'bottleneck' && node.fieldId && fieldClusters.has(node.fieldId)) {
                            const cluster = fieldClusters.get(node.fieldId);

                            // Pull node toward its cluster center
                            const k = clusterStrength * alpha;
                            node.vx += (cluster.x - node.x) * k;
                            node.vy += (cluster.y - node.y) * k;
                        }

                        // Add stronger force to pull capabilities toward their connected bottlenecks
                        if (node.type === 'capability') {
                            const connectedBottlenecks = [];
                            filteredData.links.forEach(link => {
                                if (link.target === node.id && link.source.type === 'bottleneck') {
                                    connectedBottlenecks.push(link.source);
                                }
                            });

                            if (connectedBottlenecks.length > 0) {
                                let centerX = 0, centerY = 0;
                                connectedBottlenecks.forEach(n => {
                                    centerX += n.x;
                                    centerY += n.y;
                                });
                                const cx = centerX / connectedBottlenecks.length;
                                const cy = centerY / connectedBottlenecks.length;

                                const k = 0.3 * alpha * clusterSeparation;
                                node.vx += (cx - node.x) * k;
                                node.vy += (cy - node.y) * k;
                            }
                        }

                        // Pull resources toward their connected capabilities
                        if (node.type === 'resource') {
                            const connectedCapabilities = [];
                            filteredData.links.forEach(link => {
                                if (link.target === node.id && link.source.type === 'capability') {
                                    connectedCapabilities.push(link.source);
                                }
                            });

                            if (connectedCapabilities.length > 0) {
                                let centerX = 0, centerY = 0;
                                connectedCapabilities.forEach(n => {
                                    centerX += n.x;
                                    centerY += n.y;
                                });
                                const cx = centerX / connectedCapabilities.length;
                                const cy = centerY / connectedCapabilities.length;

                                const k = 0.3 * alpha * clusterSeparation;
                                node.vx += (cx - node.x) * k;
                                node.vy += (cy - node.y) * k;
                            }
                        }

                        // Add a stronger repulsion force between different field clusters
                        if (node.type === 'bottleneck' && node.fieldId) {
                            filteredData.nodes.forEach(otherNode => {
                                if (otherNode.type === 'bottleneck' && otherNode.fieldId &&
                                    node.fieldId !== otherNode.fieldId) {
                                    // Calculate distance between nodes
                                    const dx = otherNode.x - node.x;
                                    const dy = otherNode.y - node.y;
                                    const distance = Math.sqrt(dx * dx + dy * dy);

                                    // Apply repulsion force proportional to clusterSeparation
                                    if (distance > 0 && distance < 200 * clusterSeparation) {
                                        const repulsionStrength = 0.1 * clusterSeparation * alpha;
                                        const force = repulsionStrength / distance;
                                        node.vx -= dx * force;
                                        node.vy -= dy * force;
                                    }
                                }
                            });
                        }
                    });
                });

                simulationRef.current = simulation;

                // Create a single layer for links with a unique identifier
                const linksGroup = svg.append('g')
                    .attr('class', 'links-layer')
                    .attr('data-group-type', 'links');

                // Create links within this group
                const link = linksGroup
                    .selectAll('line')
                    .data(filteredData.links)
                    .enter()
                    .append('line')
                    .attr('class', 'network-link')
                    .attr('stroke', NETWORK_STYLES.link.color)
                    .attr('stroke-opacity', NETWORK_STYLES.link.opacity)
                    .attr('stroke-width', d => Math.sqrt(d.value) || NETWORK_STYLES.link.width)
                    .style('transition', animationsEnabled ?
                        `opacity ${NETWORK_STYLES.text.fadeTransition}ms ease-in-out` : 'none');

                // Helper function to determine if a label should be visible based on zoom level
                const shouldLabelBeVisible = (nodeType, zoomScale) => {
                    const threshold = NETWORK_STYLES.text.zoomThresholds[nodeType];
                    return zoomScale >= threshold;
                };

                // Create a nodes layer (bottom layer)
                const nodesLayer = svg.append('g')
                    .attr('class', 'nodes-layer')
                    .attr('data-group-type', 'nodes');

                // Add node circles to the layer
                const nodeCircles = nodesLayer
                    .selectAll('.node-circle')
                    .data(filteredData.nodes)
                    .enter()
                    .append('circle')
                    .attr('class', d => `node-circle node-circle-${d.type} node-circle-${d.id}`)
                    .attr('r', d => d.radius)
                    .attr('fill', d => d.color)
                    .attr('stroke', NETWORK_STYLES.nodeStroke.color)
                    .attr('stroke-width', NETWORK_STYLES.nodeStroke.width)
                    .style('cursor', 'pointer') // Add pointer cursor to indicate clickable nodes
                    .style('transition', animationsEnabled ?
                        `opacity ${NETWORK_STYLES.text.fadeTransition}ms ease-in-out, stroke-width 300ms ease, stroke 300ms ease` : 'none')
                    .call(d3.drag()
                        .on('start', dragstarted)
                        .on('drag', dragged)
                        .on('end', dragended));

                // Create a unified layer for labels (text + background as a unit) - always on top
                const labelsLayer = svg.append('g')
                    .attr('class', 'labels-layer')
                    .attr('data-group-type', 'labels');

                // Create label groups - one group per node containing both background and text
                const labelGroups = labelsLayer
                    .selectAll('.label-group')
                    .data(filteredData.nodes)
                    .enter()
                    .append('g')
                    .attr('class', d => `label-group label-group-${d.id}`)
                    .style('opacity', 0)
                    .style('transition', animationsEnabled ?
                        `opacity ${NETWORK_STYLES.text.fadeTransition}ms ease-in-out` : 'none')
                    .style('pointer-events', 'none');

                // First add background rectangles to each group (rendered first/beneath)
                const textBackgrounds = labelGroups
                    .append('rect')
                    .attr('class', d => `node-label-bg node-label-bg-${d.type} node-label-bg-${d.id}`)
                    .attr('rx', 3)
                    .attr('ry', 3)
                    .attr('fill', 'var(--background-color)')
                    .attr('fill-opacity', 0.9);

                // Then add text labels to each group (rendered on top of backgrounds)
                const textLabels = labelGroups
                    .append('text')
                    .attr('class', d => `node-label node-label-${d.type} node-label-${d.id}`)
                    .text(d => d.name)
                    .attr('font-size', NETWORK_STYLES.text.fontSize)
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.35em') // Vertical centering within the text element
                    .attr('fill', NETWORK_STYLES.text.color);

                // Helper function to update text background rectangles
                const updateTextBackgrounds = () => {
                    labelGroups.each(function (d) {
                        const group = d3.select(this);
                        const textElement = group.select('text').node();
                        if (textElement) {
                            const textBBox = textElement.getBBox();
                            const padding = 4;

                            // Update the background rect within the same group
                            group.select('rect')
                                .attr('x', -textBBox.width / 2 - padding)
                                .attr('y', -textBBox.height / 2 - padding)
                                .attr('width', textBBox.width + (padding * 2))
                                .attr('height', textBBox.height + (padding * 2));
                        }
                    });
                };

                // First, ensure any old tooltips are removed
                d3.selectAll('.network-tooltip').remove();

                // Define tooltip with a unique ID to ensure we don't get duplicates
                const tooltipId = `network-tooltip-${Date.now()}`;
                const tooltip = d3.select(containerElement).append('div')
                    .attr('id', tooltipId)
                    .attr('class', 'network-tooltip')
                    .style('position', 'absolute')  // Changed from 'absolute' to 'fixed'
                    .style('inset', 'auto 0 0 auto')     // Position from bottom
                    .style('max-width', '22em') // Limit width
                    .style('background', NETWORK_STYLES.tooltip.background)
                    .style('opacity', 0)
                    .style('z-index', NETWORK_STYLES.tooltip.zIndex)
                    .style('pointer-events', 'none')
                    .style('transition', animationsEnabled ?
                        'opacity 300ms ease-in-out' : 'none');  // Smooth transition

                // Store tooltip in ref for cleanup
                tooltipRef.current = tooltip.node();

                // Function to update all labels based on current zoom level
                const updateLabelVisibility = (scale) => {
                    // Store current scale for reference
                    setCurrentZoomScale(scale);

                    // Different visibility rules based on zoom level
                    labelGroups.style('opacity', nodeData => {
                        // CASE 1: Node is hovered or connected to hovered node
                        if (hoveredNodeIdRef.current) {
                            // When very zoomed out, only show the hovered node's label
                            if (scale < NETWORK_STYLES.text.veryZoomedOutThreshold) {
                                return nodeData.id === hoveredNodeIdRef.current ? 1 : 0;
                            }
                            // At medium zoom, show hovered node and its connections 
                            else {
                                return (nodeData.id === hoveredNodeIdRef.current ||
                                    hoveredConnectedIdsRef.current.has(nodeData.id)) ? 1 : 0;
                            }
                        }
                        // CASE 2: No hover, use standard zoom threshold logic
                        else {
                            // At very low zoom levels, hide all labels
                            if (scale < NETWORK_STYLES.text.veryZoomedOutThreshold) {
                                return 0;
                            }
                            // At higher zoom levels, show based on node type thresholds
                            return shouldLabelBeVisible(nodeData.type, scale) ? 1 : 0;
                        }
                    });

                    // Update text size to appear consistent at all zoom levels
                    textLabels.style('font-size', `${NETWORK_STYLES.text.fontSize / scale}px`);

                    // Update background rectangles
                    updateTextBackgrounds();

                    // Update node-to-label distances for all label groups based on new zoom level
                    if (simulation.alpha() < 0.1) { // Only when simulation is somewhat stable
                        // Calculate dynamic label offset based on current zoom
                        const dynamicLabelOffset = (d) => {
                            const baseOffset = d.radius + 6;
                            const zoomFactor = 0.5 + (0.5 * Math.min(2, scale));
                            return baseOffset * zoomFactor;
                        };

                        // Update label positions with the new dynamic offset
                        labelGroups.attr('transform', d =>
                            `translate(${d.x}, ${d.y + dynamicLabelOffset(d)})`
                        );
                    }
                };

                // Add node interaction behavior
                nodeCircles.on('mouseover', function (event, d) {
                    // Get the hovered node ID
                    const nodeId = d.id;

                    // Find connected node IDs
                    const connectedNodeIds = new Set();
                    filteredData.links.forEach(link => {
                        // Handle both string IDs and object references with .id
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                        if (sourceId === nodeId || targetId === nodeId) {
                            connectedNodeIds.add(sourceId);
                            connectedNodeIds.add(targetId);
                        }
                    });

                    // Update hover state using refs (doesn't trigger re-render)
                    hoveredNodeIdRef.current = nodeId;
                    hoveredConnectedIdsRef.current = connectedNodeIds;

                    // Show tooltip with more detailed information
                    let tooltipContent = `<strong>${d.name}</strong><br/>`;

                    if (d.type === 'bottleneck') {
                        tooltipContent += `Field: ${d.fieldName}`;

                        // Count connected capabilities
                        const connectedCapabilities = filteredData.links.filter(
                            link => (link.source.id === d.id || link.source === d.id) &&
                                (link.target.type === 'capability' || link.target.startsWith('capability-'))
                        ).length;

                        if (connectedCapabilities > 0) {
                            tooltipContent += `<br/>Connected to ${connectedCapabilities} capabilities`;
                        }
                    } else if (d.type === 'capability') {
                        tooltipContent += `Capability`;

                        // Count connected resources
                        const connectedResources = filteredData.links.filter(
                            link => (link.source.id === d.id || link.source === d.id) &&
                                (link.target.type === 'resource' || link.target.startsWith('resource-'))
                        ).length;

                        if (connectedResources > 0) {
                            tooltipContent += `<br/>Connected to ${connectedResources} resources`;
                        }
                    } else if (d.type === 'resource') {
                        tooltipContent += `Resource`;
                    }

                    tooltip.transition()
                        .duration(NETWORK_STYLES.animation.tooltip)
                        .style('opacity', .9);
                    tooltip.html(tooltipContent);

                    // Highlight connected nodes and links
                    nodeCircles
                        .style('opacity', nodeData =>
                            connectedNodeIds.has(nodeData.id) || nodeData.id === d.id ? 1 : 0.2
                        );

                    // Adjust link visibility
                    link.style('opacity', linkData => {
                        const linkSourceId = typeof linkData.source === 'object' ?
                            linkData.source.id : linkData.source;
                        const linkTargetId = typeof linkData.target === 'object' ?
                            linkData.target.id : linkData.target;

                        return linkSourceId === d.id || linkTargetId === d.id ?
                            NETWORK_STYLES.link.hoverOpacity :
                            NETWORK_STYLES.link.hiddenOpacity;
                    });

                    // Get current zoom scale to make proper text size adjustments
                    const currentTransform = d3.zoomTransform(rootSvg.node());
                    const currentScale = currentTransform.k;

                    // Force update label visibility with current scale and hover state
                    updateLabelVisibility(currentScale);
                });

                nodeCircles.on('mouseout', function (event, d) {
                    // Clear hover state with refs (doesn't trigger re-render)
                    hoveredNodeIdRef.current = null;
                    hoveredConnectedIdsRef.current = new Set();

                    // Hide tooltip
                    tooltip.transition()
                        .duration(NETWORK_STYLES.animation.tooltipHide)
                        .style('opacity', 0);

                    // Reset node stroke
                    nodeCircles.attr('stroke-width', NETWORK_STYLES.nodeStroke.width)
                        .attr('stroke', NETWORK_STYLES.nodeStroke.color);

                    // Reset node and link opacity
                    nodeCircles.style('opacity', 1);
                    link.style('opacity', NETWORK_STYLES.link.opacity);

                    // Get current zoom scale
                    const currentTransform = d3.zoomTransform(rootSvg.node());
                    const currentScale = currentTransform.k;

                    // Force update label visibility with current scale but no hover
                    updateLabelVisibility(currentScale);
                });

                // Enable click-through to detail pages
                nodeCircles.on('click', function (event, d) {
                    if (d.type === 'bottleneck') {
                        window.location.href = `/gaps/${d.slug}`;
                    } else if (d.type === 'capability') {
                        window.location.href = `/capabilities/${d.slug}`;
                    } else if (d.type === 'resource' && d.url) {
                        window.open(d.url, '_blank', 'noopener,noreferrer');
                    }
                    event.preventDefault();
                    event.stopPropagation();
                });

                // Define drag functions with proper cursor handling
                function dragstarted(event, d) {
                    // Prevent event propagation to avoid triggering pan
                    event.sourceEvent.stopPropagation();

                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;

                    // Change cursor to grabbing during drag
                    d3.select(event.sourceEvent.target).style('cursor', 'grabbing');
                }

                function dragged(event, d) {
                    d.fx = event.x;
                    d.fy = event.y;
                }

                function dragended(event, d) {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;

                    // Reset cursor to pointer when drag ends
                    d3.select(event.sourceEvent.target).style('cursor', 'pointer');
                }

                // Setup a timer to detect when the layout has stabilized
                let tickCount = 0;
                const stabilityCheckInterval = 20; // Check every 20 ticks
                let previousEnergy = Infinity;
                let stabilityCounter = 0;

                // Update positions on tick
                simulation.on('tick', () => {
                    // Update link positions
                    link
                        .attr('x1', d => {
                            const source = typeof d.source === 'object' ? d.source : filteredData.nodes.find(n => n.id === d.source);
                            return source ? source.x : 0;
                        })
                        .attr('y1', d => {
                            const source = typeof d.source === 'object' ? d.source : filteredData.nodes.find(n => n.id === d.source);
                            return source ? source.y : 0;
                        })
                        .attr('x2', d => {
                            const target = typeof d.target === 'object' ? d.target : filteredData.nodes.find(n => n.id === d.target);
                            return target ? target.x : 0;
                        })
                        .attr('y2', d => {
                            const target = typeof d.target === 'object' ? d.target : filteredData.nodes.find(n => n.id === d.target);
                            return target ? target.y : 0;
                        });

                    // Update node circle positions
                    nodeCircles
                        .attr('cx', d => d.x)
                        .attr('cy', d => d.y);

                    // Calculate dynamic label offset based on zoom level
                    // When zoomed out, labels should be closer to nodes; when zoomed in, they need more space
                    // Get current zoom scale - default to 1 if not yet set
                    const currentScale = zoomRef.current ?
                        d3.zoomTransform(rootSvg.node()).k || 1 : 1;

                    // Base offset adjusted for zoom: reduce distance when zoomed out, increase when zoomed in
                    const dynamicLabelOffset = (d) => {
                        // Base offset is the node radius plus a minimum padding
                        const baseOffset = d.radius + 6;

                        // Adjust offset based on zoom:
                        // - When zoomed way out (0.1x), we want labels very close to nodes (multiply by ~0.5)
                        // - At normal zoom (1x), we want the standard offset
                        // - When zoomed way in (5x+), we want more spacing (multiply by ~1.5)
                        // Using a curve that gives us these properties:
                        const zoomFactor = 0.5 + (0.5 * Math.min(2, currentScale));

                        // Return the dynamically calculated offset
                        return baseOffset * zoomFactor;
                    };

                    // Update label group positions with dynamic offset
                    labelGroups
                        .attr('transform', d => `translate(${d.x}, ${d.y + dynamicLabelOffset(d)})`); // Position below node with dynamic offset

                    // Update text background positions within each group
                    updateTextBackgrounds();

                    // Check for stabilization
                    tickCount++;
                    if (tickCount % stabilityCheckInterval === 0) {
                        // Calculate total energy of the system (a measure of movement)
                        let energy = 0;
                        filteredData.nodes.forEach(node => {
                            energy += Math.abs(node.vx || 0) + Math.abs(node.vy || 0);
                        });

                        // If energy is very low or hasn't changed much, consider it stabilized
                        if (energy < 0.1 || Math.abs(energy - previousEnergy) < 0.05) {
                            stabilityCounter++;

                            // After 3 consecutive stable checks, fit to viewport
                            if (stabilityCounter >= 3 && !layoutStabilized) {
                                setLayoutStabilized(true);
                                fitGraphToViewport(rootSvg, svg, filteredData.nodes);
                                // Do NOT add the event dispatch here - we're handling it in the useEffect
                            }
                        } else {
                            stabilityCounter = 0;
                        }

                        previousEnergy = energy;
                    }
                });

                // Function to fit graph to viewport
                function fitGraphToViewport(rootSvg, contentSvg, nodes) {
                    if (!nodes.length) return;

                    // Find bounds of all nodes
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

                    nodes.forEach(node => {
                        if (node.x < minX) minX = node.x;
                        if (node.x > maxX) maxX = node.x;
                        if (node.y < minY) minY = node.y;
                        if (node.y > maxY) maxY = node.y;
                    });

                    // Add padding
                    const padding = 40;
                    minX -= padding;
                    minY -= padding;
                    maxX += padding;
                    maxY += padding;

                    // Calculate scale and translate to fit bounds
                    const width = dimensions.width;
                    const height = dimensions.height;

                    const boundWidth = maxX - minX;
                    const boundHeight = maxY - minY;

                    // Calculate the scale to fit within the viewport
                    const scale = Math.min(width / boundWidth, height / boundHeight, 1.5); // Cap at 1.5x zoom

                    // Calculate center point of bounds
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;

                    // Create the transform to center and scale
                    const transform = d3.zoomIdentity
                        .translate(width / 2, height / 2)
                        .scale(scale)
                        .translate(-centerX, -centerY);

                    // Apply the transform smoothly
                    rootSvg.transition()
                        .duration(NETWORK_STYLES.animation.zoom)
                        .call(zoomRef.current.transform, transform)
                        .on('end', () => {
                            // Update labels with new scale when transition completes
                            updateLabelVisibility(transform.k);
                        });
                }

                // Add a window level event listener to catch mouse up even when it occurs outside the SVG
                const handleWindowMouseUp = () => {
                    if (rootSvg && rootSvg.node()) {
                        d3.select(rootSvg.node()).style('cursor', 'grab');
                    }
                };

                // Store the handler in a ref for cleanup
                handleWindowMouseUpRef.current = handleWindowMouseUp;

                // Add event listener to window for mouseup
                window.addEventListener('mouseup', handleWindowMouseUp);

                // Setup zoom behavior
                const zoomHandler = d3.zoom()
                    .scaleExtent([0.1, 10])
                    .on('start', () => {
                        rootSvg.style('cursor', 'grabbing');
                    })
                    .on('zoom', (event) => {
                        // Update the transform for panning and zooming
                        svg.attr('transform', event.transform);

                        // Update label visibility and sizing based on new zoom level
                        updateLabelVisibility(event.transform.k);

                        // Also update the dynamic label positioning immediately
                        const dynamicLabelOffset = (d) => {
                            const baseOffset = d.radius + 6;
                            const zoomFactor = 0.5 + (0.5 * Math.min(2, event.transform.k));
                            return baseOffset * zoomFactor;
                        };

                        // Update all label positions with the new offset
                        labelGroups.attr('transform', d =>
                            `translate(${d.x}, ${d.y + dynamicLabelOffset(d)})`
                        );
                    })
                    .on('end', () => {
                        rootSvg.style('cursor', 'grab');
                    });

                // Apply zoom to the rootSvg, not the transformed group
                rootSvg.call(zoomHandler);
                zoomRef.current = zoomHandler;

                // Initialize label visibility with current zoom level
                updateLabelVisibility(currentZoomScale);

                // Store the D3 context in the visualization ref for access from React event handlers
                visualizationRef.current = {
                    rootSvg,
                    svg,
                    nodeCircles,
                    link,
                    labelGroups,
                    textLabels,
                    tooltip,
                    simulation,
                    updateLabelVisibility
                };
            } catch (err) {
                console.error("Error setting up network visualization:", err);
            }
        });
// Add a timeout-based backup signaling mechanism
const backupSignalTimer = setTimeout(() => {
    if (!hasSignaledReadiness && filteredData.nodes.length > 0) {
      console.log("BACKUP: Force signaling graph-view-ready after timeout");
      window.dispatchEvent(new CustomEvent('graph-view-ready'));
      setHasSignaledReadiness(true);
    }
  }, 3000); // 3 second backup timeout
  
  // Be sure to clean this up
  return () => {
    if (backupSignalTimer) clearTimeout(backupSignalTimer);
    // Rest of your cleanup code...
  };
        // Cleanup function when component unmounts or when this effect re-runs
        return () => {
            cleanupVisualization();
        };
    }, [filteredData, dimensions, isClient, clusterSeparation, layoutStabilized, animationsEnabled]);

    // Return a loading state or placeholder when rendering on the server
    if (!isClient) {
        return (
            <div className="network-graph" ref={containerRef}>
                <div className="network-loading">Loading visualization...</div>
            </div>
        );
    }

    return (
        <div className="network-graph" ref={containerRef}>
            <div className="network-controls">
                <div className="network-controls__title">Display</div>
                <div className="network-controls__item">
                    <input
                        type="checkbox"
                        id="show-capabilities"
                        checked={showCapabilities}
                        onChange={() => setShowCapabilities(!showCapabilities)}
                    />
                    <label htmlFor="show-capabilities">Capabilities</label>
                </div>
                <div className="network-controls__item">
                    <input
                        type="checkbox"
                        id="show-resources"
                        checked={showResources}
                        onChange={() => setShowResources(!showResources)}
                    />
                    <label htmlFor="show-resources">Resources</label>
                </div>

                <div className="network-controls__section">
                    <div className="network-controls__title">Performance</div>
                    <div className="network-controls__item">
                        <input
                            type="checkbox"
                            id="enable-animations"
                            checked={animationsEnabled}
                            onChange={() => setAnimationsEnabled(!animationsEnabled)}
                        />
                        <label htmlFor="enable-animations">Enable Animations</label>
                    </div>
                </div>

                <div className="network-controls__section">
                    <div className="network-controls__title">Layout</div>
                    <div className="network-controls__slider">
                        <label htmlFor="cluster-separation">Cluster Separation</label>
                        <input
                            type="range"
                            id="cluster-separation"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={clusterSeparation}
                            onChange={(e) => setClusterSeparation(parseFloat(e.target.value))}
                        />
                        <div className="network-controls__slider-label">
                            {clusterSeparation.toFixed(1)}
                        </div>
                    </div>
                    <button
                        className="network-controls__button"
                        onClick={() => {
                            setLayoutStabilized(false);
                            if (simulationRef.current) {
                                simulationRef.current.alpha(1).restart();
                            }
                        }}
                    >
                        Reset
                    </button>
                </div>

                {showResources && (
                    <div className="network-controls__section">
                        <div className="network-controls__title">Resource Limit</div>
                        <div className="network-controls__slider">
                            <input
                                type="range"
                                id="resource-limit"
                                min="0"
                                max="1000"
                                step="50"
                                value={resourceLimit}
                                onChange={(e) => setResourceLimit(parseInt(e.target.value))}
                            />
                            <div className="network-controls__slider-label">
                                {resourceLimit === 0 ? 'No limit' : resourceLimit}
                            </div>
                        </div>
                        <div className="network-controls__buttons">
                            <button
                                onClick={() => setResourceLimit(100)}
                                className={resourceLimit === 100 ? 'active' : ''}
                            >
                                100
                            </button>
                            <button
                                onClick={() => setResourceLimit(200)}
                                className={resourceLimit === 200 ? 'active' : ''}
                            >
                                200
                            </button>
                            <button
                                onClick={() => setResourceLimit(500)}
                                className={resourceLimit === 500 ? 'active' : ''}
                            >
                                500
                            </button>
                            <button
                                onClick={() => setResourceLimit(0)}
                                className={resourceLimit === 0 ? 'active' : ''}
                            >
                                All
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {filteredData.nodes.length === 0 && (
                <div className="network-empty-state">
                    <p>No data matches your current filters. Try adjusting your search criteria or filters.</p>
                </div>
            )}

            <svg ref={svgRef} className="network-svg"></svg>

            <div className="network-instructions">
                <p>Zoom to explore. Hold for info. Tap for more.</p>
                <div className="zoom-indicator">
                    <small>Zoom: {currentZoomScale.toFixed(1)}x</small>
                </div>
            </div>
        </div>
    );
}