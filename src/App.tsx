import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Bell, 
  Settings as SettingsIcon,
  Plus,
  Search,
  Scan,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit2,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calculator,
  FileText,
  Users,
  Download,
  CreditCard,
  History,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };
  
  const logoUrl = "https://lh3.googleusercontent.com/d/1HQn7i1ULdPr9k5E4Qr_P0aZYwgHiYnw4";

  return (
    <div className={`${dimensions[size]} flex items-center justify-center relative overflow-hidden`}>
      <img 
        src={logoUrl} 
        alt="App Logo" 
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { BarcodeScanner } from './components/BarcodeScanner';
import { Product, Category, Sale, Stats, Import } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Screen = 'dashboard' | 'products' | 'add-product' | 'sales' | 'reports' | 'notifications' | 'settings' | 'pos' | 'import-products' | 'capital' | 'invoices' | 'credit';

interface Invoice {
  id: number;
  customer_name: string;
  total_amount: number;
  status: 'open' | 'closed';
  created_at: string;
}

interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name?: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  total_debt: number;
  created_at: string;
}

interface Debt {
  id: number;
  customer_id: number;
  amount: number;
  description: string;
  type: 'purchase' | 'payment';
  status: 'unpaid' | 'paid';
  created_at: string;
}

const AppContent = () => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('hanout_dark_mode');
    return saved === 'true';
  });
  const [user, setUser] = useState<{ id: number; username: string; shop_name: string } | null>(() => {
    const saved = localStorage.getItem('hanout_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [importsHistory, setImportsHistory] = useState<Import[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<{ items: { product: Product; quantity: number }[]; customerName: string } | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDebts, setCustomerDebts] = useState<Debt[]>([]);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);
  const [expandedInvoiceItems, setExpandedInvoiceItems] = useState<InvoiceItem[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const url = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('hanout_user', JSON.stringify(userData));
      } else {
        const err = await res.json();
        alert(err.error || t('error'));
      }
    } catch (error) {
      alert(t('error'));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hanout_user');
  };

  const handleReset = async () => {
    setConfirmModal({
      isOpen: true,
      title: t('resetData'),
      message: t('confirmReset'),
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/reset', { method: 'POST' });
          if (res.ok) {
            fetchData();
            setAlertModal({
              isOpen: true,
              title: t('success'),
              message: t('success')
            });
          }
        } catch (error) {
          console.error('Error resetting data:', error);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 dark:bg-slate-950 shadow-2xl p-6 justify-center transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800"
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('appName')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{authMode === 'login' ? t('login') : t('signup')}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('username')}</label>
              <input 
                name="username" 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('password')}</label>
              <input 
                name="password" 
                type="password" 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20" 
              />
            </div>
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('shopName')}</label>
                <input 
                  name="shop_name" 
                  required 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20" 
                />
              </div>
            )}
            <button className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 mt-4 transition-transform active:scale-95">
              {authMode === 'login' ? t('login') : t('signup')}
            </button>
          </form>

          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="w-full text-center mt-6 text-sm text-slate-500 dark:text-slate-400 font-medium"
          >
            {authMode === 'login' ? t('noAccount') : t('haveAccount')} <span className="text-emerald-600">{authMode === 'login' ? t('signup') : t('login')}</span>
          </button>
        </motion.div>
      </div>
    );
  }

  const fetchInvoiceItems = async (invoiceId: number) => {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
      setExpandedInvoiceItems([]);
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/items`);
      if (res.ok) {
        const items = await res.json();
        setExpandedInvoiceItems(items);
        setExpandedInvoiceId(invoiceId);
      }
    } catch (error) {
      console.error('Error fetching invoice items:', error);
    }
  };

  const fetchCustomerDebts = async (customerId: number) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/debts`);
      if (res.ok) {
        const debts = await res.json();
        setCustomerDebts(debts);
      }
    } catch (error) {
      console.error('Error fetching customer debts:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [prodRes, catRes, statsRes, salesRes, importsRes, invoiceRes, customerRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/stats'),
        fetch('/api/sales/history'),
        fetch('/api/imports/history'),
        fetch('/api/invoices'),
        fetch('/api/customers')
      ]);
      const [prods, cats, st, sales, imports, invs, custs] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        statsRes.json(),
        salesRes.json(),
        importsRes.json(),
        invoiceRes.json(),
        customerRes.json()
      ]);
      setProducts(prods);
      setCategories(cats);
      setStats(st);
      setSalesHistory(sales);
      setImportsHistory(imports);
      setInvoices(invs);
      setCustomers(custs);
      setNotificationCount(st.lowStock + st.expiringSoon);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export');
      if (res.ok) {
        const data = await res.json();
        
        // Create a hidden container for the PDF content
        const element = document.createElement('div');
        element.style.padding = '40px';
        element.style.fontFamily = 'Arial, sans-serif';
        element.style.direction = isRTL ? 'rtl' : 'ltr';
        element.style.color = '#1a2b3c';
        
        const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        element.innerHTML = `
          <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
            <h1 style="margin: 0; color: #059669;">${user?.shop_name || t('appName')}</h1>
            <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">${t('reports')} - ${date}</p>
          </div>

          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 18px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px;">${t('sales')}</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #f8fafc; text-align: ${isRTL ? 'right' : 'left'};">
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('productName')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('quantity')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('total')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('profit')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('history')}</th>
                </tr>
              </thead>
              <tbody>
                ${data.sales.map((s: any) => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.product_name || 'Product'}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.quantity}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.total_price.toFixed(2)}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.profit.toFixed(2)}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date(s.sale_date).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 18px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px;">${t('invoices')}</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #f8fafc; text-align: ${isRTL ? 'right' : 'left'};">
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('customerName')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('total')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('history')}</th>
                </tr>
              </thead>
              <tbody>
                ${data.invoices.map((inv: any) => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${inv.customer_name || t('customerName')}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${inv.total_amount.toFixed(2)}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date(inv.created_at).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-bottom: 40px;">
            <h2 style="font-size: 18px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px;">${t('credit')}</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #f8fafc; text-align: ${isRTL ? 'right' : 'left'};">
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('customerName')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('amount')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('description')}</th>
                  <th style="padding: 10px; border: 1px solid #e2e8f0;">${t('history')}</th>
                </tr>
              </thead>
              <tbody>
                ${data.debts.map((d: any) => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${d.customer_name || 'Customer'}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; color: ${d.type === 'purchase' ? '#dc2626' : '#059669'};">
                      ${d.type === 'purchase' ? '+' : '-'}${d.amount.toFixed(2)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${d.description || ''}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date(d.created_at).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        const opt = {
          margin: 10,
          filename: `hanout_report_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        html2pdf().from(element).set(opt).save();
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('hanout_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (editingProduct) {
      setImagePreview(editingProduct.image_url);
    } else {
      setImagePreview(null);
    }
  }, [editingProduct]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          purchase_price: Number(data.purchase_price),
          selling_price: Number(data.selling_price),
          quantity: Number(data.quantity),
          category_id: Number(data.category_id),
          image_url: imagePreview
        })
      });
      if (res.ok) {
        fetchData();
        setCurrentScreen('products');
        setEditingProduct(null);
      }
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: t('delete'),
      message: t('confirmDelete'),
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchData();
            if (editingProduct && editingProduct.id === id) {
              setEditingProduct(null);
              setCurrentScreen('products');
            }
          } else {
            const err = await res.json();
            setAlertModal({
              isOpen: true,
              title: t('error'),
              message: err.error || t('error')
            });
          }
        } catch (error) {
          console.error('Error deleting product:', error);
          setAlertModal({
            isOpen: true,
            title: t('error'),
            message: t('error')
          });
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSale = async (productId: number, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    if (activeInvoice) {
      setActiveInvoice(prev => {
        if (!prev) return prev;
        const existingItem = prev.items.find(item => item.product.id === productId);
        if (existingItem) {
          return {
            ...prev,
            items: prev.items.map(item => 
              item.product.id === productId 
                ? { ...item, quantity: item.quantity + quantity } 
                : item
            )
          };
        }
        return {
          ...prev,
          items: [...prev.items, { product, quantity }]
        };
      });
      return true;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity })
      });
      if (res.ok) {
        fetchData();
        return true;
      }
    } catch (error) {
      console.error('Error recording sale:', error);
    }
    return false;
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode?.includes(searchQuery)
  );

  const NavItem = ({ screen, icon: Icon, label }: { screen: Screen, icon: any, label: string }) => (
    <button 
      onClick={() => setCurrentScreen(screen)}
      className={cn(
        "flex flex-col items-center justify-center flex-1 py-2 transition-colors",
        currentScreen === screen ? "text-emerald-600" : "text-slate-400 dark:text-slate-500"
      )}
    >
      <div className="relative">
        <Icon size={24} />
        {screen === 'notifications' && notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
            {notificationCount}
          </span>
        )}
      </div>
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );

  const Header = ({ title, showBack = false }: { title: string, showBack?: boolean }) => (
    <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={() => {
              if (currentScreen === 'add-product' || currentScreen === 'import-products') {
                setCurrentScreen('products');
                setEditingProduct(null);
              } else {
                setCurrentScreen('dashboard');
              }
            }} 
            className="p-1 text-slate-600 dark:text-slate-400"
          >
            {isRTL ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
        )}
        {!showBack && (
          <Logo size="sm" />
        )}
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {currentScreen !== 'notifications' && (
          <button 
            onClick={() => setCurrentScreen('notifications')}
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {notificationCount}
              </span>
            )}
          </button>
        )}
        {currentScreen === 'dashboard' && (
          <button 
            onClick={() => setCurrentScreen('pos')}
            className="bg-blue-600 text-white p-2 rounded-full shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
          >
            <Scan size={20} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "min-h-screen pb-20 flex flex-col max-w-md mx-auto bg-slate-50 dark:bg-slate-950 shadow-2xl relative overflow-hidden transition-colors duration-300",
      darkMode && "dark"
    )}>
      <AnimatePresence mode="wait">
        {isScanning && (
          <BarcodeScanner 
            onScan={(barcode) => {
              setSearchQuery(barcode);
              setIsScanning(false);
              const product = products.find(p => p.barcode === barcode);
              if (product) {
                if (currentScreen === 'pos') {
                  handleSale(product.id, 1);
                } else {
                  setCurrentScreen('products');
                }
              }
            }} 
            onClose={() => setIsScanning(false)} 
          />
        )}
      </AnimatePresence>

      {currentScreen === 'dashboard' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          className="flex-1"
        >
          <Header title={t('appName')} />
          <div className="p-4 space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                  <ShoppingCart size={20} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('todaySales')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.todayCount || 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                  <BarChart3 size={20} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('todayIncome')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.todayIncome.toFixed(2)} {t('currencySymbol')}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle2 size={20} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('todayProfit')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats?.todayProfit.toFixed(2)} {t('currencySymbol')}</p>
              </div>
              <div 
                onClick={() => setCurrentScreen('credit')}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer"
              >
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                  <CreditCard size={20} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('credit')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {customers.reduce((acc, c) => acc + c.total_debt, 0).toFixed(2)} {t('currencySymbol')}
                </p>
              </div>
            </div>

            {/* Dashboard Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setActiveInvoice({ items: [], customerName: '' });
                  setCurrentScreen('pos');
                }}
                className="bg-emerald-600 text-white p-4 rounded-3xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <div className="bg-white/20 p-2 rounded-xl">
                  <Plus size={24} />
                </div>
                <span className="font-bold text-sm">{t('activeInvoice')}</span>
              </button>
              <button 
                onClick={() => setCurrentScreen('pos')}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 p-2 rounded-xl">
                  <Scan size={24} />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">{t('pos')}</span>
              </button>
            </div>

            {/* Alerts */}
            {((stats?.lowStock || 0) > 0 || (stats?.expiringSoon || 0) > 0) && (
              <button 
                onClick={() => setCurrentScreen('notifications')}
                className={cn(
                  "w-full p-4 rounded-2xl flex items-center justify-between transition-colors",
                  (stats?.expiringSoon || 0) > 0 
                    ? "bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-700 dark:text-red-400"
                    : "bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 text-amber-700 dark:text-amber-400"
                )}
              >
                <div className="flex items-center gap-3">
                  <Bell size={20} className="animate-bounce" />
                  <div className="text-left">
                    <span className="font-bold text-sm block">{t('notifications')}</span>
                    <span className="text-xs opacity-80">
                      {stats?.lowStock ? `${t('lowStock')}: ${stats.lowStock} ` : ''}
                      {stats?.expiringSoon ? `${t('expiringSoon')}: ${stats.expiringSoon}` : ''}
                    </span>
                  </div>
                </div>
                {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            )}

            {/* Today's Hourly Chart */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{t('todayHourlySales')}</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.todayHourlySales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{t('weeklySales')}</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.salesChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Sales */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('history')}</h3>
                <button onClick={() => setCurrentScreen('reports')} className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  {t('reports')}
                </button>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {salesHistory.slice(0, 5).map(sale => (
                  <div key={sale.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{sale.product_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(sale.sale_date).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{sale.total_price.toFixed(2)} {t('currencySymbol')}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+{sale.profit.toFixed(2)} {t('currencySymbol')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {currentScreen === 'products' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: -20 }}
          className="flex-1"
        >
          <Header title={t('products')} />
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button 
                onClick={() => setIsScanning(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
              >
                <Scan size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-600 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={32} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{product.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? product.category_ar : product.category_en}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        product.quantity < 5 ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {product.quantity} {t('unit')}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{product.selling_price.toFixed(2)} {t('currencySymbol')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        setEditingProduct(product);
                        setCurrentScreen('add-product');
                      }}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <Package size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 text-sm">{t('noProducts')}</p>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setCurrentScreen('add-product');
            }}
            className="fixed bottom-24 right-4 bg-emerald-600 text-white w-14 h-14 rounded-full shadow-xl shadow-emerald-200 dark:shadow-emerald-900/40 flex items-center justify-center z-40"
          >
            <Plus size={28} />
          </button>
        </motion.div>
      )}

      {currentScreen === 'add-product' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          className="flex-1"
        >
          <Header title={editingProduct ? t('editProduct') : t('addProduct')} showBack />
          <form onSubmit={handleAddProduct} className="p-4 space-y-4">
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Plus size={32} className="text-slate-300 dark:text-slate-600" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-wider">{t('uploadImage')}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('productName')}</label>
              <input 
                name="name" 
                defaultValue={editingProduct?.name}
                required 
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('barcode')}</label>
              <div className="relative">
                <input 
                  name="barcode" 
                  defaultValue={editingProduct?.barcode}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                />
                <button 
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600"
                >
                  <Scan size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('purchasePrice')}</label>
                <input 
                  name="purchase_price" 
                  type="number" 
                  step="0.01"
                  defaultValue={editingProduct?.purchase_price}
                  required 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('sellingPrice')}</label>
                <input 
                  name="selling_price" 
                  type="number" 
                  step="0.01"
                  defaultValue={editingProduct?.selling_price}
                  required 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('quantity')}</label>
                <input 
                  name="quantity" 
                  type="number" 
                  defaultValue={editingProduct?.quantity}
                  required 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('category')}</label>
                <select 
                  name="category_id" 
                  defaultValue={editingProduct?.category_id}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {isRTL ? cat.name_ar : cat.name_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('expiryDate')}</label>
              <input 
                name="expiration_date" 
                type="date" 
                defaultValue={editingProduct?.expiration_date}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button 
                type="submit"
                className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-transform active:scale-95"
              >
                {t('save')}
              </button>
              {editingProduct && (
                <button 
                  type="button"
                  onClick={() => handleDeleteProduct(editingProduct.id)}
                  className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold px-6 rounded-2xl border border-red-100 dark:border-red-900/20 transition-transform active:scale-95 flex items-center justify-center"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </form>
        </motion.div>
      )}

      {currentScreen === 'pos' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex-1 flex flex-col"
        >
          <Header title={activeInvoice ? t('activeInvoice') : t('pos')} showBack />
          <div className="p-4 flex-1 flex flex-col space-y-4">
            {activeInvoice && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 space-y-3">
                <div className="flex items-center justify-between relative">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder={t('customerName')}
                      value={activeInvoice.customerName}
                      onChange={(e) => {
                        setActiveInvoice(prev => prev ? { ...prev, customerName: e.target.value } : null);
                        setCustomerSearch(e.target.value);
                      }}
                      onFocus={() => setCustomerSearch(activeInvoice.customerName)}
                      className="w-full bg-transparent border-b border-emerald-200 dark:border-emerald-800 text-sm font-bold focus:outline-none text-slate-900 dark:text-white pb-1"
                    />
                    {customerSearch && (
                      <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl mt-1 z-50 max-h-40 overflow-y-auto">
                        {customers
                          .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                          .map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => {
                                setActiveInvoice(prev => prev ? { ...prev, customerName: c.name } : null);
                                setCustomerSearch('');
                              }}
                              className="p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 flex justify-between items-center"
                            >
                              <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                              <span className="text-[10px] text-slate-400">{c.phone}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setActiveInvoice(null)}
                    className="text-slate-400 ml-2"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeInvoice.items.length > 0 ? (
                    activeInvoice.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30 animate-in fade-in slide-in-from-left-2 duration-200">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{item.product.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('quantity')}: <span className="font-bold text-emerald-600">{item.quantity}</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setActiveInvoice(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    items: prev.items.map(i => 
                                      i.product.id === item.product.id 
                                        ? { ...i, quantity: Math.max(1, i.quantity - 1) } 
                                        : i
                                    )
                                  };
                                });
                              }}
                              className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                            >
                              -
                            </button>
                            <button 
                              onClick={() => {
                                setActiveInvoice(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    items: prev.items.map(i => 
                                      i.product.id === item.product.id 
                                        ? { ...i, quantity: i.quantity + 1 } 
                                        : i
                                    )
                                  };
                                });
                              }}
                              className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right min-w-[60px]">
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{(item.product.selling_price * item.quantity).toFixed(2)}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setActiveInvoice(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  items: prev.items.filter(i => i.product.id !== item.product.id)
                                };
                              });
                            }}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-[10px] text-slate-400 py-2 italic">{t('noProducts')}</p>
                  )}
                </div>
                <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/20 flex justify-between items-center gap-2">
                  <span className="font-bold text-sm">{t('total')}: {activeInvoice.items.reduce((acc, item) => acc + (item.product.selling_price * item.quantity), 0).toFixed(2)}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        if (!activeInvoice.customerName) {
                          alert(t('customerName'));
                          return;
                        }
                        let customer = customers.find(c => c.name === activeInvoice.customerName);
                        if (!customer) {
                          const res = await fetch('/api/customers', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: activeInvoice.customerName })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            customer = { id: data.id, name: activeInvoice.customerName, phone: '', total_debt: 0, created_at: '' };
                          }
                        }
                        if (customer) {
                          const total = activeInvoice.items.reduce((acc, item) => acc + (item.product.selling_price * item.quantity), 0);
                          
                          // 1. Create the invoice first to get its ID
                          const invRes = await fetch('/api/invoices', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              customer_name: activeInvoice.customerName,
                              total_amount: total,
                              status: 'open',
                              items: activeInvoice.items.map(item => ({
                                product_id: item.product.id,
                                quantity: item.quantity,
                                price: item.product.selling_price
                              }))
                            })
                          });

                          if (invRes.ok) {
                            const invData = await invRes.json();
                            const invoiceId = invData.id;

                            // 2. Create the debt linked to this invoice
                            const debtRes = await fetch('/api/debts', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                customer_id: customer.id,
                                amount: total,
                                type: 'purchase',
                                invoice_id: invoiceId,
                                description: activeInvoice.items.map(i => `${i.product.name} x${i.quantity}`).join(', ')
                              })
                            });

                            if (debtRes.ok) {
                              fetchData();
                              setActiveInvoice(null);
                              setAlertModal({ isOpen: true, title: t('success'), message: t('success') });
                            }
                          }
                        }
                      }}
                      className="bg-amber-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl"
                    >
                      {t('credit')}
                    </button>
                    <button 
                      onClick={async () => {
                        const res = await fetch('/api/invoices', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            customer_name: activeInvoice.customerName,
                            total_amount: activeInvoice.items.reduce((acc, item) => acc + (item.product.selling_price * item.quantity), 0),
                            status: 'closed',
                            items: activeInvoice.items.map(item => ({
                              product_id: item.product.id,
                              quantity: item.quantity,
                              price: item.product.selling_price
                            }))
                          })
                        });
                        if (res.ok) {
                          fetchData();
                          setActiveInvoice(null);
                          setAlertModal({ isOpen: true, title: t('success'), message: t('success') });
                        }
                      }}
                      className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl"
                    >
                      {t('closeInvoice')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button 
                onClick={() => setIsScanning(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600"
              >
                <Scan size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredProducts.slice(0, 10).map(product => (
                <button 
                  key={product.id}
                  onClick={() => handleSale(product.id, 1)}
                  className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between active:bg-emerald-50 dark:active:bg-emerald-900/20 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{product.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{product.quantity} {t('unit')}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{product.selling_price.toFixed(2)} {t('currencySymbol')}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {currentScreen === 'sales' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: -20 }}
          className="flex-1"
        >
          <Header title={t('sales')} />
          <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('history')}</h3>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {salesHistory.map(sale => (
                  <div key={sale.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{sale.product_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(sale.sale_date).toLocaleDateString()} {new Date(sale.sale_date).toLocaleTimeString()}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('quantity')}: {sale.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{sale.total_price.toFixed(2)} {t('currencySymbol')}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{t('profit')}: {sale.profit.toFixed(2)} {t('currencySymbol')}</p>
                    </div>
                  </div>
                ))}
                {salesHistory.length === 0 && (
                  <div className="p-8 text-center text-slate-400">{t('noProducts')}</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {currentScreen === 'import-products' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          className="flex-1"
        >
          <Header title={t('importProducts')} showBack />
          <div className="p-4 space-y-6">
            {/* Required Imports Section */}
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/20 overflow-hidden">
              <div className="p-4 border-b border-amber-100 dark:border-amber-900/20 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400">{t('requiredImports')}</h3>
              </div>
              <div className="divide-y divide-amber-100 dark:divide-amber-900/20">
                {products.filter(p => p.quantity < 5).map(product => (
                  <div key={`req-${product.id}`} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-300">{product.name}</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">{t('stock')}: {product.quantity} {t('unit')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">{t('purchasePrice')}: {product.purchase_price.toFixed(2)} {t('currencySymbol')}</p>
                    </div>
                  </div>
                ))}
                {products.filter(p => p.quantity < 5).length === 0 && (
                  <div className="p-4 text-center text-amber-600 dark:text-amber-500 text-xs">{t('noProducts')}</div>
                )}
              </div>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                const res = await fetch('/api/imports', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    product_id: Number(data.product_id),
                    quantity: Number(data.quantity),
                    unit_price: Number(data.unit_price) / Number(data.quantity)
                  })
                });
                if (res.ok) {
                  fetchData();
                  setCurrentScreen('products');
                }
              }}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('productName')}</label>
                <select 
                  name="product_id" 
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">{t('search')}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('quantity')}</label>
                  <input 
                    name="quantity" 
                    type="number" 
                    required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('unitPrice')}</label>
                  <input 
                    name="unit_price" 
                    type="number" 
                    step="0.01"
                    required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-transform active:scale-95"
              >
                {t('import')}
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('importHistory')}</h3>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {importsHistory.map(imp => (
                  <div key={imp.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{imp.product_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(imp.import_date).toLocaleDateString()} {new Date(imp.import_date).toLocaleTimeString()}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('quantity')}: {imp.quantity} x {imp.unit_price.toFixed(2)} {t('currencySymbol')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{imp.total_price.toFixed(2)} {t('currencySymbol')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {currentScreen === 'invoices' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: -20 }}
          className="flex-1"
        >
          <Header title={t('invoices')} />
          <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('invoiceHistory')}</h3>
                <button 
                  onClick={() => {
                    setActiveInvoice({ items: [], customerName: '' });
                    setCurrentScreen('pos');
                  }}
                  className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Plus size={14} />
                  {t('newInvoice')}
                </button>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {invoices.map(inv => (
                  <div key={inv.id} className="divide-y divide-slate-50 dark:divide-slate-800">
                    <div 
                      onClick={() => fetchInvoiceItems(inv.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.customer_name || t('customerName')}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(inv.created_at).toLocaleDateString()} {new Date(inv.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{inv.total_amount.toFixed(2)} {t('currencySymbol')}</p>
                        <span 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (inv.status === 'open') {
                              const res = await fetch(`/api/invoices/${inv.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'closed' })
                              });
                              if (res.ok) fetchData();
                            }
                          }}
                          className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold cursor-pointer transition-transform active:scale-95 ${inv.status === 'closed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}
                        >
                          {inv.status === 'closed' ? t('paid') : t('unpaid')}
                        </span>
                      </div>
                    </div>
                    {expandedInvoiceId === inv.id && (
                      <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {expandedInvoiceItems.map(item => (
                          <div key={item.id} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                            <span>{item.product_name} x{item.quantity}</span>
                            <span>{(item.price * item.quantity).toFixed(2)} {t('currencySymbol')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="p-8 text-center text-slate-400">{t('noProducts')}</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {currentScreen === 'credit' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: -20 }}
          className="flex-1"
        >
          <Header title={t('credit')} />
          <div className="p-4 space-y-4">
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                const res = await fetch('/api/customers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (res.ok) {
                  fetchData();
                  e.currentTarget.reset();
                }
              }}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input 
                  name="name" 
                  placeholder={t('customerName')} 
                  required 
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white"
                />
                <input 
                  name="phone" 
                  placeholder={t('phone')} 
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <button className="w-full bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm">
                {t('addCustomer')}
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('customers')}</h3>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {customers.map(cust => (
                  <div key={cust.id} className="divide-y divide-slate-50 dark:divide-slate-800">
                    <div 
                      onClick={() => {
                        if (selectedCustomer?.id === cust.id) {
                          setSelectedCustomer(null);
                          setCustomerDebts([]);
                        } else {
                          setSelectedCustomer(cust);
                          fetchCustomerDebts(cust.id);
                        }
                      }}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{cust.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{cust.phone}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{cust.total_debt.toFixed(2)} {t('currencySymbol')}</p>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            const amount = prompt(t('amount'));
                            if (amount) {
                              const res = await fetch('/api/debts', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  customer_id: cust.id,
                                  amount: Number(amount),
                                  type: 'payment',
                                  description: 'Payment'
                                })
                              });
                              if (res.ok) {
                                fetchData();
                                if (selectedCustomer?.id === cust.id) fetchCustomerDebts(cust.id);
                              }
                            }
                          }}
                          className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-lg font-bold"
                        >
                          {t('payment')}
                        </button>
                      </div>
                    </div>
                    {selectedCustomer?.id === cust.id && (
                      <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Quick Transaction Form */}
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('payment')}</p>
                          <div className="flex flex-col gap-2">
                            <input 
                              type="number" 
                              placeholder={t('amount')}
                              value={quickAmount}
                              onChange={(e) => setQuickAmount(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                            />
                            <input 
                              type="text" 
                              placeholder={t('description')}
                              value={quickDesc}
                              onChange={(e) => setQuickDesc(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!quickAmount) return;
                                const res = await fetch('/api/debts', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    customer_id: cust.id,
                                    amount: Number(quickAmount),
                                    type: 'payment',
                                    description: quickDesc || 'Payment'
                                  })
                                });
                                if (res.ok) {
                                  setQuickAmount('');
                                  setQuickDesc('');
                                  fetchData();
                                  fetchCustomerDebts(cust.id);
                                }
                              }}
                              className="flex-1 bg-emerald-600 text-white text-[10px] font-bold py-2 rounded-lg shadow-sm active:scale-95 transition-transform"
                            >
                              {t('payment')} (-)
                            </button>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!quickAmount) return;
                                const res = await fetch('/api/debts', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    customer_id: cust.id,
                                    amount: Number(quickAmount),
                                    type: 'purchase',
                                    description: quickDesc || 'Manual Debt'
                                  })
                                });
                                if (res.ok) {
                                  setQuickAmount('');
                                  setQuickDesc('');
                                  fetchData();
                                  fetchCustomerDebts(cust.id);
                                }
                              }}
                              className="flex-1 bg-red-600 text-white text-[10px] font-bold py-2 rounded-lg shadow-sm active:scale-95 transition-transform"
                            >
                              {t('debt')} (+)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {customerDebts.map(debt => (
                          <div key={debt.id} className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold ${debt.type === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                #{debt.id}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {new Date(debt.created_at).toLocaleDateString()} {new Date(debt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={debt.type === 'payment' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                                {debt.type === 'payment' ? '-' : '+'}{debt.amount.toFixed(2)}
                              </span>
                              <span 
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  (debt.type === 'payment' || debt.status === 'paid') 
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400 border-red-100 dark:border-red-900/20'
                                }`}
                              >
                                {(debt.type === 'payment' || debt.status === 'paid') ? t('paid') : t('debt')}
                              </span>
                            </div>
                          </div>
                        ))}
                        {customerDebts.length === 0 && (
                          <p className="text-center text-[10px] text-slate-400 py-2">لا توجد معاملات</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    )}

      {currentScreen === 'capital' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: -20 }}
          className="flex-1"
        >
          <Header title={t('capital')} />
          <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl">
                  <Calculator size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('capital')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('stats')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t('stockValue')}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {products.reduce((acc, p) => acc + (p.purchase_price * p.quantity), 0).toFixed(2)} {t('currencySymbol')}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">{t('potentialRevenue')}</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {products.reduce((acc, p) => acc + (p.selling_price * p.quantity), 0).toFixed(2)} {t('currencySymbol')}
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">{t('potentialProfit')}</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {(products.reduce((acc, p) => acc + (p.selling_price * p.quantity), 0) - products.reduce((acc, p) => acc + (p.purchase_price * p.quantity), 0)).toFixed(2)} {t('currencySymbol')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('products')}</h3>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[300px] overflow-y-auto">
                {products.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{p.quantity} {t('unit')} x {p.purchase_price.toFixed(2)}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{(p.purchase_price * p.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {currentScreen === 'reports' && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: 20 }}
          className="flex-1"
        >
          <Header title={t('reports')} showBack />
          <div className="p-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{t('weeklySales')}</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.salesChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: darkMode ? '#0f172a' : '#fff',
                        color: darkMode ? '#fff' : '#000'
                      }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('history')}</h3>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {salesHistory.map(sale => (
                  <div key={sale.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{sale.product_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(sale.sale_date).toLocaleDateString()} {new Date(sale.sale_date).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{sale.total_price.toFixed(2)} {t('currencySymbol')}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{t('profit')}: {sale.profit.toFixed(2)} {t('currencySymbol')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {currentScreen === 'notifications' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          className="flex-1"
        >
          <Header title={t('notifications')} showBack />
          <div className="p-4 space-y-3">
            {products.filter(p => p.quantity < 5).map(p => (
              <button 
                key={`low-${p.id}`} 
                onClick={() => {
                  setEditingProduct(p);
                  setCurrentScreen('add-product');
                }}
                className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-4 rounded-2xl flex items-start gap-3 text-left transition-transform active:scale-95"
              >
                <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">{t('lowStockAlert')}</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{p.name}: {p.quantity} {t('unit')} {t('stock')}</p>
                </div>
              </button>
            ))}
            {products.filter(p => p.expiration_date && new Date(p.expiration_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).map(p => (
              <button 
                key={`exp-${p.id}`} 
                onClick={() => {
                  setEditingProduct(p);
                  setCurrentScreen('add-product');
                }}
                className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 rounded-2xl flex items-start gap-3 text-left transition-transform active:scale-95"
              >
                <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded-xl">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900 dark:text-red-400">{t('expiryAlert')}</h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">{p.name}: {p.expiration_date}</p>
                </div>
              </button>
            ))}
            {notificationCount === 0 && (
              <div className="text-center py-12">
                <Bell size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                <p className="text-slate-400 dark:text-slate-600 text-sm">{t('noProducts')}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {currentScreen === 'settings' && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: 20 }}
          className="flex-1"
        >
          <Header title={t('settings')} showBack />
          <div className="p-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('language')}</h3>
              </div>
              <div className="p-2">
                <button 
                  onClick={() => setLanguage('ar')}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
                    language === 'ar' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <span className="font-medium">{t('arabic')}</span>
                  {language === 'ar' && <CheckCircle2 size={18} />}
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
                    language === 'en' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <span className="font-medium">{t('english')}</span>
                  {language === 'en' && <CheckCircle2 size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('darkMode')}</h3>
              </div>
              <div className="p-4">
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors"
                >
                  <span className="font-medium text-slate-600 dark:text-slate-400">{darkMode ? t('lightMode') : t('darkMode')}</span>
                  <div className={cn(
                    "w-12 h-6 rounded-full relative transition-colors",
                    darkMode ? "bg-emerald-600" : "bg-slate-300"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      darkMode ? "right-1" : "left-1"
                    )} />
                  </div>
                </button>
              </div>
            </div>

            <button 
              onClick={handleExport}
              className="w-full bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 font-bold py-4 rounded-2xl border border-blue-100 dark:border-blue-900/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Download size={20} />
              {t('exportData')}
            </button>

            <button 
              onClick={handleLogout}
              className="w-full bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold py-4 rounded-2xl border border-red-100 dark:border-red-900/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <X size={20} />
              {t('logout')}
            </button>

            <button 
              onClick={handleReset}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-2xl border border-slate-200 dark:border-slate-700 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Trash2 size={20} />
              {t('resetData')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-1 z-40 max-w-md mx-auto overflow-x-auto">
        <NavItem screen="dashboard" icon={LayoutDashboard} label={t('dashboard')} />
        <NavItem screen="products" icon={Package} label={t('products')} />
        <NavItem screen="sales" icon={ShoppingCart} label={t('sales')} />
        <NavItem screen="invoices" icon={FileText} label={t('invoices')} />
        <NavItem screen="credit" icon={CreditCard} label={t('credit')} />
        <NavItem screen="capital" icon={Calculator} label={t('capital')} />
        <NavItem screen="settings" icon={SettingsIcon} label={t('settings')} />
      </nav>

      {/* Custom Modals */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 w-full max-w-xs relative z-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
                confirmModal.type === 'danger' ? "bg-red-50 dark:bg-red-900/20 text-red-600" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
              )}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95",
                    confirmModal.type === 'danger' ? "bg-red-600 shadow-red-200 dark:shadow-red-900/20" : "bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900/20"
                  )}
                >
                  {confirmModal.type === 'danger' ? t('delete') : t('save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {alertModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 w-full max-w-xs relative z-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{alertModal.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{alertModal.message}</p>
              <button 
                onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-3 rounded-xl font-bold text-white bg-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-transform active:scale-95"
              >
                {t('success')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
