"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ImagePlus } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function CompanyProfileCard({
  initialCompany,
}: {
  initialCompany: {
    name: string;
    logo: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}) {
  const [name, setName] = useState(initialCompany.name);
  const [email, setEmail] = useState(initialCompany.email ?? "");
  const [phone, setPhone] = useState(initialCompany.phone ?? "");
  const [address, setAddress] = useState(initialCompany.address ?? "");
  const [logo, setLogo] = useState(initialCompany.logo);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, address }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save company details"));
        return;
      }
      notify.success("Company details saved");
      router.refresh();
    } catch {
      notify.error("Could not save company details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickLogo = () => fileRef.current?.click();

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/settings/company/logo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not upload logo"));
        return;
      }
      const data = await res.json();
      setLogo(data.logo);
      notify.success("Company logo updated");
      router.refresh();
    } catch {
      notify.error("Could not upload logo. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Company profile"
        description="Your company name, logo and contact details — shown across the app in real time"
      />
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
            {logo ? (
              <img src={logo} alt={name} className="w-full h-full object-contain p-1" />
            ) : (
              <Building2 className="w-7 h-7 text-white" />
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={pickLogo}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 disabled:opacity-60"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : logo ? "Change logo" : "Upload logo"}
            </button>
            <p className="text-[11px] text-gray-400 mt-1.5">PNG, JPG or SVG · max 2 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Company name</label>
            <input
              className={`${inputClass} text-sm`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your company name"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Company email</label>
              <input
                className={`${inputClass} text-sm`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input
                className={`${inputClass} text-sm`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 000 000 0000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Address</label>
            <textarea
              className={`${inputClass} text-sm resize-y`}
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Head office address"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button loading={loading} onClick={save}>
            Save company details
          </Button>
          {loading && <span className="text-xs text-gray-400">Saving…</span>}
        </div>
      </div>
    </Card>
  );
}
