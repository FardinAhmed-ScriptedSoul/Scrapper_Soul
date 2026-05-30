const { Router } = require('express');
const authControllers = require('../controllers/auth.controllers.js');
const authMiddleware = require('../middleware/auth.middleware.js'); // ✅ FIXED: Changed from 'middlewares' to 'middleware'

const authRouter = Router();

// --- Registration Lifecycle Routes ---
authRouter.post("/register-request", authControllers.registerUserController);
authRouter.post("/register-verify", authControllers.verifyOTPAndRegisterController);

// --- Dual-Step Secure Login System Routes ---
authRouter.post("/login", authControllers.loginUserController);
authRouter.post("/login-verify", authControllers.verifyOTPAndLoginController); 

// --- Private Session Control Routes ---
authRouter.post("/logout", authMiddleware, authControllers.logoutUserController);
authRouter.post("/logout-all", authMiddleware, authControllers.logoutFromAllDevicesController);
authRouter.get("/get-me", authMiddleware, authControllers.getMe);

// --- Passcode Management Recovery Routes ---
authRouter.post("/forgot-password", authControllers.forgotPasswordController);
authRouter.post("/reset-password/:token", authControllers.resetPasswordController);

module.exports = authRouter;