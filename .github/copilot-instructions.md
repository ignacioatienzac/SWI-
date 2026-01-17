# GitHub Copilot Instructions

## Overview
This document provides guidance for AI coding agents working within this codebase. It outlines the architecture, developer workflows, project-specific conventions, and integration points necessary for effective collaboration.

## Architecture
- The project is structured into several key directories:
  - **components/**: Contains React components used throughout the application.
  - **services/**: Includes service files for handling API interactions and data management.

## Developer Workflows
- Ensure to follow the established coding standards and commit messages.
- Regularly pull the latest changes from the main branch to avoid conflicts.

## Project-Specific Conventions
- Use TypeScript for all new components and services.
- Follow the naming conventions for files and functions as outlined in the project documentation.

## Integration Points
- The project integrates with Google GenAI for AI functionalities. Refer to the `geminiService.ts` for implementation details.
- Ensure that environment variables are set correctly for API keys.

## Additional Resources
- Refer to the `README.md` for setup instructions and additional context on running the application locally.

## Conclusion
This document should be updated regularly to reflect any changes in the project structure or workflows. AI agents are encouraged to contribute to this document as they identify new conventions or integration points.