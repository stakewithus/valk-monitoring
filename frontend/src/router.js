import Vue from "vue";
import Router from "vue-router";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/Home"),
      redirect: "/networks/mainnet",
      children: [
        {
          path: "/users",
          name: "user",
          component: () => import("@/views/UserManagement/UserList"),
          meta: {
            roles: ["admin"]
          }
        },
        {
          path: "/users/:id",
          name: "user-edit",
          component: () => import("@/views/UserManagement/UserEdit"),
          meta: {
            roles: ["admin"]
          }
        },
        {
          path: "/permission-denied",
          name: "permission-denied",
          component: () => import("@/views/PermissionDenied")
        },
        {
          path: "/account/settings",
          name: "settings",
          component: () => import("@/views/Account/Settings")
        },
        {
          path: "/networks/mainnet",
          name: "networksMainnet",
          component: () => import("@/views/Network")
        },
        {
          path: "/networks/testnet",
          name: "networksTestnet",
          component: () => import("@/views/Network")
        },
        {
          path: "/networks/alerting-thresholds",
          name: "network-alerting-thresholds",
          component: () => import("@/views/Network/AlertingThresholdSettings")
        },
        {
          path: "/networks/validator-mapping",
          name: "network-validator-mapping",
          component: () => import("@/views/Network/ValidatorMapping")
        },
        {
          path: "/networks/:projectName/:networkName/statistics",
          name: "network-statistics",
          component: () => import("@/views/Network/Statistics")
        },
        {
          path: "/networks/:projectName/:networkName/sentry-view",
          name: "network-sentry-view",
          component: () => import("@/views/Network/SentryView")
        }
      ]
    },
    {
      path: "/auth/login",
      name: "login",
      component: () => import("@/views/Auth/Login"),
      meta: {
        requiresAuth: false
      }
    },
    {
      path: "/auth/verify-email",
      name: "verify-email",
      component: () => import("@/views/Auth/VerifyEmail"),
      meta: {
        requiresAuth: false
      }
    },
    {
      path: "/auth/resend-email-verification",
      name: "send-email-verification",
      component: () => import("@/views/Auth/SendEmailVerification"),
      meta: {
        requiresAuth: false
      }
    },
    {
      path: "/auth/forgot-password",
      name: "forgot-password",
      component: () => import("@/views/Auth/ForgotPassword"),
      meta: {
        requiresAuth: false
      }
    },
    {
      path: "/auth/reset-password",
      name: "reset-password",
      component: () => import("@/views/Auth/ResetPassword"),
      meta: {
        requiresAuth: false
      }
    },
    {
      path: "*",
      name: "not-found",
      component: () => import("@/views/NotFound")
    }
  ]
});
