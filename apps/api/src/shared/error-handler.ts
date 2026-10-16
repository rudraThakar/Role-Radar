import type { ErrorRequestHandler } from "express";

import { HttpError } from "./http-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: "Internal server error"
  });
};

