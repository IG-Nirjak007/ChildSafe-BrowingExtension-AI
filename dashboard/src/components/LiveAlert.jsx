import io from 'socket.io-client';
import { useState, useEffect } from 'react';

const socket = io("http://localhost:5000");

export default function LiveAlert() {
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        socket.on('new_alert', (data) => {
            setAlert(data); // Popup will appear
            setTimeout(() => setAlert(null), 5000); // Auto-hide after 5s
        });
    }, []);

    return alert && (
        <div className="fixed top-4 right-4 bg-red-600 text-white p-6 rounded-lg shadow-2xl z-50 animate-pulse">
            <h2 className="font-bold">🚨 ALERT: Attempted Access</h2>
            <p>{alert.child_name} tried to visit: {alert.url}</p>
        </div>
    );
}