// Simple function with no dependencies
exports.handler = async function(event, context) {
    // Log the environment
    console.log("Function environment:", {
      nodeEnv: process.env.NODE_ENV,
      functionName: context.functionName,
      hasEnvVars: {
        NOTION_CONTRIBUTIONS_API_KEY: !!process.env.NOTION_CONTRIBUTIONS_API_KEY,
        NOTION_CONTRIBUTIONS_DB_ID: !!process.env.NOTION_CONTRIBUTIONS_DB_ID
      }
    });
  
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Simple function is working!",
        time: new Date().toISOString(),
        path: event.path,
        method: event.httpMethod
      })
    };
  };