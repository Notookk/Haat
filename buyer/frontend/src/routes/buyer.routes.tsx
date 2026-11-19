import type { RouteObject } from 'react-router-dom';
import { BuyerLayout } from '../layouts/BuyerLayout';
import { CataloguePage } from '../pages/CataloguePage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductPage } from '../pages/ProductPage';
import { RegisterPage } from '../pages/RegisterPage';
import { StorefrontPage } from '../pages/StorefrontPage';
import { ChatPage } from '../pages/ChatPage';
import { WishlistPage } from '../pages/WishlistPage';
import { CartPage } from '../pages/CartPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const buyerRoutes: RouteObject[] = [
  {
    path: '/',
    element: <BuyerLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalogue', element: <CataloguePage /> },
      { path: 'product/:slug', element: <ProductPage /> },
      { path: 'store/:slug', element: <StorefrontPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
