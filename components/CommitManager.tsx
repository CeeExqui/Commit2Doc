import React, { useState } from 'react';
import { Github, FileCode, Plus, Trash2, GitCommit, Cloud, Search, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Commit, CommitSource } from '../types';
import { fetchGitHubCommit } from '../services/githubService';
import { fetchAzureCommit, fetchAzureRepositories, AzureRepository } from '../services/azureService';

interface CommitManagerProps {
  commits: Commit[];
  onAddCommit: (commit: Commit) => void;
  onRemoveCommit: (id: string) => void;
}

export const CommitManager: React.FC<CommitManagerProps> = ({ commits, onAddCommit, onRemoveCommit }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'github' | 'azure'>('manual');
  
  // Shared/Split Fetch State
  const [repoUrl, setRepoUrl] = useState('');
  const [commitHash, setCommitHash] = useState('');
  
  // Tokens
  const [ghToken, setGhToken] = useState('');
  const [azureToken, setAzureToken] = useState('');
  
  // Azure Specifics
  const [azureOrg, setAzureOrg] = useState('');
  const [azureRepos, setAzureRepos] = useState<AzureRepository[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Manual State
  const [manualDiff, setManualDiff] = useState('');
  const [manualMessage, setManualMessage] = useState('');

  const handleFetch = async () => {
    if (!repoUrl || !commitHash) {
      setFetchError("Repo URL and Commit Hash are required");
      return;
    }
    
    setIsFetching(true);
    setFetchError('');
    
    try {
      let commit: Commit;
      
      if (activeTab === 'github') {
        commit = await fetchGitHubCommit(repoUrl, commitHash, ghToken);
      } else if (activeTab === 'azure') {
        if (!azureToken) {
            throw new Error("Personal Access Token (PAT) is required for Azure DevOps");
        }
        commit = await fetchAzureCommit(repoUrl, commitHash, azureToken);
      } else {
        throw new Error("Invalid fetch source");
      }

      onAddCommit(commit);
      // Reset fields
      setCommitHash('');
      setFetchError('');
    } catch (err: any) {
      setFetchError(err.message || "Failed to fetch");
    } finally {
      setIsFetching(false);
    }
  };

  const handleLoadRepos = async () => {
    if (!azureOrg || !azureToken) {
      setFetchError("Organization and PAT are required to load repositories");
      return;
    }

    setIsLoadingRepos(true);
    setFetchError('');
    setAzureRepos([]);

    try {
      const repos = await fetchAzureRepositories(azureOrg, azureToken);
      setAzureRepos(repos);
      if (repos.length === 0) {
        setFetchError("No repositories found in this organization.");
      }
    } catch (err: any) {
      setFetchError(err.message || "Failed to load repositories");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleManualAdd = () => {
    if (!manualDiff) return;
    const newCommit: Commit = {
      id: crypto.randomUUID(),
      hash: 'manual',
      message: manualMessage || 'Manual Diff Entry',
      diff: manualDiff,
      source: CommitSource.MANUAL,
      date: new Date().toISOString()
    };
    onAddCommit(newCommit);
    setManualDiff('');
    setManualMessage('');
  };

  const tabClasses = (tabName: string) => 
    `flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tabName 
      ? 'bg-gray-800 text-primary-400 border-b-2 border-primary-500' 
      : 'bg-gray-900 text-gray-400 hover:text-gray-200'}`;

  return (
    <div className="space-y-6">
      {/* Added Commits List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center">
          <GitCommit className="w-5 h-5 mr-2 text-primary-500" />
          Selected Commits ({commits.length})
        </h3>
        
        {commits.length === 0 ? (
          <div className="p-6 border border-dashed border-gray-700 rounded-lg text-center text-gray-500">
            No commits added yet. Add one below to start documentation.
          </div>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {commits.map((commit) => (
              <li key={commit.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 group">
                <div className="overflow-hidden">
                  <div className="flex items-center text-sm font-medium text-gray-200">
                    <span className={`mr-2 px-1.5 py-0.5 rounded text-xs font-bold
                      ${commit.source === CommitSource.GITHUB ? 'bg-gray-700 text-white' : ''}
                      ${commit.source === CommitSource.AZURE ? 'bg-blue-900 text-blue-200' : ''}
                      ${commit.source === CommitSource.MANUAL ? 'bg-indigo-900 text-indigo-200' : ''}
                    `}>
                      {commit.source}
                    </span>
                    <span className="font-mono text-primary-400 mr-2">{commit.hash.substring(0, 7)}</span>
                    <span className="truncate max-w-[200px]">{commit.message}</span>
                  </div>
                </div>
                <button 
                  onClick={() => onRemoveCommit(commit.id)}
                  className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-700">
          <button className={tabClasses('manual')} onClick={() => { setActiveTab('manual'); setFetchError(''); }}>
            <FileCode className="w-4 h-4 inline mr-2" />
            Paste Diff
          </button>
          <button className={tabClasses('github')} onClick={() => { setActiveTab('github'); setFetchError(''); }}>
            <Github className="w-4 h-4 inline mr-2" />
            GitHub
          </button>
          <button className={tabClasses('azure')} onClick={() => { setActiveTab('azure'); setFetchError(''); }}>
            <Cloud className="w-4 h-4 inline mr-2" />
            Azure DevOps
          </button>
        </div>

        <div className="p-4 space-y-4">
          {activeTab === 'manual' ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Input 
                placeholder="Commit Message (Optional)" 
                value={manualMessage}
                onChange={(e) => setManualMessage(e.target.value)}
              />
              <TextArea 
                placeholder="Paste your git diff or code changes here..." 
                rows={6}
                value={manualDiff}
                onChange={(e) => setManualDiff(e.target.value)}
                className="font-mono text-sm"
              />
              <Button 
                onClick={handleManualAdd} 
                disabled={!manualDiff}
                className="w-full"
                icon={<Plus className="w-4 h-4"/>}
              >
                Add Diff manually
              </Button>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {activeTab === 'github' && (
                <>
                  <div className="bg-gray-900/50 p-3 rounded text-xs text-gray-400 border border-gray-800">
                     Fetching from GitHub API. Public repos work without token. Private repos need a Classic Token.
                  </div>
                  <Input 
                    label="GitHub Repository URL" 
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input 
                      label="Commit Hash" 
                      placeholder="e.g. 8a2b3c" 
                      value={commitHash}
                      onChange={(e) => setCommitHash(e.target.value)}
                    />
                    <Input 
                      label="GitHub Token (Optional)" 
                      type="password"
                      placeholder="ghp_..."
                      value={ghToken}
                      onChange={(e) => setGhToken(e.target.value)}
                    />
                  </div>
                </>
              )}

              {activeTab === 'azure' && (
                <>
                  <div className="bg-gray-900/50 p-3 rounded text-xs text-gray-400 border border-gray-800">
                    Provide Organization & PAT to list repos, or paste full URL manually. PAT requires 'Code (Read)' scope.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input 
                      label="Organization Name" 
                      placeholder="e.g. my-org or https://dev.azure.com/my-org"
                      value={azureOrg}
                      onChange={(e) => setAzureOrg(e.target.value)}
                    />
                    <Input 
                      label="PAT (Required)" 
                      type="password"
                      placeholder="Personal Access Token"
                      value={azureToken}
                      onChange={(e) => setAzureToken(e.target.value)}
                    />
                  </div>

                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleLoadRepos}
                    isLoading={isLoadingRepos}
                    disabled={!azureOrg || !azureToken}
                    icon={<Search className="w-4 h-4"/>}
                    className="w-full border-dashed border-gray-600"
                  >
                    Load Repositories
                  </Button>

                  {azureRepos.length > 0 ? (
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-300">Repository</label>
                        <button 
                          onClick={() => setAzureRepos([])}
                          className="text-xs text-primary-400 hover:text-primary-300"
                        >
                          Switch to Manual URL
                        </button>
                      </div>
                      <select
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors appearance-none"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                      >
                        <option value="">Select a repository...</option>
                        {azureRepos.map(repo => (
                          <option key={repo.id} value={repo.webUrl}>
                            {repo.name} ({repo.project})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <Input 
                      label="Repo URL (Manual)" 
                      placeholder="https://dev.azure.com/org/project/_git/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                    />
                  )}

                  <Input 
                    label="Commit Hash" 
                    placeholder="e.g. 8a2b3c" 
                    value={commitHash}
                    onChange={(e) => setCommitHash(e.target.value)}
                  />
                </>
              )}

              {fetchError && <div className="text-red-400 text-sm p-2 bg-red-900/20 rounded border border-red-900/50">{fetchError}</div>}
              
              <Button 
                onClick={handleFetch} 
                isLoading={isFetching}
                className="w-full"
                icon={activeTab === 'github' ? <Github className="w-4 h-4"/> : <Cloud className="w-4 h-4"/>}
              >
                {activeTab === 'github' ? 'Fetch from GitHub' : 'Fetch from Azure'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};