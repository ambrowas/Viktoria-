# How to Test This Project

This project did not have a testing framework installed. To verify the recent changes to the game saving logic, I have written a unit test file. To run it, you need to set up a test runner called **Vitest**.

Follow these simple, one-time setup steps:

### 1. Install Testing Libraries

Open your terminal in the project root and run this command. This will add the necessary testing libraries to your `devDependencies` in `package.json`.

```bash
npm install --save-dev vitest jsdom @vitest/ui
```

### 2. Configure Vite for Testing

To make Vitest work with your Vite project, you need to add a reference to it in your `vite.config.mts` file.

Open `vite.config.mts` and modify it to look like this:

```typescript
// vite.config.mts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Add this 'test' section
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts', // Optional: for more complex setup
  },
})
```

*Note: You may need to create an empty setup file if you add that line. You can create an empty file at `src/test/setup.ts`.*

### 3. Add Test Scripts to `package.json`

Open your `package.json` file and add the following `test` scripts to the `"scripts"` section:

```json
{
  "name": "viktoria-gameshow",
  "version": "1.0.0",
  "scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "...": "..."
}
```

### 4. Run the Tests!

Now you can run the tests I created.

Open your terminal and run:

```bash
npm run test
```

You should see output indicating that the tests for `src/services/localGameService.test.ts` have passed. This confirms that the logic for saving, loading, and deleting games from the local filesystem is working correctly.

For a more visual way to see the test results, you can run:
```bash
npm run test:ui
```
And open the link it provides in your browser.
