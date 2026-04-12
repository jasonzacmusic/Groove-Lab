import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Auth() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [, navigate] = useLocation();
  const { login, register, user } = useAuth();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-10rem)] px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Disc3 className="w-12 h-12 text-primary mb-3" />
          <h1 className="font-serif italic text-3xl text-foreground">
            GrooveLab
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tab === "login"
              ? "Welcome back! Sign in to continue."
              : "Create an account to get started."}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {tab === "login" ? (
          <LoginForm onLogin={login} onSuccess={() => navigate("/")} />
        ) : (
          <RegisterForm onRegister={register} onSuccess={() => navigate("/")} />
        )}
      </div>
    </div>
  );
}

function LoginForm({
  onLogin,
  onSuccess,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Email</label>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Password</label>
        <Input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

function RegisterForm({
  onRegister,
  onSuccess,
}: {
  onRegister: (email: string, password: string, name: string) => Promise<void>;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await onRegister(email, password, name);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Name</label>
        <Input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Email</label>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Password</label>
        <Input
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Confirm Password
        </label>
        <Input
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {loading ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
}
