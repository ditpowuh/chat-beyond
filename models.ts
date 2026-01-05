interface ModelData {
  description: string;
  cost: {input: number, output: number};
  temperature: boolean;
  reasoning: boolean;
  web: boolean;
}

const models: Record<string, ModelData> = {
  "gpt-4o-mini": {
    "description": "A cheaper verison of GPT-4o. This is the free model of ChatGPT.",
    "cost": {
      "input": 0.15,
      "output": 0.6
    },
    "temperature": true,
    "reasoning": false,
    "web": true
  },
  "gpt-4o": {
    "description": "This is the main model of ChatGPT's subscriptions.",
    "cost": {
      "input": 2.5,
      "output": 10
    },
    "temperature": true,
    "reasoning": false,
    "web": true
  },
  "gpt-4.1": {
    "description": "Described as the flagship GPT model for complex tasks, this model peforms strongly.",
    "cost": {
      "input": 2,
      "output": 8
    },
    "temperature": true,
    "reasoning": false,
    "web": true
  },
  "gpt-4.1-mini": {
    "description": "A weaker, but still strong version of GPT-4.1, with reduced costs.",
    "cost": {
      "input": 0.4,
      "output": 1.6
    },
    "temperature": true,
    "reasoning": false,
    "web": true
  },
  "gpt-4.1-nano": {
    "description": "The cheapest verison of GPT-4.1, which makes it the weakest version of GPT-4.1.",
    "cost": {
      "input": 0.1,
      "output": 0.4
    },
    "temperature": true,
    "reasoning": false,
    "web": false
  },
  "o4-mini": {
    "description": "A strong, but relatively affordable model that focuses on reasoning.",
    "cost": {
      "input": 1.1,
      "output": 4.4
    },
    "temperature": false,
    "reasoning": true,
    "web": false
  },
  "gpt-5": {
    "description": "A previous strong flagship GPT model for tasks across all domains.",
    "cost": {
      "input": 1.25,
      "output": 10
    },
    "temperature": false,
    "reasoning": true,
    "web": true
  },
  "gpt-5-mini": {
    "description": "A faster, more cost-efficient version of GPT-5 that is still strong.",
    "cost": {
      "input": 0.25,
      "output": 2
    },
    "temperature": false,
    "reasoning": true,
    "web": true
  },
  "gpt-5-nano": {
    "description": "The cheapest verison of GPT-5, which makes it the weakest version of GPT-5.",
    "cost": {
      "input": 0.05,
      "output": 0.4
    },
    "temperature": false,
    "reasoning": true,
    "web": false
  },
  "gpt-5.1": {
    "description": "The flagship GPT model for coding and agentic tasks with configurable reasoning and non-reasoning effort.",
    "cost": {
      "input": 1.25,
      "output": 10
    },
    "temperature": false,
    "reasoning": true,
    "web": true
  },
  "gpt-5.2": {
    "description": "The latest flagship GPT model for coding and agentic tasks across industries.",
    "cost": {
      "input": 1.75,
      "output": 14
    },
    "temperature": false,
    "reasoning": true,
    "web": true
  }
};

export default models;
