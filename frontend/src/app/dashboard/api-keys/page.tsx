'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

export default function ApiKeysPage() {
  const { refreshUser } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await apiClient.getGatekeeperStatus();
      if (response.success) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setIsLoading(true);

    try {
      const response = await apiClient.updateApiKeys(apiKey, secretKey);
      setMessage({ type: 'success', text: response.data.message });
      setApiKey('');
      setSecretKey('');
      await loadStatus();
      await refreshUser();

      // Run gatekeeper check
      setTimeout(async () => {
        const checkResponse = await apiClient.checkAccess();
        if (checkResponse.success) {
          setMessage({
            type: checkResponse.data.status === 'APPROVED' ? 'success' : 'warning',
            text: checkResponse.data.message
          });
          await refreshUser();
        }
      }, 1000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error?.message || 'Failed to connect API keys'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your API keys?')) return;

    setIsLoading(true);
    try {
      const response = await apiClient.removeApiKeys();
      setMessage({ type: 'success', text: response.data.message });
      await loadStatus();
      await refreshUser();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error?.message || 'Failed to remove API keys'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold">BingX API Keys</h1>
          <p className="text-muted-foreground">
            Connect your BingX account to enable trading features
          </p>
        </div>

        {message.text && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/10 border border-green-500' :
            message.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500' :
            'bg-destructive/10 border border-destructive'
          }`}>
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-500' :
              message.type === 'warning' ? 'text-yellow-500' :
              'text-destructive'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {status && (
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Keys:</span>
                <span className={status.hasApiKeys ? 'text-green-500' : 'text-destructive'}>
                  {status.hasApiKeys ? '✓ Connected' : '✗ Not Connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referral Status:</span>
                <span className={status.isDirectReferral || status.isIndirectReferral ? 'text-green-500' : 'text-yellow-500'}>
                  {status.isDirectReferral ? 'Direct Referral' :
                   status.isIndirectReferral ? 'Indirect Referral' :
                   'Not Verified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wallet Balance:</span>
                <span className={status.walletBalance >= 200 ? 'text-green-500' : 'text-yellow-500'}>
                  {status.walletBalance ? `$${status.walletBalance.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Access Level:</span>
                <span className={`font-medium ${status.accessLevel === 'FULL' ? 'text-green-500' : 'text-yellow-500'}`}>
                  {status.accessLevel}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Connect BingX Account</CardTitle>
            <CardDescription>
              Enter your BingX API credentials to enable trading features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConnect} className="space-y-4">
              <Input
                type="text"
                label="API Key"
                placeholder="Enter your BingX API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                disabled={isLoading}
              />

              <Input
                type="password"
                label="Secret Key"
                placeholder="Enter your BingX secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
                disabled={isLoading}
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {status?.hasApiKeys ? 'Update Keys' : 'Connect'}
                </Button>

                {status?.hasApiKeys && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRemove}
                    disabled={isLoading}
                  >
                    Remove Keys
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Get BingX API Keys</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <ol className="text-sm space-y-2">
              <li>Log in to your BingX account</li>
              <li>Go to <strong>API Management</strong> in your account settings</li>
              <li>Click <strong>Create API</strong></li>
              <li>Enable <strong>Futures Trading</strong> permission</li>
              <li>Set IP restrictions for security (optional but recommended)</li>
              <li>Copy your API Key and Secret Key</li>
              <li>Paste them in the form above</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500 rounded">
              <p className="text-xs text-yellow-500 m-0">
                ⚠️ <strong>Security Notice:</strong> Never share your API keys with anyone.
                FLAXU encrypts your keys with AES-256-GCM and stores them securely.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
