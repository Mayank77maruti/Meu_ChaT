import MeuAI from './MeuAI';

export default function AIChatView() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-200">MeuAI</h2>
            <p className="text-sm text-gray-400">AI Assistant</p>
          </div>
        </div>
      </div>
      <MeuAI />
    </div>
  );
} 