import { makeRequest } from "./makeRequest.js";
import { LocalRestAPI } from "shared";
import { type } from "arktype";

// Flexible note schema that handles any frontmatter data types
// This is an alternative to LocalRestAPI.ApiNoteJson which restricts frontmatter to strings only
const FlexibleNoteSchema = type({
  content: "string",
  frontmatter: "Record<string, unknown>", // Allow any value types (arrays, booleans, null, etc.)
  path: "string",
  stat: {
    ctime: "number",
    mtime: "number",
    size: "number",
  },
  tags: "string[]",
});

/**
 * Default compression rules when .mcp/GenCompRules.md is not found
 */
const DEFAULT_COMPRESSION_RULES = `# Default GenCompRules

## Core Compression Rules

1. **Whitespace Optimization**: Reduce multiple newlines to single newlines, trim trailing spaces
2. **Header Simplification**: Convert verbose headers to concise versions while maintaining structure
3. **List Condensation**: Compress redundant list items and combine related items
4. **Comment Reduction**: Remove verbose explanations while keeping essential information
5. **Code Block Optimization**: Maintain code functionality while reducing verbose comments
6. **Link Consolidation**: Combine duplicate links and references
7. **Metadata Preservation**: Always preserve frontmatter and critical structural elements

## Transformation Patterns

- Remove "The purpose of this document is to..." type introductions
- Convert "In order to accomplish X, you need to do Y" to "To do X: Y"
- Compress step-by-step instructions to bullet points
- Remove filler words: "basically", "essentially", "obviously", etc.
- Convert passive voice to active voice where possible
- Consolidate redundant examples to single representative examples

## Preserve Always

- Code blocks and their functionality
- Frontmatter/YAML headers
- Critical data and numbers
- Unique insights and conclusions
- Cross-references and links
- Technical terminology and proper names`;

/**
 * Cache for GenCompRules to avoid repeated API calls
 */
const rulesCache = new Map<string, string>();
const cacheTimestamps = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract vault root from a file path
 */
function getVaultRoot(filePath: string): string {
  // Remove any leading/trailing slashes and split path
  const pathParts = filePath.replace(/^\/+|\/+$/g, '').split('/');
  
  // For vault files, we need to determine the vault root
  // This assumes the vault is the root directory in the API context
  return '';
}

/**
 * Get GenCompRules from a vault's _mcp/GenCompRules.md file
 */
async function getGenCompRules(vaultRoot: string = ''): Promise<string> {
  const rulesPath = '_mcp/GenCompRules.md';
  const cacheKey = `${vaultRoot}/${rulesPath}`;
  const now = Date.now();
  
  // Check cache first
  if (rulesCache.has(cacheKey)) {
    const timestamp = cacheTimestamps.get(cacheKey) || 0;
    if (now - timestamp < CACHE_TTL) {
      return rulesCache.get(cacheKey)!;
    }
  }
  
  try {
    // Try to get the GenCompRules file
    const rules = await makeRequest(
      LocalRestAPI.ApiContentResponse,
      `/vault/${encodeURIComponent(rulesPath)}`,
      {
        headers: { Accept: "text/markdown" },
      },
    );
    
    // Cache the rules
    rulesCache.set(cacheKey, rules);
    cacheTimestamps.set(cacheKey, now);
    
    return rules;
  } catch (error) {
    // If _mcp/GenCompRules.md doesn't exist, use default rules
    rulesCache.set(cacheKey, DEFAULT_COMPRESSION_RULES);
    cacheTimestamps.set(cacheKey, now);
    
    return DEFAULT_COMPRESSION_RULES;
  }
}

/**
 * Apply compression rules to content based on GenCompRules
 */
