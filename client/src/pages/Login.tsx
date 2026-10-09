import { useState, type FormEvent } from "react";
import { ArrowRight, Route, ShieldCheck } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type Mode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });

  const handleSuccess = (user: NonNullable<typeof me.data>) => {
    utils.auth.me.setData(undefined, user);
    setLocation("/");
  };
  const register = trpc.auth.register.useMutation({
    onSuccess: handleSuccess,
    onError: error => setFormError(error.message),
  });
  const login = trpc.auth.login.useMutation({
    onSuccess: handleSuccess,
    onError: error => setFormError(error.message),
  });

  if (me.data) return <Redirect to="/" />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (mode === "register") register.mutate({ name, email, password });
    else login.mutate({ email, password });
  }

  const pending = register.isPending || login.isPending;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="auth-brand" href="/" aria-label="Rideline home">
          <span className="brand-mark"><Route size={21} strokeWidth={2.4} /></span>
          <span className="brand-copy"><strong>ride<span>line</span></strong><small>YOUR RIDE, IN VIEW</small></span>
        </a>
        <div className="auth-heading">
          <span className="auth-eyebrow"><span className="eyebrow-line" /> RIDER ACCOUNT</span>
          <h1>{mode === "login" ? <>Welcome<br /><em>back.</em></> : <>Your next ride<br /><em>starts here.</em></>}</h1>
          <p>{mode === "login" ? "Sign in to open your ride dashboard." : "Create an account to save and manage your demo rides."}</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setFormError(""); }}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setFormError(""); }}>Create account</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              <span>NAME</span>
              <input autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Your name" required minLength={1} maxLength={100} />
            </label>
          )}
          <label>
            <span>EMAIL</span>
            <input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required maxLength={254} />
          </label>
          <label>
            <span>PASSWORD</span>
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"} required minLength={mode === "register" ? 8 : 1} maxLength={128} />
          </label>
          {formError && <p className="auth-error" role="alert">{formError}</p>}
          <button className="auth-submit" type="submit" disabled={pending || me.isLoading}>
            {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            {!pending && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="auth-privacy"><ShieldCheck size={15} /><span>Your password is stored as a secure hash. This app only provides demo ride requests.</span></div>
      </section>
      <p className="auth-footer">RIDELINE <span>·</span> YOUR RIDE, IN VIEW</p>
    </main>
  );
}
