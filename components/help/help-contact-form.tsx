"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Mail, Send } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { notify } from "@/lib/toast";

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

const topics = [
  "Account & login",
  "Leave & attendance",
  "Payroll",
  "Recruitment",
  "Bug report",
  "Other",
];

export function HelpContactForm({ userEmail, userName }: { userEmail: string; userName: string }) {
  const [topic, setTopic] = useState(topics[0]);
  const [message, setMessage] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Smart HR Support — ${topic}`);
    const body = encodeURIComponent(
      `Name: ${userName}\nEmail: ${userEmail}\nTopic: ${topic}\n\n${message}`
    );
    window.location.href = `mailto:support@smarthr.com?subject=${subject}&body=${body}`;
    notify.success("Opening your email client to send the message");
  };

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/help" className="hover:text-violet-600 transition-colors">
          Help
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Contact support</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Contact support</h1>
          <p className="text-sm text-gray-500 mb-6">
            Describe your issue and we&apos;ll open your email client with a pre-filled message.
          </p>

          <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Your name</label>
                  <input className={`${inputClass} mt-1 bg-gray-50`} value={userName} readOnly />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Your email</label>
                  <input className={`${inputClass} mt-1 bg-gray-50`} value={userEmail} readOnly />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Topic</label>
                <select
                  className={`${inputClass} mt-1`}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  {topics.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Message</label>
                <textarea
                  className={`${inputClass} mt-1 min-h-[140px] resize-y`}
                  placeholder="Tell us what you need help with..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              <Button type="submit">
                <Send className="w-4 h-4" />
                Send message
              </Button>
            </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Email support</h3>
            <p className="text-xs text-gray-500 mt-1 mb-3">Monday – Friday, 9 AM – 6 PM</p>
            <a href="mailto:support@smarthr.com" className="text-sm font-medium text-violet-600 hover:text-violet-700">
              support@smarthr.com
            </a>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Before you write</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Check the FAQ on the Help home page</li>
              <li>• Search guides for your module</li>
              <li>• Include screenshots if reporting a bug</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
