import { RecordedEvent } from './types';

let isRecording = false;
const events: RecordedEvent[] = [];

// Event listeners
let clickListener: ((e: MouseEvent) => void) | null = null;
let inputListener: ((e: Event) => void) | null = null;
let keydownListener: ((e: KeyboardEvent) => void) | null = null;
let changeListener: ((e: Event) => void) | null = null;
let submitListener: ((e: Event) => void) | null = null;

// Navigation tracking
let originalPushState: typeof history.pushState;
let originalReplaceState: typeof history.replaceState;
let popstateListener: ((e: PopStateEvent) => void) | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message.type === 'startRecording') {
        startRecording();
        sendResponse({ success: true });
        return true;
    }

    if (message.type === 'stopRecording') {
        stopRecording();
        sendResponse({ success: true });
        return true;
    }

    if (message.type === 'getEvents') {
        sendResponse({ events: events });
        return true;
    }

    if (message.type === 'clearEvents') {
        events.length = 0;
        chrome.storage.session.remove('recordedEvents');
        sendResponse({ success: true });
        return true;
    }

    if (message.type === 'navigation') {
        captureNavigationEvent(message.url);
        sendResponse({ success: true });
        return true;
    }

    return false;
});

function startRecording() {
    if (isRecording) {
        return;
    }

    isRecording = true;
    events.length = 0;

    // Capture initial page info
    captureNavigationEvent(window.location.href);

    // Set up event listeners
    clickListener = (e: MouseEvent) => {
        if (e.target instanceof Element) {
            captureClickEvent(e);
        }
    };

    inputListener = (e: Event) => {
        const target = e.target;
        if (target instanceof HTMLInputElement || 
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable)) {
            // Only capture if the element is actually focused and has content
            // This helps avoid capturing events on hidden or disabled inputs
            if (target instanceof HTMLElement) {
                if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                    // For standard inputs, always capture
                    captureInputEvent(e);
                } else if (target.isContentEditable && document.activeElement === target) {
                    // For contenteditable, only capture when focused
                    captureInputEvent(e);
                }
            }
        }
    };

    keydownListener = (e: KeyboardEvent) => {
        // Capture typing in contenteditable elements and inputs
        const target = e.target;
        if (target instanceof HTMLElement) {
            // Skip modifier keys and special keys
            if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter') {
                if (target.isContentEditable || 
                    target instanceof HTMLInputElement || 
                    target instanceof HTMLTextAreaElement) {
                    // Debounce: only capture after a short delay to avoid capturing every keystroke
                    // The input event will handle the final value
                    // This is just a fallback for contenteditable
                    if (target.isContentEditable) {
                        captureInputEvent(e as any);
                    }
                }
            }
        }
    };

    changeListener = (e: Event) => {
        if (e.target instanceof HTMLSelectElement || 
            e.target instanceof HTMLInputElement) {
            captureChangeEvent(e);
        }
    };

    submitListener = (e: Event) => {
        if (e.target instanceof HTMLFormElement) {
            captureSubmitEvent(e);
        }
    };

    document.addEventListener('click', clickListener, true);
    // Listen to both 'input' and 'beforeinput' events for better coverage
    document.addEventListener('input', inputListener, true);
    document.addEventListener('beforeinput', inputListener, true);
    document.addEventListener('keydown', keydownListener, true);
    document.addEventListener('change', changeListener, true);
    document.addEventListener('submit', submitListener, true);

    // Track navigation
    trackNavigation();
}

function stopRecording() {
    if (!isRecording) {
        return;
    }

    isRecording = false;

    // Remove event listeners
    if (clickListener) {
        document.removeEventListener('click', clickListener, true);
        clickListener = null;
    }
    if (inputListener) {
        document.removeEventListener('input', inputListener, true);
        document.removeEventListener('beforeinput', inputListener, true);
        inputListener = null;
    }
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener, true);
        keydownListener = null;
    }
    if (changeListener) {
        document.removeEventListener('change', changeListener, true);
        changeListener = null;
    }
    if (submitListener) {
        document.removeEventListener('submit', submitListener, true);
        submitListener = null;
    }

    // Restore navigation
    restoreNavigation();

    // Store events in session storage
    chrome.storage.session.set({ recordedEvents: events });
}

function captureClickEvent(e: MouseEvent) {
    if (!(e.target instanceof Element)) return;

    const event = createEvent('click', e.target);
    events.push(event);
    notifyBackground(event);
}

function captureInputEvent(e: Event) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement || 
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable))) {
        return;
    }

    const event = createEvent('input', target as Element);
    
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        event.value = target.value;
        event.inputType = target.type || null;
    } else if (target instanceof HTMLElement && target.isContentEditable) {
        // For contenteditable elements, get the text content
        event.value = target.textContent || target.innerText || '';
        event.inputType = 'text';
    }
    
    events.push(event);
    notifyBackground(event);
}

