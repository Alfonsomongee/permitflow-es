/**
 * apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx
 */
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <SignUp
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
