import fs from "fs";
import {imageSize} from "image-size";

export const textTypes = [
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

export const imageTypes = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp"
];

export const videoTypes = [
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
  "ts",
  "mts",
  "vob"
];

export const audioTypes = [
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
  "mid"
];

export const spreadsheetTypes = [
  "xls",
  "xlsx",
  "xlsm",
  "ods",
  "xlsb"
];

export const presentationTypes = [
  "ppt",
  "pptx",
  "pps",
  "ppsx",
  "odp"
];

export const archiveTypes = [
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

export const executableTypes = [
  "exe",
  "msi",
  "com",
  "apk",
  "app",
  "deb",
  "rpm",
  "dmg",
  "jar",
  "elf",
  "bin",
  "run"
];

export function formatMessage(message) {
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

export function calculateImageCost(model, path) {
  if (Object.keys(imageToken.smallCategory).includes(model)) {
    const fileDimensions = imageSize(fs.readFileSync(path));
    let rescaleFactor = 1;
    if (Math.ceil(fileDimensions.width / 32) * Math.ceil(fileDimensions.height / 32) > 1536) {
      rescaleFactor = Math.sqrt(32 ** 2 * 1536 / (fileDimensions.width * fileDimensions.height));
      let widthFactor = Math.floor(fileDimensions.width * rescaleFactor / 32) / (fileDimensions.width * rescaleFactor / 32);
      let heightFactor = Math.floor(fileDimensions.height * rescaleFactor / 32) / (fileDimensions.height * rescaleFactor / 32);
      rescaleFactor = rescaleFactor * Math.min(widthFactor, heightFactor);
    }
    return Math.ceil(rescaleFactor * fileDimensions.width / 32) * Math.ceil(rescaleFactor * fileDimensions.height / 32) * (imageToken.smallCategory[model].multiplier ?? 1);
  }
  else if (Object.keys(imageToken.bigCategory).includes(model)) {
    const fileDimensions = imageSize(fs.readFileSync(path));
    if (fileDimensions.width > 2048 || fileDimensions.height > 2048) {
      if (fileDimensions.width > fileDimensions.height) {
        fileDimensions.height = fileDimensions.height * (2048 / fileDimensions.width);
        fileDimensions.width = 2048;
      }
      else {
        fileDimensions.width = fileDimensions.width * (2048 / fileDimensions.height);
        fileDimensions.height = 2048;
      }
    }
    if (fileDimensions.width > fileDimensions.height) {
      fileDimensions.height = fileDimensions.height * (765 / fileDimensions.width);
      fileDimensions.width = 765;
    }
    else {
      fileDimensions.width = fileDimensions.width * (765 / fileDimensions.height);
      fileDimensions.height = 765;
    }
    return Math.ceil(fileDimensions.width / 512) * Math.ceil(fileDimensions.height / 512) * imageToken.bigCategory[model].tile + imageToken.bigCategory[model].base;
  }
  else {
    return null;
  }
}

export const imageToken = {
  smallCategory: {
    "gpt-5-mini": {
      "multiplier": 1.62
    },
    "gpt-5-nano": {
      "multiplier": 2.46
    },
    "gpt-4.1-mini": {
      "multiplier": 1.62
    },
    "gpt-4.1-nano": {
      "multiplier": 2.46
    },
    "o4-mini": {
      "multiplier": 1.72
    }
  },
  bigCategory: {
    "gpt-5": {
      "base": 70,
      "tile": 140
    },
    "gpt-4o": {
      "base": 85,
      "tile": 170
    },
    "gpt-4.1": {
      "base": 85,
      "tile": 170
    },
    "gpt-4o-mini": {
      "base": 2833,
      "tile": 5667
    },
    "gpt-4.5": {
      "base": 85,
      "tile": 170
    },
    "o1": {
      "base": 75,
      "tile": 150
    },
    "o1-pro": {
      "base": 75,
      "tile": 150
    },
    "o3": {
      "base": 75,
      "tile": 150
    },
    "o3-pro": {
      "base": 75,
      "tile": 150
    }
  },
  calculateImageCost
};

export default {
  textTypes,
  imageTypes,
  videoTypes,
  audioTypes,
  spreadsheetTypes,
  presentationTypes,
  archiveTypes,
  executableTypes,
  formatMessage,
  imageToken
};
