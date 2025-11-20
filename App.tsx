import React, { useState } from 'react';
import { Upload, Wand2, FileText, AlertCircle } from 'lucide-react';
import { CommitManager } from './components/CommitManager';
import { DocumentationPreview } from './components/DocumentationPreview';
import { Input, TextArea } from './components/Input';
import { Button } from './components/Button';
import { generateDocumentation } from './services/geminiService';
import { Commit, GenerationConfig } from './types';

const App: React.FC = () => {
  // State
  const [commits, setCommits] = useState<Commit[]>([]);
  const [generatedDoc, setGeneratedDoc] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Configuration State
  const [extraInfo, setExtraInfo] = useState('');
  const [setupInstructions, setSetupInstructions] = useState('');
  const [previousDocContent, setPreviousDocContent] = useState<string | null>(null);
  const [previousDocName, setPreviousDocName] = useState<string>('');

  const handleAddCommit = (commit: Commit) => {
    setCommits(prev => [...prev, commit]);
  };

  const handleRemoveCommit = (id: string) => {
    setCommits(prev => prev.filter(c => c.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPreviousDocName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPreviousDocContent(text);
    };
    reader.readAsText(file);
  };

  const clearPreviousDoc = () => {
    setPreviousDocContent(null);
    setPreviousDocName('');
  };

  const handleGenerate = async () => {
    if (commits.length === 0) return;
    
    setIsGenerating(true);
    try {
      const config: GenerationConfig = {
        extraInfo,
        setupInstructions,
        previousDocContent
      };
      const markdown = await generateDocumentation(commits, config);
      setGeneratedDoc(markdown);
    } catch (error) {
      console.error("Failed to generate docs", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-primary-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-900/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Commit<span className="text-primary-500">2</span>Doc
            </h1>
          </div>
          <div className="text-xs text-gray-500 font-mono border border-gray-800 px-2 py-1 rounded">
            v1.0.0 • Gemini Powered
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Configuration (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Section 1: Commits */}
            <section>
              <CommitManager 
                commits={commits} 
                onAddCommit={handleAddCommit} 
                onRemoveCommit={handleRemoveCommit} 
              />
            </section>

            <div className="border-t border-gray-800 my-6"></div>

            {/* Section 2: Context */}
            <section className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-200">Documentation Context</h3>
              
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Update Existing Docs (Optional)
                  </label>
                  {!previousDocContent ? (
                    <div className="relative group">
                      <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-700/50 hover:border-primary-500 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-6 h-6 mb-2 text-gray-400 group-hover:text-primary-400" />
                            <p className="text-sm text-gray-400"><span className="font-semibold">Click to upload</span> .md file</p>
                          </div>
                          <input id="dropzone-file" type="file" className="hidden" accept=".md,.txt" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
                      <div className="flex items-center overflow-hidden">
                        <FileText className="w-4 h-4 text-indigo-400 mr-2 flex-shrink-0" />
                        <span className="text-sm text-indigo-200 truncate">{previousDocName}</span>
                      </div>
                      <button onClick={clearPreviousDoc} className="text-gray-400 hover:text-red-400 ml-2">
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <TextArea 
                  label="Additional Context" 
                  placeholder="Explain rationale, hidden logic, or business value..." 
                  rows={3}
                  value={extraInfo}
                  onChange={(e) => setExtraInfo(e.target.value)}
                />
                
                <TextArea 
                  label="Setup / Usage Instructions" 
                  placeholder="npm install..., env vars required..." 
                  rows={3}
                  value={setupInstructions}
                  onChange={(e) => setSetupInstructions(e.target.value)}
                />
              </div>
            </section>

            {/* Generate Button (Mobile Sticky) */}
            <div className="sticky bottom-4 z-30">
              <Button 
                size="lg" 
                className="w-full shadow-xl shadow-primary-900/20 py-4 text-lg"
                onClick={handleGenerate}
                disabled={commits.length === 0}
                isLoading={isGenerating}
                icon={<Wand2 className="w-5 h-5" />}
              >
                {isGenerating ? 'Generating Docs...' : 'Generate Documentation'}
              </Button>
            </div>
          </div>

          {/* Right Column: Preview (7 cols) */}
          <div className="lg:col-span-7 h-[800px] lg:h-[calc(100vh-8rem)] sticky top-24">
            <DocumentationPreview markdown={generatedDoc} />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;