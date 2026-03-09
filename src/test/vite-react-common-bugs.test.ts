/**
 * 20 Test Cases for Common React + Vite Bugs
 *
 * 涵蓋以下 bug 類別：
 * 1. Module & Import Errors  (TC01–TC03)
 * 2. Environment Variables    (TC04–TC05)
 * 3. Auth Service Logic       (TC06–TC09)
 * 4. AuthStore Persistence    (TC10–TC16)
 * 5. CartStore Singleton State(TC17–TC20)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";

import { loginApi, registerApi, getMeApi } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import {
    addToCart,
    removeFromCart,
    clearCart,
    getCart,
    getCartTotal,
    updateQuantity,
} from "@/store/cartStore";
import { cn } from "@/lib/utils";

// ─── Static source files ──────────────────────────────────────
const configSource = readFileSync(
    new URL("../services/config.ts", import.meta.url),
    "utf-8"
);
const pkgJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf-8")
);

// ─── Reset helpers ────────────────────────────────────────────
/** 清除 localStorage 並把 authStore 重置為未登入狀態 */
function resetAuthStore() {
    localStorage.clear();
    useAuthStore.getState().logout();
}

// =============================================================
// Group 1 ── Module & Import Errors (TC01–TC03)
// Common bug: ESM setup, VITE_ prefix, import.meta.env
// =============================================================
describe("TC01–03: Module & Import Errors", () => {
    /**
     * TC01 – package.json must declare "type":"module"
     * Bug: Without "type":"module", Vite/Node throws
     * "Cannot use import statement outside a module"
     */
    it('TC01: package.json 含有 "type": "module" (ESM-first)', () => {
        expect(pkgJson.type).toBe("module");
    });

    /**
     * TC02 – config.ts uses import.meta.env, NOT process.env
     * Bug: process.env is undefined in the browser;
     * Vite replaces import.meta.env at build time.
     */
    it("TC02: config.ts 使用 import.meta.env 而非 process.env", () => {
        expect(configSource).toContain("import.meta.env");
        expect(configSource).not.toContain("process.env");
    });

    /**
     * TC03 – every env var in config.ts must start with VITE_
     * Bug: Vite only exposes VITE_-prefixed variables to client
     * bundles; non-prefixed secrets are silently undefined.
     */
    it("TC03: config.ts 所有環境變數以 VITE_ 開頭", () => {
        // Match all import.meta.env.SOMETHING references
        const refs = configSource.match(/import\.meta\.env\.([A-Z0-9_]+)/g) ?? [];
        // Vite built-ins that don't require VITE_ prefix
        const builtins = new Set(["MODE", "DEV", "PROD", "BASE_URL", "SSR"]);

        expect(refs.length).toBeGreaterThan(0);

        refs.forEach((ref) => {
            const key = ref.replace("import.meta.env.", "");
            const isValid = key.startsWith("VITE_") || builtins.has(key);
            expect(isValid, `"${key}" 必須以 VITE_ 開頭或為 Vite 內建變數`).toBe(true);
        });
    });
});

// =============================================================
// Group 2 ── Environment Variable Troubles (TC04–TC05)
// Common bug: missing VITE_ prefix / no fallback when unset
// =============================================================
describe("TC04–05: Environment Variable Fallback", () => {
    /**
     * TC04 – loginApi falls back to mock when VITE_AUTH_API_URL is absent
     * Bug: app crashes if the missing-env-var case isn't handled.
     * Assumes VITE_AUTH_API_URL is NOT set in the test environment.
     */
    it("TC04: VITE_AUTH_API_URL 未設定時 loginApi 使用模擬模式", async () => {
        const res = await loginApi("testuser", "testpass");
        // Mock mode always succeeds
        expect(res.success).toBe(true);
        expect(res.message).toContain("模擬登入");
    });

    /**
     * TC05 – registerApi returns a clear error (not crash) when API URL is absent
     * Bug: calling fetch(undefined, ...) throws a runtime TypeError.
     */
    it("TC05: VITE_AUTH_API_URL 未設定時 registerApi 回傳錯誤訊息", async () => {
        const res = await registerApi("user", "u@test.com", "pass");
        expect(res.success).toBe(false);
        expect(res.message).toContain("VITE_AUTH_API_URL");
    });
});

// =============================================================
// Group 3 ── Auth Service Logic (TC06–TC09)
// Common bug: HMR named/default export mismatch exposes logic errors
// =============================================================
describe("TC06–09: Auth Service Mock Logic", () => {
    /**
     * TC06 – username containing 'admin' → role 'superadmin'
     * Verifies the role-derivation branch in mockLogin().
     */
    it("TC06: 含 'admin' 的帳號取得 superadmin 角色", async () => {
        const res = await loginApi("admin_boss", "anypass");
        expect(res.data?.user.role).toBe("superadmin");
    });

    /**
     * TC07 – normal username → role 'user'
     */
    it("TC07: 一般帳號取得 user 角色", async () => {
        const res = await loginApi("alice", "pass");
        expect(res.data?.user.role).toBe("user");
    });

    /**
     * TC08 – mock login always issues 'mock-jwt-token-dev'
     * Bug: if token is undefined, all subsequent auth headers are broken.
     */
    it("TC08: 模擬登入回傳固定 mock-jwt-token-dev", async () => {
        const res = await loginApi("alice", "pass");
        expect(res.data?.token).toBe("mock-jwt-token-dev");
    });

    /**
     * TC09 – getMeApi returns null (not throws) when no API URL
     * Bug: unhandled promise rejection breaks the app shell.
     */
    it("TC09: getMeApi 在無 API URL 時回傳 null 而非拋出例外", async () => {
        const user = await getMeApi("some-token");
        expect(user).toBeNull();
    });
});

