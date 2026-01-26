import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { parseXrayLink } from '../../../utils/link-parser';

export const OutboundImport = ({ onImport }) => {
    const [linkInput, setLinkInput] = useState("");

    const handleImport = () => {
        if (!linkInput) return;
        const parsed = parseXrayLink(linkInput.trim());
        if (parsed) {
            onImport(parsed);
            setLinkInput("");
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6">
            <label className="label-xs">Import from Link</label>
            <div className="flex gap-2">
                <input 
                    className="flex-1 input-base py-1.5 font-mono text-xs" 
                    placeholder="vless://... or ss://..." 
                    value={linkInput} 
                    onChange={e => setLinkInput(e.target.value)} 
                />
                <Button variant="primary" className="text-xs px-4" onClick={handleImport}>Parse</Button>
            </div>
        </div>
    );
};