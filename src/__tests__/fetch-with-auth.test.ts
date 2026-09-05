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

  it("triggers internal timeout and rejects with timeout error", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((input: any, init: any) => {
      return new Promise((resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    globalThis.fetch = fetchMock as any;

    const promise = fetchWithAuth("/api/test");
    vi.advanceTimersByTime(30_000);
    await expect(promise).rejects.toThrow("Request timed out. Please try again.");
    vi.useRealTimers();
  });
  it("aborts pending body when external signal fires after headers", async () => {
    const controller = new AbortController();
    const bodyStream = new ReadableStream({
      start(streamController) {
        controller.signal.addEventListener("abort", () => {
          streamController.error(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      },
    });
    const mockResponse = {
      status: 200,
      headers: new Headers({ "Content-Type": "text/plain" }),
      text: () => new Promise((_, reject) => {
        const reader = bodyStream.getReader();
        reader.read().then(({ value, done }) => {
          if (done) resolve("done");
          else reject(reader.closed.catch((e) => e));
        }).catch(reject);
      }),
      ok: true,
    } as unknown as Response;
    const fetchMock = vi.fn().mockResolvedValue(mockResponse);
    globalThis.fetch = fetchMock as any;

    const result = await fetchWithAuth("/api/test", { signal: controller.signal });
    const bodyRead = result.text();

    controller.abort();
    await expect(bodyRead).rejects.toThrow("Aborted");
  });
})





