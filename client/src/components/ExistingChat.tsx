import styles from "./ExistingChat.module.css";
import {Fragment, useState, useEffect, useLayoutEffect, useRef} from "react";

import {AnimatePresence, motion} from "framer-motion";
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
  chatUUID: string;
}

export default function ExistingChat({bottomPadding, processingChatInProgress, setProcessingChatInProgress, processing, chatUUID}: ExistingChatProps) {
  const lenis = useLenis();

  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [storedImageTypes, setStoredImageTypes] = useState<string[]>([]);

  const [isVisible, setIsVisible] = useState<boolean>(false);

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(false);
    lenis!.scrollTo(0, {immediate: true});

    const loadMessages = (messages: Message[], imageTypes: string[]) => {
      setStoredImageTypes(imageTypes);
      const previousMessages = messages.map((message: Message) => ({
        ...message,
        uuid: uuidv4()
      }));
      setCurrentMessages(previousMessages);

      setTimeout(() => {
        lenis!.scrollTo(document.body.scrollHeight, {
          duration: 0.6,
          onComplete: () => {
            setIsVisible(true);
          }
        });
      }, 300);
    }
    socket.on("LoadMessages", loadMessages);

    if (chatUUID !== "") {
      socket.emit("LoadMessages", chatUUID);
    }
    else {
      setIsVisible(true);
    }

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
  }, [chatUUID]);

  useLayoutEffect(() => {
    if (!isVisible || !chatRef.current) {
      return;
    }

    const raf = requestAnimationFrame(() => {
      chatRef.current!.querySelectorAll("pre code").forEach((codeBlock) => {
        const block = codeBlock as HTMLElement;

        block.classList.remove("hljs");
        block.removeAttribute("data-highlighted");
        hljs.highlightElement(block);
      });

      chatRef.current!.querySelectorAll("a").forEach(link => {
        link.setAttribute("target", "_blank");
      });
    });

    return () => {
      cancelAnimationFrame(raf);
    }
  }, [isVisible, currentMessages, bottomPadding, processingChatInProgress]);

  const triggerShowFile = (fileName: string) => {
    socket.emit("ShowFile", fileName);
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={chatUUID || "pending"} ref={chatRef} className={`${styles.chat} content wrapper`} style={{paddingBottom: bottomPadding}} initial={{opacity: 0}} animate={{opacity: isVisible ? 1 : 0 }} transition={{duration: 0.3}}>
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
                            <img src={`/files/${file}`} onClick={(e) => triggerShowFile(file)}/>
                            <span className={`${styles.subtext} ${styles.image}`}>{file}</span>
                          </div>
                        );
                      }
                      else {
                        return (
                          <div className={`${styles.message} ${styles.user} ${styles.file}`}>
                            <span className={styles.fileicon} onClick={(e) => triggerShowFile(file)}>
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
      </motion.div>
    </AnimatePresence>
  );
}
