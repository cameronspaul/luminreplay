import React, { useEffect, useState } from 'react';

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
        <div style={{
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px'
        }}>
            <h1>Select View to Save</h1>
            <div style={{ display: 'flex', gap: '20px' }}>
                {monitors.map((m, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        style={{ padding: '20px', fontSize: '18px', cursor: 'pointer' }}
                    >
                        Monitor {idx + 1}
                        <br />
                        <small>{m.width}x{m.height}</small>
                    </button>
                ))}
                <button
                    onClick={() => handleSelect('all')}
                    style={{ padding: '20px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Save All (Mega-Canvas)
                </button>
            </div>
            <button onClick={() => window.close()} style={{ marginTop: '50px' }}>Cancel</button>
        </div>
    );
};

export default Overlay;
