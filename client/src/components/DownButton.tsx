import styles from "./DownButton.module.css";
import {useCallback, useSyncExternalStore} from "react";

import whiteArrow from "@/assets/DownArrowWhite.svg";
import blackArrow from "@/assets/DownArrowBlack.svg";

import {AnimatePresence, motion} from "motion/react";
import {useLenis} from "lenis/react";

import {getImageFromTheme} from "@/lib/utility";

import type {PageType} from "@/App";

const BOTTOM_THRESHOLD = 48;

interface DownButtonProps {
  theme: string;
  page: PageType;
  chatUUID: string;
  padding: number;
}

export default function DownButton({theme, page, chatUUID, padding}: DownButtonProps) {
  const lenis = useLenis();

  const distanceFromBottom = (): number => {
    return document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
  }

  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("scroll", onChange, {passive: true});
    
    const observer = new ResizeObserver(onChange);
    observer.observe(document.documentElement);

    lenis?.on("scroll", onChange);

    return () => {
      window.removeEventListener("scroll", onChange);
      observer.disconnect();
      lenis?.off("scroll", onChange);
    }
  }, [lenis]);

  const getSnapshot = useCallback(() => {
    return lenis ? lenis.limit > BOTTOM_THRESHOLD && lenis.limit - lenis.scroll > BOTTOM_THRESHOLD : distanceFromBottom() > BOTTOM_THRESHOLD;
  }, [lenis]);

  const canScrollDown = useSyncExternalStore(subscribe, getSnapshot);

  const show = page === "ExistingChat" && chatUUID !== "" && canScrollDown;

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.button className={styles.button} style={{bottom: padding}} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.3}} onClick={() => lenis!.scrollTo(document.body.scrollHeight)}>
          <img src={getImageFromTheme(theme, {dark: whiteArrow, light: blackArrow})}/>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
