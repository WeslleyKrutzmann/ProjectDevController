import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

type ModalOverlayProps = {
  children: ReactNode;
};

export function ModalOverlay({ children }: ModalOverlayProps) {
  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
      {children}
    </div>,
    document.body
  );
}
