import {useState, useEffect} from "react";

import {confetti} from "@tsparticles/confetti";

import {socket} from "@/lib/socket";
import {formatToMoney} from "@/lib/utility";

interface CostEstimationProps {
  calculating: boolean;
  processing: React.RefObject<boolean>;
}

export default function CostEstimation({calculating, processing}: CostEstimationProps) {
  const [estimatedCost, setEstimatedCost] = useState<string>("Uncalculated");

  useEffect(() => {
    const tokenCost = (tokenCount: number, cost: number) => {
      if (cost < 0.01) {
        setEstimatedCost("Less than $0.01 USD");
      }
      else {
        setEstimatedCost(`${formatToMoney(cost)} USD`);
      }
      confetti({
        angle: 90,
        particleCount: 20,
        spread: 180,
        origin: {
          x: 450 / window.innerWidth,
          y: 1
        }
      });
      processing.current = false;
    }
    socket.on("TokenCost", tokenCost);

    return () => {
      socket.off("TokenCost", tokenCost);
    }
  }, []);

  return (
    <div id="bottombar" className="undraggable">
      <div id="cost">{`Estimated Input Cost: ${calculating ? "Calculating..." : estimatedCost}`}</div>
    </div>
  );
}
