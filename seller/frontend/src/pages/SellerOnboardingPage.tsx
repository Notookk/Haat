import { Navigate, useNavigate } from 'react-router-dom';
import { useSellerAuth } from '../features/auth/SellerAuthProvider';
import { SellerApplicationForm } from '../features/onboarding/SellerApplicationForm';

export function SellerOnboardingPage() {
  const { seller } = useSellerAuth();
  const navigate = useNavigate();

  if (seller?.status === 'ACTIVE') return <Navigate to="/" replace />;
  if (seller?.status === 'BLOCKED') return <Navigate to="/status/blocked" replace />;

  const isEditing = Boolean(seller && (seller.status === 'PENDING_APPROVAL' || seller.status === 'REJECTED'));

  return (
    <div className="w-full min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SellerApplicationForm
          isEditing={isEditing}
          onCancel={isEditing ? () => navigate('/status/pending') : undefined}
          onSubmitSuccess={() => navigate('/status/pending', { replace: true })}
        />
      </div>
    </div>
  );
}
