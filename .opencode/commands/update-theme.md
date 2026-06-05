---
description: Update a theme variant — asks which one, edits colors, packages, and installs
agent: theme-builder
---

Ask the user which theme variant they want to update. Read the `contributes.themes` array from the root `package.json` and present the list of available variants via the question tool.

Once the user has chosen a variant and described the color changes they want, do the following:

1. Edit the corresponding theme JSON file in `themes/` to apply the requested color changes. Follow the vscode-themer skill guidelines for color design (dark/light background ranges, accent color limits, accessibility contrast).

2. Ask the user if they want a patch, minor, or major version bump (default: patch). Bump the version in root `package.json`.

3. Run `vsce package` to generate a new `.vsix` file.

4. Run `code --install-extension <path-to-generated-vsix>` to install it.

5. Notify the user:
   > Theme updated and installed! Press `Ctrl+K Ctrl+T` (Windows/Linux) or `Cmd+K Cmd+T` (Mac) to select it.
