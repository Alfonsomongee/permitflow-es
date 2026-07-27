"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-bg group-[.toaster]:text-text-primary group-[.toaster]:border-border group-[.toaster]:shadow-card",
          description: "group-[.toast]:text-text-secondary",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-surface group-[.toast]:text-text-secondary group-[.toast]:border-border",
          error: "group-[.toaster]:bg-danger-light group-[.toaster]:text-danger-dark group-[.toaster]:border-danger/30",
          success: "group-[.toaster]:bg-success-light group-[.toaster]:text-success-dark group-[.toaster]:border-success/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
