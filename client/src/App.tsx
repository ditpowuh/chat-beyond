import {useState, useEffect, useRef} from "react";

import whiteSettingsIcon from "./assets/SettingsWhite.svg";
import blackSettingsIcon from "./assets/SettingsBlack.svg";
import "./app.css";

import Swal from "sweetalert2";
import {useLenis} from "lenis/react";

import Sidebar from "@/components/Sidebar";
import Version from "@/components/Version";
import Settings from "@/components/Settings";
import NewChat from "@/components/NewChat";
import ExistingChat from "@/components/ExistingChat";
import InputArea from "@/components/InputArea";

import {socket} from "@/lib/socket";
import {getImageFromTheme} from "@/lib/utility";

import type {SavedSettings, ModelData} from "@/types/settings";

export type PageType = "Home" | "ExistingChat" | "Settings";

export default function App() {
  const lenis = useLenis();

  const [page, setPage] = useState<PageType>("Home");
  const [chatUUID, setChatUUID] = useState<string>("");
  const [fileSizeLimit, setFileSizeLimit] = useState<number>(1e8);
  const [reasoningEnabled, setReasoningEnabled] = useState<boolean>(false);
  const [settings, setSettings] = useState<SavedSettings>({
    apikey: "",
    theme: "dark",
    model: "gpt-4o"
  });
  const [processingChatInProgress, setProcessingChatInProgress] = useState<boolean>(false);
  const [pagePadding, setPagePadding] = useState<number>(240);
  const chatNameRef = useRef<HTMLInputElement>(null);

  const processing = useRef<boolean>(false);

  useEffect(() => {
    socket.emit("LoadSettings");

    const loadSettings = (models: Record<string, ModelData>, settings: SavedSettings, limit: number) => {
      setSettings(settings);
      setFileSizeLimit(limit);
      for (const model in models) {
        if (model === settings.model) {
          setReasoningEnabled(models[model].reasoning);
          break;
        }
      }
    }
    socket.on("LoadSettings", loadSettings);

    const saveModel = (modelInfo: ModelData) => {
      setReasoningEnabled(modelInfo.reasoning);
    }
    socket.on("SaveModel", saveModel);

    const notificationAlert = (title: string, message: string, error: boolean, clean: boolean) => {
      if (clean) {
        setPage("Home");
      }
      Swal.fire({
        icon: error ? "error" : "success",
        title: title,
        text: message,
        confirmButtonColor: "#666666",
        confirmButtonText: "Okay"
      });
      processing.current = false;
    }
    socket.on("NotificationAlert", notificationAlert);

    const reloadChatData = () => {
      setPage("Home");
    }
    socket.on("ReloadChatData", reloadChatData);

    const chatInProgress = () => {
      setProcessingChatInProgress(true);
      setPage("ExistingChat");
    }
    socket.on("ChatInProgress", chatInProgress);

    const startNewMessage = (originalMessage: string, uuidReceiving: string, title: string, files: string[], imageTypes: string[]) => {
      setProcessingChatInProgress(false);
      setChatUUID(uuidReceiving);
      document.title = `ChatBeyond: ${title}`;
    }
    socket.on("StartNewMessage", startNewMessage);

    return () => {
      socket.off("LoadSettings", loadSettings);
      socket.off("SaveModel", saveModel);
      socket.off("NotificationAlert", notificationAlert);
      socket.off("ReloadChatData", reloadChatData);
      socket.off("ChatInProgress", chatInProgress);
      socket.off("StartNewMessage", startNewMessage);
    }
  }, []);

  useEffect(() => {
    if (page !== "ExistingChat") {
      setChatUUID("");
    }
    if (page === "Home") {
      document.title = "ChatBeyond";
    }
    if (page === "Settings") {
      document.title = "ChatBeyond: Settings";
      lenis!.scrollTo(0, {immediate: true});
    }
  }, [page]);

  useEffect(() => {
    (document.getElementById("theme") as HTMLLinkElement)!.href = `/CSS/${settings.theme}.css`;
  }, [settings]);

  return (
    <>
      <Sidebar setPage={setPage} processing={processing} chatUUID={chatUUID} setChatUUID={setChatUUID} theme={settings.theme}/>
      <div id="topbar" className="undraggable">
        <div>ChatBeyond</div>
        <div className="separator">|</div>
        <img id="settingsicon" className="undraggable" src={getImageFromTheme(settings.theme, {dark: whiteSettingsIcon, light: blackSettingsIcon})} width="32" title="Settings" onClick={(e) => setPage("Settings")}/>
      </div>
      {page === "Home" && <NewChat chatNameRef={chatNameRef}/>}
      {page === "Settings" && <Settings settings={settings} setSettings={setSettings} processing={processing}/>}
      {page === "ExistingChat" && <ExistingChat bottomPadding={pagePadding} processingChatInProgress={processingChatInProgress} setProcessingChatInProgress={setProcessingChatInProgress} processing={processing}/>}
      <InputArea fileSizeLimit={fileSizeLimit} reasoningEnabled={reasoningEnabled} chatUUID={chatUUID} chatNameRef={chatNameRef} processing={processing} currentPage={page} theme={settings.theme} setPagePadding={setPagePadding}/>
      <Version/>
      <link rel="stylesheet" href={`https://unpkg.com/@highlightjs/cdn-assets@11.11.1/styles/atom-one-${settings.theme}.min.css`}/>
    </>
  );
}
