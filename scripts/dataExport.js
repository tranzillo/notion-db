// scripts/dataExport.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log function with timestamps for better debugging
function log(message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Format and export data for public distribution
 */
export async function generateDataExport() {
  log('Starting data export process...');
  
  try {
    // Fetch all data from Notion
    log('Importing getAllData function...');
    const { getAllData } = await import('../src/lib/notion.js');
    
    log('Fetching data from Notion...');
    const { bottlenecks, foundationalCapabilities, fields, resources, resourceTypeOptions } = 
      await getAllData();
    
    log(`Retrieved data: ${bottlenecks.length} gaps, ${foundationalCapabilities.length} capabilities, ${fields.length} fields, ${resources.length} resources`);
      
    // Create the output directory if it doesn't exist
    const outputDir = path.resolve(__dirname, '../public/data');
    const zipOutputDir = path.resolve(__dirname, '../public/download');
    
    log(`Output directory: ${outputDir}`);
    log(`Zip output directory: ${zipOutputDir}`);
    
    if (!fs.existsSync(outputDir)) {
      log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(zipOutputDir)) {
      log(`Creating zip output directory: ${zipOutputDir}`);
      fs.mkdirSync(zipOutputDir, { recursive: true });
    }
    
    // Import slug utilities
    log('Importing slug utilities...');
    const { createBottleneckSlug, createCapabilitySlug, createFieldSlug } = 
      await import('../src/lib/slugUtils.js');
    
    // Format the field data
    log('Formatting field data...');
    const formattedFields = fields.map(field => ({
      id: field.id,
      name: field.field_name,
      slug: field.slug || createFieldSlug(field.field_name),
      description: field.field_description
    }));
    
    // Format the bottlenecks data (removing rank and private tags)
    // Also renaming "bottleneck" to "gap" in the public-facing data structure
    log('Formatting R&D gaps data...');
    const formattedGaps = bottlenecks.map(bottleneck => ({
      id: bottleneck.id,
      name: bottleneck.bottleneck_name,
      slug: bottleneck.slug || createBottleneckSlug(bottleneck.bottleneck_name),
      description: bottleneck.bottleneck_description,
      field: bottleneck.field ? {
        id: bottleneck.field.id,
        name: bottleneck.field.field_name
      } : null,
      foundationalCapabilities: bottleneck.foundational_capabilities 
        ? bottleneck.foundational_capabilities.map(fc => fc.id)
        : [],
      tags: bottleneck.tags || []
    }));
    
    // Format the capabilities data (removing private tags)
    // Also renaming "bottlenecks" to "gaps" in the public-facing data structure
    log('Formatting capabilities data...');
    const formattedCapabilities = foundationalCapabilities.map(capability => ({
      id: capability.id,
      name: capability.fc_name,
      slug: capability.slug || createCapabilitySlug(capability.fc_name),
      description: capability.fc_description,
      gaps: capability.bottlenecks // Renamed from bottlenecks to gaps
        ? capability.bottlenecks.map(b => b.id)
        : [],
      resources: capability.resources 
        ? capability.resources.map(r => r.id)
        : [],
      tags: capability.tags || []
    }));
    
    // Format the resource data
    log('Formatting resource data...');
    const formattedResources = resources.map(resource => ({
      id: resource.id,
      title: resource.resource_title,
      url: resource.resource_url,
      summary: resource.content || "",
      types: resource.resourceTypes || ["Publication"]
    }));
    
    // Create a normalized dataset for the most efficient structure
    const normalizedData = {
      fields: formattedFields,
      gaps: formattedGaps, // Renamed from bottlenecks to gaps
      capabilities: formattedCapabilities,
      resources: formattedResources,
      resourceTypes: resourceTypeOptions,
      metadata: {
        exportDate: new Date().toISOString(),
        version: "1.0.0",
        counts: {
          fields: formattedFields.length,
          gaps: formattedGaps.length, // Renamed from bottlenecks to gaps
          capabilities: formattedCapabilities.length,
          resources: formattedResources.length
        }
      }
    };
    
    // Write the normalized data as a single comprehensive JSON file
    log('Writing complete dataset...');
    const mainDataPath = path.join(outputDir, 'gapmap-data.json');
    fs.writeFileSync(mainDataPath, JSON.stringify(normalizedData, null, 2));
    log(`Complete dataset written to: ${mainDataPath}`);
    
    // Also write individual files for each data type
    log('Writing individual data files...');
    
    const fieldsPath = path.join(outputDir, 'fields.json');
    fs.writeFileSync(fieldsPath, JSON.stringify(formattedFields, null, 2));
    log(`Fields data written to: ${fieldsPath}`);
    
    const gapsPath = path.join(outputDir, 'gaps.json'); // Renamed from bottlenecks.json to gaps.json
    fs.writeFileSync(gapsPath, JSON.stringify(formattedGaps, null, 2));
    log(`Gaps data written to: ${gapsPath}`);
    
    const capabilitiesPath = path.join(outputDir, 'capabilities.json');
    fs.writeFileSync(capabilitiesPath, JSON.stringify(formattedCapabilities, null, 2));
    log(`Capabilities data written to: ${capabilitiesPath}`);
    
    const resourcesPath = path.join(outputDir, 'resources.json');
    fs.writeFileSync(resourcesPath, JSON.stringify(formattedResources, null, 2));
    log(`Resources data written to: ${resourcesPath}`);
    
    // Write metadata file with export info
    log('Writing metadata file...');
    const metadataPath = path.join(outputDir, 'metadata.json');
    fs.writeFileSync(
      metadataPath,
      JSON.stringify({
        exportDate: new Date().toISOString(),
        version: "1.0.0",
        counts: {
          fields: formattedFields.length,
          gaps: formattedGaps.length,
          capabilities: formattedCapabilities.length,
          resources: formattedResources.length
        },
        schema: "https://gap-map.org/data/schema.json"
      }, null, 2)
    );
    log(`Metadata written to: ${metadataPath}`);
    
    // Generate a README file to help users understand the data
    log('Writing README file...');
    const readmeContent = `# Gap Map Data Export

## Overview
This export contains research gaps and foundational capabilities data from the Gap Map project.

## Files
- \`gapmap-data.json\`: Complete dataset with all entities
- \`fields.json\`: Research fields/disciplines
- \`gaps.json\`: R&D Gaps 
- \`capabilities.json\`: Foundational Capabilities
- \`resources.json\`: Related resources and publications
- \`metadata.json\`: Export information and statistics

## Data Structure
- Fields have: id, name, slug, description
- R&D Gaps have: id, name, slug, description, field, foundationalCapabilities (IDs), tags
- Capabilities have: id, name, slug, description, gaps (IDs), resources (IDs), tags
- Resources have: id, title, url, summary, types

## Contact
For questions or corrections, please contact gapmap@convergentresearch.org.

## Last Updated
${new Date().toISOString().split('T')[0]}
`;
    
    const readmePath = path.join(outputDir, 'README.md');
    fs.writeFileSync(readmePath, readmeContent);
    log(`README written to: ${readmePath}`);
    
    // Write JSON schema file
    log('Writing JSON schema file...');
    const schemaContent = {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Gap Map Data",
      "description": "Schema for the Gap Map research gaps and foundational capabilities dataset",
      "type": "object",
      "required": ["fields", "gaps", "capabilities", "resources", "metadata"],
      "properties": {
        "fields": {
          "type": "array",
          "description": "Research fields or disciplines",
          "items": {
            "type": "object",
            "required": ["id", "name", "slug", "description"],
            "properties": {
              "id": {
                "type": "string",
                "description": "Unique identifier for the field"
              },
              "name": {
                "type": "string",
                "description": "Name of the research field"
              },
              "slug": {
                "type": "string",
                "description": "URL-friendly version of the field name"
              },
              "description": {
                "type": "string",
                "description": "Description of the research field"
              }
            }
          }
        },
        "gaps": {
          "type": "array",
          "description": "Research and development gaps",
          "items": {
            "type": "object",
            "required": ["id", "name", "slug", "description"],
            "properties": {
              "id": {
                "type": "string",
                "description": "Unique identifier for the R&D gap"
              },
              "name": {
                "type": "string",
                "description": "Name of the R&D gap"
              },
              "slug": {
                "type": "string",
                "description": "URL-friendly version of the gap name"
              },
              "description": {
                "type": "string",
                "description": "Description of the R&D gap"
              },
              "field": {
                "type": ["object", "null"],
                "description": "The research field this gap belongs to",
                "properties": {
                  "id": {
                    "type": "string",
                    "description": "Unique identifier for the field"
                  },
                  "name": {
                    "type": "string",
                    "description": "Name of the research field"
                  }
                }
              },
              "foundationalCapabilities": {
                "type": "array",
                "description": "IDs of foundational capabilities that address this gap",
                "items": {
                  "type": "string"
                }
              },
              "tags": {
                "type": "array",
                "description": "Tags associated with this gap",
                "items": {
                  "type": "string"
                }
              }
            }
          }
        },
        "capabilities": {
          "type": "array",
          "description": "Foundational capabilities that address R&D gaps",
          "items": {
            "type": "object",
            "required": ["id", "name", "slug", "description"],
            "properties": {
              "id": {
                "type": "string",
                "description": "Unique identifier for the capability"
              },
              "name": {
                "type": "string",
                "description": "Name of the foundational capability"
              },
              "slug": {
                "type": "string",
                "description": "URL-friendly version of the capability name"
              },
              "description": {
                "type": "string",
                "description": "Description of the foundational capability"
              },
              "gaps": {
                "type": "array",
                "description": "IDs of R&D gaps addressed by this capability",
                "items": {
                  "type": "string"
                }
              },
              "resources": {
                "type": "array",
                "description": "IDs of resources related to this capability",
                "items": {
                  "type": "string"
                }
              },
              "tags": {
                "type": "array",
                "description": "Tags associated with this capability",
                "items": {
                  "type": "string"
                }
              }
            }
          }
        },
        "resources": {
          "type": "array",
          "description": "Resources related to foundational capabilities",
          "items": {
            "type": "object",
            "required": ["id", "title"],
            "properties": {
              "id": {
                "type": "string",
                "description": "Unique identifier for the resource"
              },
              "title": {
                "type": "string",
                "description": "Title of the resource"
              },
              "url": {
                "type": "string",
                "description": "URL where the resource can be accessed"
              },
              "summary": {
                "type": "string",
                "description": "Summary or description of the resource"
              },
              "types": {
                "type": "array",
                "description": "Types of resource (e.g., Publication, Dataset, Tool)",
                "items": {
                  "type": "string"
                }
              }
            }
          }
        },
        "metadata": {
          "type": "object",
          "description": "Metadata about the export",
          "properties": {
            "exportDate": {
              "type": "string",
              "format": "date-time",
              "description": "Date and time when the export was created"
            },
            "version": {
              "type": "string",
              "description": "Version of the export format"
            },
            "counts": {
              "type": "object",
              "description": "Count of items in each category",
              "properties": {
                "fields": {
                  "type": "integer",
                  "description": "Number of fields"
                },
                "gaps": {
                  "type": "integer",
                  "description": "Number of R&D gaps"
                },
                "capabilities": {
                  "type": "integer",
                  "description": "Number of capabilities"
                },
                "resources": {
                  "type": "integer",
                  "description": "Number of resources"
                }
              }
            }
          }
        }
      }
    };

    const schemaPath = path.join(outputDir, 'schema.json');
    fs.writeFileSync(schemaPath, JSON.stringify(schemaContent, null, 2));
    log(`Schema written to: ${schemaPath}`);
    
    log('Data export completed successfully!');
    return outputDir;
  } catch (error) {
    console.error('Error generating data export:');
    console.error(error);
    throw error;
  }
}

// Main execution block
log("STARTING DATA EXPORT SCRIPT");
generateDataExport()
  .then(outputDir => {
    log(`COMPLETED: Export successful. Data available in: ${outputDir}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED: Export process encountered an error:');
    console.error(err);
    process.exit(1);
  });