import fs from "fs";

import {imageSize} from "image-size";

export function calculateImageCostByPatch(path: string, multiplier: number, maxPatches: number, mode: "pessimistic" | "optimistic"): number {
  const fileDimensions = imageSize(fs.readFileSync(path));
  if (mode === "optimistic") {
    fileDimensions.width = 512;
    fileDimensions.height = 512;
  }
  let rescaleFactor = 1;
  if (Math.ceil(fileDimensions.width / 32) * Math.ceil(fileDimensions.height / 32) > maxPatches) {
    rescaleFactor = Math.sqrt(32 ** 2 * 1536 / (fileDimensions.width * fileDimensions.height));
    let widthFactor = Math.floor(fileDimensions.width * rescaleFactor / 32) / (fileDimensions.width * rescaleFactor / 32);
    let heightFactor = Math.floor(fileDimensions.height * rescaleFactor / 32) / (fileDimensions.height * rescaleFactor / 32);
    rescaleFactor = rescaleFactor * Math.min(widthFactor, heightFactor);
  }
  return Math.ceil(rescaleFactor * fileDimensions.width / 32) * Math.ceil(rescaleFactor * fileDimensions.height / 32) * (multiplier ?? 1);
}

export function calculateImageCostByTile(path: string, base: number, tile: number, mode: "pessimistic" | "optimistic"): number {
  if (mode === "optimistic") {
    return base;
  }
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
    fileDimensions.height = fileDimensions.height * (768 / fileDimensions.width);
    fileDimensions.width = 768;
  }
  else {
    fileDimensions.width = fileDimensions.width * (768 / fileDimensions.height);
    fileDimensions.height = 768;
  }
  return Math.ceil(fileDimensions.width / 512) * Math.ceil(fileDimensions.height / 512) * tile + base;
}

export function calculateImageCost(model: string, path: string, mode: "pessimistic" | "optimistic" = "pessimistic"): number | null {
  if (Object.keys(patchBasedCategory.fullVariant).includes(model)) {
    return calculateImageCostByPatch(path, patchBasedCategory.fullVariant[model].multiplier, 10000, mode);
  }
  else if (Object.keys(patchBasedCategory.oldVariant).includes(model)) {
    return calculateImageCostByPatch(path, patchBasedCategory.oldVariant[model].multiplier, 1536, mode);
  }
  else if (Object.keys(tileBasedCategory).includes(model)) {
    return calculateImageCostByTile(path, tileBasedCategory[model].base, tileBasedCategory[model].tile, mode);
  }
  else {
    return null;
  }
}

const patchBasedCategory: {fullVariant: Record<string, {multiplier: number}>, oldVariant: Record<string, {multiplier: number}>} = {
  fullVariant: {
    "gpt-5.4": {
      "multiplier": 1.2
    }
  },
  oldVariant: {
    "gpt-5.4-mini": {
      "multiplier": 1.62
    },
    "gpt-5.4-nano": {
      "multiplier": 2.46
    },
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
    },
    "gpt-5.2": {
      "multiplier": 1.62
    }
  }
};

const tileBasedCategory: Record<string, {base: number, tile: number}> = {
  "gpt-5": {
    "base": 70,
    "tile": 140
  },
  "gpt-4o": {
    "base": 85,
    "tile": 170
  },
  "gpt-4o-mini": {
    "base": 2833,
    "tile": 5667
  },
  "gpt-4.1": {
    "base": 85,
    "tile": 170
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
};

export default {
  patchBasedCategory,
  tileBasedCategory,
  calculateImageCost
};
