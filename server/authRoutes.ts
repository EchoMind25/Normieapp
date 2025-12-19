import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import sgMail from "@sendgrid/mail";
import { storage } from "./storage";
import {
  createJWT,
  hashPassword,
  verifyPassword,
  generateChallenge,
  verifyWalletSignature,
  generatePasswordResetToken,
  authMiddleware,
  determineRole,
  isReservedUsername,
  ADMIN_USERNAME,
  type AuthRequest,
} from "./auth";

const router = Router();

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const CHALLENGE_EXPIRY_MINUTES = 5;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

// =====================================================
// Wallet Authentication
// =====================================================

router.post("/wallet/challenge", async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress || typeof walletAddress !== "string" || walletAddress.length < 32 || walletAddress.length > 44) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    const challenge = generateChallenge();
    const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MINUTES * 60 * 1000);

    await storage.createAuthChallenge({
      walletAddress,
      challenge,
      expiresAt,
    });

    res.json({ challenge });
  } catch (error) {
    console.error("[Auth] Challenge generation error:", error);
    res.status(500).json({ error: "Failed to generate challenge" });
  }
});

router.post("/wallet/verify", async (req: Request, res: Response) => {
  try {
    const { walletAddress, challenge, signature, publicKey } = req.body;

    if (!walletAddress || !challenge || !signature || !publicKey) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const authChallenge = await storage.getAuthChallenge(walletAddress, challenge);
    if (!authChallenge) {
      res.status(400).json({ error: "Invalid or expired challenge" });
      return;
    }

    const isValid = verifyWalletSignature(challenge, signature, publicKey);
    if (!isValid) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    await storage.markAuthChallengeUsed(authChallenge.id);

    let user = await storage.getUserByWallet(walletAddress);
    
    if (!user) {
      let username = `normie_${walletAddress.slice(0, 8)}`;
      const role = determineRole(walletAddress);
      
      // Ensure wallet-generated usernames don't conflict with reserved names
      if (isReservedUsername(username)) {
        username = `user_${walletAddress.slice(0, 8)}`;
      }
      
      user = await storage.createUser({
        walletAddress,
        username,
        role,
      });
    } else if (user.role !== "admin" && determineRole(walletAddress) === "admin") {
      user = await storage.updateUser(user.id, { role: "admin" }) || user;
    }

    const token = createJWT({
      userId: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      role: user.role || "user",
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storage.createSession({
      userId: user.id,
      token,
      expiresAt,
    });

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (error) {
    console.error("[Auth] Wallet verification error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// =====================================================
// Email/Password Authentication
// =====================================================

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Password must be at least 8 characters with lowercase, uppercase, and number"),
    body("username")
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username must be alphanumeric with underscores"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, username } = req.body;

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        res.status(400).json({ error: "Username already taken" });
        return;
      }

      // Block reserved usernames (Normie, NormieCEO, variations)
      if (isReservedUsername(username)) {
        res.status(400).json({ error: "This username is reserved" });
        return;
      }

      const passwordHash = await hashPassword(password);

      const user = await storage.createUser({
        email,
        passwordHash,
        username,
        role: "user",
      });

      const token = createJWT({
        userId: user.id,
        walletAddress: null,
        email: user.email,
        role: user.role || "user",
      });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createSession({
        userId: user.id,
        token,
        expiresAt,
      });

      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      console.error("[Auth] Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  }
);

router.post(
  "/login",
  [
    body("identifier").notEmpty().withMessage("Username or email is required"),
    body("password").notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { identifier, password } = req.body;

      // Try to find user by email first, then by username
      let user = identifier.includes("@") 
        ? await storage.getUserByEmail(identifier.toLowerCase())
        : await storage.getUserByUsername(identifier);
      
      // If not found by username, try email as fallback
      if (!user && !identifier.includes("@")) {
        user = await storage.getUserByEmail(identifier.toLowerCase());
      }

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      if (user.bannedAt) {
        res.status(403).json({ error: "Account banned" });
        return;
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = createJWT({
        userId: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        role: user.role || "user",
      });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await storage.createSession({
        userId: user.id,
        token,
        expiresAt,
      });

      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          walletAddress: user.walletAddress,
          role: user.role,
          avatarUrl: user.avatarUrl,
          passwordChanged: user.passwordChanged ?? true,
        },
        token,
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

router.post("/logout", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.token) {
      const session = await storage.getSessionByToken(req.token);
      if (session) {
        await storage.deleteSession(session.id);
      }
    }

    res.clearCookie("authToken");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

// =====================================================
// Password Reset
// =====================================================

router.post(
  "/request-reset",
  [body("email").isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email } = req.body;

      const user = await storage.getUserByEmail(email);
      
      res.json({ message: "If an account exists, a reset email has been sent" });

      if (!user) return;

      const token = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);

      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
      });

      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        const resetLink = `${process.env.APP_URL || "https://normienation.replit.app"}/reset-password?token=${token}`;
        
        await sgMail.send({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: "Forgot Your Password, Bro? No Sweat, Let's Get You Back In",
          html: `
            <html>
            <body style="background: #0a0a0a; color: #e0e0e0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #00ff00; font-family: monospace; font-size: 28px; margin: 0;">$NORMIE</h1>
                  <p style="color: #666; font-size: 12px; margin-top: 5px;">NORMIE NATION</p>
                </div>
                
                <div style="background: #111; border: 1px solid #222; border-radius: 8px; padding: 30px;">
                  <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Yo, <span style="color: #00ff00;">Normie</span> here—your favorite bearded CEO grinding away at <span style="color: #00ff00;">$NORMIE</span> and all things built different.
                  </p>
                  
                  <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Forgot your password? Damn, that happens to the best of us, even in the trenches. Don't trip, just prove you're the real deal and I'll hook you up to reset that thing. We're all about that relentless vibe—no shortcuts, just straight-up getting back to the grind.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="display: inline-block; background: #00ff00; color: #000; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-family: monospace;">RESET PASSWORD</a>
                  </div>
                  
                  <p style="font-size: 14px; color: #888; margin: 20px 0 0 0; text-align: center;">
                    This link expires in 1 hour. If you didn't request this, just ignore it.
                  </p>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #222;">
                  <p style="font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                    Stay locked in, believe in the vision, and let's keep building. Much love to you and the <span style="color: #00ff00;">#NormieNation</span> fam.
                  </p>
                  
                  <p style="font-size: 16px; margin: 20px 0 5px 0;">
                    Your Normie CEO,<br>
                    <a href="https://x.com/NormieCEO" style="color: #00ff00; text-decoration: none;">@NormieCEO</a>
                  </p>
                  
                  <p style="font-size: 13px; color: #666; margin-top: 20px; font-style: italic;">
                    P.S. Tell my hot Normie wife <a href="https://x.com/JessyGHotOrNot" style="color: #00ff00; text-decoration: none;">@JessyGHotOrNot</a> I said hi if you see her. Built different, always.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #222;">
                  <p style="font-size: 12px; color: #444; margin: 0;">
                    Normie Nation | Built Different
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }
    } catch (error) {
      console.error("[Auth] Password reset request error:", error);
      res.json({ message: "If an account exists, a reset email has been sent" });
    }
  }
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty(),
    body("password")
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { token, password } = req.body;

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        res.status(400).json({ error: "Invalid or expired reset token" });
        return;
      }

      const passwordHash = await hashPassword(password);
      await storage.updateUser(resetToken.userId, { passwordHash });

      await storage.markPasswordResetTokenUsed(resetToken.id);

      await storage.deleteUserSessions(resetToken.userId);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("[Auth] Password reset error:", error);
      res.status(500).json({ error: "Password reset failed" });
    }
  }
);

// =====================================================
// Current User
// =====================================================

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        walletAddress: req.user.walletAddress,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
        bio: req.user.bio,
        holdingsVisible: req.user.holdingsVisible,
        selectedIconId: req.user.selectedIconId,
        createdAt: req.user.createdAt,
        passwordChanged: req.user.passwordChanged ?? true,
      },
    });
  } catch (error) {
    console.error("[Auth] Get current user error:", error);
    res.status(500).json({ error: "Failed to get user data" });
  }
});

router.post(
  "/force-change-password",
  authMiddleware,
  [
    body("currentPassword").notEmpty(),
    body("newPassword")
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Password must be at least 8 characters with lowercase, uppercase, and number"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!req.user.passwordHash) {
        res.status(400).json({ error: "Account does not use password authentication" });
        return;
      }

      const isValid = await verifyPassword(currentPassword, req.user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const newPasswordHash = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(req.user.id, {
        passwordHash: newPasswordHash,
        passwordChanged: true,
      });

      if (!updatedUser) {
        console.error(`[Auth] Force password change FAILED for user ${req.user.id} - updateUser returned undefined`);
        res.status(500).json({ error: "Failed to save password change" });
        return;
      }
      
      console.log(`[Auth] Force password change successful for user ${req.user.id} (${req.user.username})`);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("[Auth] Force change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

// =====================================================
// Profile Update
// =====================================================

router.patch(
  "/profile",
  authMiddleware,
  [
    body("username")
      .optional()
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username must be 3-50 alphanumeric characters with underscores"),
    body("bio")
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === "") return true;
        if (typeof value === "string" && value.length <= 500) return true;
        throw new Error("Bio must be 500 characters or less");
      }),
    body("avatarUrl")
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === "") return true;
        // Allow relative paths (e.g., /api/storage/public/...) or absolute URLs
        if (typeof value === "string" && value.startsWith("/")) return true;
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error("Must be a valid URL or empty");
        }
      }),
    body("holdingsVisible")
      .optional()
      .isBoolean()
      .withMessage("Holdings visibility must be true or false"),
    body("selectedIconId")
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === "") return true;
        if (typeof value === "string" && value.length > 0) return true;
        throw new Error("Must be a valid icon ID or null");
      }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const { username, bio, avatarUrl, holdingsVisible, selectedIconId } = req.body;
      const updates: Record<string, any> = {};

      if (username !== undefined && username !== req.user.username) {
        // Block reserved usernames (except for admin who already has "Normie")
        if (isReservedUsername(username) && req.user.role !== "admin") {
          res.status(400).json({ error: "This username is reserved" });
          return;
        }
        
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername && existingUsername.id !== req.user.id) {
          res.status(400).json({ error: "Username already taken" });
          return;
        }
        updates.username = username;
      }

      if (bio !== undefined) updates.bio = bio === "" ? null : bio;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl === "" ? null : avatarUrl;
      if (holdingsVisible !== undefined) updates.holdingsVisible = holdingsVisible;
      if (selectedIconId !== undefined) updates.selectedIconId = selectedIconId === "" ? null : selectedIconId;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      const updatedUser = await storage.updateUser(req.user.id, updates);
      if (!updatedUser) {
        res.status(500).json({ error: "Failed to update profile" });
        return;
      }

      res.json({
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          walletAddress: updatedUser.walletAddress,
          role: updatedUser.role,
          avatarUrl: updatedUser.avatarUrl,
          bio: updatedUser.bio,
          holdingsVisible: updatedUser.holdingsVisible,
          selectedIconId: updatedUser.selectedIconId,
          createdAt: updatedUser.createdAt,
        },
      });
    } catch (error) {
      console.error("[Auth] Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

// Change password (for email users)
router.post(
  "/change-password",
  authMiddleware,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("New password must be at least 8 characters with lowercase, uppercase, and number"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      if (!req.user.passwordHash) {
        res.status(400).json({ error: "Password change not available for wallet-only accounts" });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      const isValid = await verifyPassword(currentPassword, req.user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const newPasswordHash = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(req.user.id, { passwordHash: newPasswordHash, passwordChanged: true });
      
      if (!updatedUser) {
        console.error(`[Auth] Password change FAILED for user ${req.user.id} - updateUser returned undefined`);
        res.status(500).json({ error: "Failed to save password change" });
        return;
      }
      
      console.log(`[Auth] Password changed successfully for user ${req.user.id} (${req.user.username})`);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("[Auth] Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

export default router;
