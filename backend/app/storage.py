from typing import Dict, Optional
from app.models import Recording
import uuid


class InMemoryStorage:
    """Simple in-memory storage for recordings"""
    
    def __init__(self):
        self.recordings: Dict[str, Recording] = {}
    
    def save_recording(self, recording: Recording) -> str:
        """Save a recording and return its ID"""
        if not recording.recording_id:
            recording.recording_id = str(uuid.uuid4())
        
        self.recordings[recording.recording_id] = recording
        return recording.recording_id
    
    def get_recording(self, recording_id: str) -> Optional[Recording]:
        """Retrieve a recording by ID"""
        return self.recordings.get(recording_id)
    
    def delete_recording(self, recording_id: str) -> bool:
        """Delete a recording by ID"""
        if recording_id in self.recordings:
            del self.recordings[recording_id]
            return True
        return False


# Global storage instance
storage = InMemoryStorage()
