import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AlertType = "success" | "error" | "info" | "warning";

interface AlertOptions {
  type?: AlertType;
  title: string;
  message: string;
  buttonText?: string;
}

interface NotificationContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  alert: (options: AlertOptions) => void;
}

interface AlertState extends AlertOptions {
  open: boolean;
}

const NotificationContext =
  createContext<NotificationContextValue | undefined>(undefined);

const alertConfig = {
  success: {
    icon: CheckCircle2,
    iconClass:
      "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/60",
    titleClass: "text-green-700 dark:text-green-400",
  },

  error: {
    icon: AlertCircle,
    iconClass:
      "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60",
    titleClass: "text-red-700 dark:text-red-400",
  },

  info: {
    icon: Info,
    iconClass:
      "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60",
    titleClass: "text-blue-700 dark:text-blue-400",
  },

  warning: {
    icon: TriangleAlert,
    iconClass:
      "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60",
    titleClass: "text-amber-700 dark:text-amber-400",
  },
};

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    type: "info",
    title: "",
    message: "",
    buttonText: "OK",
  });

  /*
   * All normal application notifications go through
   * this central API.
   *
   * The actual visual rendering is handled by the
   * single global Sonner instance in App.tsx.
   */

  const success = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const error = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const info = useCallback((message: string) => {
    toast.info(message);
  }, []);

  const warning = useCallback((message: string) => {
    toast.warning(message);
  }, []);

  /*
   * Alert is intentionally different from a toast.
   * It is a modal notification requiring acknowledgement.
   */
  const alert = useCallback((options: AlertOptions) => {
    setAlertState({
      open: true,
      type: options.type || "info",
      title: options.title,
      message: options.message,
      buttonText: options.buttonText || "OK",
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((current) => ({
      ...current,
      open: false,
    }));
  }, []);

  const value = useMemo(
    () => ({
      success,
      error,
      info,
      warning,
      alert,
    }),
    [success, error, info, warning, alert]
  );

  const type = alertState.type || "info";
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <AlertDialog
        open={alertState.open}
        onOpenChange={(open) => {
          if (!open) {
            closeAlert();
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 sm:p-7">
          <AlertDialogHeader className="items-center text-center">
            <div
              className={`mb-2 flex h-16 w-16 items-center justify-center rounded-full ${config.iconClass}`}
            >
              <Icon className="h-8 w-8" strokeWidth={2.2} />
            </div>

            <AlertDialogTitle
              className={`text-xl font-bold ${config.titleClass}`}
            >
              {alertState.title}
            </AlertDialogTitle>

            <AlertDialogDescription className="pt-1 text-center text-sm leading-6">
              {alertState.message}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 sm:justify-center">
            <AlertDialogAction
              onClick={closeAlert}
              className="min-w-[110px] rounded-xl px-6"
            >
              {alertState.buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
}
