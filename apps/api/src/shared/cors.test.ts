import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";

import { createCorsMiddleware } from "./cors.js";

test("CORS preflight allows configured frontend origins", async () => {
  const middleware = createCorsMiddleware("https://roleradar.example.com,http://localhost:5173");
  const headers = new Map<string, string | number | readonly string[]>();
  let statusCode: number | undefined;
  let didEnd = false;
  let didCallNext = false;

  middleware(
    {
      method: "OPTIONS",
      header: (name: string) => (name.toLowerCase() === "origin" ? "https://roleradar.example.com" : undefined)
    } as Request,
    {
      setHeader: (name: string, value: string | number | readonly string[]) => {
        headers.set(name.toLowerCase(), value);
        return {} as Response;
      },
      status: (code: number) => {
        statusCode = code;
        return {
          end: () => {
            didEnd = true;
          }
        } as Response;
      }
    } as Response,
    () => {
      didCallNext = true;
    }
  );

  assert.equal(statusCode, 204);
  assert.equal(didEnd, true);
  assert.equal(didCallNext, false);
  assert.equal(headers.get("access-control-allow-origin"), "https://roleradar.example.com");
  assert.equal(headers.get("access-control-allow-methods"), "GET,POST,PATCH,DELETE,OPTIONS");
  assert.equal(headers.get("access-control-allow-headers"), "Content-Type,Authorization");
});
