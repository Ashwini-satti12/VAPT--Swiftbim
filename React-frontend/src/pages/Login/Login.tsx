import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import { getPasswordStrengthMessage } from "../../utils/employeeActive";
import { PasswordStrengthHints } from "../../components/ProtectedRoute";
import loginBackground from "../../assets/login_bg.png";

type Step = "login" | "forgot" | "otp" | "reset";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [step, setStep] = useState<Step>("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const emailVal = (form.elements.namedItem("email") as HTMLInputElement)?.value?.trim() || email.trim();
    const passwordVal = (form.elements.namedItem("password") as HTMLInputElement)?.value || password;
    if (emailVal !== email) setEmail(emailVal);
    if (passwordVal !== password) setPassword(passwordVal);
    if (!emailVal || !passwordVal) {
      setError("Email and password are required");
      return;
    }
    setSubmitting(true);
    const result = await login(emailVal, passwordVal);
    setSubmitting(false);

    if (result.success && result.user) {
      const { user_role } = result.user;

      if (user_role === 'Technical Director') navigate("/td/dashboard", { replace: true });
      else if (user_role === 'BIM Lead') navigate("/bl/dashboard", { replace: true });
      else if (user_role === 'BIM Coordinator') navigate("/bc/dashboard", { replace: true });
      else if (user_role === 'Vendor PM') navigate("/vpm/dashboard", { replace: true });
      else if (user_role === 'Vendor BIM Lead' || user_role === 'Vendor Bim Lead') navigate("/vendor-bim-lead/dashboard", { replace: true });
      else if (user_role === 'Vendor Employee') navigate("/ve/dashboard", { replace: true });
      else if (user_role === 'Vendor' || user_role === 'Vendor Admin') navigate("/v/dashboard", { replace: true });
      else if (user_role === 'BIM Modeler') navigate("/bm/dashboard", { replace: true });
      else navigate("/dashboard", { replace: true });
    } else {
      setError(result.message || "Login failed");
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post<{ success: boolean; message?: string }>(
        "/api/auth/forgot-password",
        { email },
      );
      if (data.success) {
        setStep("otp");
        setOtp("");
        setMessage("Enter the 4-digit OTP sent to your email.");
        setResendCooldown(60);
      } else setError(data.message || "Failed");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to send OTP",
      );
    }
    setSubmitting(false);
  }

  async function handleResendOtp() {
    if (!email.trim() || resendCooldown > 0 || resending) return;
    setError("");
    setMessage("");
    setResending(true);
    try {
      const { data } = await api.post<{
        success: boolean;
        message?: string;
        retry_after_seconds?: number;
      }>("/api/auth/resend-otp", { email });
      if (data.success) {
        setOtp("");
        setMessage(data.message || "A new code has been sent to your email.");
        setResendCooldown(60);
      } else {
        setError(data.message || "Failed to resend code");
      }
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string; retry_after_seconds?: number } } })
        ?.response?.data;
      if (resp?.retry_after_seconds) {
        setResendCooldown(resp.retry_after_seconds);
      }
      setError(resp?.message || "Failed to resend code");
    }
    setResending(false);
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post<{
        success: boolean;
        reset_token?: string;
      }>("/api/auth/verify-otp", { email, otp });
      if (data.success && data.reset_token) {
        setResetToken(data.reset_token);
        setStep("reset");
        setMessage("Set your new password.");
      } else setError("Invalid OTP.");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid OTP",
      );
    }
    setSubmitting(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password1 !== password2) {
      setError("Passwords do not match.");
      return;
    }
    const pwdMsg = getPasswordStrengthMessage(password1);
    if (pwdMsg) {
      setError(pwdMsg);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post<{ success: boolean; message?: string }>(
        "/api/auth/reset-password",
        {
          reset_token: resetToken,
          password1,
          password2,
        },
      );
      if (data.success) {
        setMessage("Password updated. You can now sign in.");
        setStep("login");
        setPassword(password1);
        setPassword1("");
        setPassword2("");
        setResetToken("");
        setError("");
      } else setError(data.message || "Failed");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to reset",
      );
    }
    setSubmitting(false);
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-end bg-[#f5f5f7] px-4 md:pr-12 lg:pr-20"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        backgroundPosition: "right center",
      }}
    >
      <div className="w-full max-w-sm shrink-0">
        <div className="bg-white/95 rounded-2xl shadow-[0_18px_40px_rgba(15,23,42,0.18)] overflow-hidden px-10 py-10">
          <div className="mb-8">
            {step === "forgot" ? (
              <>
                <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 mb-3 text-center">
                  Forgot Password?
                </h2>
                <p className="text-slate-600 text-sm md:text-base text-center leading-relaxed">
                  Don&apos;t worry! It Happens.
                </p>
                <p className="text-slate-600 text-sm md:text-base text-center mt-1">
                  Please enter the email address linked with your account.
                </p>
              </>
            ) : step === "otp" ? (
              <>
                <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 mb-3 text-center">
                  OTP Verification
                </h2>
                <p className="text-slate-600 text-sm md:text-base text-center">
                  Please enter the 4-digit verification code we sent to your email.
                  It is valid for 10 minutes.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-rose-500 mb-1">
                  Welcome to SwiftBIM
                </p>
                <h2 className="text-[32px] leading-tight font-semibold text-slate-900 mb-2">
                  {step === "login" && "Login"}
                  {step === "reset" && "Reset Password"}
                </h2>
                {step === "reset" && (
                  <p className="text-slate-500 text-sm">{message}</p>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100">
              {error}
            </div>
          )}
          {message && step === "otp" && !error && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm border border-emerald-100">
              {message}
            </div>
          )}

          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Enter your email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#ADADAD] text-slate-900 placeholder-[#808080] text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-[#DD4342]"
                  placeholder="Username or email address"
                  required
                />
              </div>
              <div>
                <div className="relative">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Enter your Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#ADADAD] text-slate-900 placeholder-[#808080] text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-[#DD4342] pr-10"
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-700"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("forgot");
                      setError("");
                    }}
                    className="pt-2 text-[14px] text-[#4285F4] font-Gantari"
                  >
                    Forgot Password
                  </button>
                </div>
              </div>
              <div className="pt-2 flex justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex justify-center items-center px-16 py-2.5 rounded-lg bg-[#DD4342] text-[#FFFFFF] text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Signing in..." : "Login"}
                </button>
              </div>
            </form>
          )}

          {step === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-5">
              <div>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-[#808080] text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full max-w-[280px] py-3 rounded-lg bg-[#E94E4E] hover:bg-[#d94545] text-white text-base font-semibold disabled:opacity-50 transition"
                >
                  {submitting ? "Sending..." : "Send Code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setError("");
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtp} className="space-y-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(-1);
                      setOtp((prev) => {
                        const arr = prev.split("");
                        arr[i] = v;
                        return arr.join("").slice(0, 4);
                      });
                      if (v && i < 3)
                        document.getElementById(`otp-${i + 1}`)?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0)
                        document.getElementById(`otp-${i - 1}`)?.focus();
                    }}
                    name={`otp-${i}`}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-center text-lg font-bold rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E64F4E] focus:border-transparent"
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
              <div className="flex flex-col items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || otp.length < 4}
                  className="w-full max-w-[280px] py-3 rounded-lg bg-[#E64F4E] hover:bg-[#d94545] text-white text-base font-semibold disabled:opacity-50 transition"
                >
                  {submitting ? "Verifying..." : "Verify"}
                </button>
                <p className="text-sm text-slate-600 text-center">
                  Didn&apos;t receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending || resendCooldown > 0}
                    className="text-[#4285F4] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending
                      ? "Sending..."
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend code"}
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("forgot");
                    setError("");
                    setMessage("");
                    setOtp("");
                    setResendCooldown(0);
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <label
                  htmlFor="newpassword"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  New Password
                </label>
                <input
                  id="newpassword"
                  type={showPassword1 ? "text" : "password"}
                  value={password1}
                  onChange={(e) => setPassword1(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword1(!showPassword1)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-700"
                  aria-label="Toggle visibility"
                >
                  {showPassword1 ? "🙈" : "👁"}
                </button>
                {password1 ? <PasswordStrengthHints password={password1} /> : null}
              </div>
              <div className="relative">
                <label
                  htmlFor="confirmpassword"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmpassword"
                  type={showPassword2 ? "text" : "password"}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2(!showPassword2)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-700"
                  aria-label="Toggle visibility"
                >
                  {showPassword2 ? "🙈" : "👁"}
                </button>
              </div>
              <div className="flex gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep("otp");
                    setError("");
                  }}
                  className="px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
