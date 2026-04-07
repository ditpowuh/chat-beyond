export type SavedSettings = {
  apikey: string;
  theme: string;
  model: string;
  calculatormode: "pessimistic" | "optimistic";
};

export type ModelData = {
  description: string;
  cost: {input: number, output: number};
  temperature: boolean;
  reasoning: boolean;
  web: boolean;
};
