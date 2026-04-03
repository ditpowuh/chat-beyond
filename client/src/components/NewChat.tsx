import styles from "./NewChat.module.css";
import {useState} from "react";

import {AnimatePresence, motion} from "framer-motion";

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
      <AnimatePresence>
        {hasName && (
          <motion.h4 key="message" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.25}}>
            Great! Start your chat with a message below!
          </motion.h4>
        )}
      </AnimatePresence>
    </div>
  );
}
