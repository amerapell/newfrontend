"use client";
import { use } from "react";
import { CustomerAdminDetail } from "@/components/admin/Customers";

export default function Page({ params }: { params: Promise<{ email: string }> }) {
  const { email } = use(params);
  return <CustomerAdminDetail email={decodeURIComponent(email)} />;
}
