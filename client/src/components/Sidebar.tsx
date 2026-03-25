import styles from "./Sidebar.module.css";
import {useState, useEffect} from "react";

import Swal from "sweetalert2";

import {useLenis} from "lenis/react";

import {socket} from "@/lib/socket";
import {getImageFromTheme} from "@/lib/utility";

import whiteLogo from "@/assets/LogoWhite.png";
import blackLogo from "@/assets/LogoBlack.png";
import whiteSettingsIcon from "@/assets/SettingsWhite.svg";
import blackSettingsIcon from "@/assets/SettingsBlack.svg";

import type {PageType} from "@/App";
import type {ChatOrderItem} from "@/types/chat";

interface SidebarProps {
  setPage: React.Dispatch<React.SetStateAction<PageType>>;
  processing: React.RefObject<boolean>;
  chatUUID: string;
  setChatUUID: React.Dispatch<React.SetStateAction<string>>;
  theme: string;
}

export default function Sidebar({setPage, processing, chatUUID, setChatUUID, theme}: SidebarProps) {
  const lenis = useLenis();

  const [chats, setChats] = useState<Record<string, ChatOrderItem[]>>({});

  useEffect(() => {
    socket.emit("LoadChatData");

    const loadChatData = (chats: Record<string, ChatOrderItem[]>) => {
      setChats(chats);
    }
    socket.on("LoadChatData", loadChatData);

    const reloadChatData = () => {
      socket.emit("LoadChatData");
    }
    socket.on("ReloadChatData", reloadChatData);

    const changeChatName = (uuid: string, name: string) => {
      socket.emit("LoadChatData");
      processing.current = false;
      Swal.fire({
        icon: "success",
        title: "Chat renamed",
        text: "Your conversation has been successfully renamed.",
        confirmButtonColor: "#666666",
        confirmButtonText: "Okay"
      });
    }
    socket.on("ChangeChatName", changeChatName);

    return () => {
      socket.off("LoadChatData", loadChatData);
      socket.off("ReloadChatData", reloadChatData);
      socket.off("ChangeChatName", changeChatName);
    }
  }, []);

  const openChat = (uuid: string, title: string) => {
    if (chatUUID === uuid) {
      lenis!.scrollTo(document.body.scrollHeight);
      return;
    }
    if (processing.current === true) {
      return;
    }
    document.title = `ChatBeyond: ${title}`;
    setPage("ExistingChat");
    setChatUUID(uuid);
    socket.emit("LoadMessages", uuid);
  }

  const modifyChat = (event: React.MouseEvent<HTMLButtonElement>, title: string, uuid: string) => {
    event.stopPropagation();
    if (processing.current === true) {
      return;
    }
    Swal.fire({
      icon: "question",
      title: "What would you like to do with this chat?",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: "#c24848",
      denyButtonColor: "#a39345",
      cancelButtonColor: "#666666",
      confirmButtonText: "Delete",
      denyButtonText: "Rename",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: "warning",
          title: "Are you sure you want to delete this chat?",
          text: "You won't be able to revert this.",
          showCancelButton: true,
          confirmButtonColor: "#c24848",
          cancelButtonColor: "#666666",
          confirmButtonText: "Delete",
          cancelButtonText: "Cancel"
        }).then((result) => {
          if (result.isConfirmed) {
            socket.emit("DeleteChat", uuid);
          }
        });
      }
      else if (result.isDenied) {
        Swal.fire({
          title: "What would you like to rename this chat?",
          input: "text",
          inputPlaceholder: "Chat Name",
          inputValue: title,
          showCancelButton: true,
          confirmButtonColor: "#a39345",
          cancelButtonColor: "#666666",
          confirmButtonText: "Rename",
          cancelButtonText: "Cancel"
        }).then((result) => {
          if (result.isConfirmed) {
            if (result.value.trim() === "") {
              Swal.fire({
                icon: "error",
                title: "No chat name",
                text: "That is not a valid name for your conversation.",
                confirmButtonColor: "#666666",
                confirmButtonText: "Okay"
              });
            }
            else {
              processing.current = true;
              socket.emit("RenameChat", uuid, result.value.trim());
            }
          }
        });
      }
    });
  }

  const goHome = () => {
    if (processing.current === true) {
      return;
    }
    setPage("Home");
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.top}>
        <img className={`${styles.logo} undraggable`} src={getImageFromTheme(theme, {dark: whiteLogo, light: blackLogo})} width="36" onClick={(e) => goHome()}/>
        <ul className={styles.list}>
          <li onClick={(e) => goHome()}>New chat</li>
        </ul>
      </div>
      <br/>
      <div className={styles.pastchats}>
        {
          Object.keys(chats).map((category) => (
            <div key={category}>
              <div className={styles.category}>{category}</div>
              <ul className={styles.list}>
                {
                  chats[category].map((chat) => (
                    <li key={chat.uuid} onClick={(e) => openChat(chat.uuid, chat.title)}>
                      <span>{chat.title}</span>
                      <button className="modifybutton" onClick={(e) => modifyChat(e, chat.title, chat.uuid)}>
                        <img src={getImageFromTheme(theme, {dark: whiteSettingsIcon, light: blackSettingsIcon})}/>
                      </button>
                    </li>
                  ))
                }
              </ul>
            </div>
          ))
        }
      </div>
    </div>
  );
}