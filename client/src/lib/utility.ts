import Lenis from "lenis";

export function formatToMoney(inputNumber: number): string {
  return (Math.round(inputNumber * 100) / 100).toFixed(2);
}

export function formatToFileSize(bytes: number): string {
  let result = "";
  const format = (value: number, unit: string) => {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded} ${unit}`;
  };

  if (bytes < 1024) {
    result = `${bytes} B`;
  }
  else if (bytes < 1024 ** 2) {
    result = format(bytes / 1024, "KB");
  }
  else if (bytes < 1024 ** 3) {
    result = format(bytes / 1024 ** 2, "MB");
  }
  else if (bytes < 1024 ** 4) {
    result = format(bytes / 1024 ** 3, "GB");
  }
  return result;
}

export async function goToBottom(lenis: Lenis): Promise<void> {
  lenis.stop();
  await new Promise((resolve) => {
    window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
    requestAnimationFrame(resolve);
  });
  lenis.start();
}

export function getImageFromTheme(theme: string, images: Record<string, string>): string {
  return images[theme] || "";
}
