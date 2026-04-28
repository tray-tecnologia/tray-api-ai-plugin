#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(process.cwd());

const targets = [
  { path: "package.json", field: "version" },
  { path: ".claude-plugin/plugin.json", field: "version" },
  { path: ".claude-plugin/marketplace.json", field: "metadata.version" },
  { path: ".claude-plugin/marketplace.json", field: "plugins.0.version" },
  { path: ".cursor-plugin/plugin.json", field: "version" },
  { path: ".codex-plugin/plugin.json", field: "version" },
  { path: "gemini-extension.json", field: "version" },
];

function parseJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), "utf-8"));
}

function stringifyJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function parseField(field) {
  return field.split(".").map((segment) => {
    if (/^\d+$/.test(segment)) return Number(segment);
    return segment;
  });
}

function getField(obj, field) {
  let current = obj;
  for (const part of parseField(field)) {
    current = current?.[part];
  }
  return current;
}

function setField(obj, field, value) {
  const parts = parseField(field);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      const next = parts[i + 1];
      current[part] = typeof next === "number" ? [] : {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

function isSemver(value) {
  return /^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/.test(value);
}

function getModeAndVersion(args) {
  if (args.includes("--check")) {
    return { mode: "check", nextVersion: null };
  }

  const setIndex = args.indexOf("--set");
  if (setIndex >= 0 && args[setIndex + 1]) {
    return { mode: "set", nextVersion: args[setIndex + 1] };
  }

  return { mode: "help", nextVersion: null };
}

function printUsage() {
  console.log("Uso:");
  console.log("  node scripts/sync-version.js --check");
  console.log("  node scripts/sync-version.js --set <versao>");
}

function collectVersions() {
  return targets.map(({ path, field }) => {
    const json = parseJson(path);
    return {
      path,
      field,
      value: getField(json, field),
    };
  });
}

function runCheck() {
  const versions = collectVersions();
  const unique = [...new Set(versions.map((entry) => entry.value))];

  console.log("Version check:");
  for (const entry of versions) {
    console.log(`  ${entry.path} (${entry.field}) -> ${entry.value}`);
  }

  if (unique.length > 1) {
    console.error("\nErro: versões divergentes encontradas.");
    process.exit(1);
  }

  console.log(`\nOK: todos os manifests estão na versão ${unique[0]}.`);
}

function runSet(nextVersion) {
  if (!isSemver(nextVersion)) {
    console.error(`Versão inválida: ${nextVersion}`);
    process.exit(1);
  }

  const byFile = new Map();
  for (const target of targets) {
    if (!byFile.has(target.path)) {
      byFile.set(target.path, parseJson(target.path));
    }
    setField(byFile.get(target.path), target.field, nextVersion);
  }

  for (const [path, json] of byFile.entries()) {
    writeFileSync(resolve(ROOT, path), stringifyJson(json), "utf-8");
    console.log(`Atualizado: ${path}`);
  }

  console.log(`\nOK: versão ${nextVersion} aplicada em todos os manifests.`);
}

const { mode, nextVersion } = getModeAndVersion(process.argv.slice(2));

if (mode === "help") {
  printUsage();
  process.exit(0);
}

if (mode === "check") {
  runCheck();
  process.exit(0);
}

runSet(nextVersion);
