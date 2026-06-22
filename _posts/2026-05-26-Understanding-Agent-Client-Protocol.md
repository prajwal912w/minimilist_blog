---
layout: post
title: "Understanding Agent Client Protocol"
date: 2026-05-26
excerpt: "Agent Client Protocol (ACP) is the JSON-RPC layer for agent-to-agent communication — covering handshake, auth, named sessions, prompt turns, progress updates, permissions, and cancellation."
---

Imagine you are coordinating a project with a remote team of specialists. You do not re-introduce yourself on every call. You pick up where you left off: what was decided, what is pending, what you are still waiting on.

Your specialists come from different companies. One uses Slack, one uses email, one has their own system. You need a shared language before any real work can happen. Before you assign anything, you ask what they can actually do. Some tasks take hours or days, so you do not block on every reply. When priorities shift, you send **stop** on an existing thread, not a brand-new conversation. Handoffs must stay visible, and access must match trust.

Agentic communication on the internet has the same shape of problems:





<div class="table-wrap" markdown="1">

| Problem          | Question                                               |
| ---------------- | ------------------------------------------------------ |
| State            | Do agents remember what was said before?               |
| Interoperability | Can my agent talk to yours in a shared format?         |
| Discovery        | Is my agent talking to the right agent?                |
| Async work       | What happens when a task runs for a long time?         |
| Control          | Who can say stop, and will the other side listen?      |
| Trust            | Should every agent trust every other agent by default? |

</div>




---

## What ACP is

ACP defines which JSON-RPC methods exist, what order they run in, and what each side may assume after every reply.   

Think of **JSON-RPC** as the shared request format those coordinators use when specialists call each other. Instead of a vague Slack message (“can you look into shoes?”), every exchange is a structured note with three parts:

- **Method** — what you want done (`initialize`, `session/prompt`, …)
- **Params** — the details for that action (session id, user message, …)
- **Id** — a receipt number so the reply matches the right request

The other side answers in the same shape: either a **result** (success) or an **error** (failure), tied to that same id.

**Agent Client Protocol (ACP)** sits on top of JSON-RPC 2.0. It is the vocabulary and sequence rules for agent-to-agent work.  
  
Those messages flow between:





<div class="table-wrap" markdown="1">

| Role       | Reference in the diagram | Responsibility                                  |
| ---------- | ------------------------ | ----------------------------------------------- |
| **Client** | Buyer-side agent         | Initiates requests                              |
| **Agent**  | Seller-side agent        | Holds session state, runs work, returns results |

</div>




The client role is structural, not necessarily human. One agent acting for a user can be the client; another agent’s endpoint can be the agent. The protocol defines **requester and responder**.

Typical stack for a single conversation:

1. **Initialize** — agree version and capabilities
2. **Authenticate** (if required)
3. **Session setup** — create or restore a thread
4. **Prompt turns** — user messages, updates, permissions, cancel

---

## Initialization

Initialization is how every connection starts. The buyer-side agent sends `initialize` with a protocol version and capabilities; the seller-side agent replies with the agreed version and what it supports. **No session exists yet.** Only after this handshake can the buyer call `session/new`.

<figure style="text-align:center; margin: 0 0 1.5rem;">
  <img
    src="/assets/images/ACP_Article_assets/initialization.png"
    alt="Initialization sequence diagram"
    style="max-width: 820px; width: 100%; height: auto; border-radius: 10px;"
  />
  <figcaption style="font-size: 0.95rem; opacity: 0.8; margin-top: 8px;">
    Figure 1 — Initialization.
  </figcaption>
</figure>





<div class="table-wrap" markdown="1">

| Step | Stage                   | Buyer-side agent       | Seller-side agent                                              | Meaning                                                                        |
| ---- | ----------------------- | ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| —    | Connection established  | Opens transport        | Accepts transport                                              | HTTP (or similar) to a JSON-RPC endpoint. ACP defines messages, not transport. |
| 1    | Initialize              | Sends `initialize`     | Receives request; runs protocol version and capabilities check | First ACP message. Not a session yet.                                          |
| 2    | Initialize response     | Receives result        | Sends `initialize` response                                    | Buyer must finish this before any session method.                              |
| —    | Ready for session setup | May call `session/new` | Ready for sessions                                             | Handshake complete. No user prompts exchanged yet.                             |

</div>




#### Wire format