function applyCompression(content: string, rules: string): string {
  let compressed = content;
  
  // Parse the sophisticated GenCompRules format
  // The user's rules are in ultra-compressed format with abbreviations and symbols
  
  // Check if rules contain the sophisticated format indicators
  const isSophisticatedRules = rules.includes('Purpose:Transform_verbose_MD_proj_doc') || 
                              rules.includes('CoreCompRules:') ||
                              rules.includes('KVStruct:');
  
  if (isSophisticatedRules) {
    // Apply sophisticated compression based on the user's ultra-compressed rule format
    
    // 1. Frontmatter preservation (CRIT rule from user's spec)
    // Extract and preserve frontmatter first
    let frontmatter = '';
    let mainContent = compressed;
    const frontmatterMatch = compressed.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (frontmatterMatch) {
      frontmatter = `---\n${frontmatterMatch[1]}\n---\n`;
      mainContent = frontmatterMatch[2];
    }
    
    // 2. Apply KVStruct rules: Key:Val(concise_attr_val)
    // Convert verbose descriptions to key-value pairs
    mainContent = mainContent.replace(/^##\s+(.+?)\n\n([^#]+?)(?=\n##|\n#|$)/gm, (match, header, content) => {
      // Compress headers to inline labels
      const compressedHeader = header.replace(/\s+/g, '_').substring(0, 20);
      // Compress content to key-value format
      const compressedContent = content
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => line.replace(/^-\s+/, '').trim())
        .join(',');
      return `${compressedHeader}:${compressedContent}`;
    });
    
    // 3. Apply abbreviation rules from user's spec
    const abbreviations = {
      // Common abbreviations
      'Development': 'Dev',
      'Implementation': 'Impl', 
      'Management': 'Mgmt',
      'Specification': 'Spec',
      'Architecture': 'Arch',
      'JavaScript': 'JS',
      'Database': 'DB',
      'Requirements': 'Req',
      'Documentation': 'Doc',
      'Testing': 'Test',
      'Project Manager': 'PM',
      'Developer': 'Dev',
      'Quality Assurance': 'QA',
      // Project-specific terms
      'Project': 'Proj',
      'Document': 'Doc',
      'Configuration': 'Config',
      'Information': 'Info',
      'System': 'Sys',
      'Application': 'App',
      'Component': 'Comp',
      'Function': 'Func',
      'Variable': 'Var',
      'Parameter': 'Param'
    };
    
    Object.entries(abbreviations).forEach(([full, abbrev]) => {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      mainContent = mainContent.replace(regex, abbrev);
    });
    
    // 4. Apply symbolic representation rules
    mainContent = mainContent
      .replace(/\bflows to\b|\bleads to\b|\bresults in\b/gi, '→')
      .replace(/\bgreater than\b|\bmore important than\b|\bpriority over\b/gi, '>')
      .replace(/\bor\b|\balternatively\b/gi, '/')
      .replace(/\bequals\b|\bis equivalent to\b|\bsame as\b/gi, '==')
      .replace(/\bnot\b|\bdoes not\b|\bisn\'t\b/gi, '!=')
      .replace(/\bto be determined\b|\buncertain\b|\bquestion\b/gi, '?=');
    
    // 5. Apply hierarchical delimiters
    // Use | for major sections, : for subsections, , for items
    mainContent = mainContent
      .replace(/\n\n+/g, '|') // Major section separator
      .replace(/:\s*\n/g, ':') // Subsection separator
      .replace(/,\s*\n/g, ','); // Item separator
    
    // 6. MD conversion rules from user's spec
    // Convert headers to inline labels
    mainContent = mainContent.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      const prefix = level === 1 ? 'H1:' : level === 2 ? 'Sec:' : 'SubSec:';
      return `${prefix}${title.replace(/\s+/g, '_')}`;
    });
    
    // Convert lists to comma-separated
    mainContent = mainContent.replace(/^[-*+]\s+(.+)$/gm, '$1,').replace(/,\s*$/, '');
    
    // Convert links
    mainContent = mainContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1[$2]');
    mainContent = mainContent.replace(/\[\[([^\]]+)\]\]/g, 'InternalRef:[[$1]]');
    
    // Remove emphasis unless semantically critical
    mainContent = mainContent.replace(/\*\*([^*]+)\*\*/g, '$1');
    mainContent = mainContent.replace(/\*([^*]+)\*/g, '$1');
    
    // 7. Whitespace formatting - eliminate non-semantic whitespace
    mainContent = mainContent
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\s*\|\s*/g, '|') // Clean pipe separators
      .replace(/\s*:\s*/g, ':') // Clean colon separators
      .replace(/\s*,\s*/g, ',') // Clean comma separators
      .trim();
    
    // 8. Structure flattening - minimize nesting depth
    mainContent = mainContent.replace(/\|{2,}/g, '|'); // Remove double pipes
    
    // Combine frontmatter with compressed content
    compressed = frontmatter + mainContent;
    
  } else {
    // Apply basic compression for standard rules (fallback to original implementation)
    
    // 1. Whitespace optimization
    compressed = compressed.replace(/\n\s*\n\s*\n/g, '\n\n');
    compressed = compressed.replace(/[ \t]+$/gm, '');
    
    // 2. Remove verbose introductions
    compressed = compressed.replace(/^.*?purpose of this document is to.*?\n/gim, '');
    compressed = compressed.replace(/^.*?this document (will|aims to|intends to).*?\n/gim, '');
    
    // 3. Convert verbose explanations to concise versions
    compressed = compressed.replace(/In order to accomplish ([^,]+), you need to (.+)/gi, 'To $1: $2');
    compressed = compressed.replace(/In order to (.+), you should (.+)/gi, 'To $1: $2');
    
    // 4. Remove filler words
    const fillerWords = ['basically', 'essentially', 'obviously', 'clearly', 'simply put', 'in other words'];
    fillerWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b[,\\s]*`, 'gi');
      compressed = compressed.replace(regex, '');
    });
    
    // 5. Consolidate redundant list items
    compressed = compressed.replace(/^(\s*[-*+])\s+(.+)\n\1\s+\2.*$/gm, '$1 $2');
    
    // 6. Convert passive to active voice
    compressed = compressed.replace(/can be done by/gi, 'do');
    compressed = compressed.replace(/should be performed by/gi, 'should perform');
    
    // 7. Compress step-by-step to bullets
    compressed = compressed.replace(/^Step \d+[:.]\s*/gm, '- ');
    
    // 8. Remove redundant explanations
    compressed = compressed.replace(/\(as mentioned (above|below|earlier|previously)\)/gi, '');
    compressed = compressed.replace(/\(see (above|below)\)/gi, '');
    
    // 9. Consolidate examples
    compressed = compressed.replace(/(For example[^.]*\.)\s+(Another example[^.]*\.)\s+(Yet another example[^.]*\.)/gi, '$1');
    
    // Final cleanup
    compressed = compressed.replace(/\n{3,}/g, '\n\n');
  }
  
  return compressed.trim();
}

/**
 * Generate compressed version of content
 */
export async function generateCompressedVersion(content: string, filePath: string): Promise<string> {
  const vaultRoot = getVaultRoot(filePath);
  const rules = await getGenCompRules(vaultRoot);
  return applyCompression(content, rules);
}

/**
 * Check if a compressed version exists for a file
 */
export async function checkCompressedVersionExists(filePath: string): Promise<boolean> {
  const compressedPath = `${filePath}.aicomp`;
  
  try {
    await makeRequest(
      LocalRestAPI.ApiContentResponse,
      `/vault/${encodeURIComponent(compressedPath)}`,
      {
        method: "HEAD", // Just check if file exists
      },
    );
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the appropriate version of a file (compressed if available, otherwise original)
 */
export async function getFileWithCompression(filePath: string, format: 'markdown' | 'json' = 'markdown'): Promise<any> {
  const compressedPath = `${filePath}.aicomp`;
  
  // First try to get compressed version
  try {
    const acceptHeader = format === 'json' 
      ? "application/vnd.olrapi.note+json" 
      : "text/markdown";
      
    const compressedContent = await makeRequest(
      format === 'json' ? 
        LocalRestAPI.ApiNoteJson : 
        LocalRestAPI.ApiContentResponse,
      `/vault/${encodeURIComponent(compressedPath)}`,
      {
        headers: { Accept: acceptHeader },
      },
    );
    
    return {
      content: compressedContent,
      isCompressed: true,
      sourcePath: compressedPath,
    };
  } catch (error) {
    // Fall back to original file
    try {
      const acceptHeader = format === 'json' 
        ? "application/vnd.olrapi.note+json" 
        : "text/markdown";
        
      const originalContent = await makeRequest(
        format === 'json' ? 
          LocalRestAPI.ApiNoteJson : 
          LocalRestAPI.ApiContentResponse,
        `/vault/${encodeURIComponent(filePath)}`,
        {
          headers: { Accept: acceptHeader },
        },
      );
      
      return {
        content: originalContent,
        isCompressed: false,
        sourcePath: filePath,
      };
    } catch (originalError) {
      throw originalError;
    }
  }
}

/**
 * Create or update both original and compressed versions of a file
 */
export async function createFileWithCompression(filePath: string, content: string): Promise<void> {
  // Create/update the original file
  await makeRequest(
    LocalRestAPI.ApiNoContentResponse,
    `/vault/${encodeURIComponent(filePath)}`,
    {
      method: "PUT",
      body: content,
    },
  );
  
  // Generate and save compressed version
  const compressedContent = await generateCompressedVersion(content, filePath);
  const compressedPath = `${filePath}.aicomp`;
  
  await makeRequest(
    LocalRestAPI.ApiNoContentResponse,
    `/vault/${encodeURIComponent(compressedPath)}`,
    {
      method: "PUT",
      body: compressedContent,
    },
  );
}

/**
 * Append to both original and compressed versions of a file
 */
export async function appendToFileWithCompression(filePath: string, content: string): Promise<void> {
  // Append to original file
  await makeRequest(
    LocalRestAPI.ApiNoContentResponse,
    `/vault/${encodeURIComponent(filePath)}`,
    {
      method: "POST",
      body: content,
    },
  );
  
  // Get the full updated content to regenerate compressed version
  const updatedContent = await makeRequest(
    LocalRestAPI.ApiContentResponse,
    `/vault/${encodeURIComponent(filePath)}`,
    {
      headers: { Accept: "text/markdown" },
    },
  );
  
  // Regenerate compressed version with full content
  const compressedContent = await generateCompressedVersion(updatedContent, filePath);
  const compressedPath = `${filePath}.aicomp`;
  
  await makeRequest(
    LocalRestAPI.ApiNoContentResponse,
    `/vault/${encodeURIComponent(compressedPath)}`,
    {
      method: "PUT",
      body: compressedContent,
    },
  );
}

/**
 * Patch both original and compressed versions of a file
 */
export async function patchFileWithCompression(
  filePath: string, 
  patchContent: string, 
  headers: HeadersInit
): Promise<string> {
  // Patch the original file
  const response = await makeRequest(
    LocalRestAPI.ApiContentResponse,
    `/vault/${encodeURIComponent(filePath)}`,
    {
      method: "PATCH",
      headers,
      body: patchContent,
    },
  );
  
  // Get the full updated content to regenerate compressed version
  const updatedContent = await makeRequest(
    LocalRestAPI.ApiContentResponse,
    `/vault/${encodeURIComponent(filePath)}`,
    {
      headers: { Accept: "text/markdown" },
    },
  );
  
  // Regenerate compressed version
  const compressedContent = await generateCompressedVersion(updatedContent, filePath);
  const compressedPath = `${filePath}.aicomp`;
  
  await makeRequest(
    LocalRestAPI.ApiNoContentResponse,
    `/vault/${encodeURIComponent(compressedPath)}`,
    {
      method: "PUT",
      body: compressedContent,
    },
  );
  
  return response;
}

/**
 * Delete both original and compressed versions of a file
 */
export async function deleteFileWithCompression(filePath: string): Promise<void> {
  // Delete original file
  await makeRequest(
    LocalRestAPI.ApiNoContentResponse,
    `/vault/${encodeURIComponent(filePath)}`,
    {
      method: "DELETE",
    },
  );
  
  // Try to delete compressed version (don't fail if it doesn't exist)
  const compressedPath = `${filePath}.aicomp`;
  try {
    await makeRequest(
      LocalRestAPI.ApiNoContentResponse,
      `/vault/${encodeURIComponent(compressedPath)}`,
      {
        method: "DELETE",
      },
    );
  } catch (error) {
    // Compressed version might not exist, that's okay
  }
}

/**
 * Clear the rules cache (useful for testing or when rules are updated)
 */
export function clearRulesCache(): void {
  rulesCache.clear();
  cacheTimestamps.clear();
} 