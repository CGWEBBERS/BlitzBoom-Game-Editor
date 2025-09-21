import React, { useState, useRef, useEffect } from 'react';
import CloseIcon from './icons/CloseIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ExternalLinkIcon from './icons/ExternalLinkIcon';

export interface ExportOptions {
  folderName: string;
  minify: boolean;
  sourceMaps: boolean;
  createZip: boolean;
  pwa: boolean;
  runtime: 'include' | 'cdn';
  assetHashing: 'none' | 'md5' | 'timestamp';
}

interface ProgressUpdate {
  step: string;
  status: 'running' | 'success' | 'error';
  log?: string;
}

// Fix: Export the ExportResult interface to be used for explicit type annotations in other files.
export interface ExportResult {
  downloadUrl?: string;
  previewUrl?: string;
}

interface ExportModalProps {
  onClose: () => void;
  onExport: (options: ExportOptions, onProgress: (update: ProgressUpdate) => void) => Promise<ExportResult>;
}

const exportSteps = [
    'Prepare Project Data',
    'Package Assets',
    'Add Game Engine',
    'Generate ZIP',
];

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void, label: string }> = ({ checked, onChange, label }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span>{label}</span>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
            checked ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
        >
            <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                checked ? 'translate-x-6' : 'translate-x-1'
            }`}
            />
        </button>
    </label>
);


const ExportModal: React.FC<ExportModalProps> = ({ onClose, onExport }) => {
    const [view, setView] = useState<'options' | 'progress'>('options');
    const [options, setOptions] = useState<ExportOptions>({
        folderName: 'exported_game',
        minify: true,
        sourceMaps: false,
        createZip: true,
        pwa: false,
        runtime: 'include',
        assetHashing: 'md5',
    });
    const [progress, setProgress] = useState<Record<string, 'pending' | 'running' | 'success' | 'error'>>({});
    const [log, setLog] = useState('');
    const [result, setResult] = useState<ExportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [log]);

    const handleOptionsChange = (field: keyof ExportOptions, value: any) => {
        setOptions(prev => ({ ...prev, [field]: value }));
    };

    const handleStartExport = async () => {
        setView('progress');
        const initialProgress: Record<string, 'pending' | 'running' | 'success' | 'error'> = {};
        
        exportSteps.forEach(step => initialProgress[step] = 'pending');
        setProgress(initialProgress);
        setLog('Starting export...\n');
        setError(null);
        setResult(null);

        try {
            const exportResult = await onExport(options, (update) => {
                setProgress(prev => ({ ...prev, [update.step]: update.status }));
                if (update.log) {
                    setLog(prev => `${prev}${update.log}\n`);
                }
            });
            setResult(exportResult);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
            setLog(prev => `${prev}\n--- EXPORT FAILED ---\n`);
        }
    };
    
    const renderOptions = () => (
         <>
            <main className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                    <label htmlFor="folderName" className="block text-xs text-gray-400 mb-1">Target Folder Name</label>
                    <input
                        id="folderName"
                        type="text"
                        value={options.folderName}
                        onChange={(e) => handleOptionsChange('folderName', e.target.value)}
                        className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg">
                        <ToggleSwitch label="Minify JavaScript" checked={options.minify} onChange={v => handleOptionsChange('minify', v)} />
                        <ToggleSwitch label="Generate Source Maps" checked={options.sourceMaps} onChange={v => handleOptionsChange('sourceMaps', v)} />
                        <ToggleSwitch label="Create ZIP Package" checked={options.createZip} onChange={v => handleOptionsChange('createZip', v)} />
                        <ToggleSwitch label="Enable PWA Support" checked={options.pwa} onChange={v => handleOptionsChange('pwa', v)} />
                    </div>
                     <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg">
                        <div>
                            <label className="block text-xs text-gray-400 mb-2">Game Runtime</label>
                             <div className="flex space-x-2 text-sm">
                                <button onClick={() => handleOptionsChange('runtime', 'include')} className={`flex-1 p-2 rounded-md ${options.runtime === 'include' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Include in Export</button>
                                <button onClick={() => handleOptionsChange('runtime', 'cdn')} className={`flex-1 p-2 rounded-md ${options.runtime === 'cdn' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Link from CDN</button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="assetHashing" className="block text-xs text-gray-400 mb-1">Asset Hashing</label>
                            <select
                                id="assetHashing"
                                value={options.assetHashing}
                                onChange={(e) => handleOptionsChange('assetHashing', e.target.value)}
                                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                            >
                                <option value="none">None</option>
                                <option value="md5">MD5 Hash</option>
                                <option value="timestamp">Timestamp</option>
                            </select>
                        </div>
                    </div>
                </div>
            </main>
            <footer className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-2">
                <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 font-bold py-2 px-4 rounded-md">Cancel</button>
                <button onClick={handleStartExport} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md">Start Export</button>
            </footer>
        </>
    );

    const renderProgress = () => (
        <>
            <main className="p-6 flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
                <div className="w-full md:w-1/3">
                    <h3 className="font-bold mb-2">Export Steps</h3>
                    <ul className="space-y-2 text-sm">
                        {Object.entries(progress).map(([step, status]) => (
                             <li key={step} className="flex items-center space-x-2">
                                {status === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                {status === 'error' && <XCircleIcon className="w-5 h-5 text-red-500" />}
                                {(status === 'pending' || status === 'running') && <div className={`w-5 h-5 flex items-center justify-center ${status === 'running' ? 'animate-spin' : ''}`}><div className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-cyan-400' : 'bg-gray-500'}`}></div></div>}
                                <span className={status === 'running' ? 'text-cyan-400' : status === 'pending' ? 'text-gray-500' : ''}>{step}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex-grow flex flex-col bg-gray-900/50 rounded-lg overflow-hidden">
                    <h3 className="font-bold p-2 bg-gray-700/50 text-sm">Log</h3>
                    <div ref={logRef} className="flex-grow p-2 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-gray-400">
                        {log}
                    </div>
                </div>
            </main>
            <footer className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-2">
                {result && result.downloadUrl && (
                    <a href={result.downloadUrl} download={`${options.folderName}.zip`} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md">Download ZIP</a>
                )}
                 <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 font-bold py-2 px-4 rounded-md">Close</button>
            </footer>
        </>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
             <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl border border-gray-700 flex flex-col text-gray-200" style={{ height: '70vh' }}>
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="font-bold text-lg">
                        {view === 'options' ? 'Export to Web (HTML5)' : 
                         error ? 'Export Failed' : 
                         result ? 'Export Complete' : 'Exporting Project...'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </header>
                {view === 'options' ? renderOptions() : renderProgress()}
            </div>
        </div>
    );
};

export default ExportModal;