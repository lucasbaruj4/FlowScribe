from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class RecordedEvent(BaseModel):
    """Individual browser event captured by the extension"""
    id: str
    timestamp: int
    eventType: str = Field(..., description="Type of event: click, input, change, submit, navigation")
    url: str
    frameId: str
    selector: Optional[str] = None
    xpath: Optional[str] = None
    value: Optional[str] = None
    tagName: Optional[str] = None
    inputType: Optional[str] = None
    innerTextPreview: Optional[str] = None


class RecordingMeta(BaseModel):
    """Metadata about the recording session"""
    initial_url: str
    page_title: str
    browser: str
    user_agent: str


class Recording(BaseModel):
    """Complete recording of a user workflow"""
    recording_id: Optional[str] = None
    started_at: int
    ended_at: Optional[int] = None
    events: List[RecordedEvent]
    meta: RecordingMeta


class Parameter(BaseModel):
    """Parameter definition for workflow"""
    name: str
    type: str
    default: str


class WorkflowStep(BaseModel):
    """High-level step in the workflow"""
    step_id: int
    title: str
    description: str
    events: List[str]  # Event IDs
    parameters: List[Parameter] = []


class GeneratedWorkflow(BaseModel):
    """LLM-generated workflow output"""
    steps: List[WorkflowStep]
    playwright_script: str
    parameters: List[Parameter] = []


class RecordingResponse(BaseModel):
    """Response after creating a recording"""
    recording_id: str
