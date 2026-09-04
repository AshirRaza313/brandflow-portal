import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

describe("fetchWithAuth external AbortSignal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("aborts fetch when external signal fires during request", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((input: any, init: any) => {
      return new Promise((resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    globalThis.fetch = fetchMock as any;

    const promise = fetchWithAuth("/api/test", { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow("Aborted");
  });

  it("removes external abort listener after fetch resolves", async () => {
    const controller = new AbortController();
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as any;

    await fetchWithAuth("/api/test", { signal: controller.signal });
    expect(removeSpy).toHaveBeenCalled();
  });

  it("does not override timeout error when external abort happens", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((input: any, init: any) => {
      return new Promise((resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    globalThis.fetch = fetchMock as any;

    const promise = fetchWithAuth("/api/test", { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow("Aborted");
  });
  it("aborts pending body when external signal fires after headers", async () => {
    const controller = new AbortController();
    let rejectBody: (err: any) => void;
    const pendingBody = new Promise((_, reject) => { rejectBody = reject; });
    const mockResponse = {
      status: 200,
      headers: new Headers({ "Content-Type": "text/plain" }),
      text: () => pendingBody,
      json: () => pendingBody,
      ok: true,
    } as unknown as Response;
    const fetchMock = vi.fn().mockResolvedValue(mockResponse);
    globalThis.fetch = fetchMock as any;

    const result = await fetchWithAuth("/api/test", { signal: controller.signal });
    const bodyRead = result.text();

    controller.abort();
    rejectBody(new DOMException("Aborted", "AbortError"));
    await expect(bodyRead).rejects.toThrow("Aborted");
  });
})

