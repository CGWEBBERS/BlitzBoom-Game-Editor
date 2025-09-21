import React, { useState } from 'react';
// Fix: Import the service to interact with the Gemini API.
import { askAI } from '../services/geminiService';
import CodeIcon from './icons/CodeIcon';

// Fix: Implement the AIAssistant component to provide an interface for interacting with Gemini.
const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setResponse('');
    try {
      const aiResponse = await askAI(prompt);
      setResponse(aiResponse);
    } catch (error) {
      console.error(error);
      setResponse('Sorry, something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-transform hover:scale-105 z-50"
        title="AI Assistant"
      >
        <CodeIcon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl flex flex-col h-[500px] z-50">
      <div className="flex justify-between items-center p-3 bg-gray-900/70 border-b border-gray-700">
        <h3 className="font-semibold text-base">AI Assistant</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
      </div>

      <div className="flex-grow p-3 overflow-y-auto text-sm">
        {response ? (
          <div className="prose prose-sm prose-invert max-w-none">
            {/* Using pre-wrap to respect newlines and wrap long lines from the AI response */}
            <pre className="bg-transparent p-0"><code className="whitespace-pre-wrap font-sans">{response}</code></pre>
          </div>
        ) : (
            <p className="text-gray-400">Ask me to create a script, explain a concept, or generate ideas...</p>
        )}
         {isLoading && <p className="text-cyan-400 animate-pulse mt-2">Thinking...</p>}
      </div>

      <div className="p-3 border-t border-gray-700">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Create a player movement script'"
            className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
            disabled={isLoading}
          />
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
