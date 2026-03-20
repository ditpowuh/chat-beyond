import * as ReactDOM from "react-dom/client";

import {StrictMode} from "react";
import App from "./App";

import LenisProvider from "./context/LenisProvider";

import "lenis/dist/lenis.css";
import "katex/dist/katex.min.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LenisProvider>
      <App/>
    </LenisProvider>
  </StrictMode>
);
