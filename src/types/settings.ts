import type {ModelData} from "./models.js";

export interface SettingsData {
  apikey: string;
  model: string;
  theme: string;
  calculatormode: "pessimistic" | "optimistic";
}

export interface AppConfig {
  fileSizeLimit: number;
  instructions: string;
  envApiKey: string | null;
}

export interface SettingsView {
  modelData: Record<string, ModelData>;
  settings: SettingsData;
  disableInput: boolean;
  limit: number;
}
