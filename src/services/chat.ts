import OpenAI from "openai";

import * as date from "date-fns";
import * as unpdf from "unpdf";

import mammoth from "mammoth";

import markedKatex from "marked-katex-extension";
import {marked} from "marked";

import {v4 as uuidv4, validate as uuidValidate} from "uuid";

import utility from "@/lib/utility.js";
import modelData from "@/models.js";

import * as storage from "@/storage/index.js";

import type {Message, Chat, ChatOrderItem, StreamHandlers} from "@/types/chat.js";
import type {AppConfig} from "@/types/settings.js";

marked.use({breaks: true}, markedKatex({
  nonStandard: true
}));

export function getGroupedChats(): Record<string, ChatOrderItem[]> {
  const chatOrder = storage.getChatOrder();
  const now = new Date();

  const grouped: Record<string, ChatOrderItem[]> = {
    "Today": [],
    "Yesterday": [],
    "Past 7 Days": [],
    "Past 30 Days": []
  };
  for (const chat of chatOrder) {
    chat["title"] = storage.readChat(chat.uuid).title;

    const chatTime = new Date(chat.time);
    if (date.isToday(chatTime)) {
      grouped["Today"].push(chat);
    }
    else if (date.isYesterday(chatTime)) {
      grouped["Yesterday"].push(chat);
    }
    else if (date.isAfter(chatTime, date.subDays(now, 7))) {
      grouped["Past 7 Days"].push(chat);
    }
    else if (date.isAfter(chatTime, date.subDays(now, 30))) {
      grouped["Past 30 Days"].push(chat);
    }
    else {
      const key = date.format(chatTime, "MMMM yyyy");
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(chat);
    }
  }

  for (const category in grouped) {
    if (grouped[category].length === 0) {
      delete grouped[category];
    }
  }

  return grouped;
}

export function deleteChat(uuid: string): void {
  storage.deleteChatFile(uuid);
}

export function renameChat(uuid: string, newName: string): void {
  const chat = storage.readChat(uuid);
  chat.title = newName;
  storage.writeChat(uuid, chat);
}

export function loadMessages(uuid: string): {messages: Message[], imageTypes: string[]} {
  const chat = storage.readChat(uuid);

  const messages = chat.messages.map((message: Message) => ({
    ...message,
    content: message.role === "assistant" ? marked.parse(utility.formatMessage(message.content)) as string : message.content
  }));

  return {
    messages: messages,
    imageTypes: utility.imageTypes
  };
}

