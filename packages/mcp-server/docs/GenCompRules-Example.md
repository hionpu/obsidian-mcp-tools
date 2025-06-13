# GenCompRules Configuration for Co-Located HAPDS

This file defines the compression rules for the Co-Located HAPDS (Human-AI Parallel Documentation System). Place this file at `_mcp/GenCompRules.md` in your vault's root directory.

## Core Compression Principles

### 1. Whitespace Optimization
- Reduce multiple consecutive newlines to maximum of two
- Remove trailing spaces and tabs
- Normalize indentation to consistent spacing

### 2. Content Compression Rules

#### Headers & Structure
- Preserve all header hierarchy (# ## ### etc.)
- Remove verbose header descriptions
- Keep structural markdown intact

#### Lists & Bullets
- Consolidate redundant list items
- Merge similar bullet points
- Preserve unique information in each item

#### Text Optimization
- Remove filler words: "basically", "essentially", "obviously", "clearly"
- Convert passive voice to active where possible
- Eliminate redundant explanations
- Compress verbose introductions

#### Examples & Code
- Preserve all code blocks and their functionality
- Keep technical examples intact
- Remove verbose code comments while maintaining clarity
- Consolidate multiple similar examples to representative ones

### 3. Content Preservation Rules

#### Always Preserve
- Frontmatter/YAML headers (complete preservation)
- Code blocks and syntax
- Technical terminology and proper names
- Unique insights and conclusions
- Cross-references and internal links
- External URLs and citations
- Data, numbers, and measurements
- Specific instructions and procedures

#### Never Remove
- Functional code
- Critical technical details
- Unique information or insights
- References to other documents
- Important warnings or notes

### 4. Transformation Patterns

#### Introductory Phrases
- "The purpose of this document is to..." → [Remove entirely]
- "This document will..." → [Remove entirely]
- "In this guide, we will..." → [Remove entirely]

#### Verbose Explanations
- "In order to accomplish X, you need to Y" → "To X: Y"
- "In order to X, you should Y" → "To X: Y"
- "It is important to note that..." → [Remove phrase, keep content]

#### Step Instructions
- "Step 1: Do this thing" → "- Do this thing"
- "First, you need to..." → "- ..."
- "Next, you should..." → "- ..."

#### Redundant References
- "(as mentioned above)" → [Remove]
- "(see below)" → [Remove]
- "(as previously stated)" → [Remove]

### 5. Compression Guidelines

#### Aggressiveness Level: Moderate
- Target 20-40% size reduction
- Prioritize readability over maximum compression
- Maintain document structure and flow

#### Quality Control
- Ensure compressed version remains fully readable
- Preserve all essential information
- Maintain logical flow and structure
- Test that compressed version serves the same purpose

### 6. File Type Specific Rules

#### Markdown Documents
- Preserve all markdown syntax
- Keep link formatting intact
- Maintain table structures
- Preserve image references

#### Documentation
- Keep procedural steps clear
- Preserve troubleshooting information
- Maintain FAQ structures
- Keep glossaries and definitions

#### Notes & Research
- Preserve citations and references
- Keep research methodology descriptions
- Maintain data and findings
- Preserve analysis and conclusions

## Implementation Notes

- These rules are applied automatically when files are created or updated
- Compressed versions (.aicomp) are generated alongside original files
- The system falls back to original files if compression fails
- Cache rules for 5 minutes to optimize performance
- Vault-specific configuration allows different rules per vault

## Example Transformation

### Before (Original)
```markdown
# Introduction

The purpose of this document is to provide you with a comprehensive guide on how to effectively use the compression system. In this guide, we will walk you through step by step.

## Getting Started

In order to get started with the system, you need to first understand the basic concepts.

Step 1: You should read the documentation carefully
Step 2: You need to configure your settings  
Step 3: Finally, you can begin using the system

It is important to note that you should always backup your files before proceeding.
```

### After (Compressed)
```markdown
# Introduction

Comprehensive guide for using the compression system.

## Getting Started

Basic concepts overview:

- Read documentation carefully
- Configure settings
- Begin using system

Always backup files before proceeding.
```

This example shows a ~60% reduction while preserving all essential information. 