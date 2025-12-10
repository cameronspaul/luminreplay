import React, { useEffect } from 'react';
import './ClipNotification.css';

interface ClipNotificationProps {
    type: 'recorded' | 'saved' | 'buffer-on' | 'buffer-off';
}

const ClipNotification: React.FC<ClipNotificationProps> = ({ type }) => {
    useEffect(() => {
        // Ensure the body/html background is transparent for this window
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';

        // Close the window after animation completes
        // The CSS animation takes roughly 3s (0.4s enter + 2.2s wait + 0.4s exit)
        // Electron also has a failsafe close at 3.5s
        const timer = setTimeout(() => {
            window.close();
        }, 3400);

        return () => clearTimeout(timer);
    }, []);

    const isProcessing = type === 'recorded';
    const isBufferOn = type === 'buffer-on';
    const isBufferOff = type === 'buffer-off';

    let title = '';
    let subtitle = '';
    let notificationClass = '';

    if (isBufferOn) {
        title = 'Buffer Started';
        subtitle = 'Recording active';
        notificationClass = 'buffer-on';
    } else if (isBufferOff) {
        title = 'Buffer Disabled';
        subtitle = 'Recording paused';
        notificationClass = 'buffer-off';
    } else if (isProcessing) {
        title = 'Clip Recorded';
        subtitle = 'Processing...';
        notificationClass = 'processing';
    } else {
        title = 'Clip Saved';
        subtitle = 'Ready to view';
        notificationClass = '';
    }

    return (
        <div className="clip-notification-container">
            <div className={`clip-notification ${notificationClass}`}>
                <div className="clip-notification-icon"></div>
                <div className="clip-notification-content">
                    <div className="clip-notification-title">{title}</div>
                    <div className="clip-notification-subtitle">{subtitle}</div>
                </div>
            </div>
        </div>
    );
};

export default ClipNotification;

