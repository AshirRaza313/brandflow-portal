'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  LayoutDashboard, Users, CreditCard, FileText, Package, ShoppingCart,
  BarChart3, Settings, LogOut, Menu, X, ChevronDown, Search, Plus,
  Edit, Trash2, Download, Filter, TrendingUp, DollarSign, UserCheck,
  Eye, EyeOff, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// ===== LOGIN PAGE =====
function LoginPage() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAppStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      login(data.admin, data.token);
    } catch {
      setError('Network error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full opacity-10" style={{ background: '#d4af37' }} />
      <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full opacity-10" style={{ background: '#d4af37' }} />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full opacity-5" style={{ background: '#d4af37' }} />
      <Card className="w-full max-w-md shadow-2xl border-0 relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <h1 className="text-3xl font-bold" style={{ color: '#1a1a2e' }}>Brand<span style={{ color: '#d4af37' }}>Flow</span></h1>
          </div>
          <CardTitle className="text-xl" style={{ color: '#1a1a2e' }}>Admin Portal</CardTitle>
          <CardDescription>Sign in to manage your brand platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <input type="email" id="email" placeholder="admin@brandflow.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Code</Label>
              <div className="relative">
                <input id="pin" type={showPin ? 'text' : 'password'} placeholder="Enter 4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPin ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}
            <Button type="submit" className="w-full text-white" style={{ background: '#1a1a2e' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-6">Demo: admin@brandflow.com / 1234</p>
        </CardContent>
      </Card>
    </div>
  );
}



// ===== SHARED COMPONENTS =====
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-gray-100 text-gray-800',
    completed: 'bg-green-100 text-green-800',
  };
  return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'} variant="secondary">{status}</Badge>;
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#1a1a2e' }}>{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-12 text-muted-foreground"><p>{message}</p></div>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// ===== DASHBOARD PAGE =====
function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [chartData, setChartData] = useState<{ month: string; revenue: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/reports/sales'),
        ]);
        const statsData = await statsRes.json();
        const chartData_ = await chartRes.json();
        setStats(statsData);
        setChartData(chartData_.monthlyRevenue || []);
      } catch { toast.error('Failed to load dashboard data'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of your business" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  );

  const statCards = [
    { label: 'Total Revenue', value: `$${((stats?.totalRevenue as number) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#d4af37' },
    { label: 'Total Clients', value: String(stats?.totalClients || 0), icon: Users, color: '#3b82f6' },
    { label: 'Active Subscriptions', value: String(stats?.activeSubscriptions || 0), icon: UserCheck, color: '#22c55e' },
    { label: 'Total Orders', value: String(stats?.totalOrders || 0), icon: ShoppingCart, color: '#a855f7' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of your business performance" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: '#1a1a2e' }}>{card.value}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${card.color}15` }}>
                  <card.icon className="h-6 w-6" style={{ color: card.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" style={{ color: '#d4af37' }} />Monthly Revenue</CardTitle>
          <CardDescription>Revenue over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#d4af37" fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {(stats?.recentOrders as Array<Record<string, unknown>>)?.slice(0, 5).map((order) => (
                  <TableRow key={order.id as string}>
                    <TableCell className="font-medium">{(order.client as Record<string, string>)?.name}</TableCell>
                    <TableCell>${Number(order.total).toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={order.status as string} /></TableCell>
                  </TableRow>
                )) || <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No recent orders</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {(stats?.recentSubscriptions as Array<Record<string, unknown>>)?.slice(0, 5).map((sub) => (
                  <TableRow key={sub.id as string}>
                    <TableCell className="font-medium">{(sub.client as Record<string, string>)?.name}</TableCell>
                    <TableCell>{(sub.plan as Record<string, string>)?.name}</TableCell>
                    <TableCell><StatusBadge status={sub.status as string} /></TableCell>
                  </TableRow>
                )) || <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No recent subscriptions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===== CLIENTS PAGE =====
function ClientsPage() {
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Record<string, string> | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '' });

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients?search=${search}`);
      setClients(await res.json());
    } catch { toast.error('Failed to load clients'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openCreate = () => {
    setEditingClient(null);
    setForm({ name: '', email: '', phone: '', company: '', address: '' });
    setDialogOpen(true);
  };

  const openEdit = (client: Record<string, unknown>) => {
    setEditingClient(client as Record<string, string>);
    setForm({
      name: client.name as string,
      email: client.email as string,
      phone: (client.phone as string) || '',
      company: (client.company as string) || '',
      address: (client.address as string) || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    try {
      if (editingClient) {
        await fetch(`/api/clients/${editingClient.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: editingClient.status }) });
        toast.success('Client updated');
      } else {
        await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        toast.success('Client created');
      }
      setDialogOpen(false);
      fetchClients();
    } catch { toast.error('Failed to save client'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      toast.success('Client deleted');
      fetchClients();
    } catch { toast.error('Failed to delete client'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle="Manage your client base" action={
        <Button onClick={openCreate} className="text-white" style={{ background: '#1a1a2e' }}><Plus className="h-4 w-4 mr-2" />Add Client</Button>
      } />
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." value={search} onChange={(e) => { setSearch(e.target.value); setLoading(true); }} className="pl-10" />
      </div>
      {loading ? <LoadingSkeleton /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Company</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id as string}>
                    <TableCell className="font-medium">{c.name as string}</TableCell>
                    <TableCell className="hidden sm:table-cell">{(c.company as string) || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{c.email as string}</TableCell>
                    <TableCell><StatusBadge status={c.status as string} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id as string)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && <TableRow><TableCell colSpan={5}><EmptyState message="No clients found" /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="text-white" style={{ background: '#1a1a2e' }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== PLANS PAGE =====
function PlansPage() {
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ name: '', price: '', duration: '30', features: '' });

  const fetchPlans = async () => {
    try { setPlans(await (await fetch('/api/plans')).json()); } catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => { setEditingPlan(null); setForm({ name: '', price: '', duration: '30', features: '' }); setDialogOpen(true); };
  const openEdit = (plan: Record<string, unknown>) => {
    setEditingPlan(plan);
    setForm({ name: plan.name as string, price: String(plan.price), duration: String(plan.duration || 30), features: plan.features as string });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price required'); return; }
    try {
      const featuresArr = form.features.split(',').map(f => f.trim()).filter(Boolean);
      const body = { ...form, features: featuresArr };
      if (editingPlan) {
        await fetch(`/api/plans/${editingPlan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        toast.success('Plan updated');
      } else {
        await fetch('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        toast.success('Plan created');
      }
      setDialogOpen(false); fetchPlans();
    } catch { toast.error('Failed to save plan'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Plan deleted'); fetchPlans();
    } catch { toast.error('Failed to delete plan'); }
  };

  const planColors = ['#d4af37', '#1a1a2e', '#3b82f6'];

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72" />)}</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Plans" subtitle="Manage subscription plans" action={
        <Button onClick={openCreate} className="text-white" style={{ background: '#1a1a2e' }}><Plus className="h-4 w-4 mr-2" />Add Plan</Button>
      } />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, idx) => {
          const features = JSON.parse(plan.features as string) as string[];
          return (
            <Card key={plan.id as string} className="hover:shadow-lg transition-shadow relative overflow-hidden">
              <div className="h-1.5" style={{ background: planColors[idx % planColors.length] }} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{plan.name as string}</CardTitle>
                  <Badge variant="secondary">{(plan._count as Record<string, number>)?.subscriptions || 0} subs</Badge>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold" style={{ color: '#1a1a2e' }}>${Number(plan.price)}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id as string)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPlan ? 'Edit Plan' : 'Add New Plan'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Plan Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Professional" /></div>
            <div><Label>Price ($/month)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><Label>Duration (days)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
            <div><Label>Features (comma-separated)</Label><Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Feature 1, Feature 2, Feature 3" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="text-white" style={{ background: '#1a1a2e' }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== SUBSCRIPTIONS PAGE =====
function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Record<string, unknown>[]>([]);
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ clientId: '', planId: '' });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [subs, cls, pls] = await Promise.all([fetch('/api/subscriptions'), fetch('/api/clients'), fetch('/api/plans')]);
        setSubscriptions(await subs.json());
        setClients(await cls.json());
        setPlans(await pls.json());
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const handleCreate = async () => {
    if (!form.clientId || !form.planId) { toast.error('Select client and plan'); return; }
    try {
      const res = await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
      toast.success('Subscription created (invoice auto-generated)');
      setDialogOpen(false);
      const subs = await (await fetch('/api/subscriptions')).json();
      setSubscriptions(subs);
    } catch { toast.error('Failed to create subscription'); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this subscription?')) return;
    try {
      await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      toast.success('Subscription cancelled');
      const subs = await (await fetch('/api/subscriptions')).json();
      setSubscriptions(subs);
    } catch { toast.error('Failed to cancel'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" subtitle="Manage client subscriptions" action={
        <Button onClick={() => { setForm({ clientId: '', planId: '' }); setDialogOpen(true); }} className="text-white" style={{ background: '#1a1a2e' }}><Plus className="h-4 w-4 mr-2" />New Subscription</Button>
      } />
      {loading ? <LoadingSkeleton /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="hidden md:table-cell">Amount</TableHead>
                  <TableHead className="hidden lg:table-cell">Start</TableHead>
                  <TableHead className="hidden lg:table-cell">End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id as string}>
                    <TableCell className="font-medium">{(sub.client as Record<string, string>)?.name}</TableCell>
                    <TableCell>{(sub.plan as Record<string, string>)?.name}</TableCell>
                    <TableCell className="hidden md:table-cell">${Number(sub.amount).toFixed(2)}/mo</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{format(new Date(sub.startDate as string), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{format(new Date(sub.endDate as string), 'MMM d, yyyy')}</TableCell>
                    <TableCell><StatusBadge status={sub.status as string} /></TableCell>
                    <TableCell className="text-right">
                      {(sub.status as string) === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(sub.id as string)}>
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Subscription</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Client</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.status === 'active').map(c => <SelectItem key={c.id as string} value={c.id as string}>{c.name as string}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Plan</Label>
              <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.status === 'active').map(p => <SelectItem key={p.id as string} value={p.id as string}>{p.name as string} - ${Number(p.price)}/mo</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="text-white" style={{ background: '#1a1a2e' }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== INVOICES PAGE =====
function InvoicesPage() {
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genForm, setGenForm] = useState({ clientId: '', amount: '', notes: '' });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (clientFilter !== 'all') params.set('clientId', clientFilter);
      const res = await fetch(`/api/invoices?${params}`);
      setInvoices(await res.json());
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [statusFilter, clientFilter]);

  useEffect(() => {
    const fetchClients = async () => { const r = await fetch('/api/clients'); setClients(await r.json()); };
    fetchClients();
    fetchInvoices();
  }, [fetchInvoices]);

  const handleGenerate = async () => {
    if (!genForm.clientId || !genForm.amount) { toast.error('Client and amount required'); return; }
    try {
      await fetch('/api/invoices/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...genForm, amount: parseFloat(genForm.amount) }) });
      toast.success('Invoice generated');
      setGenDialogOpen(false); fetchInvoices();
    } catch { toast.error('Failed to generate invoice'); }
  };

  const handleDownload = (id: string, invNum: string) => {
    window.open(`/api/invoices/${id}/download`, '_blank');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle="Manage and track invoices" action={
        <Button onClick={() => { setGenForm({ clientId: '', amount: '', notes: '' }); setGenDialogOpen(true); }} className="text-white" style={{ background: '#1a1a2e' }}><Plus className="h-4 w-4 mr-2" />Generate Invoice</Button>
      } />
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id as string} value={c.id as string}>{c.name as string}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {loading ? <LoadingSkeleton /> : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id as string}>
                      <TableCell className="font-medium">{inv.invoiceNumber as string}</TableCell>
                      <TableCell>{(inv.client as Record<string, string>)?.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">${Number(inv.amount).toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">${Number(inv.tax).toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">${Number(inv.total).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(inv.dueDate as string), 'MMM d, yy')}</TableCell>
                      <TableCell><StatusBadge status={inv.status as string} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(inv.id as string, inv.invoiceNumber as string)}><Download className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Client</Label>
              <Select value={genForm.clientId} onValueChange={(v) => setGenForm({ ...genForm, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id as string} value={c.id as string}>{c.name as string}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount ($)</Label><Input type="number" value={genForm.amount} onChange={(e) => setGenForm({ ...genForm, amount: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={genForm.notes} onChange={(e) => setGenForm({ ...genForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} className="text-white" style={{ background: '#1a1a2e' }}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== PRODUCTS PAGE =====
function ProductsPage() {
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ name: '', price: '', category: '', stock: '0' });

  const fetchProducts = async () => {
    try { setProducts(await (await fetch('/api/products')).json()); } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const openCreate = () => { setEditingProduct(null); setForm({ name: '', price: '', category: '', stock: '0' }); setDialogOpen(true); };
  const openEdit = (p: Record<string, unknown>) => {
    setEditingProduct(p);
    setForm({ name: p.name as string, price: String(p.price), category: (p.category as string) || '', stock: String(p.stock) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price required'); return; }
    try {
      if (editingProduct) {
        await fetch(`/api/products/${editingProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        toast.success('Product updated');
      } else {
        await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        toast.success('Product created');
      }
      setDialogOpen(false); fetchProducts();
    } catch { toast.error('Failed to save product'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Manage your product catalog" action={
        <Button onClick={openCreate} className="text-white" style={{ background: '#1a1a2e' }}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
      } />
      {loading ? <LoadingSkeleton /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Ordered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id as string}>
                    <TableCell className="font-medium">{p.name as string}</TableCell>
                    <TableCell className="hidden sm:table-cell">{(p.category as string) || '-'}</TableCell>
                    <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.stock as number}</TableCell>
                    <TableCell className="hidden md:table-cell">{(p._count as Record<string, number>)?.orderItems || 0}</TableCell>
                    <TableCell><StatusBadge status={p.status as string} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Price ($)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="text-white" style={{ background: '#1a1a2e' }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== ORDERS PAGE =====
function OrdersPage() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try { setOrders(await (await fetch('/api/orders')).json()); } catch { toast.error('Failed to load orders'); }
      finally { setLoading(false); }
    };
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle="View and manage all orders" />
      {loading ? <LoadingSkeleton /> : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id as string}>
                      <TableCell className="font-mono text-sm">{(o.id as string).slice(-6).toUpperCase()}</TableCell>
                      <TableCell className="font-medium">{(o.client as Record<string, string>)?.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{(o.orderItems as unknown[]).length} items</TableCell>
                      <TableCell className="font-semibold">${Number(o.total).toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{format(new Date(o.createdAt as string), 'MMM d, yyyy')}</TableCell>
                      <TableCell><StatusBadge status={o.status as string} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(o); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{(selectedOrder.client as Record<string, string>)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge status={selectedOrder.status as string} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{format(new Date(selectedOrder.createdAt as string), 'MMM d, yyyy')}</span>
              </div>
              <Separator />
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(selectedOrder.orderItems as Array<Record<string, unknown>>)?.map((item) => (
                    <TableRow key={item.id as string}>
                      <TableCell className="font-medium">{(item.product as Record<string, string>)?.name}</TableCell>
                      <TableCell className="text-right">{item.quantity as number}</TableCell>
                      <TableCell className="text-right">${Number(item.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">${Number(item.total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span style={{ color: '#d4af37' }}>${Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== REPORTS PAGE =====
function ReportsPage() {
  const [reportType, setReportType] = useState('sales');
  const [chartData, setChartData] = useState<{ month: string; revenue: number; orders: number }[]>([]);
  const [topClients, setTopClients] = useState<{ name: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchChart = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/sales');
        const data = await res.json();
        setChartData(data.monthlyRevenue || []);
        setTopClients(data.topClients || []);
      } catch { toast.error('Failed to load chart data'); }
      finally { setLoading(false); }
    };
    fetchChart();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) { toast.error('Failed to generate report'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brandflow-${reportType}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch { toast.error('Failed to export report'); }
    finally { setExporting(false); }
  };

  const COLORS = ['#d4af37', '#1a1a2e', '#3b82f6', '#22c55e', '#a855f7'];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Generate and export business reports" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-sm text-muted-foreground">Report Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="clients">Clients</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="products">Products</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Date From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Date To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
        </div>
        <div className="flex items-end">
          <Button onClick={handleExport} className="w-full text-white" style={{ background: '#1a1a2e' }} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />{exporting ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" style={{ color: '#d4af37' }} />Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? <Skeleton className="h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#d4af37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" style={{ color: '#1a1a2e' }} />Order Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? <Skeleton className="h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#1a1a2e" strokeWidth={2} dot={{ fill: '#d4af37', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {topClients.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Top Clients by Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topClients} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {topClients.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== SETTINGS PAGE =====
function SettingsPage() {
  const { admin, logout } = useAppStore();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin?.email, pin: currentPin }) });
      if (!res.ok) { toast.error('Current PIN incorrect'); return; }
      toast.success('Verification successful (PIN update requires backend extension)');
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
    } catch { toast.error('Failed to verify'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Admin Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-muted-foreground">Name</Label><p className="text-lg font-medium">{admin?.name}</p></div>
            <Separator />
            <div><Label className="text-muted-foreground">Email</Label><p className="text-lg font-medium">{admin?.email}</p></div>
            <Separator />
            <Button variant="destructive" className="gap-2" onClick={() => { logout(); toast.success('Logged out'); }}>
              <LogOut className="h-4 w-4" />Sign Out
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Change PIN</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleChangePin} className="space-y-3">
              <div><Label>Current PIN</Label><Input type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} required /></div>
              <div><Label>New PIN</Label><Input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} required minLength={4} /></div>
              <div><Label>Confirm New PIN</Label><Input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} required minLength={4} /></div>
              <Button type="submit" className="w-full text-white" style={{ background: '#1a1a2e' }} disabled={loading}>{loading ? 'Verifying...' : 'Update PIN'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===== SIDEBAR & MAIN LAYOUT =====
const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'plans', label: 'Plans', icon: CreditCard },
  { key: 'subscriptions', label: 'Subscriptions', icon: FileText },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

function Sidebar() {
  const { currentPage, setCurrentPage, admin, logout, sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} style={{ background: '#1a1a2e' }}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5">
          <h1 className="text-xl font-bold text-white">Brand<span style={{ color: '#d4af37' }}>Flow</span></h1>
          <button className="lg:hidden text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-px mx-4" style={{ background: 'rgba(212,175,55,0.3)' }} />

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setCurrentPage(item.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                style={isActive ? { background: 'rgba(212,175,55,0.15)', color: '#d4af37' } : {}}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: '#d4af37' }}>
              {admin?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{admin?.name}</p>
              <p className="text-gray-500 text-xs truncate">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); toast.success('Logged out'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function TopBar() {
  const { currentPage, setSidebarOpen } = useAppStore();
  const title = navItems.find(n => n.key === currentPage)?.label || 'Dashboard';

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold" style={{ color: '#1a1a2e' }}>{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: '#d4af3715' }}>
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-muted-foreground">Online</span>
        </div>
      </div>
    </header>
  );
}

function MainContent() {
  const { currentPage } = useAppStore();
  switch (currentPage) {
    case 'dashboard': return <DashboardPage />;
    case 'clients': return <ClientsPage />;
    case 'plans': return <PlansPage />;
    case 'subscriptions': return <SubscriptionsPage />;
    case 'invoices': return <InvoicesPage />;
    case 'products': return <ProductsPage />;
    case 'orders': return <OrdersPage />;
    case 'reports': return <ReportsPage />;
    case 'settings': return <SettingsPage />;
    default: return <DashboardPage />;
  }
}

// ===== MAIN APP =====
export default function HomePage() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  // Check auth on mount
  useEffect(() => {
    if (!isAuthenticated) {
      fetch('/api/auth/login').then(res => {
        if (res.ok) {
          // Already authenticated from cookie
        }
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <MainContent />
        </main>
      </div>
    </div>
  );
}
