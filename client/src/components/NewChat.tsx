import styles from "./NewChat.module.css";
import {useState} from "react";

import {socket} from "@/lib/socket";

interface NewChatProps {
  chatNameRef: React.RefObject<HTMLInputElement | null>;
}

export default function NewChat({chatNameRef}: NewChatProps) {
  const [hasName, setHasName] = useState<boolean>(false);

  return (
    <div className={`${styles.newchatarea} content wrapper`}>
      <h1>Let's start. How can I help?</h1>
      <input ref={chatNameRef} className={styles.chatname} type="text" placeholder="Chat name" onChange={(e) => setHasName(e.target.value.length > 0)}/>
      {hasName && <h4 className="message">Great! Start your chat with a message below!</h4>}
    </div>
  );
}
