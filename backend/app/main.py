from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import Recording, RecordingResponse, GeneratedWorkflow
from app.storage import storage
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="FlowScribe API", version="1.0.0")

# Add CORS middleware to allow extension to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to extension origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "FlowScribe Backend", "status": "running"}


@app.post("/api/recordings", response_model=RecordingResponse)
def create_recording(recording: Recording):
    """
    Accept a recording from the extension and save it.
    Returns the recording_id for future reference.
    """
    recording_id = storage.save_recording(recording)
    logger.info(f"Recording saved: {recording_id} ({len(recording.events)} events)")
    return RecordingResponse(recording_id=recording_id)


@app.get("/api/recordings")
def list_recordings():
    """
    List all recording IDs (for debugging).
    """
    # Access the storage's recordings dict
    recording_ids = list(storage.recordings.keys())
    return {
        "count": len(recording_ids),
        "recording_ids": recording_ids
    }


@app.get("/api/recordings/{recording_id}")
def get_recording(recording_id: str):
    """
    Retrieve a recording by ID (for debugging).
    """
    recording = storage.get_recording(recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording


@app.post("/api/recordings/{recording_id}/generate", response_model=GeneratedWorkflow)
def generate_workflow(recording_id: str):
    """
    Generate a Playwright workflow from a recording.
    Currently returns a placeholder - will be implemented in Phase 4.
    """
    recording = storage.get_recording(recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Placeholder response for now
    return GeneratedWorkflow(
        steps=[],
        playwright_script="# Placeholder - LLM integration coming in Phase 4",
        parameters=[]
    )
