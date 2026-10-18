export interface EventEnvelope<TPayload> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  correlationId: string;
  producer: string;
  schemaVersion: number;
  payload: TPayload;
}

