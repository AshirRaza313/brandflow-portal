"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "configuring" | "done" | "error">("welcome");
  const [neonUrl, setNeonUrl] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [nextauthSecret, setNextauthSecret] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const generateSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 48; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleNeonSetup = async () => {
    setStep("configuring");
    setLogs([]);
    setError("");

    try {
      addLog("Creating Neon PostgreSQL database...");

      // Use Neon's serverless API to create a project
      const neonRes = await fetch("https://neon-api.app.execute-api.us-east-1.amazonaws.com/v2/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer",
        },
        body: JSON.stringify({ name: "valtriox" }),
      }).catch(async () => {
        addLog("Neon auto-create failed. Using manual setup...");
        return null;
      });

      if (neonRes && neonRes.ok) {
        const neonData = await neonRes.json();
        addLog("Database created successfully!");
        addLog("Connection string: " + neonData.connectionString);
      } else {
        addLog("Please create a free database manually at neon.tech");
      }

      // Test the database connection
      if (neonUrl) {
        addLog("Testing database connection...");
        const testRes = await fetch("/api/setup/test-db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseUrl: neonUrl }),
        });

        if (testRes.ok) {
          addLog("Database connection successful!");
        } else {
          addLog("Database connection failed. Check your DATABASE_URL.");
        }
      }

      // Run migrations
      addLog("Setting up database schema...");
      const migrateRes = await fetch("/api/setup/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl: neonUrl }),
      });

      if (migrateRes.ok) {
        addLog("Database schema created!");
      }

      // Seed initial data
      addLog("Seeding initial data...");
      const seedRes = await fetch("/api/setup/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseUrl: neonUrl,
          adminEmail: adminEmail,
        }),
      });

      if (seedRes.ok) {
        addLog("Initial data seeded successfully!");
      }

      setStep("done");
    } catch (err: any) {
      setError(err.message || "Setup failed");
      setStep("error");
      addLog("ERROR: " + (err.message || "Unknown error"));
    }
  };

  const handleManualSetup = () => {
    setStep("configuring");
    setLogs([]);
    setError("");
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111118] border border-[rgba(217,119,6,0.15)] rounded-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.3)] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-amber-400 mb-3">Setup Complete!</h2>
          <p className="text-gray-400 mb-2">Your Valtriox portal is ready to use.</p>
          <p className="text-gray-500 text-sm mb-6">Admin login credentials have been set up.</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all"
          >
            Go to Portal
          </button>
        </div>
      </div>
    );
  }

  if (step === "configuring") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-[#111118] border border-[rgba(217,119,6,0.15)] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-amber-400 mb-6">Setting Up Valtriox...</h2>
          <div className="bg-[#0a0a0f] rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <p key={i} className={`${log.includes("ERROR") ? "text-red-400" : log.includes("successfully") || log.includes("success") ? "text-amber-400" : "text-gray-400"} mb-1`}>
                {log}
              </p>
            ))}
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400 mb-2">Valtriox Setup</h1>
          <p className="text-gray-400">Configure your portal database connection</p>
        </div>

        {/* Card */}
        <div className="bg-[#111118] border border-[rgba(217,119,6,0.15)] rounded-2xl p-8">
          {/* Step 1: Database URL */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-amber-400 mb-2">
              Database URL (PostgreSQL)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Create a free database at{" "}
              <a href="https://neon.tech" target="_blank" className="text-amber-400 underline">
                neon.tech
              </a>{" "}
              or{" "}
              <a href="https://supabase.com" target="_blank" className="text-amber-400 underline">
                supabase.com
              </a>
            </p>
            <input
              type="text"
              value={neonUrl}
              onChange={(e) => setNeonUrl(e.target.value)}
              placeholder="postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require&pgbouncer=true"
              className="w-full px-4 py-3 bg-[#0a0a0f] border border-[rgba(217,119,6,0.15)] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          {/* Step 2: Admin Email */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-amber-400 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-4 py-3 bg-[#0a0a0f] border border-[rgba(217,119,6,0.15)] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          {/* Step 3: Auto-generate secret */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-amber-400 mb-2">
              NextAuth Secret
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nextauthSecret}
                onChange={(e) => setNextauthSecret(e.target.value)}
                placeholder="Auto-generated or paste your own"
                className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[rgba(217,119,6,0.15)] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
              />
              <button
                type="button"
                onClick={() => setNextauthSecret(generateSecret())}
                className="px-4 py-3 bg-[rgba(217,119,6,0.1)] border border-[rgba(217,119,6,0.3)] text-amber-400 rounded-xl text-sm hover:bg-[rgba(217,119,6,0.2)] transition-all"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Setup Button */}
          <button
            onClick={handleNeonSetup}
            disabled={!neonUrl || !adminEmail}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed text-lg"
          >
            Connect & Setup Database
          </button>

          {/* Copy env vars */}
          <div className="mt-6 p-4 bg-[#0a0a0f] rounded-xl">
            <p className="text-xs text-gray-500 mb-2 font-semibold">
              For Vercel, add these Environment Variables:
            </p>
            <code className="text-xs text-gray-400 block space-y-1">
              <p>DATABASE_URL=<span className="text-amber-400">{neonUrl || "(your-db-url)"}</span></p>
              <p>NEXTAUTH_SECRET=<span className="text-amber-400">{nextauthSecret || "(your-secret)"}</span></p>
              <p>NEXTAUTH_URL=<span className="text-amber-400">https://your-domain.vercel.app</span></p>
              <p>ADMIN_EMAIL=<span className="text-amber-400">{adminEmail || "(your-email)"}</span></p>
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
