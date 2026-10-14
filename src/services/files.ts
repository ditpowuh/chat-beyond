import path from "path";

import open from "open";
import {spawn} from "child_process";

import {v4 as uuidv4} from "uuid";

import utility from "../lib/utility.js";

import * as storage from "../storage/index.js";

export function isUnsupportedFile(name: string): boolean {
  if (utility.videoTypes.some(ending => name.endsWith(`.${ending}`))) {
    return true;
  }
  if (utility.audioTypes.some(ending => name.endsWith(`.${ending}`))) {
    return true;
  }
  if (utility.spreadsheetTypes.some(ending => name.endsWith(`.${ending}`))) {
    return true;
  }
  if (utility.presentationTypes.some(ending => name.endsWith(`.${ending}`))) {
    return true;
  }
  if (utility.archiveTypes.some(ending => name.endsWith(`.${ending}`))) {
    return true;
  }
  if (utility.executableTypes.some(ending => name.endsWith(`.${ending}`))) {
    return true;
  }
  if (utility.fontTypes.some(ending => name.endsWith(`.${ending}`))) {
    return true;
  }
  if (name.endsWith(".heic")) {
    return true;
  }
  return false;
}

export function saveUpload(file: {name: string, type: string, data: ArrayBuffer}): {name: string, error: string | null} {
  const buffer = Buffer.from(file.data);
  const extension = path.extname(file.name);

  const uuidFile = uuidv4();

  let error: string | null = null;
  try {
    storage.writeBlob(uuidFile + extension, buffer);
  }
  catch (caughtError) {
    if (caughtError instanceof Error) {
      error = caughtError.message;
    }
  }
  return {
    name: uuidFile + extension,
    error: error
  };
}

export function getFilesDirectory(): string {
  return storage.getFilesDirectory();
}

export function showInExplorer(file: string): void {
  const filePath = storage.getBlobPath(file);
  if (process.platform === "darwin") {
    open(filePath);
  }
  else if (process.platform === "win32") {
    spawn("explorer.exe", [`/select,${filePath}`], {
      detached: true,
      stdio: "ignore"
    }).unref();
  }
  else {
    open(path.dirname(filePath));
  }
}

export function clearUnusedFiles(): void {
  let uuidFiles = storage.listBlobs();
  const data = storage.listChatFiles();
  for (let i = 0; i < data.length; i++) {
    if (data[i] === "settings.json" || data[i] === "files") {
      continue;
    }
    const chat = storage.readChat(path.basename(data[i], ".json"));
    for (let j = 0; j < chat.messages.length; j++) {
      if ("files" in chat.messages[j]) {
        for (let k = 0; k < chat.messages[j].files!.length; k++) {
          if (uuidFiles.includes(chat.messages[j].files![k])) {
            uuidFiles = uuidFiles.filter(file => file !== chat.messages[j].files![k]);
          }
        }
      }
    }
  }
  for (let i = 0; i < uuidFiles.length; i++) {
    storage.deleteBlob(uuidFiles[i]);
  }
}

export function clearAndDeleteAll(): void {
  storage.wipeAll();
}
