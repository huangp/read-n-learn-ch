# AGENTS.md - Coding Guidelines for Read & Learn Chinese

## Build & Test Commands

```bash
# Development
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm start               # Start Metro bundler
npm run mock-server     # Start mock API server (localhost:3000)

# Testing
npm test                # Run all Jest tests
npx jest src/utils/__tests__/pagination.test.ts     # Run single test file
npx jest --testNamePattern="should return single page"  # Run single test

# Build
npm run build:dict      # Build dictionary data files
npm run generate:api    # Regenerate API client from OpenAPI spec
```

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** - all code must be type-safe
- Use explicit types for function parameters and return values
- Prefer `interface` over `type` for object definitions
- Use `??` (nullish coalescing) over `||` for defaults

### Naming Conventions
- **Components**: PascalCase (e.g., `HomeScreen`, `ArticleCard`)
- **Functions/Variables**: camelCase (e.g., `loadArticles`, `isLoading`)
- **Interfaces/Types**: PascalCase (e.g., `Article`, `ReadingProgress`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_FONT_SIZE`)
- **Files**: 
  - Components: PascalCase.tsx
  - Utilities/Services: camelCase.ts

### Imports (Order Matters)
1. React imports first
2. Third-party libraries (React Native, Expo)
3. Local imports (relative paths: `../types`, `../services/...`)
4. Type-only imports use inline syntax

### Formatting
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Max line length: ~100-120 characters

### Error Handling
- Use try-catch with descriptive error logging
- Prefix logs with service name: `console.error('[ServiceName] Error:', error)`
- Use async/await pattern throughout
- Leverage optional chaining (`?.`) and nullish coalescing (`??`)

### Comments
- JSDoc for public functions with @param and @returns
- Section dividers: `// ==================== Section Name ====================`
- Inline comments for complex logic only

## Project Structure

```
src/
  components/     # Reusable UI components (PascalCase.tsx)
  screens/        # Screen components (PascalCase.tsx)
  services/       # Business logic only (camelCase.ts)
  utils/          # Helper functions (camelCase.ts)
  types/          # TypeScript interfaces (index.ts)
  store/          # Zustand stores (camelCase.ts)
  hooks/          # Custom React hooks (useHookName.ts)
  api/            # Generated API client (don't edit manually)
  utils/database/ # All database scripts should be created here and used by business service
  __mocks__/      # Jest mocks
```

## Testing

- Tests co-located with source in `__tests__/` subdirectories
- Test files: `*.test.ts` pattern
- Use descriptive test names: `it('should handle empty content', ...)`
- Mock external dependencies (expo-sqlite, etc.)
- Group related tests with `describe()` blocks

## Key Technologies

- **Framework**: Expo SDK 54 + React Native 0.81.5
- **State**: Zustand with persistence
- **Storage**: expo-sqlite + AsyncStorage
- **UI**: React Native Paper
- **Navigation**: React Navigation (Stack)
- **Testing**: Jest 30 + ts-jest

## Environment Variables

Development uses `.env` with `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000`
Production URLs configured in `eas.json` build profiles

## Important Notes

- Dictionary data is bundled and stored in SQLite (offline-first)
- Custom Expo module: `expo-vision-ocr` for OCR functionality
- No ESLint/Prettier configured - rely on TypeScript strict mode
- Regenerate API client with `npm run generate:api` if API spec changes
