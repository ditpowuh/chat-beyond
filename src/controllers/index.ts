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

    socket.on("SaveModel", function(model: string) {
      socket.emit("SaveModel", services.settings.saveModel(model));
    });

    socket.on("SaveKey", function(key: string) {
      services.settings.saveKey(key);
    });

    socket.on("ChangeTheme", function(theme: string) {
      const view = services.settings.changeTheme(theme, config);
      socket.emit("LoadSettings", view.modelData, view.settings, view.disableInput, view.limit);
    });

    socket.on("ChangeCostCalculatorMode", function(mode: "pessimistic" | "optimistic") {
      services.settings.changeCalculatorMode(mode);
    });

    socket.on("LoadChatData", function() {
      socket.emit("LoadChatData", services.chat.getGroupedChats());
    });

    socket.on("DeleteChat", function(uuid: string) {
      services.chat.deleteChat(uuid);
      socket.emit("ReloadChatData");
    });

    socket.on("RenameChat", function(uuid: string, newName: string) {
      services.chat.renameChat(uuid, newName);
      socket.emit("ChangeChatName", uuid, newName);
    });

    socket.on("LoadMessages", function(uuid: string) {
      const result = services.chat.loadMessages(uuid);
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

    socket.on("FileUpload", function(file: {name: string, type: string, data: ArrayBuffer}, index: number) {
      if (services.files.isUnsupportedFile(file.name)) {
        socket.emit("UnsupportedType", index);
        return;
      }
      const result = services.files.saveUpload(file);
      if (result.error !== null) {
        socket.emit("NotificationAlert", "A problem occured", result.error, true, true);
      }
      socket.emit("UploadComplete", result.name, index);
    });

    socket.on("ShowFile", function(file: string) {
      services.files.showInExplorer(file);
    });

    socket.on("ClearUnusedFiles", function() {
      services.files.clearUnusedFiles();
      socket.emit("NotificationAlert", "Unused Files Deleted", "All unused files were deleted.", false, false);
    });

    socket.on("ClearAndDeleteAll", function() {
      services.files.clearAndDeleteAll();
      socket.emit("NotificationAlert", "Unused Files Deleted", "All chats and uploaded files were delete.", false, true);
      socket.emit("ReloadChatData");
    });

  });
}
