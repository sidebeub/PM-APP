# Cursor Guide for Project Management

This guide explains how to use Cursor effectively with our project management application, including tracking issues and dependencies.

## Documentation Tools

We've set up several tools to help maintain documentation and track issues:

1. **ISSUES_AND_SOLUTIONS.md** - Tracks issues and their solutions
2. **DEPENDENCIES.md** - Tracks component and module dependencies
3. **update-docs.js** - Script to automatically update documentation
4. **.cursor-settings.json** - Cursor-specific settings

## Best Practices for Issue Tracking

### When to Update the Issues File

1. **After fixing a bug**: Add the issue and solution to the appropriate section
2. **When implementing a new feature**: Document any challenges faced
3. **When refactoring code**: Note any architectural decisions
4. **When optimizing performance**: Document the improvements made

### How to Update the Issues File

1. Open `ISSUES_AND_SOLUTIONS.md`
2. Navigate to the appropriate section
3. Add a new row to the "Issues and Solutions" table with:
   - Issue description
   - Solution implemented
   - Current date
   - Status (✅ Resolved, 🔄 In Progress, ❌ Blocked)

### Example

```markdown
| Issue | Solution | Date | Status |
|-------|----------|------|--------|
| Task status values inconsistent | Updated TaskStatus enum to match database | 2024-04-15 | ✅ Resolved |
```

## Best Practices for Dependency Tracking

### When to Update the Dependencies File

1. **When creating a new component**: Document its dependencies
2. **When modifying an existing component**: Update its dependencies
3. **When refactoring code**: Update the dependency relationships
4. **When adding new API endpoints**: Document which components use them

### How to Update the Dependencies File

1. Open `DEPENDENCIES.md`
2. Navigate to the appropriate section
3. Update the component or module information with:
   - Files it depends on
   - Components that use it
   - API endpoints it interacts with

### Example

```markdown
### TaskList Component
- **File**: `src/pages/TaskList.tsx`
- **Depends on**:
  - `src/types/index.ts` - For Task types
  - `src/store/tasksSlice.ts` - For Redux actions
- **Used by**:
  - `src/App.tsx` - As a route component
```

## Using the Documentation Update Script

We've added a script to help update documentation automatically:

```bash
# Update all documentation
npm run docs:update

# Update only issues
npm run docs:update:issues

# Update only dependencies
npm run docs:update:dependencies
```

## Cursor-Specific Settings

The `.cursor-settings.json` file contains settings for Cursor to help with documentation:

```json
{
  "issueTracking": {
    "autoUpdateIssuesFile": true,
    "issuesFilePath": "ISSUES_AND_SOLUTIONS.md"
  },
  "dependencyTracking": {
    "enabled": true,
    "dependencyFilePath": "DEPENDENCIES.md"
  }
}
```

## Workflow for Making Changes

1. **Before making changes**:
   - Check `DEPENDENCIES.md` to understand what components might be affected
   - Review `ISSUES_AND_SOLUTIONS.md` for similar issues that have been solved

2. **While making changes**:
   - Keep the documentation files open in separate tabs
   - Update them as you identify issues or dependencies

3. **After making changes**:
   - Run `npm run docs:update` to automatically update documentation
   - Review the changes to ensure they're accurate
   - Commit both code and documentation changes together

## Using Cursor's AI Features

Cursor's AI features can help with documentation:

1. **Ask for help with documentation**: "Help me update the ISSUES_AND_SOLUTIONS.md file for this bug fix"
2. **Generate dependency documentation**: "Document the dependencies for this new component"
3. **Review code changes**: "Review these changes and suggest documentation updates"

## Conclusion

By following these practices, we can maintain accurate documentation that helps the team understand the codebase, track issues, and make informed decisions about changes. 