import fsSync from "fs";
import fs from "fs/promises";
import path from "path";

import type {ReadStream} from "fs";
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

export async function saveSettings(): Promise<void> {
  await fs.writeFile(settingsFile, JSON.stringify(settingsData, null, 2));
}

export function getSettings(): SettingsData {
  return settingsData;
}

export async function updateSettings(patch: Partial<SettingsData>): Promise<void> {
  Object.assign(settingsData, patch);
  await saveSettings();
}

export function getChatOrder(): ChatOrderItem[] {
  return chatOrder;
}

export async function readChat(uuid: string): Promise<Chat> {
  return JSON.parse(await fs.readFile(getChatFile(uuid), "utf8"));
}

export async function reindexChat(uuid: string): Promise<void> {
  chatOrder = chatOrder.filter(chat => chat.uuid !== uuid);
  chatOrder.push({
    uuid: uuid,
    time: (await fs.stat(getChatFile(uuid))).mtime
  });
  chatOrder.sort((a, b) => b.time.getTime() - a.time.getTime());
}

export async function writeChat(uuid: string, chat: Chat): Promise<void> {
  await fs.writeFile(getChatFile(uuid), JSON.stringify(chat, null, 2));
  await reindexChat(uuid);
}

export async function deleteChatFile(uuid: string): Promise<void> {
  await fs.rm(getChatFile(uuid));
  chatOrder = chatOrder.filter(chat => chat.uuid !== uuid);
}

export async function writeBlob(name: string, buffer: Buffer): Promise<void> {
  await fs.writeFile(getBlobPath(name), buffer);
}

export async function readBlobText(name: string): Promise<string> {
  return fs.readFile(getBlobPath(name), {
    encoding: "utf8"
  });
}

export async function readBlobBuffer(name: string): Promise<Buffer> {
  return fs.readFile(getBlobPath(name));
}

export function createBlobStream(name: string): ReadStream {
  return fsSync.createReadStream(getBlobPath(name));
}

export async function deleteBlob(name: string): Promise<void> {
  await fs.rm(getBlobPath(name));
}

export async function listBlobs(): Promise<string[]> {
  return fs.readdir(filesDirectory);
}

export async function listChatFiles(): Promise<string[]> {
  return fs.readdir(dataDirectory);
}

export async function wipeAll(): Promise<void> {
  await fs.rm(dataDirectory, {
    recursive: true,
    force: true
  });

  await fs.mkdir(dataDirectory);
  await fs.mkdir(filesDirectory);

  await saveSettings();

  chatOrder = [];
}

export async function setup(): Promise<void> {
  await fs.mkdir(dataDirectory, {recursive: true});
  try {
    await fs.access(settingsFile);
  }
  catch {
    await fs.writeFile(settingsFile, JSON.stringify(settingsData, null, 2));
  }
  await fs.mkdir(filesDirectory, {recursive: true});

  const files = await fs.readdir(dataDirectory);
  for (let i = 0; i < files.length; i++) {
    if (files[i] === "settings.json" || files[i] === "files") {
      continue;
    }
    chatOrder.push({
      uuid: path.basename(files[i], ".json"),
      time: (await fs.stat(path.join(dataDirectory, files[i]))).mtime
    });
  }
  chatOrder.sort((a, b) => b.time.getTime() - a.time.getTime());

  settingsData = JSON.parse(await fs.readFile(settingsFile, "utf8"));
}
