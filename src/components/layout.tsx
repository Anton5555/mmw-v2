import type { PropsWithChildren } from "react";
import { Header } from "./header";
import { ThemeProvider } from "./theme-provider";
import { Inter as FontSans } from "next/font/google";
import { cn } from "~/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
      >
        <Header />

        <main
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable,
          )}
        >
          {props.children}
        </main>
      </ThemeProvider>
    </>
  );
};
