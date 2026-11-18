import { Navigate, Outlet, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { BuyerLayout } from './components/layout/BuyerLayout';
import { SellerLayout } from './components/layout/SellerLayout';
import { RequireAuth, RequireSeller } from './features/auth/guards';
import { CataloguePage } from './pages/CataloguePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProductEditorPage } from './pages/ProductEditorPage';
import { ProductPage } from './pages/ProductPage';
import { RegisterPage } from './pages/RegisterPage';
import { SellerOnboardingPage } from './pages/SellerOnboardingPage';
import { SellerProductsPage } from './pages/SellerProductsPage';

/** One scroll restoration for both surfaces, so the buyer and seller apps never fight over it. */
function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <BuyerLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'catalogue', element: <CataloguePage /> },
          { path: 'product/:slug', element: <ProductPage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          {
            element: <RequireAuth />,
            children: [{ path: 'seller/onboarding', element: <SellerOnboardingPage /> }],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <RequireSeller />,
        children: [
          {
            path: '/seller',
            element: <SellerLayout />,
            children: [
              { index: true, element: <Navigate to="/seller/products" replace /> },
              { path: 'products', element: <SellerProductsPage /> },
              { path: 'products/new', element: <ProductEditorPage /> },
              { path: 'products/:id/edit', element: <ProductEditorPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export default router;
