import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { RequireAdmin, RequireGuestAdmin } from '../features/auth/guards';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminBuyersPage } from '../pages/AdminBuyersPage';
import { AdminSellersPage } from '../pages/AdminSellersPage';
import { AdminCategoriesPage } from '../pages/AdminCategoriesPage';
import { AdminCatalogPage } from '../pages/AdminCatalogPage';
import { AdminOrdersPage } from '../pages/AdminOrdersPage';
import { AdminTransactionsPage } from '../pages/AdminTransactionsPage';
import { AdminAuditLogsPage } from '../pages/AdminAuditLogsPage';
import { AdminNotFoundPage } from '../pages/AdminNotFoundPage';

export const adminRouter = createBrowserRouter([
  {
    element: <RequireGuestAdmin />,
    children: [
      {
        path: '/login',
        element: <AdminLoginPage />,
      },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: 'buyers',
            element: <AdminBuyersPage />,
          },
          {
            path: 'sellers',
            element: <AdminSellersPage />,
          },
          {
            path: 'catalog',
            element: <AdminCatalogPage />,
          },
          {
            path: 'categories',
            element: <AdminCategoriesPage />,
          },
          {
            path: 'orders',
            element: <AdminOrdersPage />,
          },
          {
            path: 'transactions',
            element: <AdminTransactionsPage />,
          },
          {
            path: 'audit-logs',
            element: <AdminAuditLogsPage />,
          },
          {
            path: '*',
            element: <AdminNotFoundPage />,
          },
        ],
      },
    ],
  },
]);
