import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset="88px"
      duration={4000}
      closeButton
      richColors
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast:
            "group toast w-[calc(100vw-2rem)] max-w-md rounded-2xl border bg-background px-4 py-4 shadow-xl",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
          actionButton:
            "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground",
          cancelButton:
            "rounded-lg bg-muted px-3 py-1.5 text-sm font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
