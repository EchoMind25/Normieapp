import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet, Mail, User, Lock, Eye, EyeOff, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { getAvailableWallets } from "@/lib/wallet";

interface HumanVerificationProps {
  verified: boolean;
  onVerify: (verified: boolean) => void;
}

function HumanVerification({ verified, onVerify }: HumanVerificationProps) {
  const [challenge, setChallenge] = useState(() => generateChallenge());
  const [userAnswer, setUserAnswer] = useState("");
  const [error, setError] = useState("");

  function generateChallenge() {
    const operations = [
      { op: "+", fn: (a: number, b: number) => a + b },
      { op: "-", fn: (a: number, b: number) => a - b },
    ];
    const { op, fn } = operations[Math.floor(Math.random() * operations.length)];
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const num1 = op === "-" ? Math.max(a, b) : a;
    const num2 = op === "-" ? Math.min(a, b) : b;
    return { num1, num2, op, answer: fn(num1, num2) };
  }

  const refreshChallenge = useCallback(() => {
    setChallenge(generateChallenge());
    setUserAnswer("");
    setError("");
    onVerify(false);
  }, [onVerify]);

  const handleVerify = useCallback(() => {
    const parsed = parseInt(userAnswer, 10);
    if (isNaN(parsed)) {
      setError("Enter a number, anon");
      return;
    }
    if (parsed === challenge.answer) {
      onVerify(true);
      setError("");
    } else {
      setError("Wrong answer, try again");
      refreshChallenge();
    }
  }, [userAnswer, challenge.answer, onVerify, refreshChallenge]);

  if (verified) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border border-chart-1/30 bg-chart-1/10">
        <ShieldCheck className="h-5 w-5 text-chart-1" />
        <span className="font-mono text-sm text-chart-1">Verified Human</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-md border border-border bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <Label className="font-mono text-xs text-muted-foreground">
          Prove you're not a bot
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={refreshChallenge}
          data-testid="button-refresh-captcha"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 p-2 rounded-md bg-background border border-border font-mono text-center text-lg">
          <span className="text-chart-1">{challenge.num1}</span>
          <span className="text-muted-foreground mx-2">{challenge.op}</span>
          <span className="text-chart-1">{challenge.num2}</span>
          <span className="text-muted-foreground mx-2">=</span>
          <span className="text-foreground">?</span>
        </div>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          className="w-16 font-mono text-center"
          placeholder="?"
          data-testid="input-captcha-answer"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleVerify}
          className="font-mono"
          data-testid="button-verify-captcha"
        >
          Check
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive font-mono">{error}</p>
      )}
    </div>
  );
}

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain lowercase, uppercase, and a number"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const { loginWithWallet, loginWithEmail, register, requestPasswordReset } = useAuth();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsHumanVerified(false);
    }
    onOpenChange(newOpen);
  };

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", username: "", password: "", confirmPassword: "" },
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const availableWallets = getAvailableWallets();

  const handleWalletConnect = async (provider: "phantom" | "solflare") => {
    setIsLoading(true);
    try {
      const success = await loginWithWallet(provider);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const success = await loginWithEmail(data.identifier, data.password);
      if (success) {
        onOpenChange(false);
        loginForm.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const success = await register(data.email, data.password, data.username);
      if (success) {
        onOpenChange(false);
        registerForm.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      const success = await requestPasswordReset(data.email);
      if (success) {
        setActiveTab("login");
        resetForm.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl text-center">
            Normie Nation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center font-mono">
              Connect with Solana Wallet
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 font-mono"
                onClick={() => handleWalletConnect("phantom")}
                disabled={isLoading || !availableWallets.includes("phantom")}
                data-testid="button-connect-phantom"
              >
                <Wallet className="h-4 w-4 mr-2" />
                <div className="flex flex-col items-start">
                  <span>Phantom</span>
                  {!availableWallets.includes("phantom") && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Not Detected</span>
                  )}
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex-1 font-mono"
                onClick={() => handleWalletConnect("solflare")}
                disabled={isLoading || !availableWallets.includes("solflare")}
                data-testid="button-connect-solflare"
              >
                <Wallet className="h-4 w-4 mr-2" />
                <div className="flex flex-col items-start">
                  <span>Solflare</span>
                  {!availableWallets.includes("solflare") && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Not Detected</span>
                  )}
                </div>
              </Button>
            </div>
            {availableWallets.length === 0 && (
              <p className="text-xs text-muted-foreground text-center font-mono">
                Install Phantom or Solflare browser extension to connect
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-mono">
                Or continue with email
              </span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="font-mono" data-testid="tab-login">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="font-mono" data-testid="tab-register">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="login-identifier" className="font-mono text-xs">Username or Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-identifier"
                      type="text"
                      className="pl-9 font-mono"
                      placeholder="Normie or anon@normie.com"
                      {...loginForm.register("identifier")}
                      data-testid="input-login-identifier"
                    />
                  </div>
                  {loginForm.formState.errors.identifier && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.identifier.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="login-password" className="font-mono text-xs">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 pr-9 font-mono"
                      placeholder="secret123"
                      {...loginForm.register("password")}
                      data-testid="input-login-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <HumanVerification verified={isHumanVerified} onVerify={setIsHumanVerified} />

                <Button
                  type="submit"
                  className="w-full font-mono"
                  disabled={isLoading || !isHumanVerified}
                  data-testid="button-login"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Login
                </Button>

                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground hover:text-primary font-mono"
                  onClick={() => setActiveTab("reset")}
                  data-testid="button-forgot-password"
                >
                  Forgot password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="register-username" className="font-mono text-xs">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-username"
                      className="pl-9 font-mono"
                      placeholder="normie_chad"
                      {...registerForm.register("username")}
                      data-testid="input-register-username"
                    />
                  </div>
                  {registerForm.formState.errors.username && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="register-email" className="font-mono text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      className="pl-9 font-mono"
                      placeholder="anon@normie.com"
                      {...registerForm.register("email")}
                      data-testid="input-register-email"
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="register-password" className="font-mono text-xs">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 pr-9 font-mono"
                      placeholder="StrongPass123"
                      {...registerForm.register("password")}
                      data-testid="input-register-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="register-confirm" className="font-mono text-xs">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-confirm"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 font-mono"
                      placeholder="StrongPass123"
                      {...registerForm.register("confirmPassword")}
                      data-testid="input-register-confirm"
                    />
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <HumanVerification verified={isHumanVerified} onVerify={setIsHumanVerified} />

                <Button
                  type="submit"
                  className="w-full font-mono"
                  disabled={isLoading || !isHumanVerified}
                  data-testid="button-register"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>

            {activeTab === "reset" && (
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground font-mono">
                  Enter your email to receive a password reset link.
                </p>
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="reset-email" className="font-mono text-xs">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        className="pl-9 font-mono"
                        placeholder="anon@normie.com"
                        {...resetForm.register("email")}
                        data-testid="input-reset-email"
                      />
                    </div>
                    {resetForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{resetForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full font-mono"
                    disabled={isLoading}
                    data-testid="button-reset"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Send Reset Link
                  </Button>

                  <button
                    type="button"
                    className="w-full text-xs text-muted-foreground hover:text-primary font-mono"
                    onClick={() => setActiveTab("login")}
                  >
                    Back to login
                  </button>
                </form>
              </div>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
