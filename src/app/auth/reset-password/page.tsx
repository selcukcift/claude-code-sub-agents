/**
 * TORVAN PASSWORD RESET PAGE
 * =========================
 * 
 * Password reset page for medical device workflow management
 */

import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}