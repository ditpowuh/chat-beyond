export type SavedSettings = {
  apikey: string;
  theme: string;
  model: string;
};

export type ModelData = {
  description: string;
  cost: {input: number, output: number};
  temperature: boolean;
  reasoning: boolean;
  web: boolean;
};
