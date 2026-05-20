"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const COUNTRY_CODES = [
  { code: "+976", name: "Mongolia" },
  { code: "+1", name: "USA" },
  { code: "+7", name: "Russia" },
  { code: "+86", name: "China" },
  { code: "+82", name: "Korea" },
  { code: "+81", name: "Japan" },
  { code: "+44", name: "UK" },
  { code: "+49", name: "Germany" },
];

type Step = "form" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, login } = useAuth();

  const [mode, setMode] = useState("login");
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+976");
  const [phone, setPhone] = useState("");
  const [accountRole, setAccountRole] = useState<"user" | "agent">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const nameParam = searchParams.get("name");
    const tabParam = searchParams.get("tab");
    const oauthError = searchParams.get("error");

    if (emailParam) setEmail(decodeURIComponent(emailParam));
    if (nameParam) setName(decodeURIComponent(nameParam));
    if (tabParam === "register" || tabParam === "login") setMode(tabParam);
    if (oauthError) {
      setError(
        oauthError === "OAuthCallback"
          ? "Google login failed. Please check the Google redirect URI and environment variables."
          : "Google login failed. Please try again."
      );
    }
  }, [searchParams]);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const sendOTP = async () => {
    setSendingOtp(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send the code. Please try again.");
        return false;
      }
      startResendTimer();
      return true;
    } catch {
      setError("Network error occurred. Please try again.");
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (!phone.trim()) {
        setError("Please enter your phone number.");
        return;
      }
      if (!email.trim() || !password.trim()) {
        setError("Please fill in all fields.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);
      const fullPhone = `${countryCode}${phone.trim()}`;
      const res = await register(name.trim(), fullPhone, email.trim(), password, accountRole);
      setLoading(false);
      if (!res.ok) {
        setError(res.error ?? "Registration failed.");
        return;
      }
      router.push("/listings");
    } else {
      if (!email.trim() || !password.trim()) {
        setError("Please enter your email/phone number and password.");
        return;
      }
      const res = await login(email.trim(), password);
      if (!res.ok) {
        setError(res.error ?? "Login failed.");
        return;
      }
      router.push(res.role === "admin" ? "/admin" : "/listings");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("6 оронтой кодоо оруулна уу.");
      return;
    }

    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Код буруу байна.");
        return;
      }

      const fullPhone = `${countryCode}${phone.trim()}`;
      const regRes = await register(name.trim(), fullPhone, email.trim(), password, accountRole);
      if (!regRes.ok) {
        setError(regRes.error ?? "Бүртгэл амжилтгүй боллоо.");
        return;
      }
      router.push("/listings");
    } catch {
      setError("Баталгаажуулалт амжилтгүй боллоо. Дахин оролдоно уу.");
    } finally {
      setOtpLoading(false);
    }
  };

  const switchMode = (nextMode: string) => {
    setMode(nextMode);
    setStep("form");
    setError("");
    setPassword("");
    setConfirmPassword("");
    setAccountRole("user");
    setOtp(["", "", "", "", "", ""]);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    window.location.href = "/api/auth/google/start";
  };

  if (step === "otp") {
    return (
      <section className="auth-page-shell">
        <AuthVisual />
        <div className="auth-panel">
          <div className="auth-page-card">
            <p className="auth-page-back" onClick={() => router.push("/")}>
              go home
            </p>

            <div className="auth-otp-header">
              <div className="auth-otp-icon">✉</div>
              <h2>Имэйлээ шалгана уу</h2>
              <p>
                Бид 6 оронтой кодыг <strong>{email}</strong> хаяг руу илгээлээ.
              </p>
            </div>

            <div className="auth-otp-inputs" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  className={`auth-otp-box${digit ? " filled" : ""}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              type="button"
              className="solid-button auth-submit-btn"
              onClick={handleVerifyOTP}
              disabled={otpLoading || otp.join("").length !== 6}
            >
              {otpLoading ? "Шалгаж байна..." : "Баталгаажуулах"}
            </button>

            <div className="auth-otp-footer">
              {resendTimer > 0 ? (
                <span className="auth-otp-timer">Дахин илгээх {resendTimer}s</span>
              ) : (
                <button type="button" className="auth-otp-resend" onClick={sendOTP} disabled={sendingOtp}>
                  {sendingOtp ? "Илгээж байна..." : "Код дахин илгээх"}
                </button>
              )}
              <button
                type="button"
                className="auth-otp-back"
                onClick={() => {
                  setStep("form");
                  setOtp(["", "", "", "", "", ""]);
                  setError("");
                }}
              >
                Буцах
              </button>
            </div>
          </div>
          <AuthFooter />
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page-shell">
      <AuthVisual />
      <div className="auth-panel">
        <div className="auth-page-card">

          <div className="auth-page-heading">
            <h1>Welcome</h1>
            <p>Continue your experience with the system.</p>
          </div>

          <div className="auth-tab-row">
            <button type="button" className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => switchMode("login")}>
              Log In
            </button>
            <button type="button" className={mode === "register" ? "auth-tab active" : "auth-tab"} onClick={() => switchMode("register")}>
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleFormSubmit}>
            {mode === "register" && (
              <>
                <label className="field">
                  <span>Name</span>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
                </label>

                <label className="field">
                  <span>Phone Number</span>
                  <div className="auth-phone-row">
                    <select
                      className="auth-country-select"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} {c.code}
                        </option>
                      ))}
                    </select>
                    <input className="auth-phone-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="99xxxxxx" autoComplete="tel" />
                  </div>
                </label>

                <label className="field">
                  <span>Account type</span>
                  <select value={accountRole} onChange={(e) => setAccountRole(e.target.value as "user" | "agent")}>
                    <option value="user">User</option>
                    <option value="agent">Agent</option>
                  </select>
                </label>
              </>
            )}

            <label className="field">
              <span>{mode === "login" ? "Email or phone number" : "Email"}</span>
              <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={mode === "login" ? "Example: user@email.com" : "user@example.com"} autoComplete="email" />
            </label>

            <label className="field">
              <span>Password</span>
              <div className="auth-password-wrap">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "register" ? "new-password" : "current-password"} />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}>
                  {showPassword ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </label>

            {mode === "register" && (
              <label className="field">
                <span>Confirm Password</span>
                <div className={`auth-password-wrap${passwordsMismatch ? " mismatch" : passwordsMatch ? " match" : ""}`}>
                  <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1} aria-label={showConfirm ? "Нууц үг нуух" : "Нууц үг харах"}>
                    {showConfirm ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
                {passwordsMismatch && <span className="auth-field-hint error">Passwords do not match</span>}
                {passwordsMatch && <span className="auth-field-hint success">Passwords match</span>}
              </label>
            )}

            {mode === "login" && (
              <button type="button" className="auth-forgot-link">
                Forgot your password?
              </button>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="solid-button auth-submit-btn" disabled={loading || (mode === "register" && passwordsMismatch)}>
              {loading ? "Loading..." : mode === "register" ? "Register" : "Log In"}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn} disabled={googleLoading}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              {googleLoading ? "Opening Google..." : "Continue with Google"}
            </button>
          </form>
        </div>
        <AuthFooter />
      </div>
    </section>
  );
}

function AuthVisual() {
  return (
    <aside className="auth-visual" aria-label="Luxe Rentals">
      <div className="auth-visual-brand">RENT</div>
      <div className="auth-visual-copy">
        <span>PREMIUM LIVING</span>
        <h2>A special space designed just for you.</h2>
        <p>An ecosystem for easily renting, selling, and buying luxury real estate.</p>
      </div>
    </aside>
  );
}

function AuthFooter() {
  return (
    <footer className="auth-page-footer">
      <p>© 2026 RENT</p>
      <div className="auth-footer-icons" aria-hidden="true">
        <span>◎</span>
        <span>?</span>
      </div>
    </footer>
  );
}

function EyeOn() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 9c1.4-3.4 4.9-6 8-6s6.6 2.6 8 6c-1.4 3.4-4.9 6-8 6S2.4 12.4 1 9z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M7.5 7.6A2.5 2.5 0 0011.4 11M4.2 4.3C2.8 5.4 1.7 7 1 9c1.4 3.4 4.9 6 8 6a8.3 8.3 0 004.8-1.5M7 3.2A8 8 0 0117 9c-.4 1-.9 2-1.7 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
