import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, Copy, Check, FileText } from 'lucide-react';
import { Button } from './Button';

interface DocumentationPreviewProps {
  markdown: string;
}

export const DocumentationPreview: React.FC<DocumentationPreviewProps> = ({ markdown }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DOCUMENTATION.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!markdown) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-12 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/50">
        <FileText className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">Documentation preview will appear here</p>
        <p className="text-sm opacity-60">Add commits and click generate</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0">
        <h2 className="font-semibold text-gray-200 flex items-center">
          <FileText className="w-4 h-4 mr-2 text-primary-500" />
          Preview
        </h2>
        <div className="flex space-x-2">
          <Button variant="secondary" size="sm" onClick={handleCopy} className="!py-1 !px-2 text-xs">
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownload} className="!py-1 !px-2 text-xs">
            <Download className="w-3 h-3 mr-1" />
            Save .md
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-gray-800 prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
};