"use client";

import { useUser } from "@clerk/nextjs";

export default function GreetingUser() {
  const { user, isLoaded, isSignedIn } = useUser();

  if (!isSignedIn) return;
  getGreeting();
  return (
    <div className="text-3xl font-semibold">
      {getGreeting()}, {user.username ?? user.firstName}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12
    ? "Good Morning"
    : hour < 18
      ? "Good Afternoon"
      : hour < 20
        ? "Good Evening"
        : "Productive Night";
}
