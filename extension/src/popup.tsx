import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RecordingState } from './types';

const Popup: React.FC = () => {
    const [state, setState] = useState<RecordingState>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Get initial state from background
        chrome.runtime.sendMessage({ type: 'getState' }, (response: any) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting state:', chrome.runtime.lastError);
                return;
            }
            if (response?.state) {
                setState(response.state);
            }
        });

        // Listen for state updates from background
        const messageListener = (message: any) => {
            if (message.type === 'stateChanged') {
                setState(message.state);
            }
            if (message.type === 'error') {
                setError(message.error);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    const handleStartRecording = () => {
        setError(null);
        chrome.runtime.sendMessage({ type: 'startRecording' }, (response: any) => {
            if (chrome.runtime.lastError) {
                setError(chrome.runtime.lastError.message || 'Unknown error');
                return;
            }
            if (response?.error) {
                setError(response.error || 'Unknown error');
            } else if (response?.state) {
                setState(response.state);
            }
        });
    };

    const handleStopRecording = () => {
        setError(null);
        chrome.runtime.sendMessage({ type: 'stopRecording' }, (response: any) => {
            if (chrome.runtime.lastError) {
                setError(chrome.runtime.lastError.message || 'Unknown error');
                return;
            }
            if (response?.error) {
                setError(response.error || 'Unknown error');
            } else if (response?.state) {
                setState(response.state);
            }
        });
    };

    const getStatusText = () => {
        switch (state) {
            case 'idle':
                return 'Ready to record';
            case 'recording':
                return 'Recording...';
            case 'uploading':
                return 'Uploading...';
            case 'ready':
                return 'Recording complete';
            default:
                return 'Unknown state';
        }
    };

    const getButtonText = () => {
        return state === 'recording' ? 'Stop Recording' : 'Start Recording';
    };

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            minWidth: '260px'
        }}>
            <h1 style={{
                margin: '0 0 16px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: '#333'
            }}>
                FlowScribe
            </h1>
            
            <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: state === 'recording' ? '#fff3cd' : '#e7f3ff',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#333'
            }}>
                {getStatusText()}
            </div>

            {error && (
                <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: '#fee',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#c33'
                }}>
                    {error}
                </div>
            )}

            <button
                onClick={state === 'recording' ? handleStopRecording : handleStartRecording}
                disabled={state === 'uploading'}
                style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#fff',
                    backgroundColor: state === 'recording' ? '#dc3545' : '#007bff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: state === 'uploading' ? 'not-allowed' : 'pointer',
                    opacity: state === 'uploading' ? 0.6 : 1
                }}
            >
                {getButtonText()}
            </button>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<Popup />);
}

