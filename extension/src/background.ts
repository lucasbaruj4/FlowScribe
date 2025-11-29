import { RecordingState, Recording, RecordedEvent } from './types';

const BACKEND_URL = 'http://localhost:8000';

let recordingState: RecordingState = 'idle';
let currentTabId: number | null = null;
let recordingStartTime: number | null = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message.type === 'getState') {
        sendResponse({ state: recordingState });
        return true;
    }

    if (message.type === 'startRecording') {
        handleStartRecording(sendResponse);
        return true; // Keep channel open for async response
    }

    if (message.type === 'stopRecording') {
        handleStopRecording(sendResponse);
        return true; // Keep channel open for async response
    }

    // Messages from content script
    if (message.type === 'eventCaptured') {
        // Events are stored directly in content script's storage
        // We just acknowledge receipt
        sendResponse({ success: true });
        return true;
    }

    return false;
});

async function handleStartRecording(sendResponse: (response: any) => void) {
    try {
        if (recordingState === 'recording') {
            sendResponse({ error: 'Recording already in progress' });
            return;
        }

        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) {
            sendResponse({ error: 'No active tab found' });
            return;
        }

        currentTabId = tab.id;
        recordingStartTime = Date.now();
        recordingState = 'recording';

        // Try to send message to content script (may already be loaded from manifest)
        // If it fails, try to inject it dynamically as a fallback
        chrome.tabs.sendMessage(tab.id, { type: 'startRecording' }, async (response: any) => {
            if (chrome.runtime.lastError) {
                // Content script not loaded yet, try dynamic injection
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content_script.js']
                    });
                    // Wait a bit for the script to initialize
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // Try sending the message again
                    chrome.tabs.sendMessage(tab.id, { type: 'startRecording' }, (_response: any) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error starting recording in content script:', chrome.runtime.lastError);
                            recordingState = 'idle';
                            currentTabId = null;
                            recordingStartTime = null;
                            notifyStateChange();
                            sendResponse({ error: 'Failed to start recording. The page may be restricted.' });
                        } else {
                            notifyStateChange();
                            sendResponse({ state: recordingState, success: true });
                        }
                    });
                } catch (error) {
                    console.error('Error injecting content script:', error);
                    recordingState = 'idle';
                    currentTabId = null;
                    recordingStartTime = null;
                    notifyStateChange();
                    sendResponse({ error: 'Failed to inject content script. Make sure you have permission for this page.' });
                }
            } else {
                // Content script was already loaded and responded
                notifyStateChange();
                sendResponse({ state: recordingState, success: true });
            }
        });
    } catch (error) {
        console.error('Error starting recording:', error);
        recordingState = 'idle';
        currentTabId = null;
        recordingStartTime = null;
        sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
}

async function handleStopRecording(sendResponse: (response: any) => void) {
    try {
        if (recordingState !== 'recording') {
            sendResponse({ error: 'No recording in progress' });
            return;
        }

        if (!currentTabId) {
            recordingState = 'idle';
            sendResponse({ error: 'No active recording session' });
            return;
        }

        recordingState = 'uploading';
        notifyStateChange();

        // Request events from content script
        const events = await getEventsFromContentScript(currentTabId);
        
        if (!events || events.length === 0) {
            recordingState = 'idle';
            currentTabId = null;
            recordingStartTime = null;
            notifyStateChange();
            sendResponse({ error: 'No events captured' });
            return;
        }

        // Get tab info for metadata
        const tab = await chrome.tabs.get(currentTabId);
        const recording: Recording = {
            started_at: recordingStartTime || Date.now(),
            ended_at: Date.now(),
            events: events,
            meta: {
                initial_url: tab.url || '',
                page_title: tab.title || '',
                browser: 'chrome',
                user_agent: navigator.userAgent
            }
        };

        // Send to backend
        const recordingId = await sendRecordingToBackend(recording);
        
        // Store recording_id
        await chrome.storage.local.set({ lastRecordingId: recordingId });

        recordingState = 'ready';
        currentTabId = null;
        recordingStartTime = null;
        notifyStateChange();

        sendResponse({ state: recordingState, recordingId, success: true });
    } catch (error) {
        console.error('Error stopping recording:', error);
        recordingState = 'idle';
        currentTabId = null;
        recordingStartTime = null;
        notifyStateChange();
        sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
}

function getEventsFromContentScript(tabId: number): Promise<RecordedEvent[]> {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: 'getEvents' }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (response?.error) {
                reject(new Error(response.error));
                return;
            }
            resolve(response?.events || []);
        });
    });
}

async function sendRecordingToBackend(recording: Recording): Promise<string> {
    const response = await fetch(`${BACKEND_URL}/api/recordings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(recording),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.recording_id;
}

function notifyStateChange() {
    // Notify all popup windows of state change
    chrome.runtime.sendMessage({
        type: 'stateChanged',
        state: recordingState
    }).catch(() => {
        // Ignore errors if no listeners
    });
}

// Handle tab updates (e.g., navigation)
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any, _tab: chrome.tabs.Tab) => {
    if (recordingState === 'recording' && tabId === currentTabId) {
        if (changeInfo.status === 'complete' && changeInfo.url) {
            // Page navigated, notify content script
            chrome.tabs.sendMessage(tabId, {
                type: 'navigation',
                url: changeInfo.url
            }).catch(() => {
                // Content script might not be ready yet
            });
        }
    }
});

