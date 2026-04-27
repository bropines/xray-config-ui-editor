import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';

export const LogEditor = ({ log, onChange, onToggle }: any) => {
    const isEnabled = !!log;
    
    return (
        <Card 
            title="Log Configuration" 
            icon="Files" 
            iconColor="bg-blue-600"
            actions={
                <Switch checked={isEnabled} onChange={onToggle} />
            }
        >
            {isEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <FormField label="Loglevel" help="Log sensitivity level.">
                        <Select 
                            value={log.loglevel || "warning"} 
                            onChange={e => onChange({ ...log, loglevel: e.target.value })}
                        >
                            <option value="debug">Debug (Verbose)</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning (Default)</option>
                            <option value="error">Error Only</option>
                            <option value="none">None (Silent)</option>
                        </Select>
                    </FormField>
                    <FormField label="Access Log Path" help="File path for access logs.">
                        <Input 
                            value={log.access || ""} 
                            placeholder="/var/log/xray/access.log"
                            onChange={e => onChange({ ...log, access: e.target.value })} 
                        />
                    </FormField>
                </div>
            )}
            {!isEnabled && (
                <div className="text-center py-2 opacity-40 text-[10px] uppercase font-black tracking-widest italic">
                    Logging is disabled
                </div>
            )}
        </Card>
    );
};