function captureChangeEvent(e: Event) {
    if (!(e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement)) return;

    const event = createEvent('change', e.target);
    if (e.target instanceof HTMLSelectElement) {
        event.value = e.target.value;
    } else if (e.target instanceof HTMLInputElement) {
        event.value = e.target.type === 'checkbox' || e.target.type === 'radio' 
            ? String(e.target.checked) 
            : e.target.value;
        event.inputType = e.target.type || null;
    }
    events.push(event);
    notifyBackground(event);
}

function captureSubmitEvent(e: Event) {
    if (!(e.target instanceof HTMLFormElement)) return;

    const event = createEvent('submit', e.target);
    events.push(event);
    notifyBackground(event);
}

function captureNavigationEvent(url: string) {
    const event: RecordedEvent = {
        id: generateEventId(),
        timestamp: Date.now(),
        eventType: 'navigation',
        url: url,
        frameId: String((window as any).frameId || '0'),
        selector: null,
        xpath: null,
        value: null,
        tagName: null,
        innerTextPreview: null
    };
    events.push(event);
    notifyBackground(event);
}

function createEvent(eventType: 'click' | 'input' | 'change' | 'submit', element: Element): RecordedEvent {
    const selector = generateSelector(element);
    const xpath = generateXPath(element);

    return {
        id: generateEventId(),
        timestamp: Date.now(),
        eventType: eventType,
        url: window.location.href,
        frameId: String((window as any).frameId || '0'),
        selector: selector,
        xpath: xpath,
        value: null,
        tagName: element.tagName,
        innerTextPreview: getInnerTextPreview(element)
    };
}

function generateSelector(element: Element): string | null {
    // Priority 1: ID
    if (element.id) {
        return `#${CSS.escape(element.id)}`;
    }

    // Priority 2: Data attributes
    const dataAttrs = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => `[${attr.name}="${CSS.escape(attr.value)}"]`);
    
    if (dataAttrs.length > 0) {
        const tagName = element.tagName.toLowerCase();
        return `${tagName}${dataAttrs.join('')}`;
    }

    // Priority 3: CSS path (tag + nth-child)
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body && current !== document.documentElement) {
        let selector = current.tagName.toLowerCase();

        // Add nth-child if there are siblings
        if (current.parentElement) {
            const siblings = Array.from(current.parentElement.children);
            const index = siblings.indexOf(current);
            if (siblings.length > 1) {
                selector += `:nth-child(${index + 1})`;
            }
        }

        path.unshift(selector);
        current = current.parentElement;
    }

    return path.length > 0 ? path.join(' > ') : null;
}

function generateXPath(element: Element): string | null {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }

    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = current.previousElementSibling;

        while (sibling) {
            if (sibling.nodeName === current.nodeName) {
                index++;
            }
            sibling = sibling.previousElementSibling;
        }

        const tagName = current.nodeName.toLowerCase();
        const xpathIndex = index > 1 ? `[${index}]` : '';
        parts.unshift(`${tagName}${xpathIndex}`);

        current = current.parentElement;
    }

    return parts.length > 0 ? '/' + parts.join('/') : null;
}

function getInnerTextPreview(element: Element, maxLength: number = 50): string | null {
    const text = element.textContent?.trim() || '';
    if (!text) return null;
    
    return text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text;
}

function generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function notifyBackground(event: RecordedEvent) {
    chrome.runtime.sendMessage({
        type: 'eventCaptured',
        event: event
    }).catch(() => {
        // Ignore errors if background script is not available
    });
}

function trackNavigation() {
    // Monkey-patch history.pushState
    originalPushState = history.pushState;
    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        if (isRecording && args.length >= 3) {
            // Extract URL from the third argument (pushState(state, title, url))
            const urlArg = args[2];
            // Resolve relative URLs to absolute URLs
            const absoluteUrl = urlArg ? new URL(urlArg, window.location.href).href : window.location.href;
            captureNavigationEvent(absoluteUrl);
        }
    };

    // Monkey-patch history.replaceState
    originalReplaceState = history.replaceState;
    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        if (isRecording && args.length >= 3) {
            // Extract URL from the third argument (replaceState(state, title, url))
            const urlArg = args[2];
            // Resolve relative URLs to absolute URLs
            const absoluteUrl = urlArg ? new URL(urlArg, window.location.href).href : window.location.href;
            captureNavigationEvent(absoluteUrl);
        }
    };

    // Listen for popstate
    popstateListener = () => {
        if (isRecording) {
            captureNavigationEvent(window.location.href);
        }
    };
    window.addEventListener('popstate', popstateListener);
}

function restoreNavigation() {
    if (originalPushState) {
        history.pushState = originalPushState;
    }
    if (originalReplaceState) {
        history.replaceState = originalReplaceState;
    }
    if (popstateListener) {
        window.removeEventListener('popstate', popstateListener);
        popstateListener = null;
    }
}

