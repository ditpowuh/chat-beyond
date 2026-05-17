import {ReactLenis} from "lenis/react";

interface LenisProviderProps {
  children?: React.ReactNode;
}

export default function LenisProvider({children}: LenisProviderProps) {
  const options = {
    autoRaf: true,
    stopInertiaOnNavigate: true,
    autoToggle: true,
    anchors: true,
    allowNestedScroll: true,
    naiveDimensions: true
  };

  return (
    <ReactLenis root options={options}>
      {children}
    </ReactLenis>
  );
}