<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Request — `initialize`**

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": 1,
    "clientCapabilities": {
      "fs": {
        "readTextFile": true,
        "writeTextFile": true
      },
      "terminal": true
    },
    "clientInfo": {
      "name": "buyer-side-agent",
      "title": "Buyer-side Agent",
      "version": "1.0.0"
    }
  }
}
```

</div>

<div class="wire-panel" markdown="1">

**Response**

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "loadSession": true,
      "promptCapabilities": {
        "image": true,
        "audio": true,
        "embeddedContext": true
      },
      "mcpCapabilities": {
        "http": true,
        "sse": true
      }
    },
    "agentInfo": {
      "name": "seller-side-agent",
      "title": "Seller-side Agent",
      "version": "1.0.0"
    },
    "authMethods": []
  }
}
```

</div>

</div>

The spec uses `clientCapabilities` / `clientInfo` on the request and `agentCapabilities` / `agentInfo` on the response. Those names map to **buyer** and **seller** roles in the handshake.

### Key rules — initialization





<div class="table-wrap" markdown="1">

| Rule         | Requirement                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Version      | `protocolVersion` is a major integer; both sides must agree.                                                 |
| Capabilities | Omitted capability means unsupported.                                                                        |
| Baseline     | After init, the seller must support `session/new`, `session/prompt`, `session/cancel`, and `session/update`. |
| Scope        | Initialization does not create a session or carry user prompts.                                              |

</div>




---

## Authentication

Authentication establishes trust **after** initialization. The seller advertises methods in `authMethods` on the initialize response. If required, the buyer calls `authenticate` with a matching `methodId` before session work continues.

<figure style="text-align:center; margin: 0 0 1.5rem;">
  <img
    src="/assets/images/ACP_Article_assets/authentication.png"
    alt="Authentication sequence diagram"
    style="max-width: 820px; width: 100%; height: auto; border-radius: 10px;"
  />
  <figcaption style="font-size: 0.95rem; opacity: 0.8; margin-top: 8px;">
    Figure 2 — Authentication.
  </figcaption>
</figure>





<div class="table-wrap" markdown="1">

| Step | Stage                   | Buyer-side agent                     | Seller-side agent                              | Meaning                                             |
| ---- | ----------------------- | ------------------------------------ | ---------------------------------------------- | --------------------------------------------------- |
| —    | Connection established  | Connected                            | Connected                                      | Transport is open before authentication begins.     |
| 1    | Initialize              | Sends `initialize`                   | Receives request                               | Starts the authentication handshake.                |
| 2    | Initialize response     | Receives response                    | Sends `initialize` response with `authMethods` | Seller advertises available authentication methods. |
| 3    | Authentication method   | Sends `authenticate` with `methodId` | Validates method                               | Buyer picks one advertised method.                  |
| 4    | Authentication response | Receives empty `result` on success   | Sends response                                 | Link is authenticated.                              |
| —    | Authenticated           | May call protected session methods   | Accepts protected calls                        | Authenticated requests may proceed.                 |
| —    | Re-auth note            | May need to authenticate again       | May require it                                 | A new session may require authentication again.     |

</div>




#### Wire format

**Advertised at init**

```json
{
  "authMethods": [
    {
      "id": "agent-login",
      "name": "Agent login",
      "description": "Sign in using the agent login flow"
    }
  ]
}
```

<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Request — `authenticate`**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "authenticate",
  "params": {
    "methodId": "agent-login"
  }
}
```

</div>

<div class="wire-panel" markdown="1">

**Response — `authenticate`**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {}
}
```

</div>

</div>

### Key rules — authentication





<div class="table-wrap" markdown="1">

| Rule     | Requirement                                                          |
| -------- | -------------------------------------------------------------------- |
| Methods  | `methodId` in `authenticate` must match an `id` from `authMethods`.  |
| Optional | Empty `authMethods` means the seller may not require `authenticate`. |
| Re-auth  | A new session may require authentication again.                      |

</div>




---

## Session setup

A **session** is a named conversation with its own `sessionId`, history, and working state. Multi-step flows (ask → clarify → answer) stay on one thread instead of resending the full transcript every time.

**Example:** Turn 1 — buyer says “running shoes.” Turn 2 — seller asks for budget. Both turns use the same `sessionId` so the seller can rely on stored context.

