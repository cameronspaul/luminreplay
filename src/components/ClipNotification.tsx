import React, { useEffect, useState } from 'react';
import './ClipNotification.css';

interface ClipNotificationProps {
    type: 'recorded' | 'saved';
}

const ClipNotification: React.FC<ClipNotificationProps> = ({ type }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        // Auto-close the window after animation completes
        const timer = setTimeout(() => {
            setVisible(false);
            // Close the window after fade out
            setTimeout(() => {
                window.close();
            }, 400);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    const isProcessing = type === 'recorded';
    const title = isProcessing ? 'Clip Recorded' : 'Clip Saved';
    const subtitle = isProcessing ? 'Processing...' : 'Ready to view';

    return (
        <div className="clip-notification-container">
            <div className={`clip-notification ${isProcessing ? 'processing' : ''}`}>
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
