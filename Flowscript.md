Product Requirements Document – “FlowScribe”
Browser-only MVP: record user actions → generate reusable Playwright (Python) automation
script.
1. Product Summary
One-liner:
Chrome extension that records a user’s interactions on a web page and generates a clean,
parameterizable Playwright (Python) script that can replay the workflow.
Target user:
Devs / power users who do repetitive browser tasks and are comfortable running Python.
Primary output:
- workflow.py Playwright script
- Optional workflow.yaml with high-level steps & parameters.
2. Goals & Non-Goals
Goals (v1 MVP)
1. Record user actions on a single browser tab & domain.
2. Convert events into a structured “workflow trace”.
3. Use LLM to summarize workflow into high-level steps.
4. Generate a runnable Playwright (Python) script from that trace.
5. Let user download/edit the script locally.
Non-Goals (v1)
- No desktop/native app automation.
- No multi-tab/multi-domain flows.
- No cloud account system (local-only or simple API key config).
- No in-app script execution UI (user runs python workflow.py themselves).
3. Tech Stack (Chosen for simplicity + AI integration)
Client (Chrome extension)
- Browser: Chrome (v1, Chromium-based compatible).
- Language: TypeScript.
- Framework: optional lightweight React for popup UI, or plain TS + minimal UI.


Backend
- Language: Python 3.11+.
- Framework: FastAPI (REST API).
- Automation runtime: Playwright (Python).
- LLM: OpenAI Chat Completions (model name configurable via ENV).
- Storage: in-memory or SQLite for simple recording persistence.
Dev / Tooling
- Package managers: pip + uv or poetry (your choice), npm/pnpm for extension.
- Testing: pytest for backend, Playwright’s own testing harness for generated script smoke
tests.
4. High-Level Architecture
1. Chrome extension:
   - Content script injects event listeners into active page.
   - Records events (click, input, change, navigation) with metadata, DOM selectors.
   - Sends batched events to backend via REST when user stops recording.
2. Backend:
   - Receives event trace JSON.
   - Builds canonical Recording object.
   - LLM pipeline:
     - Step 1: compress raw events → semantic steps.
     - Step 2: convert steps → Playwright Python code string + parameter schema.
   - Returns:
     - Playwright script text
     - High-level steps summary
     - Parameter definitions (if any)
3. Extension popup:
   - Simple UI:
     - Start/Stop recording
     - Display step summary
     - “Download script” button.


5. Core Data Structures
5.1 Recorded Event (from extension → backend)
type RecordedEvent = {
  id: string;                // uuid
  timestamp: number;         // ms since epoch
  eventType: "click" | "input" | "change" | "submit" | "navigation";
  url: string;
  frameId: string;           // Chrome frame id
  selector: string | null;   // CSS selector if element-based
  xpath: string | null;      // optional fallback
  value: string | null;      // text typed or selected value
  tagName: string | null;    // e.g. "INPUT", "BUTTON"
  inputType?: string | null; // for inputs: "text", "email", etc.
  innerTextPreview?: string | null; // first N chars
};
5.2 Recording
{
  "recording_id": "uuid",
  "started_at": 1234567890,
  "ended_at": 1234567999,
  "events": [ /* RecordedEvent[] */ ],
  "meta": {
    "initial_url": "https://example.com/",
    "page_title": "Example",
    "browser": "chrome",
    "user_agent": "..."
  }
}
5.3 LLM Output Schema
{


  "steps": [
    {
      "step_id": 1,
      "title": "Open login page",
      "description": "Navigate to the login page at /login",
      "events": ["event-id-1", "event-id-2"],
      "parameters": []
    },
    {
      "step_id": 2,
      "title": "Fill login form",
      "description": "Enter email and password and submit the login form",
      "events": ["event-id-3", "event-id-4", "event-id-5"],
      "parameters": [
        {
          "name": "email",
          "type": "string",
          "default": "john@example.com"
        },
        {
          "name": "password",
          "type": "string",
          "default": "********"
        }
      ]
    }
  ],
  "playwright_script": "from playwright.sync_api import sync_playwright
...
",
  "parameters": [
    { "name": "email", "type": "string", "default": "john@example.com" },


    { "name": "password", "type": "string", "default": "password123" }
  ]
}
6. Backend API Specification (FastAPI)
6.1 POST /api/recordings
Request body: Recording (as above, without recording_id).
Behavior:
  - Generate recording_id.
  - Persist recording (in-memory or SQLite).
Response:
  { "recording_id": "uuid" }
