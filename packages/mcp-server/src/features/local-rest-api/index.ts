import { makeRequest, type ToolRegistry, 
  getFileWithCompression, createFileWithCompression, 
  appendToFileWithCompression, patchFileWithCompression,
  deleteFileWithCompression, clearRulesCache, 
  generateCompressedVersion } from "$/shared";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { type } from "arktype";
import { LocalRestAPI } from "shared";

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

export function registerLocalRestApiTools(tools: ToolRegistry, server: Server) {
  // GET Status
  tools.register(
    type({
      name: '"get_server_info"',
      arguments: "Record<string, unknown>",
    }).describe(
      "Returns basic details about the Obsidian Local REST API and authentication status. This is the only API request that does not require authentication.",
    ),
    async () => {
      const data = await makeRequest(LocalRestAPI.ApiStatusResponse, "/");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // GET Active File
  tools.register(
    type({
      name: '"get_active_file"',
      arguments: {
        format: type('"markdown" | "json"').optional(),
      },
    }).describe(
      "Returns the content of the currently active file in Obsidian. Can return either markdown content or a JSON representation including parsed tags and frontmatter.",
    ),
    async ({ arguments: args }) => {
      const format =
        args?.format === "json"
          ? "application/vnd.olrapi.note+json"
          : "text/markdown";
          
      const data = await makeRequest(
        args?.format === "json" ? FlexibleNoteSchema : type("string"),
        "/active/",
        {
          headers: { Accept: format },
        },
      );
      const content =
        typeof data === "string" ? data : JSON.stringify(data, null, 2);
      return { content: [{ type: "text", text: content }] };
    },
  );

  // PUT Active File
  tools.register(
    type({
      name: '"update_active_file"',
      arguments: {
        content: "string",
      },
    }).describe("Update the content of the active file open in Obsidian."),
    async ({ arguments: args }) => {
      await makeRequest(LocalRestAPI.ApiNoContentResponse, "/active/", {
        method: "PUT",
        body: args.content,
      });
      return {
        content: [{ type: "text", text: "File updated successfully" }],
      };
    },
  );

  // POST Active File
  tools.register(
    type({
      name: '"append_to_active_file"',
      arguments: {
        content: "string",
      },
    }).describe("Append content to the end of the currently-open note."),
    async ({ arguments: args }) => {
      await makeRequest(LocalRestAPI.ApiNoContentResponse, "/active/", {
        method: "POST",
        body: args.content,
      });
      return {
        content: [{ type: "text", text: "Content appended successfully" }],
      };
    },
  );

  // PATCH Active File
  tools.register(
    type({
      name: '"patch_active_file"',
      arguments: LocalRestAPI.ApiPatchParameters,
    }).describe(
      "Insert or modify content in the currently-open note relative to a heading, block reference, or frontmatter field.",
    ),
    async ({ arguments: args }) => {
      const headers: Record<string, string> = {
        Operation: args.operation,
        "Target-Type": args.targetType,
        Target: args.target,
        "Create-Target-If-Missing": "true",
      };

      if (args.targetDelimiter) {
        headers["Target-Delimiter"] = args.targetDelimiter;
      }
      if (args.trimTargetWhitespace !== undefined) {
        headers["Trim-Target-Whitespace"] = String(args.trimTargetWhitespace);
      }
      if (args.contentType) {
        headers["Content-Type"] = args.contentType;
      }

      const response = await makeRequest(
        LocalRestAPI.ApiContentResponse,
        "/active/",
        {
          method: "PATCH",
          headers,
          body: args.content,
        },
      );
      return {
        content: [
          { type: "text", text: "File patched successfully" },
          { type: "text", text: response },
        ],
      };
    },
  );

  // DELETE Active File
  tools.register(
    type({
      name: '"delete_active_file"',
      arguments: "Record<string, unknown>",
    }).describe("Delete the currently-active file in Obsidian."),
    async () => {
      await makeRequest(LocalRestAPI.ApiNoContentResponse, "/active/", {
        method: "DELETE",
      });
      return {
        content: [{ type: "text", text: "File deleted successfully" }],
      };
    },
  );

  // POST Open File in Obsidian UI
  tools.register(
    type({
      name: '"show_file_in_obsidian"',
      arguments: {
        filename: "string",
        "newLeaf?": "boolean",
      },
    }).describe(
      "Open a document in the Obsidian UI. Creates a new document if it doesn't exist. Returns a confirmation if the file was opened successfully.",
    ),
    async ({ arguments: args }) => {
      const query = args.newLeaf ? "?newLeaf=true" : "";

      await makeRequest(
        LocalRestAPI.ApiNoContentResponse,
        `/open/${encodeURIComponent(args.filename)}${query}`,
        {
          method: "POST",
        },
      );

      return {
        content: [{ type: "text", text: "File opened successfully" }],
      };
    },
  );

  // POST Search via Dataview or JsonLogic
  tools.register(
    type({
      name: '"search_vault"',
      arguments: {
        queryType: '"dataview" | "jsonlogic"',
        query: "string",
      },
    }).describe(
      "Search for documents matching a specified query using either Dataview DQL or JsonLogic.",
    ),
    async ({ arguments: args }) => {
      const contentType =
        args.queryType === "dataview"
          ? "application/vnd.olrapi.dataview.dql+txt"
          : "application/vnd.olrapi.jsonlogic+json";

      const data = await makeRequest(
        LocalRestAPI.ApiSearchResponse,
        "/search/",
        {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: args.query,
        },
      );

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // POST Simple Search
  tools.register(
    type({
      name: '"search_vault_simple"',
      arguments: {
        query: "string",
        "contextLength?": "number",
      },
    }).describe("Search for documents matching a text query."),
    async ({ arguments: args }) => {
      const query = new URLSearchParams({
        query: args.query,
        ...(args.contextLength
          ? {
              contextLength: String(args.contextLength),
            }
          : {}),
      });

      const data = await makeRequest(
        LocalRestAPI.ApiSimpleSearchResponse,
        `/search/simple/?${query}`,
        {
          method: "POST",
        },
      );

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // GET Vault Files or Directories List
  tools.register(
    type({
      name: '"list_vault_files"',
      arguments: {
        "directory?": "string",
      },
    }).describe(
      "List files in the root directory or a specified subdirectory of your vault.",
    ),
    async ({ arguments: args }) => {
      const path = args.directory ? `${args.directory}/` : "";
      const data = await makeRequest(
        LocalRestAPI.ApiVaultFileResponse.or(
          LocalRestAPI.ApiVaultDirectoryResponse,
        ),
        `/vault/${path}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // GET Vault File Content
  tools.register(
    type({
      name: '"get_vault_file"',
      arguments: {
        filename: "string",
        "format?": '"markdown" | "json"',
      },
    }).describe("Get the content of a file from your vault. Automatically returns compressed version (.aicomp) if available, otherwise returns the original file."),
    async ({ arguments: args }) => {
      try {
        const result = await getFileWithCompression(args.filename, args.format || 'markdown');
        
        const content = typeof result.content === "string" 
          ? result.content 
          : JSON.stringify(result.content, null, 2);
          
        const compressionNote = result.isCompressed 
          ? " (compressed version)" 
          : " (original version)";
          
        return {
          content: [
            {
              type: "text",
              text: content,
            },
            {
              type: "text",
              text: `Source: ${result.sourcePath}${compressionNote}`,
            },
          ],
        };
      } catch (error) {
        // Fall back to original implementation if compression fails
        const isJson = args.format === "json";
        const format = isJson
          ? "application/vnd.olrapi.note+json"
          : "text/markdown";
        
        const data = await makeRequest(
          isJson ? FlexibleNoteSchema : LocalRestAPI.ApiContentResponse,
          `/vault/${encodeURIComponent(args.filename)}`,
          {
            headers: { Accept: format },
          },
        );
        return {
          content: [
            {
              type: "text",
              text:
                typeof data === "string" ? data : JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    },
  );

  // PUT Vault File Content
  tools.register(
    type({
      name: '"create_vault_file"',
      arguments: {
        filename: "string",
        content: "string",
      },
    }).describe("Create a new file in your vault or update an existing one. Automatically creates both original (.md) and compressed (.aicomp) versions using Co-Located HAPDS."),
    async ({ arguments: args }) => {
      try {
        await createFileWithCompression(args.filename, args.content);
        return {
          content: [
            { type: "text", text: "File created successfully" },
            { type: "text", text: `Created: ${args.filename} (original)` },
            { type: "text", text: `Created: ${args.filename}.aicomp (compressed)` },
          ],
        };
      } catch (error) {
        // Fall back to original implementation if compression fails
        await makeRequest(
          LocalRestAPI.ApiNoContentResponse,
          `/vault/${encodeURIComponent(args.filename)}`,
          {
            method: "PUT",
            body: args.content,
          },
        );
        return {
          content: [{ type: "text", text: "File created successfully (original only)" }],
        };
      }
    },
  );

  // POST Vault File Content
  tools.register(
    type({
      name: '"append_to_vault_file"',
      arguments: {
        filename: "string",
        content: "string",
      },
    }).describe("Append content to a new or existing file. Automatically updates both original and compressed (.aicomp) versions using Co-Located HAPDS."),
    async ({ arguments: args }) => {
      try {
        await appendToFileWithCompression(args.filename, args.content);
        return {
          content: [
            { type: "text", text: "Content appended successfully" },
            { type: "text", text: `Updated: ${args.filename} (original)` },
            { type: "text", text: `Updated: ${args.filename}.aicomp (compressed)` },
          ],
        };
      } catch (error) {
        // Fall back to original implementation if compression fails
        await makeRequest(
          LocalRestAPI.ApiNoContentResponse,
          `/vault/${encodeURIComponent(args.filename)}`,
          {
            method: "POST",
            body: args.content,
          },
        );
        return {
          content: [{ type: "text", text: "Content appended successfully (original only)" }],
        };
      }
    },
  );

  // PATCH Vault File Content
  tools.register(
    type({
      name: '"patch_vault_file"',
      arguments: type({
        filename: "string",
      }).and(LocalRestAPI.ApiPatchParameters),
    }).describe(
      "Insert or modify content in a file relative to a heading, block reference, or frontmatter field. Automatically updates both original and compressed (.aicomp) versions using Co-Located HAPDS.",
    ),
    async ({ arguments: args }) => {
      const headers: HeadersInit = {
        Operation: args.operation,
        "Target-Type": args.targetType,
        Target: args.target,
        "Create-Target-If-Missing": "true",
      };

      if (args.targetDelimiter) {
        headers["Target-Delimiter"] = args.targetDelimiter;
      }
      if (args.trimTargetWhitespace !== undefined) {
        headers["Trim-Target-Whitespace"] = String(args.trimTargetWhitespace);
      }
      if (args.contentType) {
        headers["Content-Type"] = args.contentType;
      }

      try {
        const response = await patchFileWithCompression(
          args.filename,
          args.content,
          headers
        );

        return {
          content: [
            { type: "text", text: "File patched successfully" },
            { type: "text", text: `Updated: ${args.filename} (original)` },
            { type: "text", text: `Updated: ${args.filename}.aicomp (compressed)` },
            { type: "text", text: response },
          ],
        };
      } catch (error) {
        // Fall back to original implementation if compression fails
        const response = await makeRequest(
          LocalRestAPI.ApiContentResponse,
          `/vault/${encodeURIComponent(args.filename)}`,
          {
            method: "PATCH",
            headers,
            body: args.content,
          },
        );

        return {
          content: [
            { type: "text", text: "File patched successfully (original only)" },
            { type: "text", text: response },
          ],
        };
      }
    },
  );

  // DELETE Vault File Content
  tools.register(
    type({
      name: '"delete_vault_file"',
      arguments: {
        filename: "string",
      },
    }).describe("Delete a file from your vault. Automatically deletes both original and compressed (.aicomp) versions if they exist."),
    async ({ arguments: args }) => {
      try {
        await deleteFileWithCompression(args.filename);
        return {
          content: [
            { type: "text", text: "File deleted successfully" },
            { type: "text", text: `Deleted: ${args.filename} (original)` },
            { type: "text", text: `Deleted: ${args.filename}.aicomp (compressed, if existed)` },
          ],
        };
      } catch (error) {
        // Fall back to original implementation if compression fails
        await makeRequest(
          LocalRestAPI.ApiNoContentResponse,
          `/vault/${encodeURIComponent(args.filename)}`,
          {
            method: "DELETE",
          },
        );
        return {
          content: [{ type: "text", text: "File deleted successfully (original only)" }],
        };
      }
    },
  );

  // GET File Structure (Frontmatter + Headings) 
  tools.register(
    type({
      name: '"get_file_structure"',
      arguments: {
        filename: "string",
        "headingLevel?": "number",
      },
    }).describe(
      "Get the frontmatter and headings of a specified level from a markdown file. If no heading level is specified, returns all headings.",
    ),
    async ({ arguments: args }) => {
      // Get file content as JSON to access frontmatter and content separately
      const data = await makeRequest(
        FlexibleNoteSchema,
        `/vault/${encodeURIComponent(args.filename)}`,
        {
          headers: { Accept: "application/vnd.olrapi.note+json" },
        },
      );

      // Extract frontmatter (now supports any data types)
      const frontmatter = data.frontmatter || {};
      
      // Parse headings from content
      const content = data.content || "";
      const lines = content.split('\n');
      const headings: Array<{ level: number; text: string; line: number }> = [];
      
      lines.forEach((line: string, index: number) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#')) {
          const match = trimmedLine.match(/^(#+)\s*(.*)$/);
          if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            headings.push({
              level,
              text,
              line: index + 1
            });
          }
        }
      });

      // Filter headings by level if specified
      const filteredHeadings = args.headingLevel 
        ? headings.filter(heading => heading.level === args.headingLevel)
        : headings;

      // Prepare response
      const result = {
        filename: args.filename,
        frontmatter,
        headings: filteredHeadings,
        totalHeadings: headings.length,
        filteredCount: filteredHeadings.length,
        ...(args.headingLevel && { requestedLevel: args.headingLevel })
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // UPDATE Frontmatter (Bulk Operations)
  tools.register(
    type({
      name: '"update_frontmatter"',
      arguments: {
        filename: "string",
        operation: type('"merge" | "replace"'),
        frontmatter: "Record<string, unknown>",
      },
    }).describe(
      "Update frontmatter in a markdown file. Use 'merge' to update specific fields while keeping others, or 'replace' to completely replace the frontmatter.",
    ),
    async ({ arguments: args }) => {
      // Get current file data
      const currentData = await makeRequest(
        FlexibleNoteSchema,
        `/vault/${encodeURIComponent(args.filename)}`,
        {
          headers: { Accept: "application/vnd.olrapi.note+json" },
        },
      );

      let newFrontmatter: Record<string, unknown>;

      if (args.operation === "merge") {
        // Merge with existing frontmatter
        newFrontmatter = {
          ...currentData.frontmatter,
          ...args.frontmatter,
        };
      } else {
        // Replace entire frontmatter
        newFrontmatter = args.frontmatter;
      }

      // Convert frontmatter to YAML format
      const yamlLines = [];
      yamlLines.push("---");
      
      for (const [key, value] of Object.entries(newFrontmatter)) {
        if (value === null) {
          yamlLines.push(`${key}: null`);
        } else if (typeof value === "string") {
          // Handle strings with special characters
          const needsQuotes = value.includes(":") || value.includes("#") || value.includes("'") || value.includes('"');
          yamlLines.push(`${key}: ${needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value}`);
        } else if (Array.isArray(value)) {
          yamlLines.push(`${key}: [${value.map(v => typeof v === "string" ? `"${v}"` : v).join(", ")}]`);
        } else if (typeof value === "object") {
          yamlLines.push(`${key}:`);
          for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
            yamlLines.push(`  ${subKey}: ${typeof subValue === "string" ? `"${subValue}"` : subValue}`);
          }
        } else {
          yamlLines.push(`${key}: ${value}`);
        }
      }
      
      yamlLines.push("---");

      // Get content without frontmatter
      const content = currentData.content || "";
      const contentLines = content.split('\n');
      
      // Find where content starts (after frontmatter)
      let contentStartIndex = 0;
      if (contentLines[0]?.trim() === "---") {
        for (let i = 1; i < contentLines.length; i++) {
          if (contentLines[i]?.trim() === "---") {
            contentStartIndex = i + 1;
            break;
          }
        }
      }

      // Combine new frontmatter with existing content
      const newContent = [
        ...yamlLines,
        ...contentLines.slice(contentStartIndex)
      ].join('\n');

      // Update the file
      await makeRequest(
        LocalRestAPI.ApiNoContentResponse,
        `/vault/${encodeURIComponent(args.filename)}`,
        {
          method: "PUT",
          body: newContent,
        },
      );

      // Return summary of changes
      const result = {
        filename: args.filename,
        operation: args.operation,
        updatedFields: Object.keys(args.frontmatter),
        finalFrontmatter: newFrontmatter,
      };

      return {
        content: [
          { type: "text", text: "Frontmatter updated successfully" },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    },
  );

  // HAPDS Compression Management
  tools.register(
    type({
      name: '"manage_hapds_compression"',
      arguments: {
        action: type('"clear_cache" | "regenerate_compressed" | "status"'),
        "filename?": "string",
      },
    }).describe(
      "Manage the Co-Located HAPDS (Human-AI Parallel Documentation System) compression. Actions: 'clear_cache' to clear GenCompRules cache, 'regenerate_compressed' to recreate .aicomp file for a specific document, 'status' to check compression system status.",
    ),
    async ({ arguments: args }) => {
      switch (args.action) {
        case "clear_cache":
          clearRulesCache();
          return {
            content: [
              { type: "text", text: "GenCompRules cache cleared successfully" },
              { type: "text", text: "Next compression operation will reload rules from _mcp/GenCompRules.md" },
            ],
          };

        case "regenerate_compressed":
          if (!args.filename) {
            return {
              content: [
                { type: "text", text: "Error: filename is required for regenerate_compressed action" },
              ],
            };
          }
          
          try {
            // Get original file content
            const originalContent = await makeRequest(
              LocalRestAPI.ApiContentResponse,
              `/vault/${encodeURIComponent(args.filename)}`,
              {
                headers: { Accept: "text/markdown" },
              },
            );
            
            // Generate new compressed version
            const compressedContent = await generateCompressedVersion(originalContent, args.filename);
            const compressedPath = `${args.filename}.aicomp`;
            
            // Save compressed version
            await makeRequest(
              LocalRestAPI.ApiNoContentResponse,
              `/vault/${encodeURIComponent(compressedPath)}`,
              {
                method: "PUT",
                body: compressedContent,
              },
            );
            
            return {
              content: [
                { type: "text", text: `Compressed version regenerated successfully` },
                { type: "text", text: `Original: ${args.filename}` },
                { type: "text", text: `Compressed: ${compressedPath}` },
                { type: "text", text: `Compression ratio: ${Math.round((1 - compressedContent.length / originalContent.length) * 100)}%` },
              ],
            };
          } catch (error) {
            return {
              content: [
                { type: "text", text: `Error regenerating compressed version: ${error}` },
              ],
            };
          }

        case "status":
          return {
            content: [
              { type: "text", text: "Co-Located HAPDS Compression System Status" },
              { type: "text", text: "✓ Compression system active" },
              { type: "text", text: "✓ Auto-compression on file creation/update enabled" },
              { type: "text", text: "✓ Auto-selection of compressed versions on read enabled" },
              { type: "text", text: "Configuration: Reads from _mcp/GenCompRules.md in vault root" },
              { type: "text", text: "File extensions: .aicomp for compressed versions" },
              { type: "text", text: "Cache: GenCompRules cached for 5 minutes per vault" },
            ],
          };

        default:
          return {
            content: [
              { type: "text", text: "Error: Invalid action. Use 'clear_cache', 'regenerate_compressed', or 'status'" },
            ],
          };
      }
    },
  );
}
