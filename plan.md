# FlowScribe Development Plan

This plan outlines the step-by-step development process for FlowScribe, designed for an LLM or developer to follow.

## Phase 1: Project Initialization & Environment Setup
**Goal:** Establish the project structure and development environments for both backend and extension.

- [x] **Directory Structure Setup**
  - Create root `flowscribe/` directory.
  - Create `backend/` and `extension/` subdirectories.
  - Initialize git repository.
- [x] **Backend Setup**
  - Initialize Python project (using `uv` or `poetry`).
  - Create `backend/app/` and `backend/tests/` folders.
  - Create `backend/app/main.py` (entry point).
  - Install dependencies: `fastapi`, `uvicorn`, `pydantic`, `openai`, `pytest`, `playwright`.
- [x] **Extension Setup**
  - Initialize Node.js project in `extension/` (`npm init -y`).
  - Install dev dependencies: `typescript`, `vite` (or webpack), `@types/chrome`.
  - Create `extension/src/` and `extension/public/` folders.
  - Create `tsconfig.json` for TypeScript configuration.

## Phase 2: Backend Core & API Definition
**Goal:** specific the data models and set up the REST API to receive recordings.

- [x] **Data Models (`backend/app/models.py`)**
  - Define `RecordedEvent` Pydantic model (id, timestamp, eventType, selector, etc.).
  - Define `Recording` model (recording_id, events list, metadata).
  - Define `GeneratedWorkflow` model (steps, playwright_script).
- [x] **API Routes (`backend/app/main.py`)**
  - Implement `POST /api/recordings`: Accepts `Recording` data, saves it, returns `recording_id`.
  - Implement `GET /api/recordings/{recording_id}`: Returns recording data (for debug).
  - Implement `POST /api/recordings/{recording_id}/generate`: Placeholder for now, returns 501 or mock data.
- [x] **Storage (`backend/app/storage.py`)**
  - Implement simple in-memory dictionary storage for recordings.
- [x] **Verification**
  - Run `uvicorn app.main:app --reload`.
  - Test `POST /api/recordings` with curl/Postman using dummy JSON.
  - Verified all endpoints working: root endpoint, create/get recordings, generate workflow placeholder, and 404 error handling.

## Phase 3: Chrome Extension - Recording Logic
**Goal:** Build the extension to capture user interactions and send them to the backend.

- [X] **Manifest & Basic UI**
  - Create `extension/manifest.json` (MV3, permissions: scripting, activeTab, storage).
  - Create `extension/src/popup.tsx` (or HTML/JS) with "Start" and "Stop" buttons.
  - Create `extension/src/background.ts` to handle state (Idle/Recording).
- [X] **Content Script (`extension/src/content_script.ts`)**
  - Implement event listeners: `click`, `input`, `change`, `submit`.
  - Implement logic to generate CSS selectors (id > data-attributes > path).
  - Capture event metadata (timestamp, url, value).
  - Store events in `chrome.storage.session`.
- [X] **Communication**
  - Wire up "Start Recording" in Popup to inject/activate Content Script listeners.
  - Wire up "Stop Recording" to:
    1. Retrieve events from storage.
    2. `fetch` POST to `http://localhost:8000/api/recordings`.
    3. Store returned `recording_id`.
- [X] **Verification**
  - Load unpacked extension in Chrome.
  - Record a few clicks on a page.
  - Check Backend logs to see if the JSON trace was received.

## Phase 4: LLM Integration & Code Generation
**Goal:** Implement the intelligence layer to convert traces into Playwright scripts.

- [ ] **LLM Client (`backend/app/llm.py`)**
  - Setup OpenAI client (API key from env).
  - Create the System Prompt: "You are a tool that converts browser event traces...".
- [ ] **Prompt Engineering**
  - Implement function to format `Recording` object into a text prompt (tabular event list).
  - Define the JSON Output Schema for the LLM (Steps + Playwright Code).
- [ ] **Generation Endpoint Logic**
  - Update `POST /api/recordings/{recording_id}/generate` to:
    1. Retrieve recording.
    2. Call LLM with prompt.
    3. Parse and validate JSON response.
    4. Return `GeneratedWorkflow`.
- [ ] **Verification**
  - Manually trigger the generate endpoint with a stored recording ID.
  - Inspect the generated Python script for correctness.

## Phase 5: Extension - Result Handling & Download
**Goal:** Allow the user to view the summary and download the generated script.

- [ ] **Popup UI Updates**
  - Add "Generating..." state.
  - Add "Download Script" button (visible after generation).
  - Add text area to show "Steps Summary".
- [ ] **Download Logic**
  - Implement `POST /api/recordings/{id}/generate` call in the extension after upload.
  - On success, display summary in Popup.
  - On "Download" click: Create a Blob from the `playwright_script` string and trigger a download of `workflow.py`.

## Phase 6: Testing & Polish
**Goal:** Ensure the end-to-end flow works as expected.

- [ ] **End-to-End Test**
  - Record a real flow (e.g., searching on Google or Wikipedia).
  - Generate the script.
  - Run `python workflow.py` locally.
  - Verify the browser replays the actions correctly.
- [ ] **Error Handling**
  - Handle backend connection failures in Extension.
  - Handle LLM generation failures (invalid JSON).
- [ ] **Cleanup**
  - Remove debug logs.
  - Add `README.md` with setup instructions.
