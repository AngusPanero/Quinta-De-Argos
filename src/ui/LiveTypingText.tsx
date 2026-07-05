import { useEffect, useState } from "react";

const LiveTypingText = ({ text, className }: { text: any; className?: string }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!text) return;
    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 5);
    return () => clearInterval(interval);
  }, [text]);

  return (
      <span className={className}>{displayed}</span>
  );
};

export default LiveTypingText;  