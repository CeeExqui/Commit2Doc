import { Commit, CommitSource } from '../types';

export interface AzureRepository {
  id: string;
  name: string;
  webUrl: string;
  project: string;
}

// Helper to parse Azure DevOps URL
// Formats:
// https://dev.azure.com/{org}/{project}/_git/{repo}
// https://{org}.visualstudio.com/{project}/_git/{repo}
const parseAzureUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    let org = '';
    let project = '';
    let repo = '';

    if (urlObj.hostname.endsWith('visualstudio.com')) {
      org = urlObj.hostname.split('.')[0];
      // Expected: /project/_git/repo
      project = pathParts[0];
      const gitIndex = pathParts.indexOf('_git');
      if (gitIndex !== -1 && gitIndex + 1 < pathParts.length) {
        repo = pathParts[gitIndex + 1];
      }
    } else if (urlObj.hostname === 'dev.azure.com') {
      // Expected: /org/project/_git/repo
      org = pathParts[0];
      project = pathParts[1];
      const gitIndex = pathParts.indexOf('_git');
      if (gitIndex !== -1 && gitIndex + 1 < pathParts.length) {
        repo = pathParts[gitIndex + 1];
      }
    }

    if (!org || !project || !repo) return null;

    return { org, project, repo };
  } catch (e) {
    return null;
  }
};

export const fetchAzureRepositories = async (orgInput: string, token: string): Promise<AzureRepository[]> => {
  let baseUrl = '';
  const cleanInput = orgInput.trim();

  // Determine base URL based on input format (name only, dev.azure.com url, or visualstudio.com url)
  if (cleanInput.includes('dev.azure.com')) {
    const match = cleanInput.match(/dev\.azure\.com\/([^/]+)/);
    const orgName = match ? match[1] : cleanInput;
    baseUrl = `https://dev.azure.com/${orgName}`;
  } else if (cleanInput.includes('visualstudio.com')) {
    const match = cleanInput.match(/([^.]+)\.visualstudio\.com/);
    const orgName = match ? match[1] : cleanInput;
    baseUrl = `https://${orgName}.visualstudio.com`;
  } else {
    // Assume it's just the organization name, default to dev.azure.com
    baseUrl = `https://dev.azure.com/${cleanInput}`;
  }

  const authHeader = 'Basic ' + btoa(':' + token);

  try {
    const response = await fetch(`${baseUrl}/_apis/git/repositories?api-version=7.1`, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Unauthorized. Please check your Personal Access Token (PAT).");
      if (response.status === 404) throw new Error(`Organization not found at ${baseUrl}`);
      throw new Error("Failed to fetch repositories.");
    }

    const data = await response.json();
    
    // Map to simple interface
    return data.value.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      webUrl: repo.webUrl,
      project: repo.project.name
    })).sort((a: AzureRepository, b: AzureRepository) => a.name.localeCompare(b.name));

  } catch (error: any) {
    console.error("Azure Repo List Error:", error);
    throw error;
  }
};

export const fetchAzureCommit = async (
  repoUrl: string,
  commitHash: string,
  token: string
): Promise<Commit> => {
  const parsed = parseAzureUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid Azure DevOps repository URL. Format should be https://dev.azure.com/{org}/{project}/_git/{repo}");
  }

  const { org, project, repo } = parsed;
  
  // Azure DevOps REST API base
  const baseUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}`;
  
  // Auth Header (Basic Auth with PAT)
  // Username can be anything, password is the PAT
  const authHeader = 'Basic ' + btoa(':' + token);

  try {
    // 1. Fetch Commit Details
    const commitResponse = await fetch(
      `${baseUrl}/commits/${commitHash}?api-version=7.1`,
      {
        headers: {
          'Authorization': authHeader
        }
      }
    );

    if (!commitResponse.ok) {
      if (commitResponse.status === 401) {
        throw new Error("Unauthorized. Please check your Personal Access Token (PAT).");
      }
      const err = await commitResponse.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch commit from Azure DevOps");
    }

    const commitData = await commitResponse.json();

    // 2. Fetch Changes (to construct a diff-like context)
    const changesResponse = await fetch(
      `${baseUrl}/commits/${commitHash}/changes?api-version=7.1`,
      {
        headers: {
          'Authorization': authHeader
        }
      }
    );

    let diffContent = "## Changes Summary\n";

    if (changesResponse.ok) {
        const changesData = await changesResponse.json();
        const changes = changesData.changes || [];
        
        // Process changes
        for (const change of changes) {
            diffContent += `\nFile: ${change.item.path} [${change.changeType}]\n`;
            
            // If it's an edit or add, try to fetch the new content to give context to the AI
            // We limit this to avoid massive payloads. 
            // Real diffing is complex via API, so we provide the file content as context.
            if (['edit', 'add'].includes(change.changeType) && !change.item.isFolder) {
                try {
                    // Fetch item content using the url provided in the change object
                    // ensuring we pass auth headers
                    const contentResponse = await fetch(change.item.url, {
                        headers: { 'Authorization': authHeader }
                    });
                    
                    if (contentResponse.ok) {
                        const text = await contentResponse.text();
                        // Simple heuristic to avoid binary files or massive dumps
                        if (text.length < 30000 && !text.includes('\0')) {
                            diffContent += "```\n" + text.substring(0, 5000) + (text.length > 5000 ? "\n... (truncated)" : "") + "\n```\n";
                        } else {
                            diffContent += "(File too large or binary, content skipped)\n";
                        }
                    }
                } catch (e) {
                    diffContent += "(Could not fetch file content)\n";
                }
            }
            diffContent += "---\n";
        }
        
        if (changes.length === 0) {
            diffContent += "No file changes found in this commit.";
        }

    } else {
        diffContent += "Could not fetch changes list from Azure API.";
    }

    return {
      id: crypto.randomUUID(),
      hash: commitData.commitId.substring(0, 7),
      message: commitData.comment,
      diff: diffContent,
      author: commitData.author?.name,
      date: commitData.author?.date,
      source: CommitSource.AZURE
    };

  } catch (error: any) {
    console.error("Azure Fetch Error:", error);
    throw error;
  }
};