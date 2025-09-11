const lenis = new Lenis();
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

function formatToMoney(number) {
  return (Math.round(number * 100) / 100).toFixed(2);
}

function formatToFileSize(bytes) {
  let result;
  const format = (value, unit) => {
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

async function goToBottom() {
  lenis.stop();
  await new Promise((resolve) => {
    window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
    requestAnimationFrame(resolve);
  });
  lenis.start();
}
