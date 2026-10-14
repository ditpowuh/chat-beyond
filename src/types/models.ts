export interface ModelData {
  description: string;
  cost: {input: number, output: number};
  temperature: boolean;
  reasoning: boolean;
  web: boolean;
}
