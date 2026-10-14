import fs from "fs";
import path from "path";

import type {Chat, ChatOrderItem} from "@/types/chat.js";
import type {SettingsData} from "@/types/settings.js";

const dataDirectory = path.join(process.cwd(), "data");
const filesDirectory = path.join(dataDirectory, "files");
const settingsFile = path.join(dataDirectory, "settings.json");

let chatOrder: ChatOrderItem[] = [];

let settingsData: SettingsData = {
  "apikey": "",
  "model": "gpt-4o",
  "theme": "dark",
  "calculatormode": "pessimistic"
};

export function getChatFile(uuid: string): string {
  return path.join(dataDirectory, `${uuid}.json`);
}

export function getBlobPath(name: string): string {
  return path.join(filesDirectory, name);
}

export function getFilesDirectory(): string {
  return filesDirectory;
}

export function saveSettings(): void {
  fs.writeFileSync(settingsFile, JSON.stringify(settingsData, null, 2));
}

export function getSettings(): SettingsData {
  return settingsData;
}

export function updateSettings(patch: Partial<SettingsData>): void {
  Object.assign(settingsData, patch);
  saveSettings();
}

export function getChatOrder(): ChatOrderItem[] {
  return chatOrder;
}

export function readChat(uuid: string): Chat {
  return JSON.parse(fs.readFileSync(getChatFile(uuid), "utf8"));
}

export function reindexChat(uuid: string): void {
  chatOrder = chatOrder.filter(chat => chat.uuid !== uuid);
  chatOrder.push({
    uuid: uuid,
    time: fs.statSync(getChatFile(uuid)).mtime
  });
  chatOrder.sort((a, b) => b.time.getTime() - a.time.getTime());
}

export function writeChat(uuid: string, chat: Chat): void {
  fs.writeFileSync(getChatFile(uuid), JSON.stringify(chat, null, 2));
  reindexChat(uuid);
}

export function deleteChatFile(uuid: string): void {
  fs.rmSync(getChatFile(uuid));
  chatOrder = chatOrder.filter(chat => chat.uuid !== uuid);
}

export function writeBlob(name: string, buffer: Buffer): void {
  fs.writeFileSync(getBlobPath(name), buffer);
}

export function readBlobText(name: string): string {
  return fs.readFileSync(getBlobPath(name), {
    encoding: "utf8"
  });
}

export function readBlobBuffer(name: string): Buffer {
  return fs.readFileSync(getBlobPath(name));
}

export function createBlobStream(name: string): fs.ReadStream {
  return fs.createReadStream(getBlobPath(name));
}

export function deleteBlob(name: string): void {
  fs.rmSync(getBlobPath(name));
}

export function listBlobs(): string[] {
  return fs.readdirSync(filesDirectory);
}

export function listChatFiles(): string[] {
  return fs.readdirSync(dataDirectory);
}

export function wipeAll(): void {
  fs.rmSync(dataDirectory, {
    recursive: true,
    force: true
  });

  fs.mkdirSync(dataDirectory);
  fs.mkdirSync(filesDirectory);

  saveSettings();

  chatOrder = [];
}

export function setup(): void {
  if (!fs.existsSync(dataDirectory)){
    fs.mkdirSync(dataDirectory);
  }
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify(settingsData, null, 2));
  }
  if (!fs.existsSync(filesDirectory)) {
    fs.mkdirSync(filesDirectory);
  }
  fs.readdir(dataDirectory, (error, files) => {
    for (let i = 0; i < files.length; i++) {
      if (files[i] === "settings.json" || files[i] === "files") {
        continue;
      }
      chatOrder.push({
        uuid: path.basename(files[i], ".json"),
        time: fs.statSync(path.join(dataDirectory, files[i])).mtime
      });
    }
    chatOrder.sort((a, b) => b.time.getTime() - a.time.getTime());
  });

  settingsData = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
}
