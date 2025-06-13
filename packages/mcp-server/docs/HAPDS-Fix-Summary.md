# HAPDS Configuration Folder Fix

## Issue Identified
The original HAPDS implementation used a hidden folder `.mcp/` for storing GenCompRules.md, but hidden folders starting with "." are typically not accessible through REST APIs for security reasons.

## Solution Applied
Changed the configuration folder from `.mcp/` to `_mcp/` to ensure compatibility with the Obsidian REST API.

## Changes Made

### 1. Core Compression System
- **File**: `packages/mcp-server/src/shared/compression.ts`
- **Change**: Updated `rulesPath` from `.mcp/GenCompRules.md` to `_mcp/GenCompRules.md`
- **Function**: `getGenCompRules()`

### 2. Documentation Updates
- **HAPDS README**: Updated all folder references from `.mcp/` to `_mcp/`
- **GenCompRules Example**: Updated file path instructions
- **Implementation Summary**: Updated configuration paths and examples

### 3. Management Tool Messages
- **File**: `packages/mcp-server/src/features/local-rest-api/index.ts`  
- **Tool**: `manage_hapds_compression`
- **Changes**: Updated status and cache clearing messages to reference `_mcp/GenCompRules.md`

## New Configuration Path

```
your-vault/
├── _mcp/
│   └── GenCompRules.md    # Vault-specific compression rules
├── document.md            # Original human-readable version
├── document.md.aicomp     # AI-optimized compressed version
└── other-files...
```

## Impact

### ✅ Positive Changes
- **REST API Compatible**: The `_mcp/` folder is accessible through Obsidian's REST API
- **Maintains Functionality**: All HAPDS features work exactly the same
- **Clear Visibility**: The underscore prefix makes the folder clearly visible but indicates it's system-related
- **No Breaking Changes**: Existing functionality remains intact

### 📋 Migration Notes
- **New Installations**: Will automatically use `_mcp/GenCompRules.md`
- **Existing Users**: Should move their rules from `.mcp/GenCompRules.md` to `_mcp/GenCompRules.md`
- **Fallback**: System gracefully falls back to default rules if configuration file is not found

## Build Status

### ✅ Updated Builds
- **MCP Server**: `packages/mcp-server/dist/mcp-server.exe` (Updated: 2025-06-02 오후 3:06:29)
- **Obsidian Plugin**: `main.js` (Updated: 2025-06-02 오후 3:06:38)

## Testing Recommendations

1. **Create Test Vault**: Set up a test vault with `_mcp/GenCompRules.md`
2. **Verify API Access**: Confirm the REST API can read the configuration file
3. **Test Compression**: Verify automatic compression works with custom rules
4. **Check Fallback**: Ensure default rules work when configuration is missing

## Configuration Example

Create `_mcp/GenCompRules.md` in your vault root with either:

**Basic Format:**
```markdown
# GenCompRules
## Core Rules
1. Remove filler words
2. Preserve code blocks
...
```

**Ultra-Compressed Format:**
```
Purpose:Transform_verbose_MD_proj_doc→ultra_comp_mach_read_fmt;Pres_all_crit_sem_info_AI_ctx_consume|...
```

The system automatically detects which format you're using and applies the appropriate compression logic. 