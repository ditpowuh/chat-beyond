import "dotenv/config";

import express from "express";
import http from "http";

import chalk from "chalk";
import {Server} from "socket.io";

import * as controllers from "./controllers/index.js";
import * as storage from "./storage/index.js";

import type {AppConfig} from "./types/settings.js";

const PORT: number = Number(process.env.PORT) || 3000;

const config: AppConfig = {
  fileSizeLimit: Number(process.env.FILE_SIZE_LIMIT) || 1e8,
  instructions: process.env.INSTRUCTIONS || "You are ChatGPT, a large language model that is a helpful and honest AI assistant. You can see images.",
  envApiKey: process.env.API_KEY || null
};

process.on("uncaughtException", function(exception) {
  console.log(exception);
});

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: config.fileSizeLimit
});

storage.setup();

controllers.register(app, io, config);

server.listen(PORT, function() {
  console.log(`Listening at specified port...`);
  console.log(`Open ${chalk.cyanBright(`http://localhost:${PORT}`)} to use the app.`);
});
