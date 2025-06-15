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
import {marked} from "marked";
import {Server} from "socket.io";
import {fileURLToPath} from "url";

import {v4 as uuidv4, validate as uuidValidate} from "uuid";

const app = express();

const server = http.Server(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MODEL_DATA = JSON.parse(fs.readFileSync("models.json"));

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

app.get("*", function(request, response) {
  response.sendFile(path.join(process.cwd(), "public", "404.html"));
});

marked.use({
  breaks: true
});

io.on("connection", function(socket) {
  socket.on("LoadSettings", function() {
    socket.emit("LoadSettings", MODEL_DATA, settingsData);
  });
  socket.on("SaveSetting", function(key, data) {
    settingsData[key] = data;
    fs.writeFileSync(path.join(process.cwd(), "data", "settings.json"), JSON.stringify(settingsData, null, 2));
  });
  socket.on("ChangeTheme", function(theme) {
    settingsData.theme = theme;
    fs.writeFileSync(path.join(process.cwd(), "data", "settings.json"), JSON.stringify(settingsData, null, 2));
    socket.emit("LoadSettings", MODEL_DATA, settingsData);
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

      chat["title"] = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", chat.uuid, "chat.json"))).title;

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
  socket.on("LoadMessages", function(uuid) {
    let chat = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", uuid, "chat.json")));

    chat.messages = chat.messages.map(message => ({
      ...message,
      content: message.role === "assistant" ? marked.parse(message.content) : message.content
    }));

    socket.emit("LoadMessages", chat.messages);
  });
  socket.on("SendMessage", function(message, identifier) {
    if (settingsData.apikey === "") {
      socket.emit("Problem", "No API key", "Please go to settings and put it in.", false);
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
      chat = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", identifier, "chat.json")));
      uuid = identifier;
    }
    chat.messages.push({
      "role": "user",
      "content": message
    });

    socket.emit("ChatInProgress");
    const responseSettings = {
      model: settingsData.model,
      input: chat.messages,
      instructions: "You are ChatGPT, a helpful and honest AI assistant."
    };
    if (MODEL_DATA[settingsData.model].temperature) {
      responseSettings.temperature = 0.7;
      responseSettings.top_p = 1.0;
    }
    client.responses.create(responseSettings).then(response => {
      chat.messages.push({
        "role": "assistant",
        "content": response.output_text
      });
      if (!fs.existsSync(path.join(process.cwd(), "data", uuid))) {
        fs.mkdirSync(path.join(process.cwd(), "data", uuid));
      }
      fs.writeFileSync(path.join(process.cwd(), "data", uuid, "chat.json"), JSON.stringify(chat, null, 2));

      chatOrder = chatOrder.filter(chat => chat.uuid !== uuid);
      chatOrder.push({
        uuid: uuid,
        time: fs.statSync(path.join(process.cwd(), "data", uuid, "chat.json")).mtime
      });
      chatOrder.sort((a, b) => b.time - a.time);

      socket.emit("NewMessage", message, marked.parse(response.output_text), uuid);
    }).catch(error => {
      if (error.status === 401) {
        socket.emit("Problem", "Incorrect API key", "Please go to settings and fix your API key.", true);
        return;
      }
      else {
        socket.emit("Problem", "A problem occured", error.message, true);
        console.log(error);
      }
    });

  });
  socket.on("CalculateCost", function(message, uuid) {
    let messages = [];
    if (uuidValidate(uuid)) {
      messages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", uuid, "chat.json"))).messages;
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
        tokenCount += encoder.encode(message[key]).length;
        if (key === "name") {
          tokenCount++;
        }
      }
    }
    encoder.free();

    socket.emit("TokenCost", tokenCount, tokenCount * MODEL_DATA[settingsData.model].cost.input / 1000000);
  })
});

server.listen(PORT, function() {
  console.log(`Listening at specified port...`);
  console.log(`\nOpening app in browser now...`);
  open(`http://localhost:${PORT}`);
  console.log(`If the app has not opened, go to ${chalk.cyanBright(`http://localhost:${PORT}`)} to use the app.`);
});

if (!fs.existsSync(path.join(process.cwd(), "data"))){
  fs.mkdirSync(path.join(process.cwd(), "data"));
}
if (!fs.existsSync(path.join(process.cwd(), "data", "settings.json"))) {
  fs.writeFileSync(path.join(process.cwd(), "data", "settings.json"), JSON.stringify(settingsData, null, 2));
}
fs.readdir(path.join(process.cwd(), "data"), (error, files) => {
  for (let i = 0; i < files.length; i++) {
    if (files[i] === "settings.json") {
      continue;
    }
    if (files[i].endsWith(".json")) {
      const uuid = path.basename(files[i], ".json");
      if (uuidValidate(uuid)) {
        fs.mkdirSync(path.join(process.cwd(), "data", uuid));
        fs.renameSync(path.join(process.cwd(), "data", files[i]), path.join(process.cwd(), "data", uuid, "chat.json"));
        chatOrder.push({
          uuid: uuid,
          time: fs.statSync(path.join(process.cwd(), "data", uuid, "chat.json")).mtime
        });
      }
      continue;
    }
    chatOrder.push({
      uuid: files[i],
      time: fs.statSync(path.join(process.cwd(), "data", files[i], "chat.json")).mtime
    });
  }

  chatOrder.sort((a, b) => b.time - a.time);
});

settingsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "settings.json")));
