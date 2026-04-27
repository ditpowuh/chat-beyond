import chalk from "chalk";
import {encoding_for_model, get_encoding} from "tiktoken";

import type {Tiktoken, TiktokenModel} from "tiktoken";

import imageToken from "./images.js";

export const textTypes: string[] = [
  "txt",
  "md",
  "markdown",
  "rst",
  "log",
  "csv",
  "tsv",
  "json",
  "xml",
  "yaml",
  "yml",
  "ini",
  "conf",
  "env",
  "tex",
  "toml",
  "bat",
  "sh",
  "ps1",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "py",
  "rb",
  "php",
  "pl",
  "pm",
  "lua",
  "java",
  "kt",
  "kts",
  "groovy",
  "scala",
  "c",
  "h",
  "cpp",
  "cc",
  "cxx",
  "hpp",
  "hxx",
  "cs",
  "vb",
  "fs",
  "fsx",
  "go",
  "rs",
  "swift",
  "dart",
  "sql",
  "r",
  "jl",
  "html",
  "htm",
  "xhtml",
  "css",
  "scss",
  "sass",
  "less",
  "vue",
  "astro",
  "svelte"
];

export const imageTypes: string[] = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp"
];

export const videoTypes: string[] = [
  "mp4",
  "m4v",
  "mov",
  "wmv",
  "avi",
  "flv",
  "webm",
  "mkv",
  "3gp",
  "3g2",
  "mpeg",
  "mpg",
  "ogv",
  "mts",
  "vob"
];

export const audioTypes: string[] = [
  "mp3",
  "wav",
  "aac",
  "ogg",
  "oga",
  "m4a",
  "flac",
  "alac",
  "wma",
  "aiff",
  "amr",
  "opus",
  "midi",
  "mid",
  "flp"
];

export const spreadsheetTypes: string[] = [
  "xls",
  "xlsx",
  "xlsm",
  "ods",
  "xlsb"
];

export const presentationTypes: string[] = [
  "ppt",
  "pptx",
  "pps",
  "ppsx",
  "odp"
];

export const archiveTypes: string[] = [
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "xz",
  "lz",
  "lzma",
  "z",
  "cab",
  "iso",
  "dmg",
  "ar",
  "cpio"
];

export const executableTypes: string[] = [
  "exe",
  "msi",
  "com",
  "apk",
  "app",
  "deb",
  "rpm",
  "jar",
  "elf",
  "bin",
  "run"
];

export const fontTypes: string[] = [
  "ttf",
  "otf",
  "woff",
  "woff2"
];

export function formatMessage(message: string): string {
  const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
  return message.replace(pattern, (match, codeBlock, squareBracket, roundBracket) => {
    if (codeBlock) {
      return codeBlock;
    }
    else if (squareBracket) {
      return `\n$$\n${squareBracket.replace(/\\\\/g, "\\")}\n$$\n`;
    }
    else if (roundBracket) {
      return `$${roundBracket.replace(/\\\\/g, "\\")}$`;
    }
    return match;
  });
}

export function getEncoder(model: string): Tiktoken {
  try {
    return encoding_for_model(model as TiktokenModel);
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.startsWith("Invalid model")) {
        console.log(`${chalk.yellow("Note:")} The currently selected model does not have a verified encoding. "o200k_base" is being used in place, which is likely to be correct for newer models, but if costs are critical, please double check.`);
      }
    }
    try {
      return get_encoding("o200k_base");
    }
    catch (fallbackError: unknown) {
      if (fallbackError instanceof Error) {
        console.error("Fallback encoding failed.");
      }
      throw new Error("Could not initialize fallback encoding.");
    }
  }
}

export default {
  imageToken,
  textTypes,
  imageTypes,
  videoTypes,
  audioTypes,
  spreadsheetTypes,
  presentationTypes,
  archiveTypes,
  executableTypes,
  fontTypes,
  formatMessage,
  getEncoder
};
