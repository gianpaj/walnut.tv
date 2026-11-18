import React from "react";
import { Toaster } from "react-hot-toast";

interface Props {
  children: React.ReactNode;
}

export const ToastProvider = (props: Props) => {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      {props.children}
    </>
  );
};
