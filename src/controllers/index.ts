import express, {type Express} from "express";

import * as services from "@/services/index.js";

import type {Server} from "socket.io";
import type {AppConfig} from "@/types/settings.js";

export function register(app: Express, io: Server, config: AppConfig): void {
  app.use(express.static("public", {
    extensions: ["html"]
  }));

  app.use("/files", express.static(services.files.getFilesDirectory()));

  app.use((request, response) => {
    response.status(404).redirect("/");
  });

  io.on("connection", function(socket) {
    socket.on("LoadSettings", function() {
      const view = services.settings.getSettingsView(config);
      socket.emit("LoadSettings", view.modelData, view.settings, view.disableInput, view.limit);
    });

    socket.on("SaveModel", async function(model: string) {
      const modelInfo = await services.settings.saveModel(model);
      if (modelInfo === null) {
        socket.emit("NotificationAlert", "Unknown model", "That model is not available.", true, false);
        return;
      }
      socket.emit("SaveModel", modelInfo);
    });

    socket.on("SaveKey", async function(key: string) {
      await services.settings.saveKey(key);
    });

    socket.on("ChangeTheme", async function(theme: string) {
      const view = await services.settings.changeTheme(theme, config);
      socket.emit("LoadSettings", view.modelData, view.settings, view.disableInput, view.limit);
    });

    socket.on("ChangeCostCalculatorMode", async function(mode: "pessimistic" | "optimistic") {
      await services.settings.changeCalculatorMode(mode);
    });

    socket.on("LoadChatData", async function() {
      socket.emit("LoadChatData", await services.chat.getGroupedChats());
    });

    socket.on("DeleteChat", async function(uuid: string) {
      await services.chat.deleteChat(uuid);
      socket.emit("ReloadChatData");
    });

    socket.on("RenameChat", async function(uuid: string, newName: string) {
      await services.chat.renameChat(uuid, newName);
      socket.emit("ChangeChatName", uuid, newName);
    });

    socket.on("LoadMessages", async function(uuid: string) {
      const result = await services.chat.loadMessages(uuid);
      socket.emit("LoadMessages", result.messages, result.imageTypes);
    });

    socket.on("SendMessage", async function(message: string, identifier: string, files: string[] = [], reasoningStrength: number) {
      await services.chat.sendMessage(message, identifier, files, reasoningStrength, config, {
        chatInProgress: function() {
          socket.emit("ChatInProgress");
        },
        start: function(text: string, uuid: string, title: string | undefined, files: string[], imageTypes: string[]) {
          socket.emit("StartNewMessage", text, uuid, title, files, imageTypes);
        },
        processing: function(html: string) {
          socket.emit("ProcessingNewMessage", html);
        },
        finish: function(html: string) {
          socket.emit("FinishNewMessage", html);
        },
        alert: function(title: string, message: string, error: boolean, clean: boolean) {
          socket.emit("NotificationAlert", title, message, error, clean);
        }
      });
    });

    socket.on("CalculateCost", async function(uuid: string, message: string, files: string[] = []) {
      const result = await services.chat.calculateCost(uuid, message, files);
      socket.emit("TokenCost", result.tokenCount, result.cost);
    });

    socket.on("FileUpload", async function(file: {name: string, type: string, data: ArrayBuffer}, index: number) {
      if (services.files.isUnsupportedFile(file.name)) {
        socket.emit("UnsupportedType", index);
        return;
      }
      const result = await services.files.saveUpload(file);
      if (result.error !== null) {
        socket.emit("NotificationAlert", "A problem occured", result.error, true, true);
      }
      socket.emit("UploadComplete", result.name, index);
    });

    socket.on("ShowFile", function(file: string) {
      services.files.showInExplorer(file);
    });

    socket.on("ClearUnusedFiles", async function() {
      await services.files.clearUnusedFiles();
      socket.emit("NotificationAlert", "Unused Files Deleted", "All unused files were deleted.", false, false);
    });

    socket.on("ClearAndDeleteAll", async function() {
      await services.files.clearAndDeleteAll();
      socket.emit("NotificationAlert", "All Data Deleted", "All chats and uploaded files were deleted.", false, true);
      socket.emit("ReloadChatData");
    });

  });
}
