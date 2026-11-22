import { Navigate, type RouteObject } from 'react-router-dom';
import { BuyerLayout } from '../layouts/BuyerLayout';
import { CataloguePage } from '../pages/CataloguePage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductPage } from '../pages/ProductPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ChatPage } from '../pages/ChatPage';
import { WishlistPage } from '../pages/WishlistPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrdersPage } from '../pages/OrdersPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { RfqPage } from '../pages/RfqPage';
import { AddressesPage } from '../pages/AddressesPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const buyerRoutes: RouteObject[] = [
  {
    path: '/',
    element: <BuyerLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalogue', element: <CataloguePage /> },
      { path: 'product/:slug', element: <ProductPage /> },
      { path: 'store/:slug', element: <Navigate to="/catalogue" replace /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'rfq', element: <RfqPage /> },
      { path: 'addresses', element: <AddressesPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