<figure style="text-align:center; margin: 0 0 1.5rem;">
  <img
    src="/assets/images/ACP_Article_assets/session-setup.png"
    alt="Session setup sequence diagram"
    style="max-width: 820px; width: 100%; height: auto; border-radius: 10px;"
  />
  <figcaption style="font-size: 0.95rem; opacity: 0.8; margin-top: 8px;">
    Figure 3 — Session setup. MCP Servers are seller-side backends, not a third ACP peer.
  </figcaption>
</figure>

All paths below assume **Initialized** (and **authenticated**, if required).





<div class="table-wrap" markdown="1">

| Step | Phase           | Buyer-side agent       | Seller-side agent                         | Meaning                                                       |
| ---- | --------------- | ---------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| —    | Initialized     | Ready for session work | Ready for session work                    | Initialization (and authentication, if required) is complete. |
| 1    | Create session  | Sends `session/new`    | Creates session (may attach MCP)          | Starts a new thread.                                          |
| 2    | Create response | Stores `sessionId`     | Returns `sessionId`                       | ID used on every later turn.                                  |
| 3    | Load session    | Sends `session/load`   | Restores session                          | Reconnect after restart; UI needs the full thread.            |
| 4    | Load response   | Receives load response | Returns load response                     | History replay begins.                                        |
| 4′   | History update  | Receives updates       | Streams past messages as `session/update` | Conversation history is replayed during load.                 |
| 5    | Resume session  | Sends `session/resume` | Restores session quietly                  | Short disconnect; seller still has context.                   |
| 6    | Resume response | Receives confirmation  | Returns resume response                   | No full history replay.                                       |
| 7    | List sessions   | Sends `session/list`   | Queries stored sessions                   | Discovery only; does not open a session.                      |
| 8    | List response   | Receives list          | Returns session metadata                  | Buyer picks a `sessionId`, then calls `load` or `resume`.     |

</div>




### Create a new session

<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Request — `session/new`**

```json
{
  "method": "session/new",
  "params": {
    "cwd": "/absolute/path",
    "mcpServers": []
  }
}
```

</div>

<div class="wire-panel" markdown="1">

**Response**

```json
{
  "result": {
    "sessionId": "sess_abc123"
  }
}
```

</div>

</div>

Use when starting a fresh conversation.

### Load vs resume





<div class="table-wrap" markdown="1">

| Method           | Buyer gets                               | When to use                                        |
| ---------------- | ---------------------------------------- | -------------------------------------------------- |
| `session/load`   | Full history replay via `session/update` | Reconnect after restart; UI needs the full thread. |
| `session/resume` | Quiet reconnect, no full replay          | Short disconnect; seller still has context.        |

</div>




<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Request — `session/load`**

```json
{
  "method": "session/load",
  "params": {
    "sessionId": "sess_abc123",
    "cwd": "/absolute/path"
  }
}
```

</div>

<div class="wire-panel" markdown="1">

**Request — `session/resume`**

```json
{
  "method": "session/resume",
  "params": {
    "sessionId": "sess_abc123",
    "cwd": "/absolute/path"
  }
}
```

</div>

</div>

During load, the seller streams past messages as `session/update` notifications until load completes.

### List sessions

<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Request — `session/list`**

```json
{
  "method": "session/list",
  "params": {}
}
```

</div>

<div class="wire-panel" markdown="1">

**Response (example)**

```json
{
  "result": {
    "sessions": [
      {
        "sessionId": "sess_abc123",
        "title": "Running shoes",
        "cwd": "/absolute/path"
      }
    ]
  }
}
```

</div>

</div>

### Key rules — session setup





<div class="table-wrap" markdown="1">

| Rule             | Requirement                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| Order            | Complete `initialize` (and `authenticate` if required) first.          |
| ID               | Every `session/prompt` and `session/cancel` uses the same `sessionId`. |
| `session/new`    | Creates a new thread; returns a new `sessionId`.                       |
| `session/load`   | Requires `loadSession` capability; replays history.                    |
| `session/resume` | Requires `sessionCapabilities.resume`.                                 |
| `session/list`   | Requires `sessionCapabilities.list`; discovery only.                   |
| `cwd`            | Absolute path for the session working context.                         |
| `mcpServers`     | Tells the seller which tool or data backends to attach.                |

</div>




---

## Prompt turn

A **prompt turn** is one cycle from a user message to a final `stopReason` on the same `session/prompt` request. The seller may use an LLM, push `session/update` progress, request permission for tools, and the buyer may cancel mid-turn. Requires init and a **ready** session.

