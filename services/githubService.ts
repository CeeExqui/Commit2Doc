import { Commit, CommitSource } from '../types';

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  files: {
    filename: string;
    status: string;
    patch?: string;
  }[];
}

export const fetchGitHubCommit = async (
  repoUrl: string,
  commitHash: string,
  token?: string
): Promise<Commit> => {
  // Parse owner and repo from URL
  // Expected format: https://github.com/owner/repo
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  
  if (!match) {
    throw new Error("Invalid GitHub repository URL");
  }

  const owner = match[1];
  const repo = match[2];

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${commitHash}`,
      { headers }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Failed to fetch commit from GitHub");
    }

    const data: GitHubCommitResponse = await response.json();
    
    // Construct a unified diff string
    let fullDiff = "";
    if (data.files) {
      fullDiff = data.files.map(f => `File: ${f.filename} (${f.status})\n${f.patch || '[Binary or Large File]'}`).join('\n\n');
    }

    return {
      id: crypto.randomUUID(),
      hash: data.sha.substring(0, 7),
      message: data.commit.message,
      diff: fullDiff,
      author: data.commit.author.name,
      date: data.commit.author.date,
      source: CommitSource.GITHUB
    };

  } catch (error: any) {
    console.error("GitHub Fetch Error:", error);
    throw error;
  }
};