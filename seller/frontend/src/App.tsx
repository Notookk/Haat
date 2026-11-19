import { RouterProvider } from 'react-router-dom';
import { sellerRouter } from './routes/seller.routes';

export function App() {
  return <RouterProvider router={sellerRouter} />;
}

export default sellerRouter;
