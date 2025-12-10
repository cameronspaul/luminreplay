import React, { useEffect, useState } from 'react';
import './Overlay.css';

const Overlay: React.FC = () => {
    const [monitors, setMonitors] = useState<any[]>([]);

    useEffect(() => {
        // Request monitor info from main process
        // @ts-ignore
        window.electronAPI?.getMonitors().then((mons) => {
            setMonitors(mons);
        });
    }, []);

    const handleSelect = (index: number | 'all') => {
        // Send selection to main process
        // @ts-ignore
        window.electronAPI?.selectMonitor(index);
    };

    return (
        <div className="overlay-container">
            <h1 className="overlay-title">Select View to Save</h1>

            <div className="overlay-monitors-grid">
                {monitors.map((m, idx) => (
                    <div
                        key={idx}
                        className="monitor-card"
                        onClick={() => handleSelect(idx)}
                    >
                        <div className="monitor-name">Monitor {idx + 1}</div>
                        <div className="monitor-res">{m.width}x{m.height}</div>
                    </div>
                ))}

                <div
                    className="monitor-card"
                    onClick={() => handleSelect('all')}
                >
                    <div className="monitor-name">Save All</div>
                    <div className="monitor-res">All Screens</div>
                </div>
            </div>

            <button className="overlay-cancel-btn" onClick={() => window.close()}>
                Cancel
            </button>
        </div>
    );
};

export default Overlay;