// =============================================================
// Group 4 ── AuthStore – State & localStorage Persistence (TC10–TC16)
// Common bug: SPA refresh loses auth state if localStorage is ignored
// =============================================================
describe("TC10–16: AuthStore – State & Persistence", () => {
    beforeEach(resetAuthStore);
    afterEach(resetAuthStore);

    /**
     * TC10 – login() sets isAuthenticated = true
     * Bug: Protected routes always redirect if this flag isn't set.
     */
    it("TC10: login() 後 isAuthenticated 為 true", () => {
        useAuthStore
            .getState()
            .login("tok", { id: "1", username: "alice", role: "user" });
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    /**
     * TC11 – login() persists JWT to localStorage
     * Bug: 404-on-refresh if token disappears after page reload.
     */
    it("TC11: login() 將 token 存入 localStorage", () => {
        useAuthStore
            .getState()
            .login("jwt-xyz", { id: "1", username: "alice", role: "user" });
        expect(localStorage.getItem("neovega_token")).toBe("jwt-xyz");
    });

    /**
     * TC12 – login() serialises user object to localStorage
     * Bug: user info is lost on page reload if not persisted.
     */
    it("TC12: login() 將 user 序列化存入 localStorage", () => {
        useAuthStore
            .getState()
            .login("tok", { id: "2", username: "bob", role: "user" });
        const stored = JSON.parse(localStorage.getItem("neovega_user") ?? "{}");
        expect(stored.username).toBe("bob");
    });

    /**
     * TC13 – logout() removes token from localStorage
     * Bug: stale token causes API 401 errors after logout.
     */
    it("TC13: logout() 從 localStorage 移除 token", () => {
        useAuthStore
            .getState()
            .login("tok", { id: "1", username: "alice", role: "user" });
        useAuthStore.getState().logout();
        expect(localStorage.getItem("neovega_token")).toBeNull();
    });

    /**
     * TC14 – logout() resets role to 'guest'
     * Bug: protected UI still renders with stale role after logout.
     */
    it("TC14: logout() 後 role 重置為 guest", () => {
        useAuthStore
            .getState()
            .login("tok", { id: "1", username: "alice", role: "superadmin" });
        useAuthStore.getState().logout();
        expect(useAuthStore.getState().role).toBe("guest");
    });

    /**
     * TC15 – getAuthHeader() returns { Authorization: 'Bearer ...' }
     * Bug: API calls fail silently if the header key or format is wrong.
     */
    it("TC15: 已登入時 getAuthHeader() 回傳 Bearer token 標頭", () => {
        useAuthStore
            .getState()
            .login("my-jwt", { id: "1", username: "alice", role: "user" });
        const header = useAuthStore.getState().getAuthHeader();
        expect(header).toEqual({ Authorization: "Bearer my-jwt" });
    });

    /**
     * TC16 – getAuthHeader() returns {} when not logged in
     * Bug: spreading undefined into fetch headers causes TypeError.
     */
    it("TC16: 未登入時 getAuthHeader() 回傳空物件", () => {
        const header = useAuthStore.getState().getAuthHeader();
        expect(header).toEqual({});
    });
});

// =============================================================
// Group 5 ── CartStore Singleton State (TC17–TC20)
// Common bug: module-level global state leaks between HMR cycles
// and between tests when not properly reset.
// =============================================================
describe("TC17–20: CartStore – Singleton Global State", () => {
    beforeEach(clearCart);
    afterEach(clearCart);

    /**
     * TC17 – addToCart() adds a brand-new item with quantity = 1
     * Bug: item disappears if the array reference isn't replaced.
     */
    it("TC17: addToCart() 新增商品 quantity=1", () => {
        addToCart({
            id: "p1",
            name: "Book A",
            price: 100,
            image: "",
            category: "test",
        });
        const cart = getCart();
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(1);
    });

    /**
     * TC18 – addToCart() increments quantity for an existing id
     * Bug: duplicate items appear instead of quantity increase if
     * `find()` uses reference equality instead of `id` comparison.
     */
    it("TC18: 重複呼叫 addToCart() 累加 quantity", () => {
        addToCart({
            id: "p1",
            name: "Book A",
            price: 100,
            image: "",
            category: "test",
        });
        addToCart({
            id: "p1",
            name: "Book A",
            price: 100,
            image: "",
            category: "test",
        });
        const cart = getCart();
        expect(cart).toHaveLength(1); // still one entry
        expect(cart[0].quantity).toBe(2);
    });

    /**
     * TC19 – removeFromCart() removes the item by id
     * Bug: filter on wrong field leaves stale entries in cart.
     */
    it("TC19: removeFromCart() 依 id 移除商品", () => {
        addToCart({
            id: "p1",
            name: "Book A",
            price: 100,
            image: "",
            category: "test",
        });
        removeFromCart("p1");
        expect(getCart()).toHaveLength(0);
    });

    /**
     * TC20 – getCartTotal() = Σ(price × quantity) for all items
     * Bug: wrong total if quantity isn't factored in, or if floating-
     * point issues arise from price arithmetic.
     * Expected: 200×2 + 300×1 = 700
     */
    it("TC20: getCartTotal() 正確計算 price × quantity 總和", () => {
        // Add Book A twice (quantity becomes 2)
        addToCart({
            id: "p1",
            name: "Book A",
            price: 200,
            image: "",
            category: "test",
        });
        addToCart({
            id: "p1",
            name: "Book A",
            price: 200,
            image: "",
            category: "test",
        });
        // Add Book B once (quantity = 1)
        addToCart({
            id: "p2",
            name: "Book B",
            price: 300,
            image: "",
            category: "test",
        });

        expect(getCartTotal()).toBe(700);
    });
});
