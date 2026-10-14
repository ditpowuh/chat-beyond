import modelData from "../models.js";

import * as storage from "../storage/index.js";

import type {AppConfig, SettingsView} from "../types/settings.js";

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

export function saveModel(model: string) {
  storage.updateSettings({
    model: model
  });
  return modelData[model];
}

export function saveKey(key: string): void {
  storage.updateSettings({
    apikey: key
  });
}

export function changeTheme(theme: string, config: AppConfig): SettingsView {
  storage.updateSettings({
    theme: theme.toLowerCase()
  });
  return getSettingsView(config);
}

export function changeCalculatorMode(mode: "pessimistic" | "optimistic"): void {
  storage.updateSettings({
    calculatormode: mode
  });
}
