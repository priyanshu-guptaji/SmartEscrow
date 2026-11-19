import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
// This file is excluded from tsconfig, so tsx uses the classic JSX runtime.
import React from "react";
import { JSDOM } from "jsdom";

// The component is a client widget, so set up a DOM before loading React.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

const domWindow = dom.window as unknown as Window & typeof globalThis;

Object.defineProperties(globalThis, {
  window: { value: domWindow, configurable: true },
  document: { value: domWindow.document, configurable: true },
  navigator: { value: domWindow.navigator, configurable: true },
  HTMLElement: { value: domWindow.HTMLElement, configurable: true },
  Node: { value: domWindow.Node, configurable: true },
  Event: { value: domWindow.Event, configurable: true },
  MouseEvent: { value: domWindow.MouseEvent, configurable: true },
  getComputedStyle: {
    value: domWindow.getComputedStyle.bind(domWindow),
    configurable: true,
  },
  requestAnimationFrame: {
    value: domWindow.requestAnimationFrame.bind(domWindow),
    configurable: true,
  },
});

domWindow.HTMLElement.prototype.scrollIntoView = function () {};

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const { act, cleanup, fireEvent, render, screen, waitFor } = await import(
  "@testing-library/react"
);
const { default: Chatbot } = await import("../src/components/chatbot");

const originalFetch = globalThis.fetch;

function mockFetch(
  handler: (url: string, init?: RequestInit) => Promise<unknown>
) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;

  return calls;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function openChat() {
  render(<Chatbot />);
  fireEvent.click(screen.getByRole("button", { name: "Open SmartEscrow chat" }));
}

function sendQuestion(question: string) {
  const input = screen.getByPlaceholderText("Type your message...");
  fireEvent.change(input, { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

describe("Chatbot widget: open flow", function () {
  it("Starts closed, opens on click, and closes again", function () {
    render(<Chatbot />);

    assert.equal(screen.queryByText("Ask SmartEscrow"), null);

    fireEvent.click(
      screen.getByRole("button", { name: "Open SmartEscrow chat" })
    );

    assert.ok(screen.getByText("Ask SmartEscrow"));
    assert.ok(screen.getByPlaceholderText("Type your message..."));

    fireEvent.click(screen.getByRole("button", { name: "Close chatbot" }));

    assert.equal(screen.queryByText("Ask SmartEscrow"), null);
    assert.ok(
      screen.getByRole("button", { name: "Open SmartEscrow chat" })
    );
  });

  it("Shows the welcome message when opened", function () {
    openChat();
    assert.match(
      screen.getByText(/Welcome to SmartEscrow/i).textContent ?? "",
      /SmartEscrow/
    );
  });
});

describe("Chatbot widget: send flow", function () {
  it("Posts the question to /api/chatbot and renders the answer", async function () {
    const calls = mockFetch(async () =>
      jsonResponse({ success: true, answer: "Escrow holds funds safely." })
    );

    openChat();
    sendQuestion("What is escrow?");

    assert.ok(screen.getByText("What is escrow?"));

    await waitFor(() => {
      assert.ok(screen.getByText("Escrow holds funds safely."));
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/chatbot");
    assert.equal(calls[0].init?.method, "POST");
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
      question: "What is escrow?",
    });

    // The input is cleared and re-enabled after the request finishes.
    const input = screen.getByPlaceholderText(
      "Type your message..."
    ) as HTMLInputElement;
    assert.equal(input.value, "");
    assert.equal(input.disabled, false);
  });

  it("Closes while a request is in flight and keeps the answer", async function () {
    const pending = deferred<unknown>();
    mockFetch(() => pending.promise);

    openChat();
    sendQuestion("What is escrow?");

    assert.ok(screen.getByText("SmartEscrow is thinking..."));

    fireEvent.click(screen.getByRole("button", { name: "Close chatbot" }));

    assert.equal(screen.queryByText("Ask SmartEscrow"), null);
    assert.equal(screen.queryByText("SmartEscrow is thinking..."), null);
    assert.ok(
      screen.getByRole("button", { name: "Open SmartEscrow chat" })
    );

    pending.resolve(
      jsonResponse({ success: true, answer: "Escrow holds funds safely." })
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Finishing the request must not reopen the panel on its own.
    assert.equal(screen.queryByText("Ask SmartEscrow"), null);

    fireEvent.click(
      screen.getByRole("button", { name: "Open SmartEscrow chat" })
    );

    assert.ok(screen.getByText("What is escrow?"));
    assert.ok(screen.getByText("Escrow holds funds safely."));
    assert.equal(screen.queryByText("SmartEscrow is thinking..."), null);
  });

  it("Disables the send button while the input is empty", function () {
    openChat();

    const send = screen.getByRole("button", {
      name: "Send message",
    }) as HTMLButtonElement;

    assert.equal(send.disabled, true);

    fireEvent.change(
      screen.getByPlaceholderText("Type your message..."),
      { target: { value: "Hello" } }
    );

    assert.equal(send.disabled, false);
  });
});

describe("Chatbot widget: error flow", function () {
  it("Shows the server error for a missing API key", async function () {
    mockFetch(async () =>
      jsonResponse(
        {
          success: false,
          code: "MISSING_API_KEY",
          error:
            "The chatbot isn't configured: GEMINI_API_KEY is missing from .env.local.",
        },
        false,
        503
      )
    );

    openChat();
    sendQuestion("What is SmartEscrow?");

    await waitFor(() => {
      assert.ok(screen.getByText(/GEMINI_API_KEY is missing/i));
    });

    assert.equal(
      screen.queryByText(/Sorry, I couldn't process your question/i),
      null
    );
  });

  it("Shows the server error for an empty knowledge base", async function () {
    mockFetch(async () =>
      jsonResponse(
        {
          success: false,
          code: "EMPTY_KNOWLEDGE_BASE",
          error:
            "The chatbot knowledge base is empty. Index the SmartEscrow knowledge PDF before asking questions.",
        },
        false,
        503
      )
    );

    openChat();
    sendQuestion("What is SmartEscrow?");

    await waitFor(() => {
      assert.ok(screen.getByText(/knowledge base is empty/i));
    });
  });

  it("Retries the failed question without duplicating it", async function () {
    let attempt = 0;

    const calls = mockFetch(async () => {
      attempt += 1;

      return attempt === 1
        ? jsonResponse({ success: false, error: "Service unavailable." }, false, 500)
        : jsonResponse({
            success: true,
            answer: "Escrow holds funds safely.",
          });
    });

    openChat();
    sendQuestion("What is escrow?");

    await waitFor(() => {
      assert.ok(screen.getByText("Service unavailable."));
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Retry request" })
    );

    await waitFor(() => {
      assert.ok(screen.getByText("Escrow holds funds safely."));
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, "/api/chatbot");
    assert.deepEqual(JSON.parse(String(calls[1].init?.body)), {
      question: "What is escrow?",
    });


    // The retry reuses the original user bubble instead of adding another one.
    assert.equal(screen.getAllByText("What is escrow?").length, 1);
    assert.equal(
      screen.queryByRole("button", { name: "Retry request" }),
      null
    );
  });

  it("Falls back to a friendly message when the request fails outright", async function () {
    mockFetch(async () => {
      throw new Error("Unable to get an answer.");
    });

    openChat();
    sendQuestion("What is SmartEscrow?");

    await waitFor(() => {
      assert.ok(
        screen.getByText(/Sorry, I couldn't process your question/i)
      );
    });
  });
});
