// Simple test function to verify Netlify Functions setup
exports.handler = async function(event, context) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Hello from Netlify Functions! It works!",
        received: {
          method: event.httpMethod,
          path: event.path,
          headers: event.headers
        }
      })
    };
  };