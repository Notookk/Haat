import { createBrowserRouter } from 'react-router-dom';
import { SellerLayout } from '../layouts/SellerLayout';
import { RequireSeller, RequireGuestSeller } from '../features/auth/guards';
import { SellerLoginPage } from '../pages/SellerLoginPage';
import { SellerDashboardPage } from '../pages/SellerDashboardPage';
import { SellerProductsPage } from '../pages/SellerProductsPage';
import { SellerProductEditorPage } from '../pages/SellerProductEditorPage';
import { SellerOnboardingPage } from '../pages/SellerOnboardingPage';
import { SellerStorePage } from '../pages/SellerStorePage';
import { SellerCategoriesPage } from '../pages/SellerCategoriesPage';
import { SellerDeliverySlotsPage } from '../pages/SellerDeliverySlotsPage';
import { SellerOrdersPage } from '../pages/SellerOrdersPage';
import { SellerRevenuePage } from '../pages/SellerRevenuePage';
import { SellerSettingsPage } from '../pages/SellerSettingsPage';
import { SellerChatPage } from '../pages/SellerChatPage';
import { SellerNotFoundPage } from '../pages/SellerNotFoundPage';
import { SellerPendingApprovalPage } from '../pages/SellerPendingApprovalPage';
import { SellerBlockedPage } from '../pages/SellerBlockedPage';
import { SellerRejectedPage } from '../pages/SellerRejectedPage';

export const sellerRouter = createBrowserRouter([
  {
    element: <RequireGuestSeller />,
    children: [
      {
        path: '/login',
        element: <SellerLoginPage />,
      },
    ],
  },
  {
    element: <RequireSeller />,
    children: [
      {
        path: '/onboard',
        element: <SellerOnboardingPage />,
      },
      {
        path: '/status/pending',
        element: <SellerPendingApprovalPage />,
      },
      {
        path: '/status/blocked',
        element: <SellerBlockedPage />,
      },
      {
        path: '/status/rejected',
        element: <SellerRejectedPage />,
      },
      {
        element: <SellerLayout />,
        children: [
          {
            index: true,
            element: <SellerDashboardPage />,
          },
          {
            path: 'store',
            element: <SellerStorePage />,
          },
          {
            path: 'categories',
            element: <SellerCategoriesPage />,
          },
          {
            path: 'products',
            element: <SellerProductsPage />,
          },
          {
            path: 'products/new',
            element: <SellerProductEditorPage />,
          },
          {
            path: 'products/:id/edit',
            element: <SellerProductEditorPage />,
          },
          {
            path: 'orders',
            element: <SellerOrdersPage />,
          },
          {
            path: 'delivery-slots',
            element: <SellerDeliverySlotsPage />,
          },
          {
            path: 'revenue',
            element: <SellerRevenuePage />,
          },
          {
            path: 'chat',
            element: <SellerChatPage />,
          },
          {
            path: 'settings',
            element: <SellerSettingsPage />,
          },
          {
            path: '*',
            element: <SellerNotFoundPage />,
          },
        ],
      },
    ],
  },
]);
