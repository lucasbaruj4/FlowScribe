export type RecordedEvent = {
    id: string;
    timestamp: number;
    eventType: "click" | "input" | "change" | "submit" | "navigation";
    url: string;
    frameId: string;
    selector: string | null;
    xpath: string | null;
    value: string | null;
    tagName: string | null;
    inputType?: string | null;
    innerTextPreview?: string | null;
};

export type Recording = {
    recording_id?: string;
    started_at: number;
    ended_at?: number;
    events: RecordedEvent[];
    meta: {
        initial_url: string;
        page_title: string;
        browser: string;
        user_agent: string;
    };
};

export type WorkflowStep = {
    step_id: number;
    title: string;
    description: string;
    events: string[];
    parameters: Parameter[];
};

export type Parameter = {
    name: string;
    type: string;
    default: string;
};

export type GeneratedWorkflow = {
    steps: WorkflowStep[];
    playwright_script: string;
    parameters: Parameter[];
};

export type RecordingState = "idle" | "recording" | "uploading" | "ready";
