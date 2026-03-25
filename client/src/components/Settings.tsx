import styles from "./Settings.module.css";
import {useState, useEffect} from "react";

import Swal from "sweetalert2";

import {socket} from "@/lib/socket";
import {formatToMoney} from "@/lib/utility";

import type {SavedSettings, ModelData} from "@/types/settings";

interface SettingsProps {
  settings: SavedSettings;
  setSettings: React.Dispatch<React.SetStateAction<SavedSettings>>;
  processing: React.RefObject<boolean>;
}

export default function Settings({settings, setSettings, processing}: SettingsProps) {
  const [models, setModels] = useState<Record<string, ModelData>>({});
  const [showKey, setShowKey] = useState<boolean>(false);

  useEffect(() => {
    socket.emit("LoadSettings");

    const loadSettings = (models: Record<string, ModelData>, settings: SavedSettings, limit: number) => {
      setSettings(settings);
      setModels(models);
    }
    socket.on("LoadSettings", loadSettings);

    return () => {
      socket.off("LoadSettings", loadSettings);
    }
  }, []);

  const clearUnusedFiles = () => {
    processing.current = true;
    socket.emit("ClearUnusedFiles");
  }

  const deleteAllFiles = () => {
    Swal.fire({
      icon: "warning",
      title: "Are you sure you want to delete all data?",
      text: "You won't be able to revert this.",
      showCancelButton: true,
      confirmButtonColor: "#c24848",
      cancelButtonColor: "#666666",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        processing.current = true;
        socket.emit("ClearAndDeleteAll");
      }
    });
  }

  const applySetting = (key: string, value: string) => {
    switch (key) {
      case "apikey": {
        setSettings(previous => ({...previous, apikey: value}));
        socket.emit("SaveKey", value);
        break;
      }
      case "theme": {
        setSettings(previous => ({...previous, theme: value}));
        socket.emit("ChangeTheme", value);
        break;
      }
      case "model": {
        setSettings(previous => ({...previous, model: value}));
        socket.emit("SaveModel", value);
        break;
      }
      default: {
        break;
      }
    }
  }

  return (
    <div className={`${styles.settings} content wrapper`}>
      <h2>API Key</h2>
      <p>This is required to use OpenAI's API. Make sure to keep it private!</p>
      <input className={!showKey ? `${styles.apikey} ${styles.hideapi}` : styles.apikey} type="text" placeholder="OpenAI API Key" value={settings.apikey} onChange={(e) => applySetting("apikey", e.target.value)}/>
      <button className={styles.revealapikey} onClick={(e) => setShowKey(previous => !previous)}>{showKey ? "Hide" : "Show"}</button>
      <br/><br/>
      <h2>Clean-up</h2>
      <p>This is to remove any unnecessary files or to reset everything.</p>
      <button id="cleanfiles" className={styles.settingbutton} onClick={clearUnusedFiles}>Remove any unused uploaded files</button>
      <br/>
      <button id="deleteall" className={styles.settingbutton} onClick={deleteAllFiles}>Delete all files and chats</button>
      <br/><br/>
      <h2>Theme</h2>
      <p>Change between themes.</p>
      <select className={styles.themeselection} name="Theme" defaultValue={settings.theme} onChange={(e) => applySetting("theme", e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <br/><br/>
      <h2>Model</h2>
      <p>
        <span>Choose one of the different models. Note that 100 tokens is around 75 words.</span>
        <br/>
        <span className={styles.modelnotice}>For information about models, head to <a href="https://developers.openai.com/api/docs/models" target="_blank" rel="noopener noreferrer">OpenAI's developer documentation</a>.</span>
      </p>
      <div className={styles.models}>
        {
          Object.keys(models).map((key) => (
            <div key={key} className={key === settings.model ? styles.selected : ""} onClick={(e) => applySetting("model", key)}>
              <h3>{key}</h3>
              <p><b>Description</b><br/><span className={styles.description}>{models[key].description}</span></p>
              <p><b>Costs</b><br/>${formatToMoney(models[key].cost.input)} per 1,000,000 tokens for Input<br/>${formatToMoney(models[key].cost.output)} per 1,000,000 tokens for Output</p>
              <p className={styles.small}><b>Web Search</b><br/>{models[key].web ? "Available" : "Not Available"}</p>
              <p className={styles.small}><b>Reasoning</b><br/>{models[key].reasoning ? "Available" : "Not Available"}</p>
            </div>
          ))
        }
      </div>
    </div>
  );
}