**Prompt content:** Each item in `params.prompt` is a content block with a `type` (for example `text`, `image`, or `resource`). The buyer must only send types the two sides agreed at `initialize` under `promptCapabilities`.

<figure style="text-align:center; margin: 0 0 1.5rem;">
  <img
    src="/assets/images/ACP_Article_assets/prompt-turn.png"
    alt="Prompt turn sequence diagram"
    style="max-width: 820px; width: 100%; height: auto; border-radius: 10px;"
  />
  <figcaption style="font-size: 0.95rem; opacity: 0.8; margin-top: 8px;">
    Figure 4 — Prompt turn. Solid lines = requests; dashed = seller notifications. LLM work is seller-internal.
  </figcaption>
</figure>





<div class="table-wrap" markdown="1">

| Step | Phase           | Buyer-side agent          | Seller-side agent                           | Method                                  |
| ---- | --------------- | ------------------------- | ------------------------------------------- | --------------------------------------- |
| —    | Session ready   | Active session            | Active session                              | —                                       |
| 1    | Prompt creation | Sends user message        | Receives, runs LLM                          | `session/prompt`                        |
| 2    | Prompt response | Renders updates           | Streams plan, text, tool calls, permissions | `session/update`                        |
| —    | User grants     | Sends permission response | Requests permission; runs tool if allowed   | `session/request_permission` + response |
| —    | User denies     | Sends cancel              | Stops LLM and tools; sends cancel response  | `session/cancel` + response             |

</div>




#### Wire format

<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Request — `session/prompt`**

```json
{
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_abc",
    "prompt": [
      {
        "type": "text",
        "text": "Running shoes under $150"
      }
    ]
  }
}
```

**Cancel (notification)**

```json
{
  "method": "session/cancel",
  "params": {
    "sessionId": "sess_abc"
  }
}
```

</div>

<div class="wire-panel" markdown="1">

**Notification — `session/update`**

```json
{
  "method": "session/update",
  "params": {
    "sessionId": "sess_abc",
    "update": {
      "sessionUpdate": "agent_message_chunk",
      "content": {
        "type": "text",
        "text": "…"
      }
    }
  }
}
```

**Turn complete — `stopReason: end_turn`**

```json
{
  "id": 2,
  "result": {
    "stopReason": "end_turn"
  }
}
```

</div>

</div>

<div class="wire-pair" markdown="1">

<div class="wire-panel" markdown="1">

**Turn complete — `stopReason: cancelled`**

```json
{
  "result": {
    "stopReason": "cancelled"
  }
}
```

</div>

<div class="wire-panel" markdown="1">

**Turn complete — `stopReason: needs_clarification`**

```json
{
  "result": {
    "stopReason": "needs_clarification",
    "message": "What is your budget?"
  }
}
```

</div>

</div>

### Key rules — prompt turn





<div class="table-wrap" markdown="1">

| Rule                | Requirement                                                 |
| ------------------- | ----------------------------------------------------------- |
| Order               | Initialize, session ready, then `session/prompt`.           |
| Content             | Block `type` must match negotiated `promptCapabilities`.    |
| Updates             | `session/update` is progress; `stopReason` closes the turn. |
| Permission          | Seller may ask; buyer responds before sensitive tools.      |
| Cancel              | Aborts the turn; session may stay open.                     |
| Cancel + permission | Pending permissions get outcome `cancelled`.                |
| Next message        | New user input = new `session/prompt`, same `sessionId`.    |

</div>




Spec: [Prompt turn](https://agentclientprotocol.com/protocol/prompt-turn.md)

---

## Protocol map





<div class="table-wrap" markdown="1">

| Phase        | Primary methods                                                                    |
| ------------ | ---------------------------------------------------------------------------------- |
| Handshake    | `initialize`                                                                       |
| Trust        | `authenticate`                                                                     |
| Thread       | `session/new`, `session/load`, `session/resume`, `session/list`, `session/close`   |
| Conversation | `session/prompt`, `session/update`, `session/request_permission`, `session/cancel` |

</div>




---

## Try the demo

Still struggling to see how the phases connect? Walk through a live, step-by-step visualization: [Agentic Commerce Protocol — Phase 1 Demo](https://dheeraj-agentic-communication-demo.netlify.app/).

The demo runs handshake, session, intent, offer, and payment between a buyer-side agent and a seller-side agent. Step through it once, then come back to this post.

---

## Thank you for reading

**Acknowledgement:** Pratik Ratadiya, thank you for reading the initial draft. :)
