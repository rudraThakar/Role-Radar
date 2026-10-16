import { HttpError } from "../shared/http-error.js";
import { applicationStageValues, type ApplicationStageValue } from "./job-state.types.js";

export interface UpdateJobApplicationInput {
  applicationStage?: ApplicationStageValue;
  applicationNotes?: string;
}

export function parseUpdateJobApplicationInput(body: unknown): UpdateJobApplicationInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const record = body as Record<string, unknown>;
  const input: UpdateJobApplicationInput = {};

  if (record.applicationStage !== undefined) {
    if (typeof record.applicationStage !== "string" || !applicationStageValues.includes(record.applicationStage as ApplicationStageValue)) {
      throw new HttpError(400, `applicationStage must be one of: ${applicationStageValues.join(", ")}`);
    }
    input.applicationStage = record.applicationStage as ApplicationStageValue;
  }

  if (record.applicationNotes !== undefined) {
    if (typeof record.applicationNotes !== "string") {
      throw new HttpError(400, "applicationNotes must be a string");
    }
    input.applicationNotes = record.applicationNotes.trim();
  }

  return input;
}
