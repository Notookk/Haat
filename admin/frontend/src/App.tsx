import { RouterProvider } from 'react-router-dom';
import { adminRouter } from './routes/admin.routes';

export function App() {
  return <RouterProvider router={adminRouter} />;
}

export default adminRouter;
