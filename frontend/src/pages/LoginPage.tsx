import { startTransition, useState } from "react";
import { Monitor, Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import ParticlesBackground from "@/components/ui/ParticlesBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ThemeMode } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export function LoginPage() {
  const { t } = useTranslation();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin123!");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeTheme = (theme ?? "light") as ThemeMode;
  const particleColors =
    resolvedTheme === "dark"
      ? ["#fb7185", "#a855f7", "#f97316", "#22d3ee", "#f472b6"]
      : ["#ff223e", "#5d1eb2", "#ff7300", "#22d3ee", "#d946ef"];

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(username, password);
      startTransition(() => {
        navigate(from, { replace: true });
      });
    } catch {
      toast.error("Kirish muvaffaqiyatsiz. Demo ma'lumotlari bilan urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 transition-colors">
      <ParticlesBackground colors={particleColors} height="100%" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <Card className="rounded-[32px] border border-border/80 bg-card/90 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <CardContent className="p-8 md:p-10">
              <form className="space-y-5 text-left" onSubmit={handleSubmit}>
                <div className="space-y-2 pb-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-muted-foreground">Mantiqiy Nazorat</p>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Tizimga kirish</h1>
                  <p className="text-sm leading-6 text-muted-foreground">Login va parolingizni kiriting.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">{t("login.username")}</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-12 rounded-2xl border-border/80 bg-background/80 px-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("login.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-2xl border-border/80 bg-background/80 px-4"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-foreground text-sm font-semibold text-background hover:bg-foreground/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("common.saving") : "Tizimga kirish"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">{t("login.demo")}</p>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card/85 p-1 shadow-sm backdrop-blur-xl">
              {[
                { value: "light", icon: SunMedium, label: "Light" },
                { value: "dark", icon: Moon, label: "Dark" },
                { value: "system", icon: Monitor, label: "System" },
              ].map((option) => {
                const Icon = option.icon;
                const isActive = activeTheme === option.value;

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isActive ? "default" : "ghost"}
                    size="icon-sm"
                    className={isActive ? "rounded-full" : "rounded-full text-muted-foreground"}
                    onClick={() => setTheme(option.value)}
                    aria-label={option.label}
                    title={option.label}
                  >
                    <Icon className="size-4" />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
