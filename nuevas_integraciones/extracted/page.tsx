/**
 * apps/web/app/(auth)/sign-in/[[...sign-in]]/page.tsx
 */
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <SignIn
        appearance={{
          elements: {
            rootBox: "shadow-none",
            card: "shadow-sm border border-border rounded-xl",
            headerTitle: "text-text-primary font-medium",
            headerSubtitle: "text-text-secondary",
            formButtonPrimary:
              "bg-primary hover:opacity-90 transition-opacity text-white",
            footerActionLink: "text-primary hover:underline",
          },
        }}
      />
    </div>
  );
}
