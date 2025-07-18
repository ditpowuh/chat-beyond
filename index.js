import "dotenv/config";

import os from "os";
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";

import OpenAI from "openai";
import tiktoken from "tiktoken";
import * as date from "date-fns";
import chalk from "chalk";
import open from "open";
import mammoth from "mammoth";
import readPdf from "pdf-parse/lib/pdf-parse.js";
import {spawn} from "child_process";
import {marked} from "marked";
import {imageSize} from "image-size";
import {Server} from "socket.io";
import {fileURLToPath} from "url";

import utility from "./utility.js";
import modelData from "./models.js";

import {v4 as uuidv4, validate as uuidValidate} from "uuid";

const app = express();

const server = http.Server(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8
});

const PORT = process.env.PORT || 3000;
const OPEN_ON_START = true;
const INSTRUCTIONS = "You are ChatGPT, a large language model that is a helpful and honest AI assistant. You can see images.";

let chatOrder = [];

let settingsData = {
  "apikey": "",
  "model": "gpt-4o",
  "theme": "DARK"
};

process.on("uncaughtException", function(exception) {
  console.log(exception);
});

app.use(express.static("public", {
  extensions: ["html"]
}));
app.use("/files", express.static("data/files"));

app.get("*", function(request, response) {
  response.sendFile(path.join(process.cwd(), "public", "404.html"));
});

marked.use({
  breaks: true
});

