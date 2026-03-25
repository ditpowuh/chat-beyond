import styles from "./InputArea.module.css";
import {useState, useEffect, useRef} from "react";

import Swal from "sweetalert2";

import whiteFileIcon from "@/assets/FileWhite.svg";
import blackFileIcon from "@/assets/FileBlack.svg";
import whiteLightbulbIcon from "@/assets/LightbulbWhite.svg";
import blackLightbulbIcon from "@/assets/LightbulbBlack.svg";
import crossIcon from "@/assets/Cross.svg";

import CostEstimation from "./CostEstimation";

import {socket} from "@/lib/socket";
import {formatToFileSize, getImageFromTheme} from "@/lib/utility";

import type {UploadedFile} from "@/types/chat";
import type {PageType} from "@/App";

const reasoningMap: Record<number, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High"
};

interface InputAreaProps {
  fileSizeLimit: number;
  reasoningEnabled: boolean;
  chatUUID: string;
  chatNameRef: React.RefObject<HTMLInputElement | null>;
  processing: React.RefObject<boolean>;
  currentPage: PageType;
  theme: string;
  setPagePadding: React.Dispatch<React.SetStateAction<number>>;
}

export default function InputArea({fileSizeLimit, reasoningEnabled, chatUUID, chatNameRef, processing, currentPage, theme, setPagePadding}: InputAreaProps) {
  const [isCalculatingCost, setIsCalculatingCost] = useState<boolean>(false);
  const [reasoningLevel, setReasoningLevel] = useState<number>(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const [inputHeight, setInputHeight] = useState<number>(48);

  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tokenCost = (tokenCount: number, cost: number) => {
      setIsCalculatingCost(false);
    }
    socket.on("TokenCost", tokenCost);

    const uploadComplete = (uuidName: string, index: number) => {
      setFiles((previous) => {
        const updated = [...previous];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            uuidName: uuidName
          };
        }
        return updated;
      });
    }
    socket.on("UploadComplete", uploadComplete);

    return () => {
      socket.off("TokenCost", tokenCost);
      socket.off("UploadComplete", uploadComplete);
    }
  }, []);

  useEffect(() => {
    if (textInputRef.current !== null) {
      textInputRef.current.value = "";
    }
  }, [currentPage]);

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  const uploadFile = (file: File) => {
    if (file.size > fileSizeLimit) {
      Swal.fire({
        icon: "error",
        title: "File size exceeded limit",
        text: "That file is too big!",
        confirmButtonColor: "#666666",
        confirmButtonText: "Okay"
      });
      return;
    }

    const newFile = {
      uploadedData: file,
      uuidName: "",
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    };

    setFiles((previous) => [...previous, newFile]);

    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("FileUpload", {
        name: file.name,
        type: file.type,
        data: reader.result
      }, files.length);
    }
    reader.readAsArrayBuffer(file);
  }

  const removeFile = (file: UploadedFile) => {
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }

    setFiles((previous) => previous.filter((currentFile) => currentFile.uploadedData.name !== file.uploadedData.name));
  }

  const calculateCost = () => {
    if (processing.current === true) {
      return;
    }
    if (textInputRef.current) {
      if (textInputRef.current.value.trim() === "") {
        Swal.fire({
          icon: "error",
          title: "Cannot calculate",
          text: "Your message cannot be empty. Please put something to calculate.",
          confirmButtonColor: "#666666",
          confirmButtonText: "Okay"
        });
        return;
      }
      processing.current = true;
      setIsCalculatingCost(true);

      socket.emit("CalculateCost", chatUUID, textInputRef.current.value.trim(), files.map(data => data.uuidName));
    }
  }

  const changeReasoningLevel = () => {
    setReasoningLevel(previous => (previous === 3 ? 0 : previous + 1));
  }

  const getReasoningStyles = (level: number): React.CSSProperties => {
    switch (level) {
      case 1: {
        return {
          border: "2.5px solid var(--low-strength)"
        };
      }
      case 2: {
        return {
          border: "2.5px solid var(--medium-strength)"
        };
      }
      case 3: {
        return {
          border: "2.5px solid var(--high-strength)"
        };
      }
      default: {
        return {};
      }
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    uploadFile(event.dataTransfer.files[0]);
  }

  const handleWheel = (event: React.WheelEvent<HTMLTextAreaElement>) => {
    const element = event.currentTarget;

    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const delta = event.deltaY;

    if (!(delta < 0 && scrollTop === 0 || delta > 0 && scrollTop + clientHeight >= scrollHeight)) {
      event.stopPropagation();
    }
  }

  const changeInputHeight = () => {
    if (textInputRef.current && fileAreaRef.current) {
      const lineHeight = 24;
      const lineCount = textInputRef.current.value.split("\n").length;

      if (lineCount <= 2) {
        setInputHeight(48);
      }
      else {
        setInputHeight(lineCount * lineHeight);
      }
      setPagePadding(240 + (textInputRef.current.offsetHeight - 48) + fileAreaRef.current.offsetHeight);
    }
  }

  const sendMessage = () => {
    if (chatNameRef.current?.value.trim() === "" && currentPage === "Home") {
      Swal.fire({
        icon: "error",
        title: "No chat name",
        text: "Please put a name for your new conversation.",
        confirmButtonColor: "#666666",
        confirmButtonText: "Okay"
      });
      return;
    }
    if (textInputRef.current) {
      if (textInputRef.current.value.trim() === "") {
        Swal.fire({
          icon: "error",
          title: "Cannot send empty message",
          text: "Your message cannot be empty. Please put your message to send.",
          confirmButtonColor: "#666666",
          confirmButtonText: "Okay"
        });
        return;
      }
      socket.emit("SendMessage", textInputRef.current.value.trim(), chatUUID !== "" ? chatUUID : chatNameRef!.current!.value.trim(), files.map(data => data.uuidName), reasoningLevel);
      textInputRef.current.value = "";
      setFiles([]);
    }
  }

  return (
    <>
      {currentPage !== "Settings" && (
        <div className={`${styles.bottomarea} wrapper`}>
          <button onClick={(e) => calculateCost()}>Estimate Cost</button>
          <div className={styles.inputarea} onDrop={handleDrop}>
            <div ref={fileAreaRef} className={styles.filearea}>
              {
                files.map((file, i) => (
                  <div className={styles.fileitem} key={i}>
                    <div>
                      {file.preview && (
                        <img src={file.preview} title={file.uploadedData.name}/>
                      )}
                      {!file.preview && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                          <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                      )}
                    </div>
                    <div className="fileinfo">
                      <div className="name" title={file.uploadedData.name}>{file.uploadedData.name}</div>
                      <div className="size" title={formatToFileSize(file.uploadedData.size)}>{formatToFileSize(file.uploadedData.size)}</div>
                    </div>
                    <button className="removebutton" onClick={(e) => removeFile(file)}><img src={crossIcon}/></button>
                  </div>
                ))
              }
            </div>
            <input ref={fileInputRef} id="fileinput" type="file" style={{display: "none"}} onChange={(e) => uploadFile(e.target!.files![0])}/>
            <div className={styles.textarea}>
              <button id="filebutton" title="Add File" onClick={openFileDialog}>
              <textarea ref={textInputRef} className={styles.textinput} maxLength={40960} placeholder="Type your message here" onChange={(e) => changeInputHeight()} onWheel={handleWheel} style={textInputRef.current ? {height: inputHeight} : {}}></textarea>
                <img src={getImageFromTheme(theme, {dark: whiteFileIcon, light: blackFileIcon})} width={16} height={16}/>
              </button>
              {reasoningEnabled && (
                <button id="reasoningbutton" title={`Reasoning: ${reasoningMap[reasoningLevel]}`} style={getReasoningStyles(reasoningLevel)} onClick={changeReasoningLevel}>
                  <img src={getImageFromTheme(theme, {dark: whiteLightbulbIcon, light: blackLightbulbIcon})} width="16" height="16"/>
                </button>
              )}
            </div>
          </div>
          <button id="sendbutton" onClick={sendMessage}>Send</button>
          <div className={styles.notice}>As always, AI can make mistakes. Make sure you check important info provided.</div>
        </div>
      )}
      <CostEstimation calculating={isCalculatingCost} processing={processing}/>
    </>
  );
}
