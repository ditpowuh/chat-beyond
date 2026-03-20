interface UserMessage {
  content: string;
  role: "user";
  files?: string[];
  uuid: string;
}

interface AssistantMessage {
  content: string;
  role: "assistant";
  uuid: string;
}

export type Message = UserMessage | AssistantMessage;

export type UploadedFile = {
  uploadedData: File;
  uuidName: string;
  preview: string | null;
}

export type ChatOrderItem = {
  time: string;
  title: string;
  uuid: string;
};
