import React from 'react';
import { Switch, Card, SchemaForm } from '../../ui';
import { LogSchema } from '../../../core/xray/schemas/log.schema';

export const LogEditor = ({ log, onChange, onToggle }: any) => {
    const enabled = !!log;
    const localLog = log || { loglevel: "warning" };

    return (
        <Card 
            title="Log Configuration" 
            icon="TerminalWindow"
            headerExtra={<Switch checked={enabled} onChange={() => onToggle(enabled ? null : { loglevel: "warning" })} />}
        >
            <p className="text-xs text-slate-500 mb-2">System output logs</p>

            {enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-slate-800/50">
                    <SchemaForm
                        schema={LogSchema}
                        value={localLog}
                        onChange={onChange}
                        fieldConfigs={{
                            loglevel: {
                                label: 'Log Level',
                                help: 'Level of verbosity for xray logs.',
                                options: ['debug', 'info', 'warning', 'error', 'none']
                            },
                            access: {
                                label: 'Access Log Path',
                                help: 'Path to access log file. Empty = stdout, "none" = discard.',
                                placeholder: '/var/log/xray/access.log'
                            },
                            error: {
                                label: 'Error Log Path',
                                help: 'Path to error log file. Empty = stdout, "none" = discard.',
                                placeholder: '/var/log/xray/error.log'
                            },
                            dnsLog: {
                                label: 'Enable DNS Log',
                                help: 'Enable DNS query logging (requires loglevel to be debug or info).'
                            },
                            maskAddress: {
                                label: 'Mask IP Address',
                                help: 'Mask client IP addresses in logs. Options: quarter, half, full, or custom mask string.',
                                placeholder: 'e.g. half'
                            }
                        }}
                    />
                </div>
            )}
        </Card>
    );
};