
import React, { useEffect, useState } from 'react';
import { Recording } from '../db';

interface RecordingHistoryProps {
    recordings: Recording[];
    onDelete: (id: number) => void;
}

const RecordingHistory: React.FC<RecordingHistoryProps> = ({ recordings, onDelete }) => {
    const [audioUrls, setAudioUrls] = useState<Map<number, string>>(new Map());

    useEffect(() => {
        const newUrls = new Map<number, string>();
        recordings.forEach(rec => {
            const url = URL.createObjectURL(rec.blob);
            newUrls.set(rec.id, url);
        });
        setAudioUrls(newUrls);

        return () => {
            newUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [recordings]);

    return (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {recordings.length > 0 ? recordings.map(rec => (
                <div key={rec.id} className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-grow">
                        <p className="font-semibold">Recording - {new Date(rec.date).toLocaleString()}</p>
                        <p className="text-sm text-gray-400">Size: {(rec.blob.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {audioUrls.get(rec.id) && <audio controls src={audioUrls.get(rec.id)} className="h-10"></audio>}
                        <button 
                            onClick={() => onDelete(rec.id)} 
                            className="p-2 bg-red-800 hover:bg-red-700 rounded-md text-white transition-colors"
                            aria-label={`Delete recording from ${new Date(rec.date).toLocaleString()}`}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )) : <p className="text-gray-400 text-center py-4">No recordings yet. Activate the amplifier and press 'Record' to save audio.</p>}
        </div>
    );
};

export default RecordingHistory;
