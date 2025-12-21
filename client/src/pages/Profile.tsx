import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { normalizeStorageUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, User, Shield, Wallet, Mail, Eye, EyeOff, Save, KeyRound, Upload, X, ImageIcon, Palette, Check, Link as LinkIcon, Unlink, Coins, Clock } from "lucide-react";
import { getAvailableWallets, linkWalletToAccount, type WalletProvider } from "@/lib/wallet";
import { NotificationSettings } from "@/components/NotificationSettings";

interface HoldingsData {
  balance: number | null;
  hasWallet: boolean;
  walletAddress?: string;
  holdDuration?: number | null;
  firstBuyAt?: string | null;
  message?: string;
}

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be 50 characters or less")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional().or(z.literal("")),
  avatarUrl: z.string().refine(
    (val) => val === "" || /^https?:\/\/.+/.test(val) || /^\//.test(val),
    "Must be a valid URL or empty"
  ).optional(),
  holdingsVisible: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain lowercase, uppercase, and number"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface AvailableIcon {
  id: string;
  name: string;
  fileUrl: string;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableWallets = getAvailableWallets();

  // Fetch available favicons/icons
  const { data: availableIcons = [] } = useQuery<AvailableIcon[]>({
    queryKey: ["/api/icons"],
    enabled: isAuthenticated,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      bio: user?.bio || "",
      avatarUrl: user?.avatarUrl || "",
      holdingsVisible: user?.holdingsVisible || false,
    },
  });

  // Watch the live form state for holdings visibility toggle
  const watchedHoldingsVisible = profileForm.watch("holdingsVisible");

  // Fetch user's wallet holdings balance (reacts to live toggle state)
  const { data: holdingsData, isLoading: isLoadingHoldings, isError: isHoldingsError } = useQuery<HoldingsData>({
    queryKey: ["/api/auth/holdings"],
    enabled: isAuthenticated && !!user?.walletAddress && watchedHoldingsVisible,
  });

  // Invalidate and refetch holdings when toggle becomes enabled
  useEffect(() => {
    if (watchedHoldingsVisible && user?.walletAddress && isAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/holdings"] });
    }
  }, [watchedHoldingsVisible, user?.walletAddress, isAuthenticated, queryClient]);
  
  const { uploadFile, isUploading, progress, error: uploadError } = useUpload({
    onSuccess: (response) => {
      const publicUrl = response.objectPath;
      profileForm.setValue("avatarUrl", publicUrl);
      setAvatarPreview(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Your avatar has been uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", {
        username: data.username,
        bio: data.bio || "",
        avatarUrl: data.avatarUrl || "",
        holdingsVisible: data.holdingsVisible,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (data?.user) {
        profileForm.reset({
          username: data.user.username || "",
          bio: data.user.bio || "",
          avatarUrl: data.user.avatarUrl || "",
          holdingsVisible: data.user.holdingsVisible || false,
        });
      }
      toast({ title: "Profile updated", description: "Your changes have been saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      setShowPasswordForm(false);
      toast({ title: "Password changed", description: "Your password has been updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Password change failed", description: error.message, variant: "destructive" });
    },
  });

  const updateFaviconMutation = useMutation({
    mutationFn: async (iconId: string | null) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", {
        selectedIconId: iconId || "",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update favicon");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Favicon updated", description: "Your browser tab icon has been updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground font-mono">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    setLocation("/");
    return null;
  }

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    await uploadFile(file);
  };

  const clearAvatar = () => {
    profileForm.setValue("avatarUrl", "");
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasEmailAuth = !!user.email;
  const hasWalletAuth = !!user.walletAddress;
  const isAdmin = user.role === "admin" || user.role === "founder";
  const [isUnlinkingWallet, setIsUnlinkingWallet] = useState(false);

  const handleUnlinkWallet = async () => {
    if (!hasWalletAuth) return;
    
    setIsUnlinkingWallet(true);
    try {
      await apiRequest("POST", "/api/auth/wallet/unlink");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Wallet unlinked",
        description: "Your wallet has been disconnected from your account",
      });
    } catch (error: any) {
      toast({
        title: "Unlink failed",
        description: error.message || "Failed to unlink wallet",
        variant: "destructive",
      });
    } finally {
      setIsUnlinkingWallet(false);
    }
  };

  const handleLinkWallet = async (provider: WalletProvider) => {
    if (hasWalletAuth) {
      toast({
        title: "Wallet already linked",
        description: "Your account already has a wallet connected",
        variant: "destructive",
      });
      return;
    }

    setIsLinkingWallet(true);
    try {
      const result = await linkWalletToAccount(provider);
      if (result) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({
          title: "Wallet linked",
          description: `Connected ${result.walletAddress.slice(0, 4)}...${result.walletAddress.slice(-4)}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Link failed",
        description: error.message || "Failed to link wallet",
        variant: "destructive",
      });
    } finally {
      setIsLinkingWallet(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono">Profile Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your account</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono">
              <User className="h-5 w-5" />
              Account Info
            </CardTitle>
            <CardDescription>Your account details and connected methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={normalizeStorageUrl(user.avatarUrl) || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-mono text-xl">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{user.username}</span>
                  {user.role === "admin" && (
                    <Shield className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {hasWalletAuth && (
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      {user.walletAddress?.slice(0, 4)}...{user.walletAddress?.slice(-4)}
                    </span>
                  )}
                  {hasEmailAuth && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </span>
                  )}
                </div>
                {hasWalletAuth && hasEmailAuth && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlinkWallet}
                    disabled={isUnlinkingWallet}
                    className="mt-2"
                    data-testid="button-unlink-wallet"
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    {isUnlinkingWallet ? "Unlinking..." : "Unlink Wallet"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Edit Profile</CardTitle>
            <CardDescription>Update your public profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="normie_123"
                          className="font-mono"
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormDescription>3-50 characters, letters, numbers, underscores only</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Tell us about yourself..."
                          className="font-mono resize-none"
                          rows={3}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>{field.value?.length || 0}/500 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Picture</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20 border-2 border-border">
                              <AvatarImage src={avatarPreview || normalizeStorageUrl(field.value) || undefined} />
                              <AvatarFallback className="bg-muted">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-2">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileSelect}
                                className="hidden"
                                data-testid="input-avatar-file"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                data-testid="button-upload-avatar"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {isUploading ? "Uploading..." : "Upload Image"}
                              </Button>
                              {(field.value || avatarPreview) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={clearAvatar}
                                  disabled={isUploading}
                                  data-testid="button-clear-avatar"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                          {isUploading && (
                            <div className="space-y-1">
                              <Progress value={progress} className="h-2" />
                              <p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>JPEG, PNG, GIF, or WebP. Max 5MB.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="holdingsVisible"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          {field.value ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          Show Holdings
                        </FormLabel>
                        <FormDescription>
                          Display your $NORMIE balance on your public profile
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-holdings-visible"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {user?.walletAddress && watchedHoldingsVisible && (
                  <div className="rounded-md border p-4 bg-muted/30" data-testid="section-holdings">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm font-medium">Your Holdings</span>
                    </div>
                    {isLoadingHoldings ? (
                      <div className="text-muted-foreground text-sm" data-testid="status-holdings-loading">Loading balance...</div>
                    ) : isHoldingsError ? (
                      <div className="text-muted-foreground text-sm" data-testid="status-holdings-error">
                        Unable to fetch holdings. Please try again later.
                      </div>
                    ) : holdingsData?.hasWallet ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-sm">Balance</span>
                          <span className="font-mono font-bold text-primary" data-testid="text-holdings-balance">
                            {holdingsData.balance !== null 
                              ? Number(holdingsData.balance).toLocaleString() 
                              : "0"} $NORMIE
                          </span>
                        </div>
                        {holdingsData.holdDuration && holdingsData.holdDuration > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Holding since
                            </span>
                            <span className="font-mono text-xs text-muted-foreground" data-testid="text-hold-duration">
                              {Math.floor(holdingsData.holdDuration / 86400)}d {Math.floor((holdingsData.holdDuration % 86400) / 3600)}h
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm" data-testid="text-holdings-message">
                        No holdings data available for your linked wallet.
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full"
                  data-testid="button-save-profile"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {hasEmailAuth && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono">
                <KeyRound className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your password</CardDescription>
            </CardHeader>
            <CardContent>
              {!showPasswordForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordForm(true)}
                  data-testid="button-change-password"
                >
                  Change Password
                </Button>
              ) : (
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              data-testid="input-current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormDescription>8+ characters with lowercase, uppercase, and number</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordForm(false);
                          passwordForm.reset();
                        }}
                        data-testid="button-cancel-password"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-save-password"
                      >
                        {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        )}

        {isAdmin && !hasWalletAuth && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono">
                <LinkIcon className="h-5 w-5" />
                Link Wallet
              </CardTitle>
              <CardDescription>
                Connect a Solana wallet to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 font-mono"
                  onClick={() => handleLinkWallet("phantom")}
                  disabled={isLinkingWallet || !availableWallets.includes("phantom")}
                  data-testid="button-link-phantom"
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
                  onClick={() => handleLinkWallet("solflare")}
                  disabled={isLinkingWallet || !availableWallets.includes("solflare")}
                  data-testid="button-link-solflare"
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
              {isLinkingWallet && (
                <p className="text-sm text-muted-foreground text-center font-mono">Connecting...</p>
              )}
              {availableWallets.length === 0 && (
                <p className="text-xs text-muted-foreground text-center font-mono">
                  Install Phantom or Solflare browser extension
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {availableIcons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono">
                <Palette className="h-5 w-5" />
                Browser Favicon
              </CardTitle>
              <CardDescription>
                Choose a custom icon to display in your browser tab
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                <button
                  onClick={() => updateFaviconMutation.mutate(null)}
                  disabled={updateFaviconMutation.isPending}
                  className={`relative p-2 border rounded-md hover-elevate flex flex-col items-center gap-1 ${
                    !user.selectedIconId ? "ring-2 ring-primary" : ""
                  }`}
                  data-testid="button-favicon-default"
                >
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">Default</span>
                  {!user.selectedIconId && (
                    <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
                {availableIcons.map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => updateFaviconMutation.mutate(icon.id)}
                    disabled={updateFaviconMutation.isPending}
                    className={`relative p-2 border rounded-md hover-elevate flex flex-col items-center gap-1 ${
                      user.selectedIconId === icon.id ? "ring-2 ring-primary" : ""
                    }`}
                    data-testid={`button-favicon-${icon.id}`}
                  >
                    <img
                      src={icon.fileUrl}
                      alt={icon.name}
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-full">{icon.name}</span>
                    {user.selectedIconId === icon.id && (
                      <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {updateFaviconMutation.isPending && (
                <p className="text-xs text-muted-foreground mt-2">Updating...</p>
              )}
            </CardContent>
          </Card>
        )}

        <NotificationSettings />

        <div className="text-center text-xs text-muted-foreground font-mono pb-8">
          Member since {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
