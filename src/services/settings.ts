import modelData from "@/models.js";

import * as storage from "@/storage/index.js";

import type {AppConfig, SettingsView} from "@/types/settings.js";
import type {ModelData} from "@/types/models.js";

export function getSettingsView(config: AppConfig): SettingsView {
  const settingsData = storage.getSettings();
  const settingsDataEmitted = {
    ...settingsData,
    ...(config.envApiKey !== null && {apikey: ""})
  };
  return {
    modelData: modelData,
    settings: settingsDataEmitted,
    disableInput: config.envApiKey !== null,
    limit: config.fileSizeLimit
  };
}

export async function saveModel(model: string): Promise<ModelData | null> {
  if (modelData[model] === undefined) {
    return null;
  }
  await storage.updateSettings({
    model: model
  });
  return modelData[model];
}

export async function saveKey(key: string): Promise<void> {
  await storage.updateSettings({
    apikey: key
  });
}

export async function changeTheme(theme: string, config: AppConfig): Promise<SettingsView> {
  await storage.updateSettings({
    theme: theme.toLowerCase()
  });
  return getSettingsView(config);
}

export async function changeCalculatorMode(mode: "pessimistic" | "optimistic"): Promise<void> {
  await storage.updateSettings({
    calculatormode: mode
  });
}
