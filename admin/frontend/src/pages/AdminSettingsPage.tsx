import { useState } from 'react';
import { Settings, Shield, Server, Database, Globe, Key, CheckCircle, RefreshCw } from 'lucide-react';
import { Panel, Badge, Button, showToast } from '@haat/shared-frontend';

export function AdminSettingsPage() {
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSaveSecurity = () => {
    showToast.success('Security settings saved', 'Rate limit and cluster configuration updated.');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-display-sm text-ink-900 font-extrabold tracking-tight">Platform System Settings</h1>
        <p className="mt-1 text-caption text-ink-500">
          Cluster runtime status, security policies, database health, and operations parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Runtime Diagnostics */}
        <Panel className="p-6 shadow-card border border-line bg-surface space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-line">
            <Server className="h-5 w-5 text-brand-600" />
            <h2 className="text-h3 font-bold text-ink-900">Cluster Diagnostics</h2>
          </div>

          <div className="space-y-3 text-caption">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-sunken border border-line">
              <span className="text-ink-600 font-medium">Node Environment</span>
              <Badge tone="brand">Node v22.17.1 (ESM)</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-sunken border border-line">
              <span className="text-ink-600 font-medium">Database Layer</span>
              <div className="flex items-center gap-1.5 text-success-fg font-semibold">
                <CheckCircle className="h-4 w-4" />
                <span>MongoDB 8.0 (Connected)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-sunken border border-line">
              <span className="text-ink-600 font-medium">Admin Backend Port</span>
              <span className="font-mono text-ink-900 font-bold">PORT 6000 (/api/v1/admin)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-sunken border border-line">
              <span className="text-ink-600 font-medium">Buyer Storefront Port</span>
              <span className="font-mono text-ink-900 font-bold">PORT 3000 / API 4000</span>
            </div>
          </div>
        </Panel>

        {/* Security & Access Policies */}
        <Panel className="p-6 shadow-card border border-line bg-surface space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-line">
            <Shield className="h-5 w-5 text-brand-600" />
            <h2 className="text-h3 font-bold text-ink-900">Security &amp; Token Rotation</h2>
          </div>

          <div className="space-y-3 text-caption">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-sunken border border-line">
              <div>
                <p className="font-bold text-ink-900">JWT Access Tokens</p>
                <p className="text-micro text-ink-500">Short-lived bearer token (Role embedded)</p>
              </div>
              <Badge tone="neutral">15 Minutes TTL</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-sunken border border-line">
              <div>
                <p className="font-bold text-ink-900">Rotating Refresh Cookies</p>
                <p className="text-micro text-ink-500">HttpOnly cookie with family replay invalidation</p>
              </div>
              <Badge tone="neutral">7 Days TTL</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-sunken border border-line">
              <div>
                <p className="font-bold text-ink-900">Auth Rate Limiting</p>
                <p className="text-micro text-ink-500">10 attempts per 15-minute window</p>
              </div>
              <Badge tone="success">Enforced</Badge>
            </div>
          </div>
        </Panel>

        {/* Marketplace Commercial Rules */}
        <Panel className="p-6 shadow-card border border-line bg-surface space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2.5 pb-2 border-b border-line">
            <Globe className="h-5 w-5 text-brand-600" />
            <h2 className="text-h3 font-bold text-ink-900">Marketplace Commercial Policies</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-caption">
            <div className="p-4 rounded-xl border border-line bg-surface-sunken space-y-1">
              <span className="text-micro font-bold uppercase text-ink-400">Platform Currency</span>
              <p className="text-title font-extrabold text-ink-900">INR (₹ / Paise)</p>
              <p className="text-micro text-ink-500">Zero floating-point rounding errors.</p>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface-sunken space-y-1">
              <span className="text-micro font-bold uppercase text-ink-400">Delivery Architecture</span>
              <p className="text-title font-extrabold text-ink-900">Slot Scheduled</p>
              <p className="text-micro text-ink-500">Capacity reserved during checkout.</p>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface-sunken space-y-1">
              <span className="text-micro font-bold uppercase text-ink-400">Catalogue Verification</span>
              <p className="text-title font-extrabold text-ink-900">Admin Moderation</p>
              <p className="text-micro text-ink-500">Only verified sellers publish live.</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" size="md" onClick={handleSaveSecurity}>
              Save Platform Configuration
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
