'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Lock, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { admin, logout } = useAppStore();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      toast.error('New PINs do not match');
      return;
    }
    if (newPin.length < 4) {
      toast.error('PIN must be at least 4 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin?.email, pin: currentPin }),
      });
      if (!res.ok) {
        toast.error('Current PIN is incorrect');
        return;
      }
      toast.success('PIN updated successfully');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch {
      toast.error('Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" style={{ color: '#d4af37' }} />
              Admin Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-lg font-medium">{admin?.name}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-lg font-medium">{admin?.email}</p>
            </div>
            <Separator />
            <Button variant="destructive" className="gap-2" onClick={() => {
              logout();
              toast.success('Logged out');
            }}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5" style={{ color: '#d4af37' }} />
              Change PIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPin">Current PIN</Label>
                <Input id="currentPin" type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPin">New PIN</Label>
                <Input id="newPin" type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} required minLength={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirm New PIN</Label>
                <Input id="confirmPin" type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} required minLength={4} />
              </div>
              <Button type="submit" className="w-full text-white" style={{ background: '#1a1a2e' }} disabled={loading}>
                {loading ? 'Updating...' : 'Update PIN'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