io.on("connection", function(socket) {
  socket.on("LoadSettings", function() {
    socket.emit("LoadSettings", modelData, settingsData);
  });
  socket.on("SaveSetting", function(key, data) {
    settingsData[key] = data;
    fs.writeFileSync(path.join(process.cwd(), "data", "settings.json"), JSON.stringify(settingsData, null, 2));
  });
  socket.on("ChangeTheme", function(theme) {
    settingsData.theme = theme;
    fs.writeFileSync(path.join(process.cwd(), "data", "settings.json"), JSON.stringify(settingsData, null, 2));
    socket.emit("LoadSettings", modelData, settingsData);
  });
  socket.on("LoadChatData", function() {
    const now = new Date();

    const grouped = {
      "Today": [],
      "Yesterday": [],
      "Past 7 Days": [],
      "Past 30 Days": []
    };
    for (const chat of chatOrder) {

      chat["title"] = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", `${chat.uuid}.json`))).title;

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

    socket.emit("LoadChatData", grouped);
  });
  socket.on("DeleteChat", function(uuid) {
    fs.rmSync(path.join(process.cwd(), "data", `${uuid}.json`));
    chatOrder = chatOrder.filter(chat => chat.uuid !== uuid);
    socket.emit("ReloadChatData");
  });
  socket.on("LoadMessages", function(uuid) {
    let chat = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", `${uuid}.json`)));

    chat.messages = chat.messages.map(message => ({
      ...message,
      content: message.role === "assistant" ? marked.parse(message.content) : message.content
    }));

    socket.emit("LoadMessages", chat.messages, utility.imageTypes);
  });
  socket.on("SendMessage", async function(message, identifier, files = []) {
    if (settingsData.apikey === "") {
      socket.emit("NotificationAlert", "No API key", "Please go to settings and put it in.", true, false);
      return;
    }
    const client = new OpenAI({apiKey: settingsData.apikey});

    let chat = {};
    let uuid;
    if (!uuidValidate(identifier)) {
      chat = {
        title: identifier,
        messages: []
      };
      uuid = uuidv4();
    }
    else {
      chat = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", `${identifier}.json`)));
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

    socket.emit("ChatInProgress");

    for (let i = 0; i < chat.messages.length; i++) {
      if (chat.messages[i].role === "user") {
        messages[i].content = [
          {
            type: "input_text",
            text: chat.messages[i].content
          }
        ];
        if ("files" in chat.messages[i]) {
          for (let j = 0; j < chat.messages[i].files.length; j++) {
            const fileContent = fs.createReadStream(path.join(process.cwd(), "data", "files", chat.messages[i].files[j]));
            const fileUploadResult = await client.files.create({
              file: fileContent,
              purpose: "user_data"
            });
            if (utility.imageTypes.some(ending => chat.messages[i].files[j].endsWith(`.${ending}`))) {
              messages[i].content.push({
                type: "input_image",
                file_id: fileUploadResult.id
              });
            }
            else {
              if (chat.messages[i].files[j].endsWith(".pdf")) {
                messages[i].content.push({
                  type: "input_file",
                  file_id: fileUploadResult.id
                });
              }
              else if (utility.textTypes.some(ending => chat.messages[i].files[j].endsWith(`.${ending}`))) {
                const text = fs.readFileSync(path.join(process.cwd(), "data", "files", chat.messages[i].files[j]), {
                  encoding: "utf8"
                });
                messages[i].content[0].text += `\nContents of file given:\n${text}`;
              }
              else if (chat.messages[i].files[j].endsWith(".docx") || chat.messages[i].files[j].endsWith(".doc")) {
                const result = await mammoth.extractRawText({
                  path: path.join(process.cwd(), "data", "files", chat.messages[i].files[j])
                });
                messages[i].content[0].text += `\nContents of document given:\n${result.value}`;
              }
            }
          }
          delete messages[i].files;
        }
      }
    }

    const responseSettings = {
      model: settingsData.model,
      input: messages,
      instructions: `${INSTRUCTIONS} Today's date is ${date.format(new Date(), "yyyy-MM-dd")}.`
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
    await client.responses.create(responseSettings).then(async response => {
      chat.messages.push({
        "role": "assistant",
        "content": response.output_text
      });
      fs.writeFileSync(path.join(process.cwd(), "data", `${uuid}.json`), JSON.stringify(chat, null, 2));

      chatOrder = chatOrder.filter(chat => chat.uuid !== uuid);
      chatOrder.push({
        uuid: uuid,
        time: fs.statSync(path.join(process.cwd(), "data", `${uuid}.json`)).mtime
      });
      chatOrder.sort((a, b) => b.time - a.time);

      socket.emit("NewMessage", message, marked.parse(response.output_text), uuid, chat.title, files, utility.imageTypes);

      for (const message in messages) {
        if (typeof message.content === "string") {
          continue;
        }
        for (const content in message.content) {
          if (content.type === "input_image" || content.type === "input_file") {
            await client.files.delete(content.file_id);
          }
        }
      }
    }).catch(error => {
      if (error.status === 401) {
        socket.emit("NotificationAlert", "Incorrect API key", "Please go to settings and fix your API key.", true, true);
        return;
      }
      else {
        socket.emit("NotificationAlert", "A problem occured", error.message, true, true);
        console.log(error);
      }
    });
  });
  socket.on("CalculateCost", async function(uuid, message, files = []) {
    let messages = [];
    if (uuidValidate(uuid)) {
      messages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", `${uuid}.json`))).messages;
    }
    messages.push({
      "role": "user",
      "content": message
    });

    const encoder = tiktoken.encoding_for_model(settingsData.model);

    let tokenCount = 3;
    for (const message of messages) {
      tokenCount += 3;
      for (const key in message) {
        if (key === "files") {
          for (let i = 0; i < message["files"].length; i++) {
            files.push(message["files"][i]);
          }
          continue;
        }
        if (key === "name") {
          tokenCount++;
        }
        tokenCount += encoder.encode(message[key]).length;
      }
    }

    for (let i = 0; i < files.length; i++) {
      if (utility.imageTypes.some(ending => files[i].endsWith(`.${ending}`))) {
        if (["gpt-4.1-mini", "gpt-4.1-nano", "o4-mini"].includes(settingsData.model)) {
          const fileDimensions = imageSize(fs.readFileSync(path.join(process.cwd(), "data", "files", files[i])));
          let widthPatches = Math.floor((fileDimensions.width + 32 - 1) / 32);
          let heightPatches = Math.floor((fileDimensions.height + 32 - 1) / 32);
          if (widthPatches * heightPatches <= 1536) {
            tokenCount += widthPatches * heightPatches;
          }
          else {
            let scaleFactor = Math.sqrt(1536 * (32 ** 2) / (fileDimensions.width * fileDimensions.height));
            fileDimensions.width = fileDimensions.width * scaleFactor;
            fileDimensions.height = fileDimensions.height * scaleFactor;
            if (fileDimensions.width % 1 !== 0) {
              scaleFactor = Math.floor(fileDimensions.width) / fileDimensions.width;
              fileDimensions.width = fileDimensions.width * scaleFactor;
              fileDimensions.height = fileDimensions.height * scaleFactor;
            }
            tokenCount += (fileDimensions.width / 32) * (fileDimensions.height / 32);
          }
        }
        if (["gpt-4o", "gpt-4.1", "gpt-4o-mini"].includes(settingsData.model)) {
          const fileDimensions = imageSize(fs.readFileSync(path.join(process.cwd(), "data", "files", files[i])));
          if (fileDimensions.width > 2048 || fileDimensions.height > 2048) {
            if (fileDimensions.width > fileDimensions.height) {
              fileDimensions.width = 2048;
              fileDimensions.height = fileDimensions.height * (2048 / fileDimensions.width);
            }
            else {
              fileDimensions.height = 2048;
              fileDimensions.width = fileDimensions.width * (2048 / fileDimensions.height);
            }
          }
          if (fileDimensions.width > fileDimensions.height) {
            fileDimensions.width = 765;
            fileDimensions.height = fileDimensions.height * (765 / fileDimensions.width);
          }
          else {
            fileDimensions.height = 765;
            fileDimensions.width = fileDimensions.width * (765 / fileDimensions.height);
          }
          tokenCount += Math.ceil(fileDimensions.width / 512) * Math.ceil(fileDimensions.height / 512) * 170 + 85;
        }
      }
      else if (utility.textTypes.some(ending => files[i].endsWith(`.${ending}`))) {
        const text = fs.readFileSync(path.join(process.cwd(), "data", "files", files[i]), {
          encoding: "utf8"
        });
        tokenCount += encoder.encode(text).length;
      }
      else if (files[i].endsWith(".docx") || files[i].endsWith(".doc")) {
        const result = await mammoth.extractRawText({
          path: path.join(process.cwd(), "data", "files", files[i])
        });
        tokenCount += encoder.encode(result.value).length;
      }
      else if (files[i].endsWith(`.pdf`)) {
        const pdfBuffer = fs.readFileSync(path.join(process.cwd(), "data", "files", files[i]));
        const result = await readPdf(pdfBuffer);
        tokenCount += encoder.encode(result.text).length;
      }
    }

    await encoder.free();

    socket.emit("TokenCost", tokenCount, tokenCount * modelData[settingsData.model].cost.input / 1e6);
  });
  socket.on("FileUpload", function(file, index) {
    if (utility.videoTypes.some(ending => file.name.endsWith(`.${ending}`))) {
      socket.emit("UnsupportedType", index);
      return;
    }
    if (utility.audioTypes.some(ending => file.name.endsWith(`.${ending}`))) {
      socket.emit("UnsupportedType", index);
      return;
    }
    if (utility.spreadsheetTypes.some(ending => file.name.endsWith(`.${ending}`))) {
      socket.emit("UnsupportedType", index);
      return;
    }
    if (utility.presentationTypes.some(ending => file.name.endsWith(`.${ending}`))) {
      socket.emit("UnsupportedType", index);
      return;
    }
    if (utility.archiveTypes.some(ending => file.name.endsWith(`.${ending}`))) {
      socket.emit("UnsupportedType", index);
      return;
    }
    if (utility.executableTypes.some(ending => file.name.endsWith(`.${ending}`))) {
      socket.emit("UnsupportedType", index);
      return;
    }
    const buffer = Buffer.from(file.data);
    const extension = path.extname(file.name);
    const uuidFile = uuidv4();
    fs.writeFileSync(path.join(process.cwd(), "data", "files", uuidFile + extension), buffer, (error) => {
      if (error) {
        socket.emit("NotificationAlert", "A problem occured", error.message, true, true);
        return;
      }
    });
    socket.emit("UploadComplete", uuidFile + extension, index);
  });
  socket.on("ShowFile", function(file) {
    const filePath = path.join(process.cwd(), "data", "files", file);
    if (process.platform === "darwin") {
      open(filePath, {
        reveal: true
      });
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
  });
  socket.on("ClearUnusedFiles", function() {
    let uuidFiles = fs.readdirSync(path.join(process.cwd(), "data", "files"));
    let data = fs.readdirSync(path.join(process.cwd(), "data"));
    for (let i = 0; i < data.length; i++) {
      if (data[i] === "settings.json" || data[i] === "files") {
        continue;
      }
      let chat = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", data[i])));
      for (let j = 0; j < chat.messages.length; j++) {
        if ("files" in chat.messages[j]) {
          for (let k = 0; k < chat.messages[j].files.length; k++) {
            if (uuidFiles.includes(chat.messages[j].files[k])) {
              uuidFiles = uuidFiles.filter(file => file !== chat.messages[j].files[k]);
            }
          }
        }
      }
    }
    for (let i = 0; i < uuidFiles.length; i++) {
      fs.rmSync(path.join(process.cwd(), "data", "files", uuidFiles[i]));
    }
    socket.emit("NotificationAlert", "Unused Files Deleted", "All unused files were deleted.", false, false);
  });
});

server.listen(PORT, function() {
  console.log(`Listening at specified port...`);
  console.log(`\nOpening app in browser now...`);
  if (OPEN_ON_START) {
    open(`http://localhost:${PORT}`);
  }
  console.log(`If the app has not opened, go to ${chalk.cyanBright(`http://localhost:${PORT}`)} to use the app.`);
});

if (!fs.existsSync(path.join(process.cwd(), "data"))){
  fs.mkdirSync(path.join(process.cwd(), "data"));
}
if (!fs.existsSync(path.join(process.cwd(), "data", "settings.json"))) {
  fs.writeFileSync(path.join(process.cwd(), "data", "settings.json"), JSON.stringify(settingsData, null, 2));
}
if (!fs.existsSync(path.join(process.cwd(), "data", "files"))) {
  fs.mkdirSync(path.join(process.cwd(), "data", "files"));
}
fs.readdir(path.join(process.cwd(), "data"), (error, files) => {
  for (let i = 0; i < files.length; i++) {
    if (files[i] === "settings.json" || files[i] === "files") {
      continue;
    }
    chatOrder.push({
      uuid: path.basename(files[i], ".json"),
      time: fs.statSync(path.join(process.cwd(), "data", files[i])).mtime
    });
  }

  chatOrder.sort((a, b) => b.time - a.time);
});

settingsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "settings.json")));
