import styles from "./ExistingChat.module.css";
import {Fragment, useState, useEffect, useRef} from "react";

import hljs from "highlight.js";

import {v4 as uuidv4} from "uuid";
import {useLenis} from "lenis/react";

import {goToBottom} from "@/lib/utility";
import {socket} from "@/lib/socket";

import type {Message} from "@/types/chat";

interface ExistingChatProps {
  bottomPadding: number;
  processingChatInProgress: boolean;
  setProcessingChatInProgress: React.Dispatch<React.SetStateAction<boolean>>;
  processing: React.RefObject<boolean>;
}

export default function ExistingChat({bottomPadding, processingChatInProgress, setProcessingChatInProgress, processing}: ExistingChatProps) {
  const lenis = useLenis();

  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [storedImageTypes, setStoredImageTypes] = useState<string[]>([]);

  const chatRef = useRef<HTMLDivElement>(null);
  const hasGoneToBottom = useRef<boolean>(false);

  useEffect(() => {
    const loadMessages = (messages: Message[], imageTypes: string[]) => {
      setStoredImageTypes(imageTypes);
      const previousMessages = messages.map((message: Message) => ({
        ...message,
        uuid: uuidv4()
      }));
      setCurrentMessages(previousMessages);
    }
    socket.on("LoadMessages", loadMessages);

    const startNewMessage = (originalMessage: string, uuidReceiving: string, title: string, files: string[], imageTypes: string[]) => {
      setStoredImageTypes(imageTypes);
      setCurrentMessages((previous) => ([
        ...previous,
        {
          role: "user",
          content: originalMessage,
          files,
          uuid: uuidv4()
        },
        {
          role: "assistant",
          content: "",
          uuid: uuidv4()
        }
      ]));
      lenis!.scrollTo(document.body.scrollHeight);
    }
    socket.on("StartNewMessage", startNewMessage);

    const processingNewMessage = (message: string) => {
      setCurrentMessages(previous => {
        if (previous.length === 0) {
          return previous;
        }
        const updated = [...previous];
        const lastMessage = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...lastMessage,
          content: message
        };
        return updated;
      });
    }
    socket.on("ProcessingNewMessage", processingNewMessage);

    const finishNewMessage = (output: string) => {
      setProcessingChatInProgress(false);
      setCurrentMessages(previous => {
        if (previous.length === 0) {
          return previous;
        }
        const updated = [...previous];
        const lastMessage = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...lastMessage,
          content: output
        };
        return updated;
      });

      socket.emit("LoadChatData");
      processing.current = false;

      lenis!.scrollTo(document.body.scrollHeight);
    }
    socket.on("FinishNewMessage", finishNewMessage);

    return () => {
      socket.off("LoadMessages", loadMessages);
      socket.off("StartNewMessage", startNewMessage);
      socket.off("ProcessingNewMessage", processingNewMessage);
      socket.off("FinishNewMessage", finishNewMessage);
    }
  }, []);

  useEffect(() => {
    hljs.highlightAll();

    if (chatRef.current) {
      chatRef.current.querySelectorAll("a").forEach(link => {
        link.setAttribute("target", "_blank");
      });
    }

    if (currentMessages.length && hasGoneToBottom.current === false) {
      hasGoneToBottom.current = true;
      requestAnimationFrame(() => {
        goToBottom(lenis!);
      });
    }
  }, [currentMessages]);

  useEffect(() => {
    hljs.highlightAll();
  }, [bottomPadding]);

  return (
    <div ref={chatRef} className={`${styles.chat} content wrapper`} style={{paddingBottom: bottomPadding}}>
      {
        currentMessages.map((message) => {
          if (message.role === "user") {
            return (
              <Fragment key={message.uuid}>
                {
                  message.files?.map((file) => {
                    if (storedImageTypes.some(imageType => file.endsWith(imageType))) {
                      return (
                        <div className={`${styles.message} ${styles.user} ${styles.file}`}>
                          <img src={`/files/${file}`}/>
                          <span className={`${styles.subtext} ${styles.image}`}>{file}</span>
                        </div>
                      );
                    }
                    else {
                      return (
                        <div className={`${styles.message} ${styles.user} ${styles.file}`}>
                          <span className={styles.fileicon}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                          </span>
                          <span className={`${styles.subtext} ${styles.file}`}>{file}</span>
                        </div>
                      );
                    }
                  })
                }
                <div className={`${styles.message} ${styles.user}`}>{message.content}</div>
              </Fragment>
            );
          }
          else {
            return <div key={message.uuid} className={styles.message} dangerouslySetInnerHTML={{__html: message.content}}></div>;
          }
        })
      }
      {processingChatInProgress && (
        <div className={`${styles.message} ${styles.processing} undraggable`}>Processing and thinking...</div>
      )}
    </div>
  );
}
