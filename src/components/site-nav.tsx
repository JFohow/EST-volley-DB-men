import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = new Set(["karl_juhkami@hotmail.com", "mjuhkami@gmail.com"]);
const IMPORT_OPEN_IN_DEV = import.meta.env.DEV;

function isAdminUser(user: { app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null } | null) {
  if (!user) return false;

  const appRole = user.app_metadata?.role;
  const appAdmin = user.app_metadata?.admin;
  const email = (user as { email?: string | null }).email?.toLowerCase() ?? "";

  return appRole === "admin" || appAdmin === true || ADMIN_EMAILS.has(email);
}

export function SiteNav() {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setIsAdmin(isAdminUser(data.session?.user ?? null));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(isAdminUser(session?.user ?? null));
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-estonia-dark text-white shadow-lg">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-5 w-8 flex-col overflow-hidden rounded-sm">
            <div className="flex-1 bg-estonia-blue" />
            <div className="flex-1 bg-black" />
            <div className="flex-1 bg-white" />
          </div>
          <span className="font-display text-xl uppercase tracking-tight sm:text-2xl">
            Eesti Võrkpall <span className="font-light opacity-70">DB</span>
          </span>
        </Link>
        <div className="order-3 w-full overflow-x-auto pb-1 sm:order-none sm:w-auto sm:overflow-visible sm:pb-0">
          <div className="flex min-w-max gap-4 text-xs font-medium uppercase tracking-wide opacity-80 sm:gap-6 sm:text-sm">
            <Link
              to="/"
              className="transition-colors hover:text-estonia-blue"
              activeProps={{ className: "text-estonia-blue" }}
              activeOptions={{ exact: true }}
            >
              {t("nav.home")}
            </Link>

            <Link
              to="/matches"
              className="transition-colors hover:text-estonia-blue"
              activeProps={{ className: "text-estonia-blue" }}
            >
              {t("nav.matches")}
            </Link>

            <Link
              to="/players"
              className="transition-colors hover:text-estonia-blue"
              activeProps={{ className: "text-estonia-blue" }}
            >
              {t("nav.players")}
            </Link>

            <Link
              to="/coaches"
              className="transition-colors hover:text-estonia-blue"
              activeProps={{ className: "text-estonia-blue" }}
            >
              {t("nav.coaches")}
            </Link>

            <Link
              to="/game-highs"
              className="transition-colors hover:text-estonia-blue"
              activeProps={{ className: "text-estonia-blue" }}
            >
              {t("nav.gameHighs")}
            </Link>

            <Link
              to="/total-top"
              className="transition-colors hover:text-estonia-blue"
              activeProps={{ className: "text-estonia-blue" }}
            >
              {t("nav.totalTop")}
            </Link>

            <Link
              to="/statistics"
              className="transition-colors hover:text-estonia-blue"
              activeProps={{ className: "text-estonia-blue" }}
            >
              {t("nav.statistics")}
            </Link>

            <Link
              to="/trivia"
              className="transition-colors hover:text-estonia-blue"
              activeProps={{ className: "text-estonia-blue" }}
            >
              {t("nav.trivia")}
            </Link>

            {IMPORT_OPEN_IN_DEV && (
              <Link
                to="/add"
                className="transition-colors hover:text-estonia-blue"
                activeProps={{ className: "text-estonia-blue" }}
              >
                ADD
              </Link>
            )}

            {(isAdmin || IMPORT_OPEN_IN_DEV) && (
              <Link
                to="/import"
                className="transition-colors hover:text-estonia-blue"
                activeProps={{ className: "text-estonia-blue" }}
              >
                Import
              </Link>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-2 py-1">
          <button
            onClick={() => i18n.changeLanguage("en")}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition ${i18n.language === "en"
              ? "bg-estonia-blue text-white"
              : "hover:bg-white/10"
              }`}
          >
            🇬🇧 EN
          </button>

          <button
            onClick={() => i18n.changeLanguage("et")}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition ${i18n.language === "et"
              ? "bg-estonia-blue text-white"
              : "hover:bg-white/10"
              }`}
          >
            🇪🇪 ET
          </button>
        </div>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const footerStatus = useMemo(() => {
    if (!userEmail) return "Admin area is logged out.";
    if (isAdmin) return `Logged in as admin: ${userEmail}`;
    return `Logged in as ${userEmail} (no admin role)`;
  }, [userEmail, isAdmin]);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const user = data.session?.user ?? null;
      setUserEmail(user?.email ?? null);
      setIsAdmin(isAdminUser(user));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUserEmail(user?.email ?? null);
      setIsAdmin(isAdminUser(user));
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message);
      setIsSubmitting(false);
      return;
    }

    setPassword("");
    setStatus("Signed in.");
    setIsSubmitting(false);
  }

  async function handleLogout() {
    setStatus("");
    setIsSubmitting(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus(error.message);
      setIsSubmitting(false);
      return;
    }

    setStatus("Signed out.");
    setIsSubmitting(false);
  }

  return (
    <footer className="mt-20 border-t border-white/5 bg-slate-900 px-6 py-12 text-slate-500">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-4 w-6 flex-col overflow-hidden rounded-sm">
              <div className="flex-1 bg-estonia-blue" />
              <div className="flex-1 bg-black" />
              <div className="flex-1 bg-white" />
            </div>
            <span className="font-display text-lg uppercase tracking-tight text-white">
              Eesti Võrkpall DB
            </span>
          </div>
          <p className="mt-4 max-w-xs text-xs">
            The historical statistical repository for the Estonia Men's National Volleyball Team.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Admin Access</div>
          <p className="mt-2 text-xs text-slate-400">{footerStatus}</p>

          {!userEmail ? (
            <form onSubmit={handleLogin} className="mt-3 grid gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Admin email"
                className="h-10 rounded-md border border-white/20 bg-slate-900 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-estonia-blue"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="h-10 rounded-md border border-white/20 bg-slate-900 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-estonia-blue"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 rounded-md bg-estonia-blue text-sm font-semibold text-white transition hover:bg-estonia-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Admin login"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="mt-3 h-10 w-full rounded-md border border-white/20 bg-transparent text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing out..." : "Logout"}
            </button>
          )}

          {status && <p className="mt-2 text-xs text-slate-400">{status}</p>}
        </div>
      </div>
    </footer>
  );
}
