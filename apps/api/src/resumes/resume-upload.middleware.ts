import multer from "multer";

import { HttpError } from "../shared/http-error.js";

export const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      callback(new HttpError(400, "Resume must be a PDF file"));
      return;
    }

    callback(null, true);
  }
});
