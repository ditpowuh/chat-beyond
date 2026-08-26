import styles from "./DownButton.module.css";
import {useState, useEffect, useCallback} from "react";

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

function distanceFromBottom(): number {
  return document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
}

export default function DownButton({theme, page, chatUUID, padding}: DownButtonProps) {
  const lenis = useLenis();
  const [show, setShow] = useState(false);

  const updateVisibility = useCallback(() => {
    const canScrollDown = lenis
      ? lenis.limit > BOTTOM_THRESHOLD && lenis.limit - lenis.scroll > BOTTOM_THRESHOLD
      : distanceFromBottom() > BOTTOM_THRESHOLD;

    setShow(page === "ExistingChat" && chatUUID !== "" && canScrollDown);
  }, [lenis, page, chatUUID]);

  useEffect(() => {
    setShow(false);
    updateVisibility();
  }, [chatUUID, updateVisibility]);

  useEffect(() => {
    updateVisibility();

    window.addEventListener("scroll", updateVisibility, {passive: true});
    const observer = new ResizeObserver(updateVisibility);
    observer.observe(document.documentElement);

    lenis?.on("scroll", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      observer.disconnect();
      lenis?.off("scroll", updateVisibility);
    };
  }, [lenis, updateVisibility, padding]);

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
