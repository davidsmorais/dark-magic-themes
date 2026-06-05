#!/usr/bin/env node
/**
 * VSCode Theme Builder
 *
 * Commands:
 *   node theme-builder.js init <theme-id> <theme-name> [--type dark|light]
 *       Copy template and initialize a new theme
 *
 *   node theme-builder.js merge <theme-id>
 *       Merge parts/*.json into themes/<theme-id>-color-theme.json
 *
 *   node theme-builder.js package <theme-id>
 *       Package as .vsix file
 *
 *   node theme-builder.js bump <theme-id> [patch|minor|major]
 *       Increment version
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const TEMPLATE_DIR = path.join(__dirname, "template");
const BASE_DIR = process.cwd();

function getThemeDir(themeId) {
	return path.join(BASE_DIR, themeId);
}

function copyDir(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

function replaceInFile(filePath, replacements) {
	let content = fs.readFileSync(filePath, "utf8");
	for (const [key, value] of Object.entries(replacements)) {
		content = content.replace(new RegExp(key, "g"), value);
	}
	fs.writeFileSync(filePath, content);
}

function initTheme(themeId, themeName, type = "dark") {
	const themeDir = getThemeDir(themeId);

	if (fs.existsSync(themeDir)) {
		console.error(`Theme directory already exists: ${themeDir}`);
		process.exit(1);
	}

	// Copy template
	copyDir(TEMPLATE_DIR, themeDir);

	// Determine uiTheme and themeType
	const uiTheme = type === "light" ? "vs" : "vs-dark";
	const themeType = type === "light" ? "light" : "dark";

	// Replace placeholders in package.json
	const packageJsonPath = path.join(themeDir, "package.json");
	replaceInFile(packageJsonPath, {
		"{{THEME_ID}}": themeId,
		"{{THEME_NAME}}": themeName,
		"{{THEME_DESCRIPTION}}": `${themeName} - Custom VSCode Theme`,
		"{{UI_THEME}}": uiTheme,
	});

	// Replace placeholders in base.json
	const baseJsonPath = path.join(themeDir, "parts", "base.json");
	replaceInFile(baseJsonPath, {
		"{{THEME_NAME}}": themeName,
	});

	// Update type in base.json
	const baseJson = JSON.parse(fs.readFileSync(baseJsonPath, "utf8"));
	baseJson.type = themeType;
	fs.writeFileSync(baseJsonPath, JSON.stringify(baseJson, null, 2));

	console.log(`Initialized theme: ${themeName}`);
	console.log(`Directory: ${themeDir}`);
	console.log(`Type: ${type}`);
	console.log(
		`\nEdit the files in ${themeDir}/parts/ to customize your theme.`,
	);
}

function mergeTheme(themeId) {
	const themeDir = getThemeDir(themeId);
	const partsDir = path.join(themeDir, "parts");

	if (!fs.existsSync(partsDir)) {
		console.error(`Theme "${themeId}" not found or parts directory missing.`);
		process.exit(1);
	}

	// Load base
	const base = JSON.parse(
		fs.readFileSync(path.join(partsDir, "base.json"), "utf8"),
	);

	// Load and merge colors
	const colors = {};
	const colorFiles = [
		"colors-editor.json",
		"colors-ui.json",
		"colors-terminal.json",
	];

	for (const file of colorFiles) {
		const filePath = path.join(partsDir, file);
		if (fs.existsSync(filePath)) {
			const fileColors = JSON.parse(fs.readFileSync(filePath, "utf8"));
			Object.assign(colors, fileColors);
		}
	}

	// Load tokens
	const tokensPath = path.join(partsDir, "tokens.json");
	const tokenColors = fs.existsSync(tokensPath)
		? JSON.parse(fs.readFileSync(tokensPath, "utf8"))
		: [];

	// Load semantic tokens
	const semanticPath = path.join(partsDir, "semantic.json");
	const semanticTokenColors = fs.existsSync(semanticPath)
		? JSON.parse(fs.readFileSync(semanticPath, "utf8"))
		: {};

	// Build final theme
	const theme = {
		name: base.name,
		type: base.type,
		semanticHighlighting: base.semanticHighlighting,
		colors,
		tokenColors,
	};

	// Only include semanticTokenColors if not empty
	if (Object.keys(semanticTokenColors).length > 0) {
		theme.semanticTokenColors = semanticTokenColors;
	}

	// Write theme file
	const themesDir = path.join(themeDir, "themes");
	fs.mkdirSync(themesDir, { recursive: true });
	const themePath = path.join(themesDir, `${themeId}-color-theme.json`);
	fs.writeFileSync(themePath, JSON.stringify(theme, null, 2));

	console.log(`Merged theme: ${themePath}`);
	return themePath;
}

function packageTheme(themeId) {
	const themeDir = getThemeDir(themeId);
	const packageJsonPath = path.join(themeDir, "package.json");

	if (!fs.existsSync(packageJsonPath)) {
		console.error(`Theme "${themeId}" not found.`);
		process.exit(1);
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const version = packageJson.version;

	try {
		execSync("vsce package", { cwd: themeDir, stdio: "inherit" });
		const vsixPath = path.join(themeDir, `${themeId}-${version}.vsix`);
		console.log(`\nPackaged: ${vsixPath}`);
		return vsixPath;
	} catch (error) {
		console.error("Failed to package theme:", error.message);
		process.exit(1);
	}
}

function bumpVersion(themeId, level = "patch") {
	const themeDir = getThemeDir(themeId);
	const packageJsonPath = path.join(themeDir, "package.json");

	if (!fs.existsSync(packageJsonPath)) {
		console.error(`Theme "${themeId}" not found.`);
		process.exit(1);
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const [major, minor, patch] = packageJson.version.split(".").map(Number);

	let newVersion;
	switch (level) {
		case "major":
			newVersion = `${major + 1}.0.0`;
			break;
		case "minor":
			newVersion = `${major}.${minor + 1}.0`;
			break;
		default:
			newVersion = `${major}.${minor}.${patch + 1}`;
	}

	packageJson.version = newVersion;
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

	console.log(`Version updated: ${newVersion}`);
	return newVersion;
}

function showHelp() {
	console.log(`
VSCode Theme Builder

Commands:
  init <theme-id> <theme-name> [--type dark|light]
      Copy template and initialize a new theme
      Example: node theme-builder.js init ocean-blue "Ocean Blue" --type dark

  merge <theme-id>
      Merge parts/*.json into the final theme file
      Example: node theme-builder.js merge ocean-blue

  package <theme-id>
      Package as .vsix file
      Example: node theme-builder.js package ocean-blue

  bump <theme-id> [patch|minor|major]
      Increment version (default: patch)
      Example: node theme-builder.js bump ocean-blue minor

Workflow:
  1. node theme-builder.js init my-theme "My Theme" --type dark
  2. Edit my-theme/parts/*.json files
  3. node theme-builder.js merge my-theme
  4. node theme-builder.js package my-theme
  5. code --install-extension my-theme/my-theme-0.0.1.vsix
`);
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
	case "init": {
		const themeId = args[1];
		const themeName = args[2];
		const typeIndex = args.indexOf("--type");
		const type = typeIndex >= 0 ? args[typeIndex + 1] : "dark";

		if (!themeId || !themeName) {
			console.error("Usage: init <theme-id> <theme-name> [--type dark|light]");
			process.exit(1);
		}
		initTheme(themeId, themeName, type);
		break;
	}

	case "merge": {
		const themeId = args[1];
		if (!themeId) {
			console.error("Usage: merge <theme-id>");
			process.exit(1);
		}
		mergeTheme(themeId);
		break;
	}

	case "package": {
		const themeId = args[1];
		if (!themeId) {
			console.error("Usage: package <theme-id>");
			process.exit(1);
		}
		packageTheme(themeId);
		break;
	}

	case "bump": {
		const themeId = args[1];
		const level = args[2] || "patch";
		if (!themeId) {
			console.error("Usage: bump <theme-id> [patch|minor|major]");
			process.exit(1);
		}
		bumpVersion(themeId, level);
		break;
	}
	default:
		showHelp();
		break;
}
