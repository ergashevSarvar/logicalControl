import { startTransition, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Workflow, ChartSpline } from "lucide-react";
import { toast } from "react-toastify";

import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin123!");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(username, password);
      toast.success("Session opened");
      startTransition(() => {
        navigate(from, { replace: true });
      });
    } catch {
      toast.error("Login failed. Demo credential bilan urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-6 md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--primary-rgb),0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(var(--accent-rgb),0.18),transparent_34%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6 rounded-[40px] border border-border/60 bg-card/70 p-8 shadow-2xl shadow-primary/10 backdrop-blur md:p-10">
          <div className="space-y-4">
            <AppLogo
              className="rounded-[24px] border border-primary/20 bg-background/70 px-3 py-2"
              imageClassName="size-12"
              title="Mantiqiy nazorat platformasi"
              subtitle="Enterprise rule orchestration workspace"
              titleClassName="text-sm font-semibold uppercase tracking-[0.22em] text-primary"
              subtitleClassName="text-xs"
            />
            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">{t("login.title")}</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{t("login.description")}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "JWT security", text: "Token-based access with protected routing." },
              { icon: Workflow, title: "Visual builder", text: "Flow-driven no-code rule design for MN logic." },
              { icon: ChartSpline, title: "Ops telemetry", text: "Dashboard, logs, yearly trends, and performance." },
            ].map((item) => (
              <Card key={item.title} className="border-border/70 bg-background/80">
                <CardContent className="space-y-3 p-5">
                  <div className="inline-flex rounded-2xl border border-border/70 bg-primary/10 p-3 text-primary">
                    <item.icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="border-border/70 bg-card/88 shadow-2xl shadow-primary/10 backdrop-blur">
          <CardContent className="p-8 md:p-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Secure entry</p>
                <h2 className="text-3xl font-semibold">Sign in</h2>
                <p className="text-sm text-muted-foreground">{t("login.demo")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t("login.username")}</Label>
                <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={isSubmitting}>
                {isSubmitting ? t("common.saving") : t("login.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
