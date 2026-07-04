import { Link,useNavigate } from "react-router-dom";
import { useState } from "react";
import { APP_NAME } from "../constants/appName";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { loginUser } from "../services/api";

function LoginPage() {
  const navigate = useNavigate();
  const [appTitleMain, appTitleSuffix = ""] = APP_NAME.split(" & ");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorText(""); 

    try {
      const response = await loginUser({ email, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem(STORAGE_KEYS.session, "1");
      if (response.data.user) {
        localStorage.setItem(
          STORAGE_KEYS.profile,
          JSON.stringify({
            name: response.data.user.name,
            email: response.data.user.email,
            avatarUrl: "",
            joinedDate: new Date().toISOString().slice(0, 10),
          }),
        );
      }

      navigate("/events", { replace: true });
    } catch (err) {
      console.error(err);
      localStorage.removeItem("token");
      setErrorText(
        err.response?.data?.message ||
          "Login failed. Backend server is unavailable or credentials are invalid."
      );
    }
  };

  return (
    <div className="relative app-viewport overflow-hidden text-slate-900">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-12 h-72 w-72 rounded-full bg-blue-300/25 blur-3xl" />

      <div className="flex min-h-full flex-col overflow-hidden">
        <header className="z-10 shrink-0 border-b border-slate-700/70 bg-slate-950/55 px-3 py-3 backdrop-blur-md sm:px-4">
          <div className="mx-auto max-w-7xl">
            <div className="inline-flex rounded-2xl border border-slate-700/20 bg-gradient-to-r from-slate-900 via-blue-800 to-cyan-700 px-3.5 py-1.5 shadow-lg shadow-blue-500/20 ring-1 ring-white/30">
              <h1 className="leading-tight text-white">
                <span className="block text-sm font-extrabold tracking-wide sm:text-base">
                  {appTitleMain}
                </span>
                {appTitleSuffix && (
                  <span className="block text-right text-[10px] font-semibold tracking-wide text-cyan-100 sm:text-xs">
                    &amp; {appTitleSuffix}
                  </span>
                )}
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-7xl items-center justify-center p-4 md:p-6">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/80 p-4 text-slate-900 shadow-xl backdrop-blur-md sm:p-8 md:p-10">
              <h1 className="mb-6 text-center text-2xl font-bold sm:mb-12 sm:text-4xl md:text-5xl">
                Login
              </h1>

              {errorText && (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorText}
                </p>
              )}

              <form className="space-y-5 sm:space-y-10" onSubmit={handleSubmit}>
                <div className="group relative my-3 rounded-xl border border-slate-300/90 bg-white/70 px-3 pb-3 pt-6 transition focus-within:border-blue-500 focus-within:bg-white sm:my-6 sm:px-4 sm:pb-5 sm:pt-9">
                  <input
                    type="email"
                    required
                    placeholder=" "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="peer w-full bg-transparent text-sm text-slate-800 outline-none sm:text-base"
                  />
                  <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-focus:top-2 peer-focus:-translate-y-1 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-1 peer-[:not(:placeholder-shown)]:text-[11px] sm:left-4 sm:text-base sm:peer-focus:top-3 sm:peer-focus:text-xs sm:peer-[:not(:placeholder-shown)]:top-3 sm:peer-[:not(:placeholder-shown)]:text-xs">
                    Enter your email
                  </label>
                </div>

                <div className="group relative my-3 rounded-xl border border-slate-300/90 bg-white/70 px-3 pb-3 pt-6 transition focus-within:border-blue-500 focus-within:bg-white sm:my-6 sm:px-4 sm:pb-5 sm:pt-9">
                  <input
                    type="password"
                    required minLength={4} maxLength={12}
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer w-full bg-transparent text-sm text-slate-800 outline-none sm:text-base"
                  />
                  <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all peer-focus:top-2 peer-focus:-translate-y-1 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-1 peer-[:not(:placeholder-shown)]:text-[11px] sm:left-4 sm:text-base sm:peer-focus:top-3 sm:peer-focus:text-xs sm:peer-[:not(:placeholder-shown)]:top-3 sm:peer-[:not(:placeholder-shown)]:text-xs">
                    Enter your password
                  </label>
                </div>

                <div className="my-4 flex items-center justify-between text-sm text-slate-600 sm:my-8 sm:text-base">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="rounded accent-slate-900" />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="hover:underline">
                      Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-md border-2 border-transparent bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:border-slate-900 hover:bg-slate-800 sm:py-4 sm:text-lg"
                >
                  Log In
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600 sm:mt-12 sm:text-base">
                Do not have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-slate-700 hover:underline"
                >
                  Register
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default LoginPage;