"use client";

import LoginForm from "@/components/login-form"
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default function page() {

    const { data, isPending } = authClient.useSession();

    if (data?.session && data?.user) {
        redirect("/");
    }

    if (isPending) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Spinner />
            </div>
        )
    }

    return (
        <LoginForm />
    )
}