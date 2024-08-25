const options = {
    openapi: "OpenAPI 3",
    language: "en-US",
    disableLogs: false,
    autoHeaders: false,
    autoQuery: false,
    autoBody: false,
  };
  const generateSwagger = require("swagger-autogen")();
  
  const swaggerDocument = {
    info: {
      version: "1.0.0",
      title: "Servidor WeTo",
      description: "API for Managing Announcements in a Complex",
      contact: {
        name: "API Support",
        email: "brayan.maca@uao.edu.co",
      },
    },
    host: "localhost:3000",
    basePath: "/",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [
      {
        name: "Servidor WeTo",
        description: "API for managing Announcenments in a complex",
      },
    ],
    securityDefinitions: {},
    definitions: {
      servidorResponse: {
        code: 200,
        message: "Success",
      },
      "errorResponse.400": {
        code: 400,
        message:
          "The request was malformed or invalid. Please check the request parameters.",
      },
      "errorResponse.401": {
        code: 401,
        message: "Authentication failed or user lacks proper authorization.",
      },
      "errorResponse.403": {
        code: 403,
        message: "You do not have permission to access this resource.",
      },
      "errorResponse.404": {
        code: "404",
        message: "The requested resource could not be found on the server.",
      },
      "errorResponse.500": {
        code: 500,
        message:
          "An unexpected error occurred on the server. Please try again later.",
      },
    },
  };
  const swaggerFile = "../docs/swagger.json";
  const apiRouteFile = ["../src/routes/routes.js"];
  generateSwagger(swaggerFile, apiRouteFile, swaggerDocument);
  