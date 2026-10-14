export interface Message {
  role: string;
  content: string;
  files?: string[];
}

export interface Chat {
  messages: Message[];
  title?: string;
}

export interface ChatOrderItem {
  uuid: string;
  time: Date;
  title?: string;
}

export interface StreamHandlers {
  chatInProgress: () => void;
  start: (text: string, uuid: string, title: string | undefined, files: string[], imageTypes: string[]) => void;
  processing: (html: string) => void;
  finish: (html: string) => void;
  alert: (title: string, message: string, error: boolean, clean: boolean) => void;
}