export async function sendMessage(message: string, identifier: string, files: string[] = [], reasoningStrength: number, config: AppConfig, handlers: StreamHandlers): Promise<void> {
  const settingsData = storage.getSettings();
  if (settingsData.apikey === "") {
    handlers.alert("No API key", "Please go to settings and put it in.", true, false);
    return;
  }
  const client = new OpenAI({apiKey: config.envApiKey === null ? settingsData.apikey : config.envApiKey});

  let chat: Chat = {
    messages: []
  };
  let uuid: string;
  if (!uuidValidate(identifier)) {
    chat = {
      ...chat,
      title: identifier
    };
    uuid = uuidv4();
  }
  else {
    chat = storage.readChat(identifier);
    uuid = identifier;
  }
  if (files.length === 0) {
    chat.messages.push({
      "role": "user",
      "content": message
    });
  }
  else {
    chat.messages.push({
      "role": "user",
      "content": message,
      "files": files
    });
  }

  const messages = JSON.parse(JSON.stringify(chat)).messages;

  handlers.chatInProgress();

  for (let i = 0; i < chat.messages.length; i++) {
    if (chat.messages[i].role === "user") {
      messages[i].content = [
        {
          type: "input_text",
          text: chat.messages[i].content
        }
      ];
      const files: string[] | undefined = chat.messages[i].files;
      if (files) {
        for (let j = 0; j < files.length; j++) {
          const fileContent = storage.createBlobStream(files[j]);
          const fileUploadResult = await client.files.create({
            file: fileContent,
            purpose: "user_data"
          });
          if (utility.imageTypes.some(ending => files[j].endsWith(`.${ending}`))) {
            messages[i].content.push({
              type: "input_image",
              file_id: fileUploadResult.id
            });
          }
          else {
            if (files[j].endsWith(".pdf")) {
              messages[i].content.push({
                type: "input_file",
                file_id: fileUploadResult.id
              });
            }
            else if (utility.textTypes.some(ending => files[j].endsWith(`.${ending}`))) {
              const text = storage.readBlobText(files[j]);
              messages[i].content[0].text += `\nContents of file given:\n${text}`;
            }
            else if (files[j].endsWith(".docx") || files[j].endsWith(".doc")) {
              const result = await mammoth.extractRawText({
                path: storage.getBlobPath(files[j])
              });
              messages[i].content[0].text += `\nContents of document given:\n${result.value}`;
            }
          }
        }
        delete messages[i].files;
      }
    }
  }

  const responseSettings: OpenAI.Responses.ResponseCreateParamsStreaming = {
    model: settingsData.model,
    input: messages,
    instructions: `${config.instructions} Today's date is ${date.format(new Date(), "yyyy-MM-dd")}.`,
    stream: true
  };
  if (modelData[settingsData.model].temperature) {
    responseSettings.temperature = 0.7;
    responseSettings.top_p = 1.0;
  }
  if (modelData[settingsData.model].web) {
    responseSettings.tools = [{
      type: "web_search_preview"
    }];
  }
  if (modelData[settingsData.model].reasoning) {
    switch (reasoningStrength) {
      case 1:
        responseSettings.reasoning = {
          effort: "low"
        };
        break;
      case 2:
        responseSettings.reasoning = {
          effort: "medium"
        };
        break;
      case 3:
        responseSettings.reasoning = {
          effort: "high"
        };
        break;
    }
  }
  await client.responses.create(responseSettings).then(async (stream) => {
    let response: string =  "";
    let started: boolean = false;

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        if (!started) {
          handlers.start(message, uuid, chat.title, files, utility.imageTypes);
          started = true;
        }
        response += event.delta;
        handlers.processing(marked.parse(utility.formatMessage(response)) as string);
      }
      else if (event.type === "response.completed") {
        chat.messages.push({
          "role": "assistant",
          "content": response
        });
        storage.writeChat(uuid, chat);

        handlers.finish(marked.parse(utility.formatMessage(response)) as string);
      }
    }

    for (const message of messages) {
      if (typeof message.content === "string") {
        continue;
      }
      for (const content of message.content) {
        if (content.type === "input_image" || content.type === "input_file") {
          await client.files.delete(content.file_id);
        }
      }
    }
  }).catch((error) => {
    if (error.status === 401) {
      handlers.alert("Incorrect API key", "Please go to settings and fix your API key.", true, true);
      return;
    }
    else {
      handlers.alert("A problem occured", error.message, true, true);
      console.log(error);
    }
  });
}

export async function calculateCost(uuid: string, message: string, files: string[] = []): Promise<{tokenCount: number, cost: number}> {
  const settingsData = storage.getSettings();
  let messages: Message[] = [];
  if (uuidValidate(uuid)) {
    messages = storage.readChat(uuid).messages;
  }
  messages.push({
    "role": "user",
    "content": message
  });

  const encoder = utility.getEncoder(settingsData.model);

  let tokenCount: number = 3;
  for (const message of messages) {
    tokenCount += 3;
    for (const key in message) {
      if (key === "files") {
        if (message["files"]) {
          for (let i = 0; i < message["files"].length; i++) {
            files.push(message["files"][i]);
          }
          continue;
        }
      }
      if (key === "name") {
        tokenCount++;
      }
      tokenCount += encoder.encode(message[key as keyof Message] as string).length;
    }
  }

  for (let i = 0; i < files.length; i++) {
    if (utility.imageTypes.some(ending => files[i].endsWith(`.${ending}`))) {
      const imageTokenCost: number | null = utility.imageToken.calculateImageCost(settingsData.model, storage.getBlobPath(files[i]), settingsData.calculatormode);
      if (imageTokenCost !== null) {
        tokenCount += imageTokenCost;
      }
    }
    else if (utility.textTypes.some(ending => files[i].endsWith(`.${ending}`))) {
      const text = storage.readBlobText(files[i]);
      tokenCount += encoder.encode(text).length;
    }
    else if (files[i].endsWith(".docx") || files[i].endsWith(".doc")) {
      const result = await mammoth.extractRawText({
        path: storage.getBlobPath(files[i])
      });
      tokenCount += encoder.encode(result.value).length;
    }
    else if (files[i].endsWith(".pdf")) {
      const pdfBuffer = storage.readBlobBuffer(files[i]);
      const pdf = await unpdf.getDocumentProxy(new Uint8Array(pdfBuffer));
      const result = await unpdf.extractText(pdf, {mergePages: true});
      tokenCount += encoder.encode(result.text).length;
    }
  }

  await encoder.free();

  return {
    tokenCount: tokenCount,
    cost: tokenCount * modelData[settingsData.model].cost.input / 1e6
  };
}
