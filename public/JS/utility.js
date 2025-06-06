function formatToMoney(number) {
  return (Math.round(number * 100) / 100).toFixed(2);
}

const lenis = new Lenis();
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
