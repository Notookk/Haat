import { Outlet } from 'react-router-dom';
import { BuyerFooter, BuyerHeader } from './BuyerHeader';

export function BuyerLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <BuyerHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <BuyerFooter />
    </div>
  );
}