6.2 POST /api/recordings/{recording_id}/generate
Purpose: Run LLM pipeline & codegen.
Request body (optional):
{
  "language": "python",            // future expansion
  "framework": "playwright",
  "parameterization_level": "auto" // or "none"
}
Behavior:
  1. Load recording by recording_id.
  2. Build prompt with:
     - recording meta
     - compacted event table (dedup successive input changes)
  3. Call LLM to:
     - produce steps[], parameters[], and playwright_script exactly matching JSON schema.
  4. Validate JSON schema, basic lint of script (e.g., check imports).
Response: LLM Output Schema (see 5.3).
6.3 GET /api/recordings/{recording_id}


Returns full recording JSON (for debugging / UI).
7. Chrome Extension Spec
7.1 Manifest
manifest_version: 3
Permissions:
  - scripting, activeTab, tabs, storage, webNavigation
Background service worker:
  - handles start/stop events
  - injection of content scripts.
7.2 Popup UI
Minimal UI (HTML/React):
  - Button: “Start Recording” / “Stop Recording”
  - Status text: Idle | Recording | Uploading | Ready
  - After generation:
    - Text area: steps summary (titles + descriptions)
    - Buttons:
      - “Download script (.py)”
      - “Download workflow.yaml” (optional)
7.3 Content Script Behavior
On “Start Recording”:
  - Attach listeners to:
    - click events
    - input and change
    - submit
    - navigation events via history.pushState, popstate, beforeunload.
  - For each event:
    - Derive CSS selector:
      - Prefer id, then [data-*], then path via tag + nth-child.
    - Capture necessary metadata (see RecordedEvent).


    - Store locally in chrome.storage.session.
On “Stop Recording”:
  - Read events from storage.
  - Send to backend via fetch:
    - POST /api/recordings.
  - Receive recording_id.
  - Call POST /api/recordings/{id}/generate.
  - Store result in chrome.storage.local and notify popup.
7.4 Download Script
When user clicks “Download script”:
  - Take playwright_script string.
  - Create Blob → URL.createObjectURL → trigger download as workflow.py.
8. LLM Prompting (Backend)
Step Extraction Prompt (single call to keep it simple)
System message (conceptual):
  - “You are a tool that converts browser event traces into high-level web automation
workflows and Playwright Python scripts. You must output valid JSON matching the given
schema. Do not include explanations.”
User content structure:
  - Recording metadata (URL, title).
  - Tabular event list (id, type, selector, preview text).
  - JSON schema definition for expected output.
  - Instructions:
    - Group low-level events into steps.
    - Identify parameters (fields likely to vary: emails, search queries, etc).
    - Generate Playwright code:
      - Use sync API
      - Use page.goto, page.click, page.fill, page.wait_for_load_state, etc.
      - Use CSS selectors from events; normalize where possible.
Validation:


  - Backend code must:
    - json.loads() the model response.
    - Verify required fields exist.
    - (Optional) run python -m py_compile on generated script in a temp dir.
    - On failure: return HTTP 500 with simple error message to extension.
9. Non-Functional Requirements
Performance:
  - For traces up to 200 events, LLM pipeline should generally complete under ~10s.
Reliability:
  - If backend/LLM fails, extension shows an error: “Generation failed. Download raw
recording JSON.”
Security:
  - Backend URL configured locally (e.g., http://localhost:8000 for dev).
  - No user auth in v1; assume local/private use.
  - Warn user that form contents (including passwords) are recorded; recommend not
recording password steps in README.
10. Project Structure (Suggested)
flowscribe/
  backend/
    app/
      main.py          # FastAPI entry, routes
      models.py        # Pydantic models: RecordedEvent, Recording, GeneratedWorkflow
      llm.py           # OpenAI client & prompts
      codegen.py       # helpers for Playwright code formatting
      storage.py       # in-memory/SQLite
    tests/
      test_codegen.py
      test_llm_schema.py
  extension/
    manifest.json


    src/
      content_script.ts
      background.ts
      popup.tsx
      types.ts
    dist/              # built extension
11. v1 Acceptance Criteria
1. User installs Chrome extension and runs local backend.
2. User clicks “Start Recording”, performs a simple task (e.g., search on a site), clicks
“Stop Recording”.
3. Extension sends events → backend.
4. Backend returns:
   - Non-empty list of steps[].
   - Valid Playwright script (passes py_compile).
5. User downloads workflow.py, runs:
   python workflow.py
   - Browser opens and successfully replays the recorded workflow.


