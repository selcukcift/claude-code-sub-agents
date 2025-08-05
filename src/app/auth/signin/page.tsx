/**
 * TORVAN SIGNIN PAGE
 * ================
 * 
 * Authentication signin page for medical device workflow management
 */

import { Suspense } from "react";
import { SigninForm } from "@/components/auth/signin-form";

interface SigninPageProps {
  searchParams: {
    callbackUrl?: string;
    error?: string;
    message?: string;
  };
}

export default function SigninPage({ searchParams }: SigninPageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SigninForm 
        callbackUrl={searchParams.callbackUrl}
        error={searchParams.error}
      />
    </Suspense>
  );
}