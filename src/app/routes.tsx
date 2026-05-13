import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { MyListings } from "./components/MyListings";
import { Applications } from "./components/Applications";
import { CurrentInterns } from "./components/CurrentInterns";
import { Settings } from "./components/Settings";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Login } from "./components/auth/Login";
import { Signup } from "./components/auth/Signup";
import { ConfirmOtp } from "./components/auth/ConfirmOtp";
import { ForgotPassword } from "./components/auth/ForgotPassword";

export const router = createBrowserRouter([
  // Public auth routes
  { path: "/login", Component: Login },
  { path: "/signup", Component: Signup },
  { path: "/confirm-otp", Component: ConfirmOtp },
  { path: "/forgot-password", Component: ForgotPassword },

  // Protected routes (require login)
  {
    Component: AuthGuard,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "listings", Component: MyListings },
          { path: "applications", Component: Applications },
          { path: "interns", Component: CurrentInterns },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
